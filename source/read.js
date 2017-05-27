const createSelectQuery = require('./create-select-query');
const buildRecords = require('./build-records');

module.exports = (connection) => {
  function read(recordType, condition, option) {
    const query = createSelectQuery(recordType, condition, option);

    return new Promise((success, failure) => {
      connection.query(query, (err, results) => {
        if (err) {
          failure(results);
        } else {
          success(buildRecords(recordType, results));
        }
      });
    });
  }

  return read;
};
