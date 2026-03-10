// ==========================================
// CONFIG: DATABASE — CORREGIDO
// ==========================================
// FIX: No hace process.exit(1) en fallo de conexión.
// Usa retry automático con backoff exponencial.
// Render free tier tarda hasta 30s en despertar MongoDB Atlas.

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const MAX_RETRIES   = 5;
const RETRY_DELAY   = 5000; // ms entre reintentos

const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName:                    process.env.DB_NAME,
      maxPoolSize:               10,
      serverSelectionTimeoutMS:  10000, // aumentado de 5000 a 10000
      socketTimeoutMS:           45000,
      connectTimeoutMS:          15000,
    });

    logger.info(`MongoDB conectado: ${conn.connection.host}`);
    logger.info(`Base de datos: ${conn.connection.name}`);

    // Eventos de conexión
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB desconectado — intentando reconectar...');
      // No llamar connectDB aquí para evitar loops; mongoose reconecta solo
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`Error de MongoDB: ${err}`);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconectado exitosamente');
    });

    // Cierre graceful
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB desconectado por terminación de la aplicación');
      process.exit(0);
    });

  } catch (error) {
    logger.error(`Error al conectar a MongoDB (intento ${retryCount + 1}/${MAX_RETRIES}): ${error.message}`);

    if (retryCount < MAX_RETRIES - 1) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount); // backoff exponencial
      logger.info(`Reintentando en ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }

    // Después de MAX_RETRIES fallos, el servidor sigue corriendo
    // pero las rutas devolverán error 503 (manejado en los controladores)
    logger.error('No se pudo conectar a MongoDB después de varios intentos. El servidor continuará.');
    // NO process.exit(1) — permite que Render mantenga el proceso vivo
  }
};

module.exports = connectDB;