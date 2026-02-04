require('dotenv').config();
const mongoose = require('mongoose');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');
const Novedad = require('../../Ejecucion/models/novedad.model');
const SemanaOperativa = require('../../ControlSemanal/models/semanaOperativa.model');
const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
const Proyecto = require('../../Proyectos/models/proyecto.model');
const ActividadCatalogo = require('../../Proyectos/models/actividadCatalogo.model');
const Lote = require('../../Territorial/models/lote.model');
const Finca = require('../../Territorial/models/finca.model');
const Nucleo = require('../../Territorial/models/nucleo.model');
const Zona = require('../../Territorial/models/zona.model');
const Persona = require('../../Personal/models/persona.model');
const Cuadrilla = require('../../Personal/models/cuadrilla.model');
const { DateTime } = require('luxon');
const logger = require('../../utils/logger');

const seedEjecucion = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });
    logger.success('Conectado a MongoDB');

    // Limpiar datos anteriores
    await Promise.all([
      RegistroDiario.deleteMany({}),
      Novedad.deleteMany({}),
      SemanaOperativa.deleteMany({})
    ]);
    logger.info('Datos anteriores de Ejecución eliminados');

    // ============================================
    // PASO 1: VERIFICAR DATOS EXISTENTES
    // ============================================
    logger.info('\n Verificando datos existentes...');

    const pals = await ProyectoActividadLote.find()
      .populate('proyecto')
      .populate('actividad');
      
    if (pals.length === 0) {
      logger.warn('  No hay PALs. Ejecute primero: npm run seed:proyectos');
      process.exit(0);
    }
    logger.success(` PALs encontrados: ${pals.length}`);

    const trabajadores = await Persona.find({ cargo: 'Trabajador de Campo' });
    if (trabajadores.length === 0) {
      logger.warn('  No hay trabajadores. Ejecute primero: npm run seed:personal');
      process.exit(0);
    }
    logger.success(` Trabajadores encontrados: ${trabajadores.length}`);

    const supervisores = await Persona.find({ cargo: 'Supervisor de Campo' });
    if (supervisores.length === 0) {
      logger.warn('  No hay supervisores. Ejecute primero: npm run seed:personal');
      process.exit(0);
    }
    logger.success(` Supervisores encontrados: ${supervisores.length}`);

    const cuadrillas = await Cuadrilla.find({ activa: true });
    logger.success(` Cuadrillas encontradas: ${cuadrillas.length}`);

    // ============================================
    // PASO 2: CREAR SEMANAS OPERATIVAS
    // ============================================
    logger.info('\n Creando semanas operativas...');

    // Semana 1: Hace 2 semanas (CERRADA)
    const hace2Semanas = DateTime.now().setZone('America/Bogota').minus({ weeks: 2 });
    let juevesInicio1 = hace2Semanas;
    while (juevesInicio1.weekday !== 4) {
      juevesInicio1 = juevesInicio1.minus({ days: 1 });
    }
    juevesInicio1 = juevesInicio1.startOf('day');
    const juevesFin1 = juevesInicio1.plus({ days: 6 }).endOf('day');

    const semana1 = await SemanaOperativa.create({
      codigo: `SEM-${juevesInicio1.year}-${String(juevesInicio1.weekNumber).padStart(2, '0')}`,
      fecha_inicio: juevesInicio1.toJSDate(),
      fecha_fin: juevesFin1.toJSDate(),
      año: juevesInicio1.year,
      numero_semana: juevesInicio1.weekNumber,
      estado: 'CERRADA',
      cerrada_por: supervisores[0]._id,
      fecha_cierre: juevesFin1.plus({ days: 1 }).toJSDate()
    });
    logger.success(` Semana creada: ${semana1.codigo} (CERRADA)`);

    // Semana 2: Semana pasada (CERRADA)
    const semanaPasada = DateTime.now().setZone('America/Bogota').minus({ weeks: 1 });
    let juevesInicio2 = semanaPasada;
    while (juevesInicio2.weekday !== 4) {
      juevesInicio2 = juevesInicio2.minus({ days: 1 });
    }
    juevesInicio2 = juevesInicio2.startOf('day');
    const juevesFin2 = juevesInicio2.plus({ days: 6 }).endOf('day');

    const semana2 = await SemanaOperativa.create({
      codigo: `SEM-${juevesInicio2.year}-${String(juevesInicio2.weekNumber).padStart(2, '0')}`,
      fecha_inicio: juevesInicio2.toJSDate(),
      fecha_fin: juevesFin2.toJSDate(),
      año: juevesInicio2.year,
      numero_semana: juevesInicio2.weekNumber,
      estado: 'CERRADA',
      cerrada_por: supervisores[0]._id,
      fecha_cierre: juevesFin2.plus({ days: 1 }).toJSDate()
    });
    logger.success(` Semana creada: ${semana2.codigo} (CERRADA)`);

    // Semana 3: Semana actual (ABIERTA)
    const ahora = DateTime.now().setZone('America/Bogota');
    let juevesInicio3 = ahora;
    while (juevesInicio3.weekday !== 4) {
      juevesInicio3 = juevesInicio3.minus({ days: 1 });
    }
    juevesInicio3 = juevesInicio3.startOf('day');
    const juevesFin3 = juevesInicio3.plus({ days: 6 }).endOf('day');

    const semana3 = await SemanaOperativa.create({
      codigo: `SEM-${juevesInicio3.year}-${String(juevesInicio3.weekNumber).padStart(2, '0')}`,
      fecha_inicio: juevesInicio3.toJSDate(),
      fecha_fin: juevesFin3.toJSDate(),
      año: juevesInicio3.year,
      numero_semana: juevesInicio3.weekNumber,
      estado: 'ABIERTA'
    });
    logger.success(` Semana creada: ${semana3.codigo} (ABIERTA - Actual)`);

    // ============================================
    // PASO 3: CREAR REGISTROS DIARIOS
    // ============================================
    logger.info('\n Creando registros diarios...');

    const registrosCreados = [];

    // Función para crear registros de una semana
    const crearRegistrosSemana = async (fechaInicio, fechaFin, pal, trabajadoresGrupo, supervisor, cuadrilla) => {
      let fecha = DateTime.fromJSDate(fechaInicio).setZone('America/Bogota');
      const fin = DateTime.fromJSDate(fechaFin).setZone('America/Bogota');

      while (fecha <= fin) {
        // Solo días laborables (lunes a sábado)
        if (fecha.weekday <= 6) {
          for (const trabajador of trabajadoresGrupo) {
            try {
              const fechaStr = fecha.toFormat('yyyyMMdd');
              const codigo = `RD-${fechaStr}-${String(registrosCreados.length + 1).padStart(4, '0')}`;

              // Generar cantidad según unidad de medida
              let cantidad;
              if (pal.actividad?.unidad_medida === 'HECTAREA') {
                // Para hectáreas: entre 0.1 y 0.5 hectáreas por día
                cantidad = parseFloat((Math.random() * 0.4 + 0.1).toFixed(2));
              } else if (pal.actividad?.unidad_medida === 'ARBOL') {
                // Para árboles: entre 50 y 150 árboles por día
                cantidad = Math.floor(Math.random() * 100) + 50;
              } else {
                // Otras unidades: cantidad aleatoria pequeña
                cantidad = parseFloat((Math.random() * 10 + 5).toFixed(2));
              }

              const registro = await RegistroDiario.create({
                codigo,
                fecha: fecha.toJSDate(),
                trabajador: trabajador._id,
                proyecto_actividad_lote: pal._id,
                cuadrilla: cuadrilla?._id,
                cantidad_ejecutada: cantidad,
                horas_trabajadas: 8,
                hora_inicio: '07:00',
                hora_fin: '17:00',
                registrado_por: supervisor._id,
                estado: 'APROBADO'
              });

              registrosCreados.push(registro);
            } catch (error) {
              // Ignorar duplicados
              if (!error.message.includes('Ya existe un registro')) {
                throw error;
              }
            }
          }
        }
        fecha = fecha.plus({ days: 1 });
      }
    };

    // Registros para PAL-2024-001 (EN_EJECUCION) - Semana actual
    const pal1 = pals.find(p => p.codigo === 'PAL-2024-001');
    if (pal1 && cuadrillas.length > 0) {
      const trabajadoresGrupo1 = trabajadores.slice(0, 3);
      await crearRegistrosSemana(
        semana3.fecha_inicio,
        ahora.toJSDate(),
        pal1,
        trabajadoresGrupo1,
        supervisores[0],
        cuadrillas[0]
      );
      logger.success(` Registros creados para PAL ${pal1.codigo} (semana actual)`);
    }

    // Registros para PAL-2024-004 (EN_EJECUCION) - Semana actual
    const pal4 = pals.find(p => p.codigo === 'PAL-2024-004');
    if (pal4 && cuadrillas.length > 1) {
      const trabajadoresGrupo2 = trabajadores.slice(5, 8);
      await crearRegistrosSemana(
        semana3.fecha_inicio,
        ahora.toJSDate(),
        pal4,
        trabajadoresGrupo2,
        supervisores.length > 1 ? supervisores[1] : supervisores[0],
        cuadrillas[1] || cuadrillas[0]
      );
      logger.success(` Registros creados para PAL ${pal4.codigo} (semana actual)`);
    }

    // Registros para semana pasada (PAL completado)
    const pal2 = pals.find(p => p.codigo === 'PAL-2024-002');
    if (pal2 && cuadrillas.length > 0) {
      const trabajadoresGrupo3 = trabajadores.slice(0, 5);
      await crearRegistrosSemana(
        semana2.fecha_inicio,
        semana2.fecha_fin,
        pal2,
        trabajadoresGrupo3,
        supervisores[0],
        cuadrillas[0]
      );
      logger.success(` Registros creados para PAL ${pal2.codigo} (semana pasada)`);
    }

    logger.success(` Total registros diarios creados: ${registrosCreados.length}`);

    // ============================================
    // PASO 4: ACTUALIZAR CANTIDADES DE PALs
    // ============================================
    // ============================================
// PASO 4: ACTUALIZAR CANTIDADES DE PALs
// ============================================
logger.info('\n Actualizando cantidades ejecutadas de PALs...');

for (const pal of pals) {
  const registros = await RegistroDiario.find({
    proyecto_actividad_lote: pal._id,
    estado: { $in: ['APROBADO', 'CORREGIDO'] }
  });

  const totalEjecutado = registros.reduce((sum, reg) => sum + reg.cantidad_ejecutada, 0);

  pal.cantidad_ejecutada = totalEjecutado;

  // Actualizar estado solo si no está ya CUMPLIDA
  if (pal.estado !== 'CUMPLIDA') {
    if (totalEjecutado >= pal.meta_minima) {
      pal.estado = 'CUMPLIDA';
      pal.fecha_fin_real = new Date();
    } else if (totalEjecutado > 0 && pal.estado === 'PENDIENTE') {
      pal.estado = 'EN_EJECUCION';
      pal.fecha_inicio_real = pal.fecha_inicio_real || new Date();
    }
  }

  await pal.save();
  logger.success(` PAL ${pal.codigo}: ${totalEjecutado.toFixed(2)}/${pal.meta_minima} (${pal.porcentajeAvance}%) - ${pal.estado}`);
}

    // ============================================
    // PASO 5: CREAR NOVEDADES 
    // ============================================
    logger.info('\n Creando novedades...');

    // Novedad 1: Permiso aprobado
    const novedad1 = await Novedad.create({
      codigo: 'NOV-20240125-0001',
      fecha: semana3.fecha_inicio,
      trabajador: trabajadores[2]._id,
      tipo: 'PERMISO',
      afecta_nomina: true,
      descripcion: 'Permiso médico por cita odontológica',
      dias: 0.5, 
      registrado_por: supervisores[0]._id,
      requiere_aprobacion: true,
      aprobado: true,
      aprobado_por: supervisores[0]._id,
      fecha_aprobacion: semana3.fecha_inicio,
      estado: 'APROBADA'
    });
    logger.success(` Novedad creada: ${novedad1.codigo} (PERMISO - Aprobada)`);

    // Novedad 2: Incapacidad
    const novedad2 = await Novedad.create({
      codigo: 'NOV-20240122-0002',
      fecha: DateTime.fromJSDate(semana2.fecha_inicio).plus({ days: 2 }).toJSDate(),
      trabajador: trabajadores[5]._id,
      tipo: 'INCAPACIDAD',
      afecta_nomina: true,
      descripcion: 'Incapacidad médica por gripe',
      dias: 2,
      fecha_inicio: DateTime.fromJSDate(semana2.fecha_inicio).plus({ days: 2 }).toJSDate(),
      fecha_fin: DateTime.fromJSDate(semana2.fecha_inicio).plus({ days: 3 }).toJSDate(),
      documento_soporte: 'INC-2024-001.pdf',
      registrado_por: supervisores[0]._id,
      requiere_aprobacion: false,
      estado: 'APROBADA'
    });
    logger.success(` Novedad creada: ${novedad2.codigo} (INCAPACIDAD)`);

    // Novedad 3: Ausencia pendiente
    const novedad3 = await Novedad.create({
      codigo: `NOV-${DateTime.now().toFormat('yyyyMMdd')}-0003`,
      fecha: ahora.toJSDate(),
      trabajador: trabajadores[7]._id,
      tipo: 'AUSENCIA',
      afecta_nomina: true,
      descripcion: 'No se presentó a trabajar sin justificación',
      dias: 1,
      registrado_por: supervisores[0]._id,
      requiere_aprobacion: true,
      estado: 'PENDIENTE'
    });
    logger.success(` Novedad creada: ${novedad3.codigo} (AUSENCIA - Pendiente)`);

    // ============================================
    // RESUMEN
    // ============================================
    logger.success('\n Seeding de Ejecución completado exitosamente');
    logger.info('\n RESUMEN:');
    logger.info('');
    logger.info(` Semanas operativas: 3 (2 cerradas, 1 abierta)`);
    logger.info(` Registros diarios: ${registrosCreados.length}`);
    logger.info(` Novedades: 3 (1 permiso, 1 incapacidad, 1 ausencia)`);
    logger.info('\n');

    logger.info(' SEMANAS CREADAS:');
    logger.info(`   ${semana1.codigo}: ${DateTime.fromJSDate(semana1.fecha_inicio).toFormat('dd/MM/yyyy')} - ${DateTime.fromJSDate(semana1.fecha_fin).toFormat('dd/MM/yyyy')} [CERRADA]`);
    logger.info(`   ${semana2.codigo}: ${DateTime.fromJSDate(semana2.fecha_inicio).toFormat('dd/MM/yyyy')} - ${DateTime.fromJSDate(semana2.fecha_fin).toFormat('dd/MM/yyyy')} [CERRADA]`);
    logger.info(`   ${semana3.codigo}: ${DateTime.fromJSDate(semana3.fecha_inicio).toFormat('dd/MM/yyyy')} - ${DateTime.fromJSDate(semana3.fecha_fin).toFormat('dd/MM/yyyy')} [ABIERTA - ACTUAL]`);
    logger.info('\n');

    logger.info(' ESTADO DE PALs ACTUALIZADO:');
    for (const pal of pals) {
      logger.info(`   ${pal.codigo}: ${pal.porcentajeAvance}% completado - Estado: ${pal.estado}`);
    }
    logger.info('\n');

    process.exit(0);
  } catch (error) {
    logger.error('Error en seeding de Ejecución:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Ejecutar seeder
seedEjecucion();