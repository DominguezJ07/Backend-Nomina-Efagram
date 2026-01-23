require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../Auth/models/user.model');
const { ROLES } = require('../../config/constants');
const logger = require('../../utils/logger');

const usuarios = [
  {
    nombre: 'Admin',
    apellidos: 'Sistema',
    email: 'admin@efagram.com',
    password: 'Admin123',
    tipo_doc: 'CC',
    num_doc: '1000000001',
    telefono: '3001234567',
    roles: [ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES]
  },
  {
    nombre: 'Juan',
    apellidos: 'Pérez',
    email: 'jefe@efagram.com',
    password: 'Jefe123',
    tipo_doc: 'CC',
    num_doc: '1000000002',
    telefono: '3001234568',
    roles: [ROLES.JEFE_OPERACIONES]
  },
  {
    nombre: 'Carlos',
    apellidos: 'Supervisor',
    email: 'supervisor@efagram.com',
    password: 'Super123',
    tipo_doc: 'CC',
    num_doc: '1000000003',
    telefono: '3001234569',
    roles: [ROLES.SUPERVISOR]
  },
  {
    nombre: 'María',
    apellidos: 'Trabajadora',
    email: 'trabajador@efagram.com',
    password: 'Trabajo123',
    tipo_doc: 'CC',
    num_doc: '1000000004',
    telefono: '3001234570',
    roles: [ROLES.TRABAJADOR]
  },
  {
    nombre: 'Ana',
    apellidos: 'Recursos',
    email: 'rrhh@efagram.com',
    password: 'Rrhh123',
    tipo_doc: 'CC',
    num_doc: '1000000005',
    telefono: '3001234571',
    roles: [ROLES.TALENTO_HUMANO]
  }
];

const seedUsers = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });
    logger.success('Conectado a MongoDB');

    // Limpiar usuarios existentes
    await User.deleteMany({});
    logger.info('Usuarios anteriores eliminados');

    // Crear usuarios
    logger.info('Creando usuarios...');
    
    for (const userData of usuarios) {
      const user = await User.create(userData);
      logger.success(`Usuario creado: ${user.email} - Roles: ${user.roles.join(', ')}`);
    }

    logger.success('\n Usuarios de prueba creados exitosamente');
    logger.info('\n CREDENCIALES DE ACCESO:');
    logger.info('');
    usuarios.forEach(u => {
      logger.info(`${u.roles.join(', ')}: ${u.email} / ${u.password}`);
    });
    logger.info('\n');

    process.exit(0);
  } catch (error) {
    logger.error('Error en seeding de usuarios:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Ejecutar seeder
seedUsers();