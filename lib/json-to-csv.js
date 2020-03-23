module.exports = function jsonToCsv(data) {
  const replaceEmpty = (key, value) => {
    return value === null ? '' : value;
  };

  const parseRow = row => {
    return header.map(fieldName =>
      JSON.stringify(row[fieldName], replaceEmpty)
    ).join(',');
  };

  const header = Object.keys(data[0] || []);
  const rows = data.map(parseRow);
  const rowsWithHeader = [header.join(','), ...rows];
  const csv = rowsWithHeader.join('\r\n');
  
  return csv;
};
