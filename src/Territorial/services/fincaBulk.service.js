const Finca = require('../models/finca.model');
const Nucleo = require('../models/nucleo.model');
const codigoTerritorialService = require('./codigoTerritorial.service');

class FincaBulkService {
  normalizeBoolean(value, defaultValue = true) {
    if (typeof value === 'boolean') return value;

    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (['true', '1', 'si', 'sí', 'yes'].includes(v)) return true;
      if (['false', '0', 'no'].includes(v)) return false;
    }

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }

    return defaultValue;
  }

  normalizeOperacion(value) {
    return String(value || '').trim().toUpperCase();
  }

  normalizeCodigo(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    return raw.padStart(2, '0').toUpperCase();
  }

  normalizeNombre(value) {
    return String(value ?? '').trim();
  }

  normalizeNumber(value) {
    if (value === null || value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? NaN : n;
  }

  async validateNucleo(nucleoId) {
    if (!nucleoId) {
      throw new Error('El nucleo_id es obligatorio');
    }

    const nucleo = await Nucleo.findById(nucleoId).populate('zona');
    if (!nucleo) {
      throw new Error('El núcleo no existe');
    }

    return nucleo;
  }

  async processRows(rows = []) {
    const resultado = {
      total: rows.length,
      creadas: 0,
      actualizadas: 0,
      rechazadas: 0,
      errores: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = Number(row.rowNumber || i + 2);

      try {
        const operacion = this.normalizeOperacion(row.operacion);
        const fincaId = String(row.finca_id || '').trim();
        const fincaNombre = this.normalizeNombre(row.finca_nombre);
        const nucleoId = String(row.nucleo_id || '').trim();
        let fincaCodigo = this.normalizeCodigo(row.finca_codigo);
        const activa = this.normalizeBoolean(row.activa, true);
        const descripcion = String(row.descripcion || '').trim();
        const areaTotal = this.normalizeNumber(row.area_total);

        if (!operacion || !['CREAR', 'ACTUALIZAR'].includes(operacion)) {
          throw new Error('La operación debe ser CREAR o ACTUALIZAR');
        }

        if (!fincaNombre) {
          throw new Error('El nombre de la finca es obligatorio');
        }

        const nucleo = await this.validateNucleo(nucleoId);

        if (areaTotal !== undefined && Number.isNaN(areaTotal)) {
          throw new Error('El área total debe ser numérica');
        }

        if (operacion === 'CREAR') {
          if (!fincaCodigo) {
            const next = await codigoTerritorialService.getNextFincaCodigo(nucleo._id);
            fincaCodigo = next.raw;
          }

          const existe = await Finca.findOne({
            nucleo: nucleo._id,
            codigo: fincaCodigo,
          });

          if (existe) {
            throw new Error(`Ya existe una finca con código ${fincaCodigo} en ese núcleo`);
          }

          await Finca.create({
            codigo: fincaCodigo,
            nombre: fincaNombre,
            nucleo: nucleo._id,
            activa,
            descripcion,
            area_total: areaTotal,
          });

          resultado.creadas += 1;
        }

        if (operacion === 'ACTUALIZAR') {
          if (!fincaId) {
            throw new Error('Para ACTUALIZAR debes enviar finca_id');
          }

          const finca = await Finca.findById(fincaId);
          if (!finca) {
            throw new Error('La finca a actualizar no existe');
          }

          if (!fincaCodigo) {
            fincaCodigo = finca.codigo;
          }

          const existeOtra = await Finca.findOne({
            _id: { $ne: finca._id },
            nucleo: nucleo._id,
            codigo: fincaCodigo,
          });

          if (existeOtra) {
            throw new Error(`Ya existe otra finca con código ${fincaCodigo} en ese núcleo`);
          }

          finca.codigo = fincaCodigo;
          finca.nombre = fincaNombre;
          finca.nucleo = nucleo._id;
          finca.activa = activa;
          finca.descripcion = descripcion;
          finca.area_total = areaTotal;

          await finca.save();

          resultado.actualizadas += 1;
        }
      } catch (error) {
        resultado.rechazadas += 1;
        resultado.errores.push({
          rowNumber,
          message: error.message || 'Error desconocido',
        });
      }
    }

    return resultado;
  }
}

module.exports = new FincaBulkService();