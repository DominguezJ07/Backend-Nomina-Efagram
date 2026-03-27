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

  normalizeEmail(value) {
    const email = this.normalizeString(value).toLowerCase();
    return email || undefined;
  }

  normalizeNumberString(value) {
    const raw = this.normalizeString(value);
    return raw || undefined;
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

  normalizeBooleanEstado(value) {
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
        const tipo_doc = this.normalizeUpper(row.tipo_doc || 'CC');
        const num_doc = this.normalizeString(row.num_doc);
        const nombres = this.normalizeString(row.nombres);
        const apellidos = this.normalizeString(row.apellidos);
        const telefono = this.normalizeString(row.telefono);
        const email = this.normalizeEmail(row.email);
        const direccion = this.normalizeString(row.direccion);
        const fecha_ingreso = this.normalizeDate(row.fecha_ingreso);
        const tipo_contrato = this.normalizeUpper(row.tipo_contrato || 'OBRA_LABOR');
        const cargo = this.normalizeString(row.cargo);
        const banco = this.normalizeString(row.banco);
        const tipo_cuenta = this.normalizeUpper(row.tipo_cuenta || 'AHORROS');
        const numero_cuenta = this.normalizeNumberString(row.numero_cuenta);
        const eps = this.normalizeString(row.eps);
        const arl = this.normalizeString(row.arl);
        const fondo_pension = this.normalizeString(row.fondo_pension);
        const estado = this.normalizeBooleanEstado(row.estado);
        const observaciones = this.normalizeString(row.observaciones);

        if (!['CREAR', 'ACTUALIZAR'].includes(operacion)) {
          throw new Error('La operación debe ser CREAR o ACTUALIZAR');
        }

        if (!['CC', 'CE', 'TI', 'PA'].includes(tipo_doc)) {
          throw new Error('tipo_doc inválido');
        }

        if (!num_doc) throw new Error('num_doc es obligatorio');
        if (!nombres) throw new Error('nombres es obligatorio');
        if (!apellidos) throw new Error('apellidos es obligatorio');

        if (
          tipo_contrato &&
          !['INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'APRENDIZ', 'TEMPORAL'].includes(tipo_contrato)
        ) {
          throw new Error('tipo_contrato inválido');
        }

        if (tipo_cuenta && !['AHORROS', 'CORRIENTE'].includes(tipo_cuenta)) {
          throw new Error('tipo_cuenta inválido');
        }

        if (fecha_ingreso === 'INVALID_DATE') {
          throw new Error('fecha_ingreso inválida. Usa YYYY-MM-DD o DD/MM/YYYY');
        }

        if (estado === 'INVALID_ESTADO') {
          throw new Error('estado inválido');
        }

        const finca = await this.validateFinca(row.finca_id);
        const proceso = await this.validateProceso(row.proceso_id);
        const supervisor = await this.validateSupervisor(row.supervisor_id);

        if (operacion === 'CREAR') {
          const existe = await Persona.findOne({ num_doc });
          if (existe) {
            throw new Error(`Ya existe una persona con documento ${num_doc}`);
          }

          await Persona.create({
            tipo_doc,
            num_doc,
            nombres,
            apellidos,
            telefono,
            email,
            direccion,
            fecha_ingreso,
            tipo_contrato,
            cargo,
            banco,
            tipo_cuenta,
            numero_cuenta,
            eps,
            arl,
            fondo_pension,
            finca,
            proceso,
            supervisor,
            estado,
            observaciones,
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

          if (num_doc !== persona.num_doc) {
            const existeOtra = await Persona.findOne({
              _id: { $ne: persona._id },
              num_doc,
            });
            if (existeOtra) {
              throw new Error(`Ya existe otra persona con documento ${num_doc}`);
            }
          }

          persona.tipo_doc = tipo_doc;
          persona.num_doc = num_doc;
          persona.nombres = nombres;
          persona.apellidos = apellidos;
          persona.telefono = telefono;
          persona.email = email;
          persona.direccion = direccion;
          if (fecha_ingreso) persona.fecha_ingreso = fecha_ingreso;
          persona.tipo_contrato = tipo_contrato;
          persona.cargo = cargo;
          persona.banco = banco;
          persona.tipo_cuenta = tipo_cuenta;
          persona.numero_cuenta = numero_cuenta;
          persona.eps = eps;
          persona.arl = arl;
          persona.fondo_pension = fondo_pension;
          persona.finca = finca;
          persona.proceso = proceso;
          persona.supervisor = supervisor;
          persona.estado = estado;
          persona.observaciones = observaciones;

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