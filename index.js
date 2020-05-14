const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { Firestore, FieldPath, Timestamp } = require('@google-cloud/firestore');

const toDashcase = require('./lib/to-dashcase');
const tableToJson = require('./lib/table-to-json');
const jsonToCsv = require('./lib/json-to-csv');
const doublingTime = require('./lib/doubling-time');

const config = require('./config.json');
const db = new Firestore(config.firestore);
const collection = db.collection(config.firestore.collectionId);

exports.lglScraper = async (req, res) => {
  const html = await scrapeBody(config.url).catch(console.error);
  const data = await scrapeData(html).catch(console.error);
  const dateString = data.date || toDateString(new Date());

  if (data.result) {
    const update = await updateDatabase(data.result, dateString).catch(console.error);
    
    if (res && res.send) {
      res.send(`Update successfull: ${update.length} documents updated`);
    }
  } else {
    if (res && res.send) {
      res.send('Update failed: Could not extract data from website');
    }
  }
};

async function scrapeBody(url) {
  return fetch(url)
    .then(res => res.text())
    .catch(console.error);
}

async function scrapeData(html) {
  const tableHeaders = [
    'name-lgl',
    'cases',
    'cases-new',
    'cases-per-100tsd',
    'cases-new-7days',
    'cases-per-100tsd-7days',
    'deaths',
    'deaths-new'
  ];

  const $ = cheerio.load(html);
  const tableHtml = $('table').eq(2).parent().html();
  const tableJson = tableToJson(tableHtml, tableHeaders);
  const cleanJson = tableJson.filter(d => d['name-lgl'] !== 'Gesamtergebnis');

  const dateText = $('table').eq(2).find('caption').text();
  const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const dateString = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : undefined;

  return {
    result: cleanJson,
    date: dateString
  };
}

async function updateDatabase(data, date) {
  const lastUpdated = new Date();
  let writeBatch = db.batch();

  data.forEach(d => {
    const doc = collection.doc(toDashcase(d['name-lgl']));
    writeBatch.set(
      doc,
      {
        'last-updated': lastUpdated,
        'last-cases': parseInt(d.cases.replace('.', '')) || 0,
        'last-deaths': parseInt(d.deaths.replace('.', '')) || 0,
        'cases-per-100tsd': parseInt(d['cases-per-100tsd'].replace('.', '')) || 0,
        'cases-per-100tsd-7days': parseInt(d['cases-per-100tsd-7days'].replace('.', '')) || 0,
        'cases': { [date]: parseInt(d.cases.replace('.', '')) || 0 },
        'deaths': { [date]: parseInt(d.deaths.replace('.', '')) || 0 }
      },
      { merge: true }
    );
  });

  return writeBatch.commit();
}

exports.lglApi = async (req, res) => {
  const firstPath = req.path.split('/')[1];

  switch (firstPath) {
    case 'date': handleDate(req, res); break;
    case 'county': handleCounty(req, res); break;
    default: handleDefault(req, res);
  }
};

async function handleDate(req, res) {
  const dateArgument = req.path.split('/')[2];
  const hasDateArgument = Date.parse(dateArgument);
  const dateObject = hasDateArgument ? new Date(dateArgument) : new Date();
  const dateString = toDateString(dateObject);

  (async function getSpecificDate(dateString) {
    const fieldPath = new FieldPath('cases', dateString);
    const snapshot = await collection
      .where(fieldPath, '>', 0)
      .withConverter(flatConverter(dateString))
      .get();
    const result = snapshot.docs.map(doc => doc.data()) || [];

    if (hasDateArgument || result.length) {
      handleResponse(req, res, result);
    } else {
      const previousDate = new Date(dateString);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateString = toDateString(previousDate);
      getSpecificDate(previousDateString);
    }
  })(dateString);
}

async function handleCounty(req, res) {
  const countyArgument = req.path.split('/')[2];

  if (countyArgument && countyArgument.length) {
    const countyId = countyArgument.toString();
    const snapshot = await collection
      .doc(countyId)
      .withConverter(dateConverter())
      .get();
    const result = snapshot.data() ? [snapshot.data()] : [];
    
    handleResponse(req, res, result);
  } else {
    handleDefault(req, res);
  }
}

async function handleDefault(req, res) {
  const snapshot = await collection
    .where('last-updated', '>', new Date(0))
    .withConverter(dateConverter())
    .get();
  const result = snapshot.docs.map(doc => doc.data());

  handleResponse(req, res, result);
}

function handleResponse(req, res, result) {
  const sortedResult = result.map(sortObject).sort((a, b) => a.id.localeCompare(b.id));
  const isCsv = req.query.filetype === 'csv';
  const contentType = isCsv ? 'text/csv' : 'application/json';
  const response = isCsv ? jsonToCsv(sortedResult) : sortedResult;

  res.set('Content-Type', contentType);
  res.send(response);
}

function flatConverter(dateString) {
  return {
    fromFirestore: function (data) {
      // Previous date = current date - 1
      const previousDate = new Date(dateString);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateString = toDateString(previousDate);

      // Past date = previous date - 5
      const pastDate = new Date(previousDateString);
      pastDate.setDate(pastDate.getDate() - 5);
      const pastDateString = toDateString(pastDate);

      // Calculate the number days it takes for
      // the number of cases to double
      const doublingTimeDays = doublingTime(
        pastDate,
        data.cases[pastDateString],
        previousDate,
        data.cases[previousDateString]
      );

      const casesPerThousand = (data.cases[dateString] * 1000) / data.pop;

      const newData = Object.assign(data, {
        date: dateString,
        cases: data.cases[dateString],
        deaths: data.deaths[dateString],
        'previous-cases': data.cases[previousDateString],
        'previous-deaths': data.deaths[previousDateString],
        'doubling-time': Math.round(doublingTimeDays * 10) / 10,
        'cases-per-tsd': Math.round(casesPerThousand * 10) / 10,
        'last-updated': toTimestampString(data['last-updated'])
      });

      return newData;
    }
  };
}

function dateConverter() {
  return {
    fromFirestore: function (data) {
      return Object.assign(data, {
        'last-updated': toTimestampString(data['last-updated'])
      });
    }
  };
}

function toDateString(date) {
  return date.toISOString().split('T')[0];
}

function toTimestampString(obj) {
  const {_seconds, _nanoseconds} = obj;
  const timestamp = new Timestamp(_seconds, _nanoseconds);
  const dateString = timestamp.toDate().toISOString();

  return dateString;
}

function sortObject(obj) {
  return Object.keys(obj).sort().reduce((result, key) => {
    result[key] = obj[key];
    return result;
  }, {});
}
