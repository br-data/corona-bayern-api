const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { Firestore, FieldPath, Timestamp } = require('@google-cloud/firestore');

const toDashcase = require('./lib/to-dashcase');
const tableToJson = require('./lib/table-to-json');
const jsonToCsv = require('./lib/json-to-csv');

const config = require('./config.json');
const db = new Firestore(config.firestore);
const collection = db.collection(config.firestore.collectionId);

exports.scraper = async () => {
  // YYYY-MM-DD
  const date = new Date().toISOString().split('T')[0];

  const html = await scrapeBody(config.url).catch(console.error);
  const data = await scrapeData(html).catch(console.error);
  const update = await updateDatabase(data, date).catch(console.error);

  console.log(`Updated ${update.length} documents`);
};

async function scrapeBody(url) {
  return fetch(url)
    .then(res => res.text())
    .catch(console.error);
}

async function scrapeData(html) {
  const $ = cheerio.load(html);
  const tableHtml = $('div.col.col-md-5.offset-md-3').html();
  const json = tableToJson(tableHtml, ['name-lgl', 'count']);
  const cleanJson = json.filter(d => d['name-lgl'] !== 'Gesamtergebnis');

  return cleanJson;
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
        'last-count': parseInt(d.count),
        'cases': { [date]: parseInt(d.count) }
      },
      { merge: true }
    );
  });

  return writeBatch.commit();
}

exports.api = async (req, res) => {
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
  const dateString = dateObject.toISOString().split('T')[0];

  const fieldPath = new FieldPath('cases', dateString);
  const snapshot = await collection
    .where(fieldPath, '>', 0)
    .withConverter(flatConverter(dateString))
    .get();
  const json = snapshot.docs.map(doc => doc.data()) || [];

  handleResponse(req, res, flatJson);
}

async function handleCounty(req, res) {
  const countyArgument = req.path.split('/')[2];

  if (countyArgument && countyArgument.length) {
    const countyId = countyArgument.toString();
    const snapshot = await collection
    .doc(countyId)
    .withConverter(dateConverter())
    .get();
    const json = snapshot.data() ? [snapshot.data()] : [];
    
    handleResponse(req, res, json);
  } else {
    handleDefault(req, res);
  }
}

async function handleDefault(req, res) {
  const snapshot = await collection
    .where('last-updated', '>', new Date(0))
    .withConverter(dateConverter())
    .get();
  const json = snapshot.docs.map(doc => doc.data());

  handleResponse(req, res, json);
}

function handleResponse(req, res, json) {
  const isCsv = req.query.filetype === 'csv';
  const contentType = isCsv ? 'text/csv' : 'application/json';
  const response = isCsv ? jsonToCsv(json) : json;

  res.set(contentType);
  res.send(response);
}

function flatConverter(dateString) {
  return {
    fromFirestore: function (data) {
      const newData = Object.assign(data, {
        count: data.cases[dateString],
        date: dateString,
        'last-updated': toDateString(data['last-updated'])
      });

      const { cases, ...result } = newData;
      return result;
    }
  };
}

function dateConverter() {
  return {
    fromFirestore: function (data) {
      return Object.assign(data, {
        'last-updated': toDateString(data['last-updated'])
      });
    }
  };
}

function toDateString(obj) {  
  const {_seconds, _nanoseconds} = obj;
  const timestamp = new Timestamp(_seconds, _nanoseconds);
  const dateString = timestamp.toDate().toISOString();

  return dateString;
}
