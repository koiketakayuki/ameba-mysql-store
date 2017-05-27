/**
 * Wrap SQL result thunk(which returns Promise[Integer]) with one transaction
 *
 * @param connection
 * @return function[thunk => promise[uid]]
 */
function withTransaction(connection) {
  return thunk =>
    new Promise((success, failure) => {
      const rollback = (e) => {
        connection.rollback();
        failure(e);
      };
      connection.beginTransaction((err) => {
        if (err) {
          rollback(err);
        }

        return thunk()
                .then((value) => {
                  connection.commit();
                  success(value);
                })
                .catch(e => rollback(e));
      });
    });
}

module.exports = withTransaction;
