const config = require('./config.json');

const fetch = require('node-fetch');
const cheerio = require('cheerio');
// const { BigQuery } = require('@google-cloud/bigquery');

// const bigquery = new BigQuery({
//   projectId: config.projectId
// });

const html = getBody(config.url).catch(console.error);
const data = getTableData(html).catch(console.error);
console.log(data.then(console.log));

// console.log(`Creating table ${config.bigQuery.tableId} in dataset ${config.bigQuery.datasetId}`);

// await createBigQueryDataset();
// await createBigQueryTable();

async function getBody(url) {
  return fetch(url)
    .then(res => res.text())
    .catch(console.error);
}

async function getTableData(html) {
  const $ = cheerio.load(await html);
  const tableHtml = $('table').parent().html();
  const json = tableToJSON(tableHtml);

  return json;
}

async function tableToJSON(html) {
  const $ = cheerio.load(await html);
  const table = $('table');
  let headers = [];
  let results = [];
  
  // Build headers
  $(table).find('tr').each((i, row) => {
    $(row).find('th').each((j, cell) => {
      headers[j] = $(cell).text().trim();
    });
  });

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
