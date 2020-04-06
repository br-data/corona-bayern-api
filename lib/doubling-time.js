module.exports = function doublingTime(date1, value1, date2, value2) {
  const diff = Math.ceil(date2.getTime() - date1.getTime()) / 86400000;
  const days = (Math.log(2) * diff) / (Math.log(value2) - Math.log(value1));

  return days;
};
