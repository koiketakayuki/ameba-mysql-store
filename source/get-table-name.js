const getRootType = require('ameba-util').getRootType;

function getTableName(recordType) {
  return getRootType(recordType).replaceAll('.', '_');
}

module.exports = getTableName;
