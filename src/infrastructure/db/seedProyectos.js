require('dotenv').config();
const mongoose = require('mongoose');
const Cliente = require('../../Proyectos/models/cliente.model');
const Proyecto = require('../../Proyectos/models/proyecto.model');
const ProyectoLote = require('../../Proyectos/models/proyectoLote.model');
const ActividadCatalogo = require('../../Proyectos/models/actividadCatalogo.model');
const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
const PrecioBaseActividad = require('../../Proyectos/models/precioBaseActividad.model');
const PrecioNegociado = require('../../Proyectos/models/precioNegociado.model');
const Lote = require('../../Territorial/models/lote.model');
const Finca = require('../../Territorial/models/finca.model');
const Nucleo = require('../../Territorial/models/nucleo.model');
const Zona = require('../../Territorial/models/zona.model');
const Persona = require('../../Personal/models/persona.model');
const { ESTADOS_PROYECTO, ESTADOS_PAL, TIPOS_CONTRATO, UNIDADES_MEDIDA } = require('../../config/constants');
const logger = require('../../utils/logger');

const seedProyectos = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });
    logger.success('Conectado a MongoDB');

    // Limpiar datos anteriores
    await Promise.all([
      PrecioNegociado.deleteMany({}),
      PrecioBaseActividad.deleteMany({}),
      ProyectoActividadLote.deleteMany({}),
      ProyectoLote.deleteMany({}),
      ActividadCatalogo.deleteMany({}),
      Proyecto.deleteMany({}),
      Cliente.deleteMany({})
    ]);
    logger.info('Datos anteriores de Proyectos eliminados');

    // ============================================
    // PASO 1: VERIFICAR DATOS TERRITORIALES
    // ============================================
    logger.info('\nVerificando datos territoriales...');

    const lotes = await Lote.find().populate('finca');
    if (lotes.length === 0) {
      logger.warn('No hay lotes. Ejecute primero: npm run seed');
      process.exit(0);
    }
    logger.success('Lotes encontrados: ' + lotes.length);

    // Verificar personas
    const supervisores = await Persona.find({ cargo: 'Supervisor de Campo' });
    const jefeOperaciones = await Persona.findOne({ cargo: 'Jefe de Operaciones' });

    if (supervisores.length === 0 || !jefeOperaciones) {
      logger.warn('No hay supervisores o jefe. Ejecute: npm run seed:personal');
      process.exit(0);
    }

    // ============================================
    // PASO 2: CREAR CLIENTE
    // ============================================
    logger.info('\nCreando clientes...');

    const smurfit = await Cliente.create({
      codigo: 'CLI-001',
      nit: '890900608-1',
      razon_social: 'Smurfit Kappa Colombia S.A.',
      nombre_comercial: 'Smurfit Kappa',
      telefono: '3012345678',
      email: 'contacto@smurfitkappa.com',
      direccion: 'Calle 100 #19-54',
      ciudad: 'Bogotá',
      contacto_nombre: 'Juan Pérez',
      contacto_telefono: '3109876543',
      contacto_email: 'juan.perez@smurfitkappa.com',
      activo: true
    });
    logger.success('Cliente creado: ' + smurfit.razon_social);

    const clienteGeneral = await Cliente.create({
      codigo: 'CLI-002',
      nit: '900123456-7',
      razon_social: 'Reforestadora del Cauca S.A.S.',
      nombre_comercial: 'Reforestadora Cauca',
      telefono: '3187654321',
      email: 'info@reforestadoracauca.com',
      direccion: 'Carrera 5 #10-20',
      ciudad: 'Popayán',
      activo: true
    });
    logger.success('Cliente creado: ' + clienteGeneral.razon_social);

    // ============================================
    // PASO 3: CREAR ACTIVIDADES DEL CATÁLOGO
    // ============================================
    logger.info('\nCreando actividades del catálogo...');

    const actividadesData = [
      {
        codigo: 'RMMACH',
        nombre: 'Repique Manual con Machete',
        descripcion: 'Control de maleza con machete',
        categoria: 'CONTROL_MALEZA',
        unidad_medida: UNIDADES_MEDIDA.HECTAREA,
        rendimiento_diario_estimado: 0.5,
        activa: true
      },
      {
        codigo: 'PLAM',
        nombre: 'Plantación Manual',
        descripcion: 'Plantación manual de árboles',
        categoria: 'SIEMBRA',
        unidad_medida: UNIDADES_MEDIDA.ARBOL,
        rendimiento_diario_estimado: 300,
        activa: true
      },
      {
        codigo: 'FERT-BASE',
        nombre: 'Fertilización Base',
        descripcion: 'Aplicación de fertilizante base',
        categoria: 'FERTILIZACION',
        unidad_medida: UNIDADES_MEDIDA.ARBOL,
        rendimiento_diario_estimado: 400,
        activa: true
      },
      {
        codigo: 'PODA-FORM',
        nombre: 'Poda de Formación',
        descripcion: 'Poda para dar forma al árbol',
        categoria: 'PODAS',
        unidad_medida: UNIDADES_MEDIDA.ARBOL,
        rendimiento_diario_estimado: 250,
        activa: true
      },
      {
        codigo: 'PREP-TERR',
        nombre: 'Preparación de Terreno',
        descripcion: 'Limpieza y preparación del terreno',
        categoria: 'PREPARACION_TERRENO',
        unidad_medida: UNIDADES_MEDIDA.HECTAREA,
        rendimiento_diario_estimado: 0.3,
        activa: true
      },
      {
        codigo: 'MANT-GEN',
        nombre: 'Mantenimiento General',
        descripcion: 'Mantenimiento general de plantación',
        categoria: 'MANTENIMIENTO',
        unidad_medida: UNIDADES_MEDIDA.HECTAREA,
        rendimiento_diario_estimado: 1.0,
        activa: true
      }
    ];

    const actividades = {};
    for (const actData of actividadesData) {
      const actividad = await ActividadCatalogo.create(actData);
      actividades[actividad.codigo] = actividad;
      logger.success('Actividad creada: ' + actividad.codigo + ' - ' + actividad.nombre);
    }

    // ============================================
    // PASO 4: CREAR PRECIOS BASE
    // ============================================
    logger.info('\nCreando precios base...');

    const preciosBaseData = [
      {
        actividad: actividades['RMMACH']._id,
        cliente: smurfit._id,
        precio_cliente: 800000, // Precio inmutable para Smurfit
        precio_base_trabajador: 600000,
        fecha_vigencia_desde: new Date('2024-01-01'),
        activo: true,
        observaciones: 'Precio base para Smurfit Kappa - INMUTABLE'
      },
      {
        actividad: actividades['PLAM']._id,
        cliente: smurfit._id,
        precio_cliente: 180,
        precio_base_trabajador: 140,
        fecha_vigencia_desde: new Date('2024-01-01'),
        activo: true
      },
      {
        actividad: actividades['FERT-BASE']._id,
        cliente: smurfit._id,
        precio_cliente: 120,
        precio_base_trabajador: 90,
        fecha_vigencia_desde: new Date('2024-01-01'),
        activo: true
      },
      {
        actividad: actividades['PODA-FORM']._id,
        cliente: smurfit._id,
        precio_cliente: 200,
        precio_base_trabajador: 150,
        fecha_vigencia_desde: new Date('2024-01-01'),
        activo: true
      }
    ];

    const preciosBase = [];
    for (const precioData of preciosBaseData) {
      const precio = await PrecioBaseActividad.create(precioData);
      preciosBase.push(precio);
      const margen = precio.calcularMargen();
      logger.success('Precio base creado - Margen: ' + margen.toFixed(2) + '%');
    }

    // ============================================
    // PASO 5: CREAR PROYECTOS
    // ============================================
    logger.info('\nCreando proyectos...');

    const proyecto1 = await Proyecto.create({
      codigo: 'PROY-2024-001',
      nombre: 'Reforestación Zona Centro 2024',
      descripcion: 'Proyecto de reforestación para Smurfit Kappa en la zona centro',
      cliente: smurfit._id,
      fecha_inicio: new Date('2024-01-15'),
      fecha_fin_estimada: new Date('2024-12-31'),
      tipo_contrato: TIPOS_CONTRATO.FIJO_TODO_COSTO,
      valor_contrato: 50000000,
      estado: ESTADOS_PROYECTO.ACTIVO,
      responsable: jefeOperaciones._id,
      observaciones: 'Proyecto principal de la zona centro'
    });
    await proyecto1.populate(['cliente', 'responsable']);
    logger.success('Proyecto creado: ' + proyecto1.codigo + ' - ' + proyecto1.nombre);

    const proyecto2 = await Proyecto.create({
      codigo: 'PROY-2024-002',
      nombre: 'Mantenimiento Fincas Existentes',
      descripcion: 'Mantenimiento de plantaciones existentes',
      cliente: smurfit._id,
      fecha_inicio: new Date('2024-02-01'),
      fecha_fin_estimada: new Date('2024-06-30'),
      tipo_contrato: TIPOS_CONTRATO.VARIABLE,
      estado: ESTADOS_PROYECTO.ACTIVO,
      responsable: jefeOperaciones._id
    });
    await proyecto2.populate(['cliente', 'responsable']);
    logger.success('Proyecto creado: ' + proyecto2.codigo + ' - ' + proyecto2.nombre);

    // ============================================
    // PASO 6: ASIGNAR LOTES A PROYECTOS
    // ============================================
    logger.info('\nAsignando lotes a proyectos...');

    const lote1 = lotes[0];
    const lote2 = lotes.length > 1 ? lotes[1] : lotes[0];

    await ProyectoLote.create({
      proyecto: proyecto1._id,
      lote: lote1._id,
      fecha_asignacion: new Date('2024-01-15'),
      fecha_inicio: new Date('2024-01-20'),
      activo: true
    });
    logger.success('Lote ' + lote1.codigo + ' asignado a ' + proyecto1.codigo);

    await ProyectoLote.create({
      proyecto: proyecto1._id,
      lote: lote2._id,
      fecha_asignacion: new Date('2024-01-15'),
      fecha_inicio: new Date('2024-02-01'),
      activo: true
    });
    logger.success('Lote ' + lote2.codigo + ' asignado a ' + proyecto1.codigo);

    // ============================================
    // PASO 7: CREAR PALs (Proyecto-Actividad-Lote)
    // ============================================
    logger.info('\nCreando PALs (Proyecto-Actividad-Lote)...');

    // PAL 1: Repique Manual - Lote 1
    const pal1 = await ProyectoActividadLote.create({
      codigo: 'PAL-2024-001',
      proyecto: proyecto1._id,
      lote: lote1._id,
      actividad: actividades['RMMACH']._id,
      meta_minima: 2.5, // hectáreas
      cantidad_ejecutada: 1.8,
      fecha_inicio_planificada: new Date('2024-01-20'),
      fecha_fin_planificada: new Date('2024-02-15'),
      fecha_inicio_real: new Date('2024-01-22'),
      estado: ESTADOS_PAL.EN_EJECUCION,
      supervisor_asignado: supervisores[0]._id,
      prioridad: 1
    });
    await pal1.populate(['proyecto', 'lote', 'actividad', 'supervisor_asignado']);
    logger.success('PAL creado: ' + pal1.codigo + ' - Avance: ' + pal1.porcentajeAvance + '%');

    // PAL 2: Plantación Manual - Lote 1
    const pal2 = await ProyectoActividadLote.create({
      codigo: 'PAL-2024-002',
      proyecto: proyecto1._id,
      lote: lote1._id,
      actividad: actividades['PLAM']._id,
      meta_minima: 5000, // árboles
      cantidad_ejecutada: 5200,
      fecha_inicio_planificada: new Date('2024-02-20'),
      fecha_fin_planificada: new Date('2024-03-20'),
      fecha_inicio_real: new Date('2024-02-20'),
      fecha_fin_real: new Date('2024-03-18'),
      estado: ESTADOS_PAL.CUMPLIDA,
      supervisor_asignado: supervisores[0]._id,
      prioridad: 1
    });
    await pal2.populate(['proyecto', 'lote', 'actividad', 'supervisor_asignado']);
    logger.success('PAL creado: ' + pal2.codigo + ' - Estado: ' + pal2.estado);

    // PAL 3: Fertilización - Lote 2
    const pal3 = await ProyectoActividadLote.create({
      codigo: 'PAL-2024-003',
      proyecto: proyecto1._id,
      lote: lote2._id,
      actividad: actividades['FERT-BASE']._id,
      meta_minima: 3000, // árboles
      cantidad_ejecutada: 0,
      fecha_inicio_planificada: new Date('2024-04-01'),
      fecha_fin_planificada: new Date('2024-04-30'),
      estado: ESTADOS_PAL.PENDIENTE,
      supervisor_asignado: supervisores.length > 1 ? supervisores[1]._id : supervisores[0]._id,
      prioridad: 2
    });
    await pal3.populate(['proyecto', 'lote', 'actividad', 'supervisor_asignado']);
    logger.success('PAL creado: ' + pal3.codigo + ' - Estado: ' + pal3.estado);

    // PAL 4: Poda de Formación - Lote 2
    const pal4 = await ProyectoActividadLote.create({
      codigo: 'PAL-2024-004',
      proyecto: proyecto2._id,
      lote: lote2._id,
      actividad: actividades['PODA-FORM']._id,
      meta_minima: 2000, // árboles
      cantidad_ejecutada: 800,
      fecha_inicio_planificada: new Date('2024-02-15'),
      fecha_fin_planificada: new Date('2024-03-15'),
      fecha_inicio_real: new Date('2024-02-16'),
      estado: ESTADOS_PAL.EN_EJECUCION,
      supervisor_asignado: supervisores.length > 1 ? supervisores[1]._id : supervisores[0]._id,
      prioridad: 2
    });
    await pal4.populate(['proyecto', 'lote', 'actividad', 'supervisor_asignado']);
    logger.success('PAL creado: ' + pal4.codigo + ' - Avance: ' + pal4.porcentajeAvance + '%');

    // ============================================
    // PASO 8: CREAR PRECIOS NEGOCIADOS
    // ============================================
    logger.info('\nCreando precios negociados...');

    // Precio negociado para PAL1 (RMMACH)
    const precioNeg1 = await PrecioNegociado.create({
      proyecto_actividad_lote: pal1._id,
      precio_acordado: 650000, // Negociado mejor que el base
      negociado_por: supervisores[0]._id,
      autorizado_por: jefeOperaciones._id,
      motivo: 'Buen rendimiento del equipo',
      fecha_negociacion: new Date('2024-01-22'),
      fecha_vigencia_desde: new Date('2024-01-22'),
      activo: true
    });
    await precioNeg1.populate(['proyecto_actividad_lote', 'negociado_por', 'autorizado_por']);
    logger.success('Precio negociado: ' + precioNeg1.precio_acordado + ' - Versión ' + precioNeg1.version);

    // Precio negociado para PAL2 (PLAM)
    const precioNeg2 = await PrecioNegociado.create({
      proyecto_actividad_lote: pal2._id,
      precio_acordado: 145, // Por árbol
      negociado_por: supervisores[0]._id,
      autorizado_por: jefeOperaciones._id,
      motivo: 'Incentivo por cumplimiento de meta',
      fecha_negociacion: new Date('2024-02-20'),
      fecha_vigencia_desde: new Date('2024-02-20'),
      activo: true
    });
    await precioNeg2.populate(['proyecto_actividad_lote', 'negociado_por', 'autorizado_por']);
    logger.success('Precio negociado: ' + precioNeg2.precio_acordado + ' - Versión ' + precioNeg2.version);

    // Precio negociado para PAL4 (PODA)
    const precioNeg3 = await PrecioNegociado.create({
      proyecto_actividad_lote: pal4._id,
      precio_acordado: 155, // Por árbol
      negociado_por: supervisores.length > 1 ? supervisores[1]._id : supervisores[0]._id,
      autorizado_por: jefeOperaciones._id,
      motivo: 'Trabajo especializado',
      fecha_negociacion: new Date('2024-02-16'),
      fecha_vigencia_desde: new Date('2024-02-16'),
      activo: true
    });
    await precioNeg3.populate(['proyecto_actividad_lote', 'negociado_por', 'autorizado_por']);
    logger.success('Precio negociado: ' + precioNeg3.precio_acordado + ' - Versión ' + precioNeg3.version);

    // ============================================
    // RESUMEN
    // ============================================
    logger.success('\nSeeding de Proyectos completado exitosamente');
    logger.info('\nRESUMEN:');
    logger.info('================================================================');
    logger.info('Clientes: 2');
    logger.info('Actividades del catálogo: ' + Object.keys(actividades).length);
    logger.info('Precios base: ' + preciosBase.length);
    logger.info('Proyectos: 2');
    logger.info('Asignaciones proyecto-lote: 2');
    logger.info('PALs creados: 4');
    logger.info('Precios negociados: 3');
    logger.info('================================================================\n');

    logger.info('ESTRUCTURA CREADA:');
    logger.info('   Proyecto 1: ' + proyecto1.nombre);
    logger.info('   - Cliente: ' + smurfit.razon_social);
    logger.info('   - Estado: ' + proyecto1.estado);
    logger.info('   - PALs: 3 (1 EN_EJECUCION, 1 CUMPLIDA, 1 PENDIENTE)');
    logger.info('');
    logger.info('   Proyecto 2: ' + proyecto2.nombre);
    logger.info('   - Cliente: ' + smurfit.razon_social);
    logger.info('   - Estado: ' + proyecto2.estado);
    logger.info('   - PALs: 1 (EN_EJECUCION)');
    logger.info('================================================================\n');

    logger.info('DATOS DE PRUEBA:');
    logger.info('   PAL ' + pal1.codigo + ': ' + pal1.porcentajeAvance + '% completado (meta: ' + pal1.meta_minima + ')');
    logger.info('   PAL ' + pal2.codigo + ': CUMPLIDA - Superó meta (' + pal2.cantidad_ejecutada + '/' + pal2.meta_minima + ')');
    logger.info('   PAL ' + pal3.codigo + ': PENDIENTE - Sin iniciar');
    logger.info('   PAL ' + pal4.codigo + ': ' + pal4.porcentajeAvance + '% completado');
    logger.info('================================================================\n');

    process.exit(0);
  } catch (error) {
    logger.error('Error en seeding de Proyectos:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Ejecutar seeder
seedProyectos();