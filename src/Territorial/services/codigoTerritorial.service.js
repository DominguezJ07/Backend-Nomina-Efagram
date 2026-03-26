const Zona = require('../models/zona.model');
const Nucleo = require('../models/nucleo.model');
const Finca = require('../models/finca.model');

const pad2 = (value) => String(value).padStart(2, '0');

const extractNumericCode = (value) => {
  if (value === null || value === undefined) return 0;
  const match = String(value).match(/\d+/g);
  if (!match) return 0;
  return Number(match.join('')) || 0;
};

const getNextZonaCodigo = async () => {
  const zonas = await Zona.find({}, { codigo: 1 }).lean();

  const maxCodigo = zonas.reduce((max, zona) => {
    const codigo = Number(zona.codigo) || 0;
    return codigo > max ? codigo : max;
  }, 0);

  const next = maxCodigo + 1;

  if (next > 99) {
    throw new Error('Se alcanzó el máximo de códigos para zonas');
  }

  return {
    raw: next,
    formatted: pad2(next),
  };
};

const getNextNucleoCodigo = async (zonaId) => {
  const nucleos = await Nucleo.find({ zona: zonaId }, { codigo: 1 }).lean();

  const maxCodigo = nucleos.reduce((max, nucleo) => {
    const codigo = extractNumericCode(nucleo.codigo);
    return codigo > max ? codigo : max;
  }, 0);

  const next = maxCodigo + 1;

  if (next > 99) {
    throw new Error('Se alcanzó el máximo de códigos para núcleos en esta zona');
  }

  return {
    raw: pad2(next),
    formatted: pad2(next),
  };
};

const getNextFincaCodigo = async (nucleoId) => {
  const fincas = await Finca.find({ nucleo: nucleoId }, { codigo: 1 }).lean();

  const maxCodigo = fincas.reduce((max, finca) => {
    const codigo = extractNumericCode(finca.codigo);
    return codigo > max ? codigo : max;
  }, 0);

  const next = maxCodigo + 1;

  if (next > 99) {
    throw new Error('Se alcanzó el máximo de códigos para fincas en este núcleo');
  }

  return {
    raw: pad2(next),
    formatted: pad2(next),
  };
};

module.exports = {
  getNextZonaCodigo,
  getNextNucleoCodigo,
  getNextFincaCodigo,
};