const cheerio = require('cheerio');

module.exports = function tableToJson(html, customHeader) {
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
};
