require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging HTTP (desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Logging HTTP personalizado (producción)
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

// Rutas de Autenticación
const authRoutes = require('./Auth/routes/auth.routes');

// Rutas Territoriales
const zonaRoutes = require('./Territorial/routes/zona.routes');
const nucleoRoutes = require('./Territorial/routes/nucleo.routes');
const fincaRoutes = require('./Territorial/routes/finca.routes');
const loteRoutes = require('./Territorial/routes/lote.routes');

// Rutas de Personal
const personaRoutes = require('./Personal/routes/persona.routes');
const rolRoutes = require('./Personal/routes/rol.routes');
const personaRolRoutes = require('./Personal/routes/personaRol.routes');
const cuadrillaRoutes = require('./Personal/routes/cuadrilla.routes');
const asignacionRoutes = require('./Personal/routes/asignacion.routes');

// Rutas de Proyectos
const clienteRoutes = require('./Proyectos/routes/cliente.routes');
const proyectoRoutes = require('./Proyectos/routes/proyecto.routes');
const actividadRoutes = require('./Proyectos/routes/actividadCatalogo.routes');
const palRoutes = require('./Proyectos/routes/pal.routes');
const precioBaseRoutes = require('./Proyectos/routes/precioBase.routes');
const precioNegociadoRoutes = require('./Proyectos/routes/precioNegociado.routes');

// Rutas de Ejecución
const registroDiarioRoutes = require('./Ejecucion/routes/registroDiario.routes');
const novedadRoutes = require('./Ejecucion/routes/novedad.routes');
const semanaOperativaRoutes = require('./ControlSemanal/routes/semanaOperativa.routes');

// Rutas de Control Semanal
const consolidadoRoutes = require('./ControlSemanal/routes/consolidado.routes');
const indicadorRoutes = require('./ControlSemanal/routes/indicador.routes');
const alertaRoutes = require('./ControlSemanal/routes/alerta.routes');
const controlSemanalRoutes = require('./ControlSemanal/routes/controlSemanal.routes');

// ========================================
// RUTAS DE LA API
// ========================================

// Rutas base API v1
const apiRouter = express.Router();

// Montar rutas de Autenticación
apiRouter.use('/auth', authRoutes);

// Montar rutas Territoriales
apiRouter.use('/zonas', zonaRoutes);
apiRouter.use('/nucleos', nucleoRoutes);
apiRouter.use('/fincas', fincaRoutes);
apiRouter.use('/lotes', loteRoutes);

// Montar rutas de Personal
apiRouter.use('/personas', personaRoutes);
apiRouter.use('/roles', rolRoutes);
apiRouter.use('/persona-roles', personaRolRoutes);
apiRouter.use('/cuadrillas', cuadrillaRoutes);
apiRouter.use('/asignaciones-supervisor', asignacionRoutes);

// Montar rutas de Proyectos
apiRouter.use('/clientes', clienteRoutes);
apiRouter.use('/proyectos', proyectoRoutes);
apiRouter.use('/actividades', actividadRoutes);
apiRouter.use('/pals', palRoutes);
apiRouter.use('/precios-base', precioBaseRoutes);
apiRouter.use('/precios-negociados', precioNegociadoRoutes);

// Montar rutas de Ejecución
apiRouter.use('/registros-diarios', registroDiarioRoutes);
apiRouter.use('/novedades', novedadRoutes);
apiRouter.use('/semanas', semanaOperativaRoutes);

// Montar rutas de Control Semanal
apiRouter.use('/consolidados', consolidadoRoutes);
apiRouter.use('/indicadores', indicadorRoutes);
apiRouter.use('/alertas', alertaRoutes);
apiRouter.use('/control-semanal', controlSemanalRoutes);

// Montar rutas en /api/v1
app.use('/api/v1', apiRouter);

// ========================================
// MANEJO DE ERRORES
// ========================================

// Ruta no encontrada
app.use(notFound);

// Manejador de errores global
app.use(errorHandler);

// ========================================
// INICIAR SERVIDOR
// ========================================

const startServer = async () => {
  try {
    // Conectar a MongoDB
    await connectDB();

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.success(`✓ Servidor ejecutándose en puerto ${PORT}`);
      logger.info(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✓ URL: http://localhost:${PORT}`);
      logger.info(`✓ Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor', { error: error.message });
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { 
    error: error.message, 
    stack: error.stack 
  });
  process.exit(1);
});

// Iniciar servidor
startServer();

module.exports = app;