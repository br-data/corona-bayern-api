const fetch = require('node-fetch');
const cheerio = require('cheerio');
const Firestore = require('@google-cloud/firestore');

const toDashcase = require('./lib/to-dashcase');
const tableToJson = require('./lib/table-to-json');

const config = require('./config.json');
const db = new Firestore(config.firestore);

// exports.init = async () => {
(async function init() {
  // YYYY-MM-DD
  const date = new Date().toISOString().split('T')[0];

  const html = await getBody(config.url).catch(console.error);
  const data = await getTableData(html).catch(console.error);
  const update = await updateDatabase(data, date).catch(console.error);

  console.log(`Updated ${update.length} documents`);
})();

async function getBody(url) {
  return fetch(url)
    .then(res => res.text())
    .catch(console.error);
}

async function getTableData(html) {
  const $ = cheerio.load(html);
  const tableHtml = $('div.col.col-md-5.offset-md-3').html();
  const json = tableToJson(tableHtml, ['name-lgl', 'count']);
  const cleanJson = json.filter(d => d['name-lgl'] !== 'Gesamtergebnis');

  return cleanJson;
}

async function updateDatabase(data, date) {
  const collection = db.collection(config.firestore.collectionId);
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
