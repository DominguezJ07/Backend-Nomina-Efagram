/**
 * Sistema centralizado de permisos por rol
 * Define qué acciones puede realizar cada rol en el sistema
 */

const ROLES = require('./constants').ROLES;

/**
 * Matriz de permisos por rol
 * Estructura: { accion: [rolesPermitidos] }
 */
const PERMISSIONS = {
  // Gestión de Usuarios
  'users:list': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO, ROLES.SUPERVISOR],
  'users:view': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES],
  'users:create': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO],
  'users:update': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO],
  'users:delete': [ROLES.ADMIN_SISTEMA],
  'users:changePassword': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO],
  'users:changeRole': [ROLES.ADMIN_SISTEMA],
  'users:activate': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO],
  'users:deactivate': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO],

  // Gestión de Proyectos
  'proyectos:list': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES],
  'proyectos:view': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES, ROLES.TRABAJADOR],
  'proyectos:create': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES],
  'proyectos:update': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES],
  'proyectos:delete': [ROLES.ADMIN_SISTEMA],

  // Gestión de Nómina
  'nomina:list': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO, ROLES.SUPERVISOR],
  'nomina:view': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO, ROLES.SUPERVISOR],
  'nomina:create': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO],
  'nomina:update': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO],
  'nomina:process': [ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO],

  // Gestión de Contratos
  'contratos:list': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES],
  'contratos:view': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES, ROLES.TRABAJADOR],
  'contratos:create': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES],
  'contratos:update': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES],
  'contratos:delete': [ROLES.ADMIN_SISTEMA],

  // Gestión de Reportes
  'reportes:view': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO],
  'reportes:download': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO],

  // Gestión de Control Semanal
  'controlSemanal:view': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES, ROLES.TRABAJADOR],
  'controlSemanal:create': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES, ROLES.TRABAJADOR],
  'controlSemanal:update': [ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR, ROLES.JEFE_OPERACIONES],
  'controlSemanal:submit': [ROLES.TRABAJADOR, ROLES.JEFE_OPERACIONES],

  // Configuración del Sistema
  'sistema:configure': [ROLES.ADMIN_SISTEMA],
  'sistema:view': [ROLES.ADMIN_SISTEMA, ROLES.SISTEMAS],
};

/**
 * Descripción de cada rol
 */
const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN_SISTEMA]: {
    nombre: 'Administrador del Sistema',
    descripcion: 'Acceso total al sistema, gestión de usuarios, configuración',
    nivel: 1,
    color: '#FF0000'
  },
  [ROLES.TALENTO_HUMANO]: {
    nombre: 'Talento Humano',
    descripcion: 'Gestión de usuarios, nómina, recursos humanos',
    nivel: 2,
    color: '#0066CC'
  },
  [ROLES.SUPERVISOR]: {
    nombre: 'Supervisor',
    descripcion: 'Supervisión de proyectos, gestión de actividades y reportes',
    nivel: 3,
    color: '#FF9900'
  },
  [ROLES.JEFE_OPERACIONES]: {
    nombre: 'Jefe de Operaciones',
    descripcion: 'Gestión operativa, coordinación de equipos y proyectos',
    nivel: 4,
    color: '#00AA00'
  },
  [ROLES.SISTEMAS]: {
    nombre: 'Sistemas',
    descripcion: 'Mantenimiento y monitoreo del sistema',
    nivel: 2,
    color: '#9900CC'
  },
  [ROLES.ADMIN_FINCA]: {
    nombre: 'Administrador de Finca',
    descripcion: 'Administración operativa de la finca',
    nivel: 3,
    color: '#00CC99'
  },
  [ROLES.TRABAJADOR]: {
    nombre: 'Trabajador',
    descripcion: 'Ejecución de actividades y registro de tareas',
    nivel: 5,
    color: '#666666'
  }
};

/**
 * Verificar si un rol tiene permiso para una acción
 * @param {String} rol - El rol a verificar
 * @param {String} accion - La acción a verificar (ej: 'users:create')
 * @returns {Boolean} true si tiene permiso, false de lo contrario
 */
const hasPermission = (rol, accion) => {
  if (!PERMISSIONS[accion]) {
    return false;
  }
  return PERMISSIONS[accion].includes(rol);
};

/**
 * Verificar si un usuario tiene permiso (puede tener múltiples roles)
 * @param {Array<String>} rolesUsuario - Array de roles del usuario
 * @param {String} accion - La acción a verificar
 * @returns {Boolean} true si al menos uno de sus roles tiene permiso
 */
const userHasPermission = (rolesUsuario, accion) => {
  if (!Array.isArray(rolesUsuario) || !rolesUsuario.length) {
    return false;
  }
  return rolesUsuario.some(rol => hasPermission(rol, accion));
};

/**
 * Obtener descripción completa de un rol
 * @param {String} rol - El rol
 * @returns {Object} Información del rol
 */
const getRoleInfo = (rol) => {
  return ROLE_DESCRIPTIONS[rol] || null;
};

/**
 * Obtener todos los permisos de un rol
 * @param {String} rol - El rol
 * @returns {Array<String>} Array de acciones permitidas
 */
const getPermissionsByRole = (rol) => {
  return Object.keys(PERMISSIONS).filter(
    accion => PERMISSIONS[accion].includes(rol)
  );
};

/**
 * Obtener todos los roles que tienen un permiso
 * @param {String} accion - La acción
 * @returns {Array<String>} Array de roles que pueden realizar la acción
 */
const getRolesByPermission = (accion) => {
  return PERMISSIONS[accion] || [];
};

module.exports = {
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
  hasPermission,
  userHasPermission,
  getRoleInfo,
  getPermissionsByRole,
  getRolesByPermission
};
