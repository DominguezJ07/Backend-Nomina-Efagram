const mongoose = require('mongoose');
const logger = require('../../utils/logger');

class MongoConnection {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      if (this.connection) {
        logger.info('Usando conexión existente a MongoDB');
        return this.connection;
      }

      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.DB_NAME,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.connection = conn.connection;
      
      logger.info(`MongoDB conectado: ${this.connection.host}`);
      logger.info(`Base de datos: ${this.connection.name}`);

      this.setupEventHandlers();
      this.setupGracefulShutdown();

      return this.connection;

    } catch (error) {
      logger.error(`Error al conectar a MongoDB: ${error.message}`);
      throw error;
    }
  }

  setupEventHandlers() {
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose conectado a MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose desconectado de MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`Error de Mongoose: ${err.message}`);
    });
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Señal ${signal} recibida, cerrando conexión a MongoDB...`);
      try {
        await mongoose.connection.close();
        logger.info('Conexión a MongoDB cerrada correctamente');
        process.exit(0);
      } catch (err) {
        logger.error(`Error al cerrar MongoDB: ${err.message}`);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.connection.close();
      this.connection = null;
      logger.info('Desconectado de MongoDB');
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new MongoConnection();