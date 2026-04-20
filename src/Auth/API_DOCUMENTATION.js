/**
 * ==========================================
 * 📚 DOCUMENTACIÓN API - GESTIÓN DE USUARIOS
 * ==========================================
 * 
 * ROLES DISPONIBLES:
 * - ADMIN_SISTEMA: Administrador del Sistema (nivel 1)
 * - TALENTO_HUMANO: Talento Humano (nivel 2)
 * - SUPERVISOR: Supervisor (nivel 3)
 * - JEFE_OPERACIONES: Jefe de Operaciones (nivel 4)
 * - TRABAJADOR: Trabajador (nivel 5)
 * - ADMIN_FINCA: Administrador de Finca
 * - SISTEMAS: Sistemas
 * 
 * ==========================================
 * 🔐 AUTENTICACIÓN REQUERIDA
 * ==========================================
 * 
 * Todas las rutas de usuarios requieren:
 * Header: Authorization: Bearer <token_jwt>
 * 
 * ==========================================
 * 📋 ENDPOINTS DISPONIBLES
 * ==========================================
 */

// ==========================================
// 1️⃣ AUTENTICACIÓN
// ==========================================

/**
 * POST /api/v1/auth/register
 * Registrar nuevo usuario
 * Access: Public
 * 
 * Body:
 * {
 *   "nombre": "string (2-50 chars)",
 *   "email": "string (email válido)",
 *   "password": "string (min 6 chars)",
 *   "roles": ["TRABAJADOR"] // Optional, default: TRABAJADOR
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Usuario registrado exitosamente",
 *   "data": {
 *     "user": {
 *       "_id": "...",
 *       "email": "...",
 *       "nombre": "...",
 *       "roles": ["..."],
 *       "createdAt": "..."
 *     },
 *     "token": "eyJ..."
 *   }
 * }
 */

/**
 * POST /api/v1/auth/login
 * Login de usuario
 * Access: Public
 * 
 * Body:
 * {
 *   "email": "string",
 *   "password": "string"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Login exitoso",
 *   "data": {
 *     "user": { ... },
 *     "token": "eyJ..."
 *   }
 * }
 */

/**
 * GET /api/v1/auth/me
 * Obtener perfil del usuario autenticado
 * Access: Private
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "...",
 *     "nombre": "...",
 *     "email": "...",
 *     "roles": ["..."],
 *     "activo": true,
 *     "avatar": "...",
 *     "createdAt": "..."
 *   }
 * }
 */

/**
 * PUT /api/v1/auth/me
 * Actualizar perfil del usuario autenticado
 * Access: Private
 * 
 * Body:
 * {
 *   "nombre": "string", // optional
 *   "email": "string", // optional
 *   "apellidos": "string" // optional
 * }
 */

/**
 * PUT /api/v1/auth/change-password
 * Cambiar contraseña del usuario
 * Access: Private
 * 
 * Body:
 * {
 *   "currentPassword": "string",
 *   "newPassword": "string"
 * }
 */

/**
 * POST /api/v1/auth/logout
 * Logout (lado servidor - invalidar sesión)
 * Access: Private
 */

// ==========================================
// 2️⃣ GESTIÓN DE USUARIOS - CRUD COMPLETO
// ==========================================

/**
 * GET /api/v1/users
 * Obtener lista de usuarios con filtros y paginación
 * Access: Private (Admin, Talento Humano, Supervisor)
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 100)
 * - search: string (busca en nombre y email)
 * - activo: boolean (filtrar por estado)
 * - rol: string (filtrar por rol específico)
 * 
 * Example: GET /api/v1/users?page=1&limit=10&search=admin&activo=true&rol=ADMIN_SISTEMA
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "usuarios": [
 *       {
 *         "_id": "...",
 *         "nombre": "...",
 *         "email": "...",
 *         "roles": ["ADMIN_SISTEMA"],
 *         "activo": true,
 *         "avatar": "...",
 *         "createdAt": "..."
 *       }
 *     ],
 *     "paginacion": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 50,
 *       "pages": 5
 *     }
 *   }
 * }
 */

/**
 * GET /api/v1/users/:id
 * Obtener usuario por ID
 * Access: Private (Admin o usuario propietario)
 * 
 * Params:
 * - id: MongoID válido
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": { ... usuario completo ... }
 * }
 */

/**
 * POST /api/v1/users
 * Crear nuevo usuario
 * Access: Private (Admin, Talento Humano)
 * ⚡ GENERA TOKENS AUTOMÁTICAMENTE
 * 
 * Body:
 * {
 *   "nombre": "string (2-50 chars)", // required
 *   "email": "string (email válido)", // required
 *   "password": "string (min 6 chars)", // required
 *   "roles": ["ADMIN_SISTEMA", "SUPERVISOR"], // optional, default: [TRABAJADOR]
 *   "avatar": "https://..." // optional
 * }
 * 
 * Response: (Status 201)
 * {
 *   "success": true,
 *   "message": "Usuario creado exitosamente",
 *   "data": {
 *     "usuario": {
 *       "_id": "...",
 *       "nombre": "...",
 *       "email": "...",
 *       "roles": ["ADMIN_SISTEMA", "SUPERVISOR"],
 *       "activo": true,
 *       "avatar": "...",
 *       "createdAt": "..."
 *     },
 *     "tokens": {
 *       "token": "eyJ...", // JWT token de acceso
 *       "refreshToken": "eyJ..." // Token para refrescar sesión
 *     }
 *   }
 * }
 */

/**
 * PUT /api/v1/users/:id
 * Actualizar datos de usuario
 * Access: Private (Admin o usuario propietario)
 * 
 * Params:
 * - id: MongoID válido
 * 
 * Body (todos optional):
 * {
 *   "nombre": "string (2-50 chars)",
 *   "email": "string (email válido)",
 *   "avatar": "https://...",
 *   "roles": ["SUPERVISOR"], // Solo admin puede cambiar
 *   "activo": true // Solo admin puede cambiar
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Usuario actualizado exitosamente",
 *   "data": { ... usuario actualizado ... }
 * }
 */

/**
 * PUT /api/v1/users/:id/password
 * Cambiar contraseña de usuario
 * Access: Private (Admin o usuario propietario)
 * 
 * Params:
 * - id: MongoID válido
 * 
 * Body:
 * {
 *   "newPassword": "string (min 6 chars)" // required
 * }
 */

/**
 * PUT /api/v1/users/:id/roles
 * Cambiar roles de usuario (solo admin)
 * Access: Private (Admin)
 * 
 * Params:
 * - id: MongoID válido
 * 
 * Body:
 * {
 *   "roles": ["SUPERVISOR", "JEFE_OPERACIONES"] // required, array
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Roles del usuario actualizados exitosamente",
 *   "data": { ... usuario con roles actualizados ... }
 * }
 */

/**
 * PUT /api/v1/users/:id/activate
 * Activar usuario
 * Access: Private (Admin, Talento Humano)
 * 
 * Params:
 * - id: MongoID válido
 */

/**
 * PUT /api/v1/users/:id/deactivate
 * Desactivar usuario (soft delete)
 * Access: Private (Admin, Talento Humano)
 * 
 * Params:
 * - id: MongoID válido
 */

/**
 * DELETE /api/v1/users/:id
 * Eliminar usuario (hard delete, permanente)
 * Access: Private (Admin)
 * 
 * Params:
 * - id: MongoID válido
 */

// ==========================================
// 3️⃣ ESTADÍSTICAS Y DATOS DE ROLES
// ==========================================

/**
 * GET /api/v1/users/stats/dashboard
 * Obtener estadísticas de usuarios
 * Access: Private (Admin)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalUsuarios": 50,
 *     "usuariosActivos": 45,
 *     "usuariosInactivos": 5,
 *     "porRol": {
 *       "ADMIN_SISTEMA": 2,
 *       "TALENTO_HUMANO": 3,
 *       "SUPERVISOR": 5,
 *       "JEFE_OPERACIONES": 10,
 *       "TRABAJADOR": 30,
 *       "ADMIN_FINCA": 0,
 *       "SISTEMAS": 0
 *     }
 *   }
 * }
 */

/**
 * GET /api/v1/users/roles/list
 * Obtener lista de roles disponibles
 * Access: Private
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "roles": [
 *       {
 *         "id": "ADMIN_SISTEMA",
 *         "nombre": "Administrador del Sistema",
 *         "descripcion": "Acceso total al sistema, gestión de usuarios, configuración",
 *         "nivel": 1,
 *         "color": "#FF0000"
 *       },
 *       {
 *         "id": "TALENTO_HUMANO",
 *         "nombre": "Talento Humano",
 *         "descripcion": "Gestión de usuarios, nómina, recursos humanos",
 *         "nivel": 2,
 *         "color": "#0066CC"
 *       },
 *       {
 *         "id": "SUPERVISOR",
 *         "nombre": "Supervisor",
 *         "descripcion": "Supervisión de proyectos, gestión de actividades y reportes",
 *         "nivel": 3,
 *         "color": "#FF9900"
 *       },
 *       ...
 *     ]
 *   }
 * }
 */

/**
 * GET /api/v1/users/roles/:rol/permissions
 * Obtener permisos específicos de un rol
 * Access: Private (Admin)
 * 
 * Params:
 * - rol: Nombre del rol (ej: ADMIN_SISTEMA)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "rol": "ADMIN_SISTEMA",
 *     "info": {
 *       "nombre": "Administrador del Sistema",
 *       "descripcion": "Acceso total al sistema...",
 *       "nivel": 1,
 *       "color": "#FF0000"
 *     },
 *     "permisos": [
 *       "users:list",
 *       "users:view",
 *       "users:create",
 *       "users:update",
 *       "users:delete",
 *       "users:changePassword",
 *       "users:changeRole",
 *       "users:activate",
 *       "users:deactivate",
 *       "proyectos:list",
 *       "proyectos:view",
 *       "proyectos:create",
 *       ...
 *     ],
 *     "totalPermisos": 45
 *   }
 * }
 */

// ==========================================
// 🔑 CÓDIGOS DE ERROR HTTP
// ==========================================

/**
 * 200 OK: Solicitud exitosa
 * 201 CREATED: Usuario creado exitosamente
 * 400 BAD REQUEST: Datos inválidos o incompletos
 * 401 UNAUTHORIZED: Token faltante, inválido o expirado
 * 403 FORBIDDEN: Permisos insuficientes
 * 404 NOT FOUND: Recurso no encontrado
 * 409 CONFLICT: Email ya existe
 * 500 INTERNAL SERVER ERROR: Error del servidor
 */

// ==========================================
// 🛡️ MIDDLEWARE DE SEGURIDAD IMPLEMENTADO
// ==========================================

/**
 * ✅ authenticate - Verifica token JWT y carga datos frescos del usuario
 * ✅ authorize - Verifica roles permitidos
 * ✅ checkPermission - Valida permisos granulares
 * ✅ checkOwnerOrAdmin - Verifica propietario o admin
 * ✅ isSupervisorOrAdmin - Verifica supervisor o admin
 * ✅ isAdmin - Verifica solo admin
 * ✅ isTalentoHumano - Verifica solo talento humano
 * 
 * Localización: /src/middlewares/userManagement.middleware.js
 */

// ==========================================
// 📝 VALIDACIONES IMPLEMENTADAS
// ==========================================

/**
 * Email:
 * - Debe ser válido (formato email)
 * - Debe ser único
 * - Se normaliza a minúsculas
 * 
 * Contraseña:
 * - Mínimo 6 caracteres
 * - Se encripta con bcrypt (salt: 10)
 * - Se valida antes de comparar
 * 
 * Nombre:
 * - Requerido
 * - 2-50 caracteres
 * - Se trimea
 * 
 * Roles:
 * - Debe existir en enum ROLES
 * - Puede tener múltiples roles
 * 
 * Admin del Sistema:
 * - No se puede eliminar el último admin
 * - No se puede desactivar el último admin
 * - No se puede remover el rol del último admin
 */

// ==========================================
// 🎯 EJEMPLOS DE USO
// ==========================================

/**
 * 1. CREAR USUARIO ADMIN DESDE MODAL
 * 
 * POST /api/v1/users
 * Headers: { Authorization: "Bearer <token_admin>" }
 * 
 * Body:
 * {
 *   "nombre": "Administrador",
 *   "email": "admin@efagram.com",
 *   "password": "Admin123!@#",
 *   "roles": ["ADMIN_SISTEMA"]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Usuario creado exitosamente",
 *   "data": {
 *     "usuario": { ... },
 *     "tokens": {
 *       "token": "eyJ...", // ⬅️ USAR ESTE TOKEN PARA LOGIN DEL NUEVO USUARIO
 *       "refreshToken": "eyJ..."
 *     }
 *   }
 * }
 */

/**
 * 2. CREAR USUARIO SUPERVISOR
 * 
 * POST /api/v1/users
 * Headers: { Authorization: "Bearer <token_admin>" }
 * 
 * Body:
 * {
 *   "nombre": "Supervisor Principal",
 *   "email": "supervisor@efagram.com",
 *   "password": "Supervisor123!@#",
 *   "roles": ["SUPERVISOR"]
 * }
 */

/**
 * 3. OBTENER LISTA DE USUARIOS CON FILTROS
 * 
 * GET /api/v1/users?page=1&limit=10&rol=SUPERVISOR&activo=true
 * Headers: { Authorization: "Bearer <token>" }
 */

/**
 * 4. CAMBIAR ROLES DE UN USUARIO
 * 
 * PUT /api/v1/users/{id}/roles
 * Headers: { Authorization: "Bearer <token_admin>" }
 * 
 * Body:
 * {
 *   "roles": ["SUPERVISOR", "JEFE_OPERACIONES"]
 * }
 */

/**
 * 5. OBTENER PERMISOS DE UN ROL
 * 
 * GET /api/v1/users/roles/SUPERVISOR/permissions
 * Headers: { Authorization: "Bearer <token_admin>" }
 */

// ==========================================
// 🚀 PRÓXIMAS IMPLEMENTACIONES SUGERIDAS
// ==========================================

/**
 * ✓ Sistema de permisos centralizado
 * ✓ CRUD completo de usuarios
 * ✓ Generación automática de tokens
 * ✓ Middleware de seguridad
 * 
 * Próximas:
 * - [ ] Refresh token endpoint
 * - [ ] Reset password via email
 * - [ ] Two-factor authentication
 * - [ ] Audit log de cambios de usuarios
 * - [ ] Rate limiting en login
 * - [ ] Bloqueo temporal por intentos fallidos
 * - [ ] Import masivo de usuarios
 */

module.exports = {
  documentacion: 'Ver comentarios arriba para documentación completa'
};
