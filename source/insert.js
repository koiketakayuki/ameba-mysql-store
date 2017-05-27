const Util = require('ameba-util');
const save = require('./save');
const getTableName = require('./get-table-name');
const withTransaction = require('./with-transaction');

const getForeignTypeFields = Util.getForeignTypeFields;

module.exports = (connection) => {
  /**
   * Insert record of the specified type
   * and return the promise waiting uid of the inserted record.
   *
   * @param recordType Object
   * @param record Object
   * @param isTransactionStarted
   * @return Promise[Integer] uid promise
   */
  function insert(recordType, record, isTransactionStarted) {
    if (!isTransactionStarted) {
      return withTransaction(connection)(() => insert(recordType, record, true));
    }

    /* only value-existing fields */
    const foreignTypeFields = getForeignTypeFields(recordType).filter(f => !!record[f.id]);

    /* save outer type records */
    const foreignTypeIdsPromise =
      Promise.all(foreignTypeFields
        .map(f => save(connection)(f.fieldType, record[f.id], true)));

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
