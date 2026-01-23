require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');

// Importar modelos
const Zona = require('./src/Territorial/models/zona.model');
const Nucleo = require('./src/Territorial/models/nucleo.model');
const Finca = require('./src/Territorial/models/finca.model');
const Lote = require('./src/Territorial/models/lote.model');

const testTerritorial = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });
    logger.success('Conectado a MongoDB');

    // Limpiar datos anteriores (solo para pruebas)
    await Promise.all([
      Lote.deleteMany({}),
      Finca.deleteMany({}),
      Nucleo.deleteMany({}),
      Zona.deleteMany({})
    ]);
    logger.info('Datos anteriores eliminados');

    // ===== CREAR ZONAS =====
    logger.info('Creando zonas...');
    const zonaNorte = await Zona.create({ codigo: 1, nombre: 'Norte' });
    const zonaSur = await Zona.create({ codigo: 2, nombre: 'Sur' });
    const zonaCentro = await Zona.create({ codigo: 3, nombre: 'Centro' });
    logger.success('Zonas creadas');

    // ===== CREAR NÚCLEOS =====
    logger.info('Creando núcleos...');
    const nucleoPopayan = await Nucleo.create({
      codigo: 'NUC-POP',
      nombre: 'Popayán',
      zona: zonaCentro._id
    });

    const nucleoCali = await Nucleo.create({
      codigo: 'NUC-CALI',
      nombre: 'Cali',
      zona: zonaSur._id
    });
    logger.success('Núcleos creados');

    // ===== CREAR FINCAS =====
    logger.info('Creando fincas...');
    const fincaElParaiso = await Finca.create({
      codigo: 'FIN-001',
      nombre: 'El Paraíso',
      nucleo: nucleoPopayan._id,
      area_total: 150.5
    });

    const fincaLaEsperanza = await Finca.create({
      codigo: 'FIN-002',
      nombre: 'La Esperanza',
      nucleo: nucleoCali._id,
      area_total: 200.0
    });
    logger.success('Fincas creadas');

    // ===== CREAR LOTES =====
    logger.info('Creando lotes...');
    const lote1 = await Lote.create({
      codigo: 'LOT-A1',
      nombre: 'Lote A1',
      finca: fincaElParaiso._id,
      area: 25.5,
      pendiente: 'Ondulada',
      accesibilidad: 'Buena'
    });

    const lote2 = await Lote.create({
      codigo: 'LOT-A2',
      nombre: 'Lote A2',
      finca: fincaElParaiso._id,
      area: 30.0,
      pendiente: 'Plana',
      accesibilidad: 'Buena'
    });
    logger.success('Lotes creados');

    // ===== CONSULTAS DE PRUEBA =====
    logger.info('\nCONSULTAS DE PRUEBA:');

    // 1. Buscar zona con sus núcleos
    const zonaConNucleos = await Zona.findById(zonaCentro._id).populate('nucleos');
    logger.info(`\nZona Centro tiene ${zonaConNucleos.nucleos.length} núcleo(s)`);

    // 2. Buscar núcleo con zona y fincas
    const nucleoCompleto = await Nucleo.findById(nucleoPopayan._id)
      .populate('zona')
      .populate('fincas');
    logger.info(`\nNúcleo Popayán:`, {
      zona: nucleoCompleto.zona.nombre,
      fincas: nucleoCompleto.fincas.length
    });

    // 3. Buscar lote con jerarquía completa
    const jerarquia = await lote1.getJerarquia();
    logger.info('\nJerarquía completa del Lote A1:', jerarquia);

    // 4. Buscar lotes por finca
    const lotesDeFinca = await Lote.findByFinca(fincaElParaiso._id);
    logger.info(`\nFinca El Paraíso tiene ${lotesDeFinca.length} lote(s)`);

    logger.success('\n🎉 Pruebas completadas exitosamente');

  } catch (error) {
    logger.error('Error en las pruebas:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    logger.info('Conexión cerrada');
    process.exit(0);
  }
};

// Ejecutar pruebas
testTerritorial();