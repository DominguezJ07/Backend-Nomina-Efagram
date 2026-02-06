require('dotenv').config();
const mongoose = require('mongoose');
const Persona = require('../../Personal/models/persona.model');
const Rol = require('../../Personal/models/rol.model');
const PersonaRol = require('../../Personal/models/personaRol.model');
const Cuadrilla = require('../../Personal/models/cuadrilla.model');
const AsignacionSupervisor = require('../../Personal/models/asignacionSupervisor.model');
const AsignacionTrabajador = require('../../Personal/models/asignacionTrabajador.model');
const Zona = require('../../Territorial/models/zona.model');
const Nucleo = require('../../Territorial/models/nucleo.model');
const Finca = require('../../Territorial/models/finca.model');
const User = require('../../Auth/models/user.model');
const { ROLES } = require('../../config/constants');
const logger = require('../../utils/logger');

const seedPersonal = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });
    logger.success('Conectado a MongoDB');

    // Limpiar datos anteriores
    await Promise.all([
      AsignacionTrabajador.deleteMany({}),
      AsignacionSupervisor.deleteMany({}),
      Cuadrilla.deleteMany({}),
      PersonaRol.deleteMany({}),
      Persona.deleteMany({}),
      Rol.deleteMany({})
    ]);
    logger.info('Datos anteriores de Personal eliminados');

    // ============================================
    // PASO 1: CREAR ROLES
    // ============================================
    logger.info('\n📋 Creando roles...');

    const rolesData = [
      {
        codigo: ROLES.ADMIN_SISTEMA,
        nombre: 'Administrador del Sistema',
        descripcion: 'Acceso total al sistema',
        permisos: ['*']
      },
      {
        codigo: ROLES.JEFE_OPERACIONES,
        nombre: 'Jefe de Operaciones',
        descripcion: 'Gestión de proyectos y personal',
        permisos: ['gestionar_proyectos', 'gestionar_personal', 'ver_reportes']
      },
      {
        codigo: ROLES.SUPERVISOR,
        nombre: 'Supervisor de Campo',
        descripcion: 'Supervisión de actividades en campo',
        permisos: ['registrar_actividades', 'gestionar_cuadrilla', 'ver_avances']
      },
      {
        codigo: ROLES.TRABAJADOR,
        nombre: 'Trabajador',
        descripcion: 'Ejecutor de actividades',
        permisos: ['ver_asignaciones', 'ver_nomina']
      },
      {
        codigo: ROLES.ADMIN_FINCA,
        nombre: 'Administrador de Finca',
        descripcion: 'Gestión de finca específica',
        permisos: ['gestionar_finca', 'ver_reportes_finca']
      },
      {
        codigo: ROLES.TALENTO_HUMANO,
        nombre: 'Talento Humano',
        descripcion: 'Gestión de personal y nómina',
        permisos: ['gestionar_personal', 'gestionar_nomina', 'ver_reportes']
      },
      {
        codigo: ROLES.SISTEMAS,
        nombre: 'Sistemas',
        descripcion: 'Soporte técnico',
        permisos: ['soporte_tecnico', 'ver_logs']
      }
    ];

    const roles = {};
    for (const rolData of rolesData) {
      const rol = await Rol.create(rolData);
      roles[rol.codigo] = rol;
      logger.success(`Rol creado: ${rol.nombre}`);
    }

    // ============================================
    // PASO 2: BUSCAR ENTIDADES EXISTENTES
    // ============================================
    logger.info('\n🔍 Buscando entidades territoriales...');

    // Buscar zonas
    const zonaCentro = await Zona.findOne({ codigo: 3 });
    const zonaSur = await Zona.findOne({ codigo: 2 });

    if (!zonaCentro || !zonaSur) {
      logger.warn('⚠️ No se encontraron zonas. Ejecute primero: npm run seed (seeders territoriales)');
      process.exit(0);
    }

    // Buscar núcleos
    const nucleoPopayan = await Nucleo.findOne({ zona: zonaCentro._id });
    const nucleoCali = await Nucleo.findOne({ zona: zonaSur._id });

    if (!nucleoPopayan || !nucleoCali) {
      logger.warn('⚠️ No se encontraron núcleos');
      process.exit(0);
    }

    // Buscar fincas
    const fincaParaiso = await Finca.findOne({ nucleo: nucleoPopayan._id });
    const fincaCali = await Finca.findOne({ nucleo: nucleoCali._id });

    // Buscar ProyectoActividadLote (si existe el modelo)
    let proyectoActividadesLotes = [];
    try {
      const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
      proyectoActividadesLotes = await ProyectoActividadLote.find({ estado: 'EN_EJECUCION' }).limit(5);
      logger.success(`Encontrados ${proyectoActividadesLotes.length} ProyectoActividadLote`);
    } catch (error) {
      logger.warn('⚠️ No se encontró el modelo ProyectoActividadLote. Las asignaciones de trabajadores se crearán sin proyecto.');
    }

    // Buscar usuarios
    const adminUser = await User.findOne({ email: 'admin@efagram.com' });
    const jefeUser = await User.findOne({ email: 'jefe@efagram.com' });
    const supervisorUser = await User.findOne({ email: 'supervisor@efagram.com' });

    // ============================================
    // PASO 3: CREAR PERSONAS
    // ============================================
    logger.info('\n👥 Creando personas...');

    // Supervisores
    const supervisor1 = await Persona.create({
      usuario: supervisorUser?._id,
      tipo_doc: 'CC',
      num_doc: '10001001',
      nombres: 'Carlos Alberto',
      apellidos: 'Supervisor Gómez',
      telefono: '3201234567',
      email: 'supervisor@efagram.com',
      fecha_ingreso: new Date('2023-01-15'),
      tipo_contrato: 'INDEFINIDO',
      cargo: 'Supervisor de Campo',
      banco: 'Bancolombia',
      tipo_cuenta: 'AHORROS',
      numero_cuenta: '12345678901',
      eps: 'Sanitas',
      arl: 'SURA',
      fondo_pension: 'Porvenir',
      estado: 'ACTIVO'
    });
    logger.success(`Supervisor creado: ${supervisor1.nombreCompleto}`);

    const supervisor2 = await Persona.create({
      tipo_doc: 'CC',
      num_doc: '10001002',
      nombres: 'María Fernanda',
      apellidos: 'Supervisora López',
      telefono: '3207654321',
      email: 'maria.supervisor@efagram.com',
      fecha_ingreso: new Date('2023-02-01'),
      tipo_contrato: 'INDEFINIDO',
      cargo: 'Supervisor de Campo',
      banco: 'Davivienda',
      tipo_cuenta: 'AHORROS',
      numero_cuenta: '98765432101',
      eps: 'Compensar',
      arl: 'Positiva',
      fondo_pension: 'Protección',
      estado: 'ACTIVO'
    });
    logger.success(`Supervisor creado: ${supervisor2.nombreCompleto}`);

    // Trabajadores
    const trabajadores = [];
    const trabajadoresData = [
      { nombres: 'Juan Carlos', apellidos: 'Pérez Martínez', num_doc: '20001001' },
      { nombres: 'María Isabel', apellidos: 'González Ruiz', num_doc: '20001002' },
      { nombres: 'Pedro Antonio', apellidos: 'Rodríguez Silva', num_doc: '20001003' },
      { nombres: 'Ana María', apellidos: 'López García', num_doc: '20001004' },
      { nombres: 'Luis Fernando', apellidos: 'Sánchez Torres', num_doc: '20001005' },
      { nombres: 'Carmen Rosa', apellidos: 'Ramírez Castro', num_doc: '20001006' },
      { nombres: 'José Miguel', apellidos: 'Hernández Ortiz', num_doc: '20001007' },
      { nombres: 'Laura Cristina', apellidos: 'Díaz Moreno', num_doc: '20001008' },
      { nombres: 'Diego Alejandro', apellidos: 'Vargas Muñoz', num_doc: '20001009' },
      { nombres: 'Sofía Andrea', apellidos: 'Jiménez Vega', num_doc: '20001010' }
    ];

    for (const data of trabajadoresData) {
      const trabajador = await Persona.create({
        tipo_doc: 'CC',
        num_doc: data.num_doc,
        nombres: data.nombres,
        apellidos: data.apellidos,
        telefono: `320${Math.floor(Math.random() * 10000000)}`,
        fecha_ingreso: new Date('2024-01-01'),
        tipo_contrato: 'OBRA_LABOR',
        cargo: 'Trabajador de Campo',
        banco: 'Bancolombia',
        tipo_cuenta: 'AHORROS',
        numero_cuenta: `${Math.floor(Math.random() * 100000000000)}`,
        eps: 'Nueva EPS',
        arl: 'SURA',
        fondo_pension: 'Colpensiones',
        estado: 'ACTIVO'
      });
      trabajadores.push(trabajador);
      logger.success(`Trabajador creado: ${trabajador.nombreCompleto}`);
    }

    // Jefe de operaciones
    const jefeOperaciones = await Persona.create({
      usuario: jefeUser?._id,
      tipo_doc: 'CC',
      num_doc: '10002001',
      nombres: 'Roberto',
      apellidos: 'Jefe Operaciones',
      telefono: '3151234567',
      email: 'jefe@efagram.com',
      fecha_ingreso: new Date('2022-06-01'),
      tipo_contrato: 'INDEFINIDO',
      cargo: 'Jefe de Operaciones',
      banco: 'Banco de Bogotá',
      tipo_cuenta: 'CORRIENTE',
      numero_cuenta: '55555555501',
      eps: 'Sanitas',
      arl: 'AXA Colpatria',
      fondo_pension: 'Skandia',
      estado: 'ACTIVO'
    });
    logger.success(`Jefe creado: ${jefeOperaciones.nombreCompleto}`);

    // ============================================
    // PASO 4: ASIGNAR ROLES A PERSONAS
    // ============================================
    logger.info('\n🔐 Asignando roles a personas...');

    // Supervisor 1 - Rol Supervisor
    await PersonaRol.create({
      persona: supervisor1._id,
      rol: roles[ROLES.SUPERVISOR]._id,
      fecha_asignacion: new Date('2023-01-15'),
      activo: true
    });
    logger.success(`Rol asignado: ${supervisor1.nombreCompleto} → Supervisor`);

    // Supervisor 2 - Rol Supervisor
    await PersonaRol.create({
      persona: supervisor2._id,
      rol: roles[ROLES.SUPERVISOR]._id,
      fecha_asignacion: new Date('2023-02-01'),
      activo: true
    });
    logger.success(`Rol asignado: ${supervisor2.nombreCompleto} → Supervisor`);

    // Trabajadores - Rol Trabajador
    for (const trabajador of trabajadores) {
      await PersonaRol.create({
        persona: trabajador._id,
        rol: roles[ROLES.TRABAJADOR]._id,
        fecha_asignacion: new Date('2024-01-01'),
        activo: true
      });
    }
    logger.success(`Roles asignados a ${trabajadores.length} trabajadores`);

    // Jefe - Rol Jefe Operaciones
    await PersonaRol.create({
      persona: jefeOperaciones._id,
      rol: roles[ROLES.JEFE_OPERACIONES]._id,
      fecha_asignacion: new Date('2022-06-01'),
      activo: true
    });
    logger.success(`Rol asignado: ${jefeOperaciones.nombreCompleto} → Jefe Operaciones`);

    // ============================================
    // PASO 5: CREAR CUADRILLAS
    // ============================================
    logger.info('\n👷 Creando cuadrillas...');

    const cuadrilla1 = await Cuadrilla.create({
      codigo: 'CUA-001',
      nombre: 'Cuadrilla Popayán A',
      supervisor: supervisor1._id,
      nucleo: nucleoPopayan._id,
      miembros: trabajadores.slice(0, 5).map(t => ({
        persona: t._id,
        fecha_ingreso: new Date('2024-01-01'),
        activo: true
      })),
      activa: true
    });
    await cuadrilla1.populate(['supervisor', 'nucleo', 'miembros.persona']);
    logger.success(`Cuadrilla creada: ${cuadrilla1.nombre} (${cuadrilla1.cantidadMiembros} miembros)`);

    const cuadrilla2 = await Cuadrilla.create({
      codigo: 'CUA-002',
      nombre: 'Cuadrilla Cali B',
      supervisor: supervisor2._id,
      nucleo: nucleoCali._id,
      miembros: trabajadores.slice(5, 10).map(t => ({
        persona: t._id,
        fecha_ingreso: new Date('2024-01-01'),
        activo: true
      })),
      activa: true
    });
    await cuadrilla2.populate(['supervisor', 'nucleo', 'miembros.persona']);
    logger.success(`Cuadrilla creada: ${cuadrilla2.nombre} (${cuadrilla2.cantidadMiembros} miembros)`);

    // ============================================
    // PASO 6: CREAR ASIGNACIONES DE SUPERVISORES
    // ============================================
    logger.info('\n📍 Creando asignaciones de supervisores...');

    // Supervisor 1 asignado al núcleo Popayán
    const asigSup1 = await AsignacionSupervisor.create({
      supervisor: supervisor1._id,
      zona: zonaCentro._id,
      nucleo: nucleoPopayan._id,
      finca: fincaParaiso?._id,
      fecha_inicio: new Date('2023-01-15'),
      activa: true,
      observaciones: 'Supervisor principal del núcleo Popayán'
    });
    await asigSup1.populate(['supervisor', 'zona', 'nucleo', 'finca']);
    logger.success(`Asignación creada: ${supervisor1.nombreCompleto} → Núcleo ${nucleoPopayan.nombre}`);

    // Supervisor 2 asignado al núcleo Cali
    const asigSup2 = await AsignacionSupervisor.create({
      supervisor: supervisor2._id,
      zona: zonaSur._id,
      nucleo: nucleoCali._id,
      fecha_inicio: new Date('2023-02-01'),
      activa: true,
      observaciones: 'Supervisor principal del núcleo Cali'
    });
    await asigSup2.populate(['supervisor', 'zona', 'nucleo']);
    logger.success(`Asignación creada: ${supervisor2.nombreCompleto} → Núcleo ${nucleoCali.nombre}`);

    // ============================================
    // PASO 7: CREAR ASIGNACIONES DE TRABAJADORES
    // ============================================
    logger.info('\n📋 Creando asignaciones de trabajadores...');

    const asignacionesTrabajador = [];
    
    // Solo crear asignaciones si hay ProyectoActividadLote disponibles
    if (proyectoActividadesLotes.length > 0) {
      // Asignar trabajadores de la cuadrilla 1 a proyectos
      for (let i = 0; i < Math.min(5, trabajadores.length); i++) {
        const trabajador = trabajadores[i];
        const proyectoActividadLote = proyectoActividadesLotes[i % proyectoActividadesLotes.length];

        const asignacion = await AsignacionTrabajador.create({
          trabajador: trabajador._id,
          proyecto_actividad_lote: proyectoActividadLote._id,
          cuadrilla: cuadrilla1._id,
          fecha_inicio: new Date('2026-02-01'),
          horario: {
            hora_entrada: '07:00',
            hora_salida: '17:00'
          },
          activa: true,
          observaciones: 'Asignación inicial de trabajador a proyecto'
        });

        await asignacion.populate(['trabajador', 'proyecto_actividad_lote', 'cuadrilla']);
        asignacionesTrabajador.push(asignacion);
        logger.success(`Asignación creada: ${trabajador.nombreCompleto} → Proyecto`);
      }

      // Asignar trabajadores de la cuadrilla 2 a proyectos
      for (let i = 5; i < Math.min(10, trabajadores.length); i++) {
        if (i - 5 < proyectoActividadesLotes.length) {
          const trabajador = trabajadores[i];
          const proyectoActividadLote = proyectoActividadesLotes[(i - 5) % proyectoActividadesLotes.length];

          const asignacion = await AsignacionTrabajador.create({
            trabajador: trabajador._id,
            proyecto_actividad_lote: proyectoActividadLote._id,
            cuadrilla: cuadrilla2._id,
            fecha_inicio: new Date('2026-02-01'),
            horario: {
              hora_entrada: '07:00',
              hora_salida: '17:00'
            },
            activa: true,
            observaciones: 'Asignación inicial de trabajador a proyecto'
          });

          await asignacion.populate(['trabajador', 'proyecto_actividad_lote', 'cuadrilla']);
          asignacionesTrabajador.push(asignacion);
          logger.success(`Asignación creada: ${trabajador.nombreCompleto} → Proyecto`);
        }
      }
    } else {
      logger.warn('⚠️ No se encontraron ProyectoActividadLote disponibles');
      logger.warn('⚠️ Ejecute primero el seeder de proyectos para crear asignaciones de trabajadores');
      logger.info('ℹ️  El seeder continuará sin crear asignaciones de trabajadores');
    }

    // ============================================
    // RESUMEN
    // ============================================
    logger.success('\n✅ Seeding de Personal completado exitosamente');
    logger.info('\nRESUMEN:');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`✅ Roles creados: ${Object.keys(roles).length}`);
    logger.info(`✅ Supervisores: 2`);
    logger.info(`✅ Trabajadores: ${trabajadores.length}`);
    logger.info(`✅ Jefes: 1`);
    logger.info(`✅ Total personas: ${2 + trabajadores.length + 1}`);
    logger.info(`✅ Asignaciones persona-rol: ${trabajadores.length + 3}`);
    logger.info(`✅ Cuadrillas: 2`);
    logger.info(`✅ Asignaciones supervisores: 2`);
    logger.info(`✅ Asignaciones trabajadores: ${asignacionesTrabajador.length}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    logger.info('📊 ESTRUCTURA CREADA:');
    logger.info(`   Cuadrilla 1: ${cuadrilla1.nombre}`);
    logger.info(`   - Supervisor: ${supervisor1.nombreCompleto}`);
    logger.info(`   - Núcleo: ${nucleoPopayan.nombre}`);
    logger.info(`   - Miembros: ${cuadrilla1.cantidadMiembros} trabajadores`);
    if (asignacionesTrabajador.length > 0) {
      logger.info(`   - Asignaciones activas: ${asignacionesTrabajador.filter(a => trabajadores.slice(0, 5).some(t => t._id.equals(a.trabajador._id))).length}`);
    }
    logger.info('');
    logger.info(`   Cuadrilla 2: ${cuadrilla2.nombre}`);
    logger.info(`   - Supervisor: ${supervisor2.nombreCompleto}`);
    logger.info(`   - Núcleo: ${nucleoCali.nombre}`);
    logger.info(`   - Miembros: ${cuadrilla2.cantidadMiembros} trabajadores`);
    if (asignacionesTrabajador.length > 0) {
      logger.info(`   - Asignaciones activas: ${asignacionesTrabajador.filter(a => trabajadores.slice(5, 10).some(t => t._id.equals(a.trabajador._id))).length}`);
    }
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error en seeding de Personal:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Ejecutar seeder
seedPersonal();