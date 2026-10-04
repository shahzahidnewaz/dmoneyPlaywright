const { clean } = require('./clean');

module.exports = async () => {
  clean(undefined, ['output']);
};
