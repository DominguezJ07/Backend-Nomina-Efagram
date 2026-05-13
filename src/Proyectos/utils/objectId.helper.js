const mongoose = require('mongoose');

const getMongoId = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    return mongoose.Types.ObjectId.isValid(value) ? value : null;
  }

  if (typeof value === 'object') {
    const id = value._id || value.id || value.value || value.external_id;
    return mongoose.Types.ObjectId.isValid(id) ? String(id) : null;
  }

  return null;
};

const idsEqual = (a, b) => {
  const idA = getMongoId(a);
  const idB = getMongoId(b);

  if (!idA || !idB) return false;

  return String(idA) === String(idB);
};

module.exports = {
  getMongoId,
  idsEqual,
};