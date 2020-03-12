const config = require('./config.json');

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const tableToJSON = require('html-table-to-json');
// const { BigQuery } = require('@google-cloud/bigquery');

// const bigquery = new BigQuery({
//   projectId: config.projectId
// });

const html = getBody(config.url);
const table = getTable(html);

// console.log(`Creating table ${config.bigQuery.tableId} in dataset ${config.bigQuery.datasetId}`);

// await createBigQueryDataset();
// await createBigQueryTable();

async function getBody(url) {
  return fetch(url)
    .then(res => res.text())
    .catch(err => console.error(err));
}

async function getTable(html) {
  const dom = new JSDOM(await html);
  const table = dom.window.document.querySelectorAll('table')[0];
  const json = tableToJSON.parse(table.outerHTML);
  console.log(json.results[0]);
  return json;
}
