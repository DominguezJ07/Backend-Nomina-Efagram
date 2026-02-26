require('dotenv').config();
const mongoose = require('mongoose');
const Proceso = require('../../Catalogos/models/proceso.model');
const Intervencion = require('../../Catalogos/models/intervencion.model');
const logger = require('../../utils/logger');

const seedCatalogos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });
    logger.success('Conectado a MongoDB');

    // ============================================
    // LIMPIAR DATOS ANTERIORES
    // ============================================
    await Intervencion.deleteMany({});
    await Proceso.deleteMany({});
    logger.info('Datos anteriores de Catálogos eliminados');

    // ============================================
    // PASO 1: CREAR PROCESOS
    // ============================================
    logger.info('\nCreando procesos...');

    const procesosData = [
      {
        codigo: 'COSECHA',
        nombre: 'Cosecha',
        descripcion: 'Proceso de cosecha de productos forestales',
        activo: true
      },
      {
        codigo: 'SILVICULTURA',
        nombre: 'Silvicultura',
        descripcion: 'Proceso de manejo y cultivo de bosques',
        activo: true
      }
    ];

    const procesos = await Proceso.insertMany(procesosData);

    const cosecha     = procesos.find(p => p.codigo === 'COSECHA');
    const silvicultura = procesos.find(p => p.codigo === 'SILVICULTURA');

    logger.success(`Procesos creados: ${procesos.length}`);
    procesos.forEach(p => logger.info(`  → [${p.codigo}] ${p.nombre}`));

    // ============================================
    // PASO 2: CREAR INTERVENCIONES
    // ============================================
    logger.info('\nCreando intervenciones...');

    const intervencionesData = [
      // ── Cosecha ──────────────────────────────
      {
        codigo: 'COS-MANT',
        nombre: 'Mantenimiento',
        proceso: cosecha._id,
        descripcion: 'Actividades de mantenimiento en cosecha',
        activo: true
      },
      {
        codigo: 'COS-NOPROG',
        nombre: 'No Programadas',
        proceso: cosecha._id,
        descripcion: 'Intervenciones no programadas en cosecha',
        activo: true
      },
      {
        codigo: 'COS-ESTAB',
        nombre: 'Establecimiento',
        proceso: cosecha._id,
        descripcion: 'Actividades de establecimiento en cosecha',
        activo: true
      },

      // ── Silvicultura ──────────────────────────
      {
        codigo: 'SIL-MANT',
        nombre: 'Mantenimiento',
        proceso: silvicultura._id,
        descripcion: 'Actividades de mantenimiento en silvicultura',
        activo: true
      },
      {
        codigo: 'SIL-NOPROG',
        nombre: 'No Programadas',
        proceso: silvicultura._id,
        descripcion: 'Intervenciones no programadas en silvicultura',
        activo: true
      },
      {
        codigo: 'SIL-ESTAB',
        nombre: 'Establecimiento',
        proceso: silvicultura._id,
        descripcion: 'Actividades de establecimiento en silvicultura',
        activo: true
      }
    ];

    const intervenciones = await Intervencion.insertMany(intervencionesData);

    logger.success(`Intervenciones creadas: ${intervenciones.length}`);

    // Mostrar resumen agrupado por proceso
    for (const proceso of procesos) {
      logger.info(`\n  Proceso: ${proceso.nombre}`);
      const ints = intervenciones.filter(
        i => i.proceso.toString() === proceso._id.toString()
      );
      ints.forEach(i => logger.info(`    → [${i.codigo}] ${i.nombre}`));
    }

    logger.success('\n✓ Seeding de Catálogos completado exitosamente');
    process.exit(0);

  } catch (error) {
    logger.error(`Error en seeding de Catálogos: ${error.message}`);
    process.exit(1);
  }
};

seedCatalogos();