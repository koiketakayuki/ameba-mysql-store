const Util = require('ameba-util');
const getTableName = require('./get-table-name');
const withTransaction = require('./with-transaction');

const isArray = Util.isArray;
const getForeignTypeFields = Util.getForeignTypeFields;

module.exports = (connection) => {
  /**
   * Insert record of the specified type
   * and return the promise waiting uid of the inserted record.
   *
   * @param recordType Object
   * @param record Object|Array
   * @param isTransactionStarted
   * @return Promise[Integer] uid promise
   */
  function insert(recordType, record, isTransactionStarted) {
    if (isArray(record)) {
      return withTransaction(() => Promise.all(record.map(r => insert(recordType, r, true))));
    }

    if (record.uid) {
      return Promise.resolve(record.uid);
    }

    /* only value-existing fields */
    const foreignTypeFields = getForeignTypeFields(recordType).filter(f => !!record[f.id]);
    const hasForeignTypeQuery = foreignTypeFields.length > 0;

    /* if it contains outer type query */
    if (hasForeignTypeQuery && !isTransactionStarted) {
      return withTransaction(connection)(() => insert(recordType, record, true));
    }

    /* save outer type records */
    const foreignTypeIdsPromise =
      Promise.all(foreignTypeFields
        .map(f => insert(f.fieldType, record[f.id], true)));

    const replaceForeignTypeValuesWithIds = (originalRecord, foreignTypeIds) => {
      const result = Object.assign({}, originalRecord);
      foreignTypeFields.forEach((f, index) => {
        result[f.id] = foreignTypeIds[index];
      });

      return result;
    };

    return new Promise((success, failure) =>
      foreignTypeIdsPromise
        .then(foreignTypeIds => replaceForeignTypeValuesWithIds(record, foreignTypeIds))
        .then((insertRecord) => {
          const tableName = getTableName(recordType);
          connection.query(`INSERT INTO ${tableName} VALUES ?`, insertRecord, (err, result) => {
            if (err) {
              failure(err);
            } else {
              success(result.insetId);
            }
          });
        }));
  }

  return insert;
};
