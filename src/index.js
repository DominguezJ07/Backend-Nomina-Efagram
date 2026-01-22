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
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Sistema de Nómina EFAGRAM',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1'
    }
  });
});

// ========================================
// RUTAS DE LA API
// ========================================

// Importar rutas (cuando las creemos)
// const authRoutes = require('./Auth/routes/auth.routes');
// const zonaRoutes = require('./Territorial/routes/zona.routes');
// const nucleoRoutes = require('./Territorial/routes/nucleo.routes');
// const fincaRoutes = require('./Territorial/routes/finca.routes');
// const loteRoutes = require('./Territorial/routes/lote.routes');
// const personaRoutes = require('./Personal/routes/persona.routes');
// const rolRoutes = require('./Personal/routes/rol.routes');
// const cuadrillaRoutes = require('./Personal/routes/cuadrilla.routes');
// const asignacionRoutes = require('./Personal/routes/asignacion.routes');
// const clienteRoutes = require('./Proyectos/routes/cliente.routes');
// const proyectoRoutes = require('./Proyectos/routes/proyecto.routes');
// const proyectoActividadRoutes = require('./Proyectos/routes/proyectoActividad.routes');
// const actividadRoutes = require('./Actividades/routes/actividad.routes');
// const precioRoutes = require('./Actividades/routes/precio.routes');
// const registroRoutes = require('./RegistroDiario/routes/registro.routes');
// const novedadRoutes = require('./RegistroDiario/routes/novedad.routes');
// const semanaRoutes = require('./ControlSemanal/routes/semana.routes');
// const nominaRoutes = require('./Nomina/routes/nomina.routes');
// const cierreRoutes = require('./Nomina/routes/cierre.routes');
// const reportesRoutes = require('./Reportes/routes/reportes.routes');

// Rutas base API v1
const apiRouter = express.Router();

// Cuando las rutas estén listas, descomentar:
// apiRouter.use('/auth', authRoutes);
// apiRouter.use('/zonas', zonaRoutes);
// apiRouter.use('/nucleos', nucleoRoutes);
// apiRouter.use('/fincas', fincaRoutes);
// apiRouter.use('/lotes', loteRoutes);
// apiRouter.use('/personas', personaRoutes);
// apiRouter.use('/roles', rolRoutes);
// apiRouter.use('/cuadrillas', cuadrillaRoutes);
// apiRouter.use('/asignaciones', asignacionRoutes);
// apiRouter.use('/clientes', clienteRoutes);
// apiRouter.use('/proyectos', proyectoRoutes);
// apiRouter.use('/proyectos-actividades', proyectoActividadRoutes);
// apiRouter.use('/actividades', actividadRoutes);
// apiRouter.use('/precios', precioRoutes);
// apiRouter.use('/registros', registroRoutes);
// apiRouter.use('/novedades', novedadRoutes);
// apiRouter.use('/semanas', semanaRoutes);
// apiRouter.use('/nomina', nominaRoutes);
// apiRouter.use('/cierres', cierreRoutes);
// apiRouter.use('/reportes', reportesRoutes);

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
      logger.success(` Servidor ejecutándose en puerto ${PORT}`);
      logger.info(` Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(` URL: http://localhost:${PORT}`);
      logger.info(` Health Check: http://localhost:${PORT}/health`);
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
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Iniciar servidor
startServer();

module.exports = app;