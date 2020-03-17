const config = require('./config.json');

const toDashcase = require('./to-dashcase');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { Firestore, FieldValue } = require('@google-cloud/firestore');

const db = new Firestore(config.firestore);

// exports.init = async () => {
(async function init() {
  const date = new Date();

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
  const tableHtml = $('table').parent().html();
  const json = await tableToJSON(tableHtml, ['name-lgl', 'count']);
  const cleanJson = json.filter(d => d['name-lgl'] !== 'Gesamtergebnis');

  return cleanJson;
}

async function tableToJSON(html, customHeader) {
  const $ = cheerio.load(html);
  const table = $('table');
  let headers = customHeader || [];
  let results = [];
  
  // Build headers
  $(table).find('tr').each((i, row) => {
    $(row).find('th').each((j, cell) => {
      headers[j] = headers[j] || $(cell).text().trim();
    });
  });

  // Process table
  $(table).find('tr').first().find('td').each((j, cell) => {
    headers[j] = $(cell).text().trim();
  });

  // Find rows
  $(table).find('tr').each((index, row) => {
    results[index] = {};
    $(row).find('td').each((i, cell) => {
      results[index][headers[i] || (i + 1)] = $(cell).text().trim();
    });
  });

  // Remove empty rows
  results = results.filter(t => Object.keys(t).length);
  
  return results;
}

async function updateDatabase(data, date) {
  const collection = db.collection(config.firestore.collectionId);
  let writeBatch = db.batch();

  data.forEach(d => {
    const doc = collection.doc(toDashcase(d['name-lgl']));
    d.cases = [];
    writeBatch.update(
      doc,
      'cases',
      FieldValue.arrayUnion({ count: d.count, date })
    );
  });

  return writeBatch.commit();
}
