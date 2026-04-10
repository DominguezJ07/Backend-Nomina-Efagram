require('dotenv').config();
const express = require('express');
const cors = require('cors'); // ✅ SOLO UNA VEZ
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARES GLOBALES
// ========================================

// Seguridad
app.use(helmet());

// ========================================
// 🔥 CORS CORREGIDO (VERSIÓN FINAL BIEN HECHA)
// ========================================

const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  'http://localhost:5173,http://localhost:5174,https://frontend-nomina-efagram-neon.vercel.app'
)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, mobile apps, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Permitir localhost en desarrollo
    if (
      process.env.NODE_ENV !== 'production' &&
      /^http:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    logger.warn(`❌ CORS bloqueado para: ${origin}`);
    return callback(new Error(`CORS no permitido para: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ✅ APLICAR CORS (SOLO UNA VEZ)
app.use(cors(corsOptions));

// ========================================
// BODY PARSER
// ========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// LOGGING
// ========================================

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req.method, req.originalUrl, res.statusCode, duration);
  });
  next();
});

// ========================================
// HEALTH CHECK
// ========================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente'
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Online'
  });
});

// ========================================
// IMPORTAR RUTAS
// ========================================

// Autenticación
const authRoutes = require('./Auth/routes/auth.routes');

// Territorial
const zonaRoutes = require('./Territorial/routes/zona.routes');
const nucleoRoutes = require('./Territorial/routes/nucleo.routes');
const fincaRoutes = require('./Territorial/routes/finca.routes');
const loteRoutes = require('./Territorial/routes/lote.routes');

// Personal
const personaRoutes = require('./Personal/routes/persona.routes');
const rolRoutes = require('./Personal/routes/rol.routes');
const personaRolRoutes = require('./Personal/routes/personaRol.routes');
const cuadrillaRoutes = require('./Personal/routes/cuadrilla.routes');
const asignacionRoutes = require('./Personal/routes/asignacion.routes');

// Proyectos
const clienteRoutes = require('./Proyectos/routes/cliente.routes');
const proyectoRoutes = require('./Proyectos/routes/proyecto.routes');
const actividadRoutes = require('./Proyectos/routes/actividadCatalogo.routes');
const palRoutes = require('./Proyectos/routes/pal.routes');
const precioBaseRoutes = require('./Proyectos/routes/precioBase.routes');
const precioNegociadoRoutes = require('./Proyectos/routes/precioNegociado.routes');

// Ejecución
const registroDiarioRoutes = require('./Ejecucion/routes/registroDiario.routes');
const novedadRoutes = require('./Ejecucion/routes/novedad.routes');
const semanaOperativaRoutes = require('./ControlSemanal/routes/semanaOperativa.routes');

// Horas No Trabajadas
const horasNoTrabajadasRoutes = require('./HorasNoTrabajadas/routes/horasNoTrabajadas.routes');

// Catálogos
const procesoRoutes = require('./Catalogos/routes/proceso.routes');
const intervencionRoutes = require('./Catalogos/routes/intervencion.routes');
const cargoRoutes = require('./Catalogos/routes/cargo.routes');

// Control Semanal
const consolidadoRoutes = require('./ControlSemanal/routes/consolidado.routes');
const indicadorRoutes = require('./ControlSemanal/routes/indicador.routes');
const alertaRoutes = require('./ControlSemanal/routes/alerta.routes');
const controlSemanalRoutes = require('./ControlSemanal/routes/controlSemanal.routes');

// Proyectos adicionales
const actividadProyectoRoutes = require('./Proyectos/routes/actividadProyecto.routes');
const subproyectoRoutes = require('./Proyectos/routes/subproyecto.routes');
const asignacionActividadRoutes = require('./Proyectos/routes/asignacionActividad.routes');

// Contratos
const contratoRoutes = require('./Contratos/routes/contrato.routes');

// Programación
const programacionRoutes = require('./Proyectos/routes/programacion.routes');
const registroDiarioProgramacionRoutes = require('./Proyectos/routes/registroDiarioProgramacion.routes');

// Reportes
const reportesRoutes = require('./Reportes/routes/reportes.routes');

// ========================================
// RUTAS API
// ========================================

const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/zonas', zonaRoutes);
apiRouter.use('/nucleos', nucleoRoutes);
apiRouter.use('/fincas', fincaRoutes);
apiRouter.use('/lotes', loteRoutes);

apiRouter.use('/personas', personaRoutes);
apiRouter.use('/roles', rolRoutes);
apiRouter.use('/persona-roles', personaRolRoutes);
apiRouter.use('/cuadrillas', cuadrillaRoutes);
apiRouter.use('/asignaciones-supervisor', asignacionRoutes);

apiRouter.use('/clientes', clienteRoutes);
apiRouter.use('/proyectos', proyectoRoutes);
apiRouter.use('/actividades', actividadRoutes);
apiRouter.use('/pals', palRoutes);
apiRouter.use('/precios-base', precioBaseRoutes);
apiRouter.use('/precios-negociados', precioNegociadoRoutes);

apiRouter.use('/registros-diarios', registroDiarioRoutes);
apiRouter.use('/novedades', novedadRoutes);
apiRouter.use('/semanas', semanaOperativaRoutes);

apiRouter.use('/horas-no-trabajadas', horasNoTrabajadasRoutes);

apiRouter.use('/procesos', procesoRoutes);
apiRouter.use('/intervenciones', intervencionRoutes);
apiRouter.use('/cargos', cargoRoutes);

apiRouter.use('/consolidados', consolidadoRoutes);
apiRouter.use('/indicadores', indicadorRoutes);
apiRouter.use('/alertas', alertaRoutes);
apiRouter.use('/control-semanal', controlSemanalRoutes);

apiRouter.use('/actividades-proyecto', actividadProyectoRoutes);
apiRouter.use('/subproyectos', subproyectoRoutes);
apiRouter.use('/asignaciones', asignacionActividadRoutes);

apiRouter.use('/contratos', contratoRoutes);

apiRouter.use('/programaciones', programacionRoutes);
apiRouter.use('/registros-diarios-programacion', registroDiarioProgramacionRoutes);

apiRouter.use('/reportes', reportesRoutes);

// Ruta base
app.use('/api/v1', apiRouter);

// ========================================
// ERRORES
// ========================================

app.use(notFound);
app.use(errorHandler);

// ========================================
// INICIAR SERVIDOR
// ========================================

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.success(`✓ Servidor ejecutándose en puerto ${PORT}`);
      logger.info(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✓ URL: http://localhost:${PORT}`);
      logger.info(`✓ Health: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('Error al iniciar el servidor', { error: error.message });
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

startServer();

module.exports = app;