require('dotenv').config();
const mongoose = require('mongoose');
const ConsolidadoSemanal = require('../../ControlSemanal/models/consolidadoSemanal.model');
const IndicadorDesempeño = require('../../ControlSemanal/models/indicadorDesempeño.model');
const AlertaSemanal = require('../../ControlSemanal/models/alertaSemanal.model');
const SemanaOperativa = require('../../ControlSemanal/models/semanaOperativa.model');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');
const Novedad = require('../../Ejecucion/models/novedad.model');
const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
const Proyecto = require('../../Proyectos/models/proyecto.model');
const ActividadCatalogo = require('../../Proyectos/models/actividadCatalogo.model');
const Persona = require('../../Personal/models/persona.model');
const consolidadoService = require('../../ControlSemanal/services/consolidado.service');
const indicadorService = require('../../ControlSemanal/services/indicador.service');
const alertaService = require('../../ControlSemanal/services/alerta.service');
const logger = require('../../utils/logger');

const seedControlSemanal = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });
    logger.success('Conectado a MongoDB');

    // Limpiar datos anteriores
    await Promise.all([
      ConsolidadoSemanal.deleteMany({}),
      IndicadorDesempeño.deleteMany({}),
      AlertaSemanal.deleteMany({})
    ]);
    logger.info('Datos anteriores de Control Semanal eliminados');

    // ============================================
    // PASO 1: VERIFICAR DATOS EXISTENTES
    // ============================================
    logger.info('\n Verificando datos existentes...');

    const semanas = await SemanaOperativa.find().sort({ fecha_inicio: -1 });
    if (semanas.length === 0) {
      logger.warn('  No hay semanas operativas. Ejecute: npm run seed:ejecucion');
      process.exit(0);
    }
    logger.success(` Semanas encontradas: ${semanas.length}`);

    const registros = await RegistroDiario.find();
    if (registros.length === 0) {
      logger.warn('  No hay registros diarios. Ejecute: npm run seed:ejecucion');
      process.exit(0);
    }
    logger.success(` Registros diarios encontrados: ${registros.length}`);

    const supervisores = await Persona.find({ cargo: 'Supervisor de Campo' });
    const jefeOperaciones = await Persona.findOne({ cargo: 'Jefe de Operaciones' });
    
    if (!jefeOperaciones) {
      logger.warn('  No hay jefe de operaciones. Ejecute: npm run seed:personal');
      process.exit(0);
    }

    // ============================================
    // PASO 2: GENERAR CONSOLIDADOS
    // ============================================
    logger.info('\n Generando consolidados semanales...');

    const consolidadosGenerados = [];

    // Generar consolidados para las semanas cerradas
    for (const semana of semanas) {
      if (semana.estado === 'CERRADA') {
        logger.info(`\n Procesando semana: ${semana.codigo}...`);
        
        try {
          const consolidados = await consolidadoService.generarConsolidadosSemana(
            semana._id,
            jefeOperaciones._id
          );

          consolidadosGenerados.push(...consolidados);
          logger.success(` ${consolidados.length} consolidados generados para ${semana.codigo}`);
        } catch (error) {
          if (error.statusCode === 404 && error.message.includes('No hay registros diarios')) {
            logger.warn(`  Sin registros diarios para ${semana.codigo} - Saltando...`);
            continue;
          }
          throw error;
        }
      }
    }

    logger.success(`\n Total consolidados generados: ${consolidadosGenerados.length}`);

    // ============================================
    // PASO 3: GENERAR INDICADORES
    // ============================================
    logger.info('\n Generando indicadores de desempeño...');

    const indicadoresGenerados = [];

    for (const semana of semanas) {
      if (semana.estado === 'CERRADA') {
        try {
          // Indicadores globales
          const indicadorGlobal = await indicadorService.generarIndicadoresGlobales(semana._id);
          indicadoresGenerados.push(indicadorGlobal);
          logger.success(` Indicador global generado para ${semana.codigo}`);

          // Indicadores por proyecto
          const proyectos = await Proyecto.find();
          for (const proyecto of proyectos) {
            try {
              const indicadorProyecto = await indicadorService.generarIndicadoresProyecto(
                semana._id,
                proyecto._id
              );
              indicadoresGenerados.push(indicadorProyecto);
              logger.success(` Indicador de proyecto ${proyecto.codigo} generado`);
            } catch (error) {
              // Puede fallar si no hay datos del proyecto en esa semana
              logger.info(`ℹ  Sin datos para proyecto ${proyecto.codigo} en ${semana.codigo}`);
            }
          }
        } catch (error) {
          logger.warn(`  No se pudieron generar indicadores para ${semana.codigo}: ${error.message}`);
        }
      }
    }

    logger.success(`\n Total indicadores generados: ${indicadoresGenerados.length}`);

    // ============================================
    // PASO 4: GENERAR ALERTAS
    // ============================================
    logger.info('\n Generando alertas automáticas...');

    const alertasGeneradas = [];

    for (const semana of semanas) {
      if (semana.estado === 'CERRADA') {
        try {
          const alertas = await alertaService.generarAlertasSemana(semana._id);
          alertasGeneradas.push(...alertas);
          logger.success(` ${alertas.length} alertas generadas para ${semana.codigo}`);
        } catch (error) {
          logger.warn(`  No se pudieron generar alertas para ${semana.codigo}: ${error.message}`);
        }
      }
    }

    logger.success(`\n Total alertas generadas: ${alertasGeneradas.length}`);

    // ============================================
    // PASO 5: CREAR ALERTAS ADICIONALES (MANUALES)
    // ============================================
    logger.info('\n Creando alertas adicionales...');

    // Alerta de retraso en proyecto
    const semanaActual = semanas.find(s => s.estado === 'ABIERTA');
    if (semanaActual) {
      const proyectos = await Proyecto.find({ estado: 'ACTIVO' });
      
      if (proyectos.length > 0) {
        const alertaRetraso = await alertaService.crearAlerta({
          semana_operativa: semanaActual._id,
          tipo: 'RETRASO_PROYECTO',
          nivel: 'ALTA',
          entidad_tipo: 'PROYECTO',
          entidad_id: proyectos[0]._id,
          entidad_referencia: 'Proyecto',
          titulo: `Posible retraso en proyecto ${proyectos[0].codigo}`,
          descripcion: 'El proyecto está mostrando señales de retraso en algunas actividades',
          accion_sugerida: 'Revisar asignación de recursos y reprogramar actividades críticas'
        });
        alertasGeneradas.push(alertaRetraso);
        logger.success(` Alerta de retraso creada para ${proyectos[0].codigo}`);
      }
    }

    // ============================================
    // PASO 6: APROBAR CONSOLIDADOS
    // ============================================
    logger.info('\n  Aprobando consolidados...');

    let consolidadosAprobados = 0;
    for (const consolidado of consolidadosGenerados) {
      if (consolidado.estado === 'CONSOLIDADO' && consolidado.porcentaje_rendimiento >= 60) {
        consolidado.estado = 'APROBADO';
        await consolidado.save();
        consolidadosAprobados++;
      }
    }

    logger.success(` ${consolidadosAprobados} consolidados aprobados`);

    // ============================================
    // RESUMEN
    // ============================================
    logger.success('\n Seeding de Control Semanal completado exitosamente');
    logger.info('\n RESUMEN:');
    logger.info('');
    logger.info(` Semanas procesadas: ${semanas.length}`);
    logger.info(` Consolidados generados: ${consolidadosGenerados.length}`);
    logger.info(` Consolidados aprobados: ${consolidadosAprobados}`);
    logger.info(` Indicadores generados: ${indicadoresGenerados.length}`);
    logger.info(` Alertas generadas: ${alertasGeneradas.length}`);
    logger.info('\n');

    // Estadísticas de consolidados
    const porClasificacion = await ConsolidadoSemanal.aggregate([
      {
        $group: {
          _id: null,
          excelentes: {
            $sum: {
              $cond: [{ $gte: ['$porcentaje_rendimiento', 100] }, 1, 0]
            }
          },
          buenos: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$porcentaje_rendimiento', 80] },
                    { $lt: ['$porcentaje_rendimiento', 100] }
                  ]
                },
                1,
                0
              ]
            }
          },
          regulares: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$porcentaje_rendimiento', 60] },
                    { $lt: ['$porcentaje_rendimiento', 80] }
                  ]
                },
                1,
                0
              ]
            }
          },
          bajos: {
            $sum: {
              $cond: [{ $lt: ['$porcentaje_rendimiento', 60] }, 1, 0]
            }
          }
        }
      }
    ]);

    if (porClasificacion.length > 0) {
      const stats = porClasificacion[0];
      logger.info(' CLASIFICACIÓN DE RENDIMIENTO:');
      logger.info(`    Excelentes (≥100%): ${stats.excelentes}`);
      logger.info(`    Buenos (80-99%): ${stats.buenos}`);
      logger.info(`    Regulares (60-79%): ${stats.regulares}`);
      logger.info(`    Bajos (<60%): ${stats.bajos}`);
      logger.info('\n');
    }

    // Estadísticas de alertas
    const alertasPorNivel = await AlertaSemanal.aggregate([
      {
        $group: {
          _id: '$nivel',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    logger.info(' ALERTAS POR NIVEL:');
    alertasPorNivel.forEach(stat => {
      const emoji = stat._id === 'CRITICA' ? '🔴' : stat._id === 'ALTA' ? '🟠' : stat._id === 'MEDIA' ? '🟡' : '🟢';
      logger.info(`   ${emoji} ${stat._id}: ${stat.count}`);
    });
    logger.info('\n');

    // Alertas pendientes
    const alertasPendientes = await AlertaSemanal.countDocuments({ estado: 'PENDIENTE' });
    const alertasResueltas = await AlertaSemanal.countDocuments({ estado: 'RESUELTA' });

    logger.info(' ESTADO DE ALERTAS:');
    logger.info(`   Pendientes: ${alertasPendientes}`);
    logger.info(`    Resueltas: ${alertasResueltas}`);
    logger.info('\n');

    process.exit(0);
  } catch (error) {
    logger.error(' Error en seeding de Control Semanal:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Ejecutar seeder
seedControlSemanal();