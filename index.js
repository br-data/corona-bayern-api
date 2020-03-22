const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { Firestore, FieldPath } = require('@google-cloud/firestore');

const toDashcase = require('./lib/to-dashcase');
const tableToJson = require('./lib/table-to-json');

const config = require('./config.json');
const db = new Firestore(config.firestore);
const collection = db.collection(config.firestore.collectionId);

exports.scrape = async () => {
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
  let writeBatch = db.batch();

  data.forEach(d => {
    const doc = collection.doc(toDashcase(d['name-lgl']));
    writeBatch.set(
      doc,
      { cases: { [date]: parseInt(d.count) }},
      { merge: true }
    );
  });

  return writeBatch.commit();
}

exports.api = async (req, res) => {
  const firstPath = req.url.split('/')[1];

  switch (firstPath) {
    case 'date': handleDate(req, res); break;
    default: handleDefault(req, res);
  }
};

async function handleDate(req, res) {
  const dateArgument = req.url.split('/')[2];
  const isDate = Date.parse(dateArgument);
  const date = isDate ? new Date(dateArgument) : new Date();
  const dateString = date.toISOString().split('T')[0];
  const data = await queryDatabase(undefined, dateString);
  
  if (data && data.length) {
    const reponse = data.map(d => {
      d.count = d.cases[dateString];
      d.date = dateString;
      delete d['cases'];
      return d;
    });

    res.json(reponse);
  } else {
    res.json([]);
  }
}

async function handleDefault(req, res) {
  const snapshot = await collection.get();
  const data = snapshot.docs.map(doc => doc.data());

  res.json(data);
}

async function queryDatabase(countyId, dateString) {
  const fieldPath = new FieldPath('cases', dateString);

  const snapshot = await collection.where(fieldPath, '>', 0).get();
  const data = snapshot.docs.map(doc => doc.data());

  return data;
}
