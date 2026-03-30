const Persona = require('../models/persona.model');
const Finca = require('../../Territorial/models/finca.model');
const Proceso = require('../../Catalogos/models/proceso.model');

class PersonaBulkService {
  normalizeString(value) {
    return String(value ?? '').trim();
  }

  normalizeUpper(value) {
    return this.normalizeString(value).toUpperCase();
  }

  normalizeDate(value) {
    const raw = this.normalizeString(value);
    if (!raw) return undefined;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T00:00:00`);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [dd, mm, yyyy] = raw.split('/');
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'INVALID_DATE';
    return parsed;
  }

  normalizeEstado(value) {
    const raw = this.normalizeUpper(value);
    if (!raw) return 'ACTIVO';

    if (['ACTIVO', 'INACTIVO', 'RETIRADO', 'SUSPENDIDO'].includes(raw)) {
      return raw;
    }

    return 'INVALID_ESTADO';
  }

  async validateFinca(fincaId) {
    const raw = this.normalizeString(fincaId);
    if (!raw) return null;

    const finca = await Finca.findById(raw);
    if (!finca) throw new Error('La finca no existe');
    return finca._id;
  }

  async validateProceso(procesoId) {
    const raw = this.normalizeString(procesoId);
    if (!raw) return null;

    const proceso = await Proceso.findById(raw);
    if (!proceso) throw new Error('El proceso no existe');
    return proceso._id;
  }

  async validateSupervisor(supervisorId) {
    const raw = this.normalizeString(supervisorId);
    if (!raw) return null;

    const supervisor = await Persona.findById(raw);
    if (!supervisor) throw new Error('El supervisor no existe');
    return supervisor._id;
  }

  buildFullName(first, second) {
    return [this.normalizeString(first), this.normalizeString(second)]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  async processRows(rows = []) {
    const result = {
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
        const operacion = this.normalizeUpper(row.operacion);
        const personaId = this.normalizeString(row.persona_id);
        const cedula = this.normalizeString(row.cedula);
        const primerNombre = this.normalizeString(row.primer_nombre);
        const segundoNombre = this.normalizeString(row.segundo_nombre);
        const primerApellido = this.normalizeString(row.primer_apellido);
        const segundoApellido = this.normalizeString(row.segundo_apellido);
        const cargo = this.normalizeString(row.cargo);
        const tipoContrato = this.normalizeUpper(row.tipo_contrato || 'OBRA_LABOR');
        const fechaIngreso = this.normalizeDate(row.fecha_ingreso);
        const estado = this.normalizeEstado(row.estado);

        if (!['CREAR', 'ACTUALIZAR'].includes(operacion)) {
          throw new Error('La operación debe ser CREAR o ACTUALIZAR');
        }

        if (!cedula) throw new Error('cedula es obligatoria');
        if (!primerNombre) throw new Error('primer_nombre es obligatorio');
        if (!primerApellido) throw new Error('primer_apellido es obligatorio');

        if (
          tipoContrato &&
          !['INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'APRENDIZ', 'TEMPORAL'].includes(tipoContrato)
        ) {
          throw new Error('tipo_contrato inválido');
        }

        if (fechaIngreso === 'INVALID_DATE') {
          throw new Error('fecha_ingreso inválida. Usa YYYY-MM-DD o DD/MM/YYYY');
        }

        if (estado === 'INVALID_ESTADO') {
          throw new Error('estado inválido');
        }

        const finca = await this.validateFinca(row.finca_id);
        const proceso = await this.validateProceso(row.proceso_id);
        const supervisor = await this.validateSupervisor(row.supervisor_id);

        const nombres = this.buildFullName(primerNombre, segundoNombre);
        const apellidos = this.buildFullName(primerApellido, segundoApellido);

        if (operacion === 'CREAR') {
          const existe = await Persona.findOne({ num_doc: cedula });
          if (existe) {
            throw new Error(`Ya existe una persona con documento ${cedula}`);
          }

          await Persona.create({
            tipo_doc: 'CC',
            num_doc: cedula,
            nombres,
            apellidos,
            cargo,
            tipo_contrato: tipoContrato,
            fecha_ingreso: fechaIngreso,
            estado,
            finca,
            proceso,
            supervisor,
          });

          result.creadas += 1;
        }

        if (operacion === 'ACTUALIZAR') {
          if (!personaId) {
            throw new Error('Para ACTUALIZAR debes enviar persona_id');
          }

          const persona = await Persona.findById(personaId);
          if (!persona) {
            throw new Error('La persona a actualizar no existe');
          }

          if (cedula !== persona.num_doc) {
            const existeOtra = await Persona.findOne({
              _id: { $ne: persona._id },
              num_doc: cedula,
            });
            if (existeOtra) {
              throw new Error(`Ya existe otra persona con documento ${cedula}`);
            }
          }

          persona.num_doc = cedula;
          persona.nombres = nombres;
          persona.apellidos = apellidos;
          persona.cargo = cargo;
          persona.tipo_contrato = tipoContrato;
          if (fechaIngreso) persona.fecha_ingreso = fechaIngreso;
          persona.estado = estado;
          persona.finca = finca;
          persona.proceso = proceso;
          persona.supervisor = supervisor;

          await persona.save();

          result.actualizadas += 1;
        }
      } catch (error) {
        result.rechazadas += 1;
        result.errores.push({
          rowNumber,
          message: error.message || 'Error desconocido',
        });
      }
    }

    return result;
  }
}

module.exports = new PersonaBulkService();