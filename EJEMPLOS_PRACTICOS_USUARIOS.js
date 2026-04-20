/**
 * 🔧 EJEMPLOS PRÁCTICOS - GESTIÓN DE USUARIOS
 * 
 * Este archivo contiene ejemplos listos para usar en Postman, curl, o directamente en el frontend
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1️⃣ AUTENTICACIÓN - LOGIN Y REGISTRO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 1.1 - REGISTRAR NUEVO USUARIO (Sin ser admin)
 * 
 * POST http://localhost:5000/api/v1/auth/register
 * Content-Type: application/json
 */
{
  "nombre": "Juan Pérez",
  "email": "juan@efagram.com",
  "password": "Juan123456",
  "roles": ["TRABAJADOR"]
}

// Response (Status 201):
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "juan@efagram.com",
      "nombre": "Juan Pérez",
      "roles": ["TRABAJADOR"],
      "createdAt": "2026-04-20T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

/**
 * EJEMPLO 1.2 - LOGIN
 * 
 * POST http://localhost:5000/api/v1/auth/login
 * Content-Type: application/json
 */
{
  "email": "admin@efagram.com",
  "password": "Admin123456"
}

// Response (Status 200):
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "nombre": "Administrador",
      "email": "admin@efagram.com",
      "roles": ["ADMIN_SISTEMA"],
      "activo": true,
      "createdAt": "2026-04-20T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

/**
 * EJEMPLO 1.3 - OBTENER PERFIL ACTUAL
 * 
 * GET http://localhost:5000/api/v1/auth/me
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

// Response (Status 200):
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "nombre": "Administrador",
    "email": "admin@efagram.com",
    "roles": ["ADMIN_SISTEMA"],
    "activo": true,
    "avatar": null,
    "createdAt": "2026-04-20T10:00:00Z"
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2️⃣ GESTIÓN DE USUARIOS - DESDE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 2.1 - CREAR USUARIO ADMIN (DESDE MODAL)
 * 
 * POST http://localhost:5000/api/v1/users
 * Authorization: Bearer <token_admin>
 * Content-Type: application/json
 * 
 * Este es el flujo principal para crear usuarios desde el modal
 */
{
  "nombre": "Administrador Sistema",
  "email": "admin-sistema@efagram.com",
  "password": "AdminSistema123!@#",
  "roles": ["ADMIN_SISTEMA"],
  "avatar": "https://example.com/avatar.jpg"  // Optional
}

// Response (Status 201 - TOKENS GENERADOS AUTOMÁTICAMENTE):
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "usuario": {
      "_id": "507f1f77bcf86cd799439012",
      "nombre": "Administrador Sistema",
      "email": "admin-sistema@efagram.com",
      "roles": ["ADMIN_SISTEMA"],
      "activo": true,
      "avatar": "https://example.com/avatar.jpg",
      "createdAt": "2026-04-20T11:00:00Z"
    },
    "tokens": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMiIsImVtYWlsIjoiYWRtaW4tc2lzdGVtYUBlZmFncmFtLmNvbSIsInJvbGVzIjpbIkFETUlOX1NJU1RFTUEiXSwibmFtYnJlIjoiQWRtaW5pc3RyYWRvciBTaXN0ZW1hIiwiaWF0IjoxNzEzNjE2ODAwLCJleHAiOjE3MTM3MDMyMDB9.xxxx",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx"
    }
  }
}

/**
 * EJEMPLO 2.2 - CREAR USUARIO SUPERVISOR (DESDE MODAL)
 * 
 * POST http://localhost:5000/api/v1/users
 * Authorization: Bearer <token_admin>
 * Content-Type: application/json
 */
{
  "nombre": "Supervisor Principal",
  "email": "supervisor@efagram.com",
  "password": "SupervisorPrincipal123!@#",
  "roles": ["SUPERVISOR"]
}

// Response (Status 201):
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "usuario": {
      "_id": "507f1f77bcf86cd799439013",
      "nombre": "Supervisor Principal",
      "email": "supervisor@efagram.com",
      "roles": ["SUPERVISOR"],
      "activo": true,
      "createdAt": "2026-04-20T11:15:00Z"
    },
    "tokens": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}

/**
 * EJEMPLO 2.3 - CREAR USUARIO TALENTO HUMANO
 * 
 * POST http://localhost:5000/api/v1/users
 * Authorization: Bearer <token_admin>
 * Content-Type: application/json
 */
{
  "nombre": "Gerente Talento Humano",
  "email": "rrhh@efagram.com",
  "password": "RRHH123456",
  "roles": ["TALENTO_HUMANO"]
}

/**
 * EJEMPLO 2.4 - CREAR USUARIO CON MÚLTIPLES ROLES
 * 
 * POST http://localhost:5000/api/v1/users
 * Authorization: Bearer <token_admin>
 * Content-Type: application/json
 * 
 * Un usuario puede tener varios roles simultáneamente
 */
{
  "nombre": "Coordinador Operaciones",
  "email": "coordinador@efagram.com",
  "password": "Coordinador123456",
  "roles": ["SUPERVISOR", "JEFE_OPERACIONES"]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3️⃣ LISTAR USUARIOS CON FILTROS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 3.1 - OBTENER LISTA SIMPLE
 * 
 * GET http://localhost:5000/api/v1/users
 * Authorization: Bearer <token>
 */

// Response (Status 200):
{
  "success": true,
  "data": {
    "usuarios": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "nombre": "Administrador",
        "email": "admin@efagram.com",
        "roles": ["ADMIN_SISTEMA"],
        "activo": true,
        "createdAt": "2026-04-20T10:00:00Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "nombre": "Supervisor Principal",
        "email": "supervisor@efagram.com",
        "roles": ["SUPERVISOR"],
        "activo": true,
        "createdAt": "2026-04-20T11:15:00Z"
      }
    ],
    "paginacion": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "pages": 1
    }
  }
}

/**
 * EJEMPLO 3.2 - CON PAGINACIÓN
 * 
 * GET http://localhost:5000/api/v1/users?page=2&limit=5
 * Authorization: Bearer <token>
 */

/**
 * EJEMPLO 3.3 - BUSCAR USUARIO POR NOMBRE O EMAIL
 * 
 * GET http://localhost:5000/api/v1/users?search=admin
 * Authorization: Bearer <token>
 * 
 * Busca en nombre y email (case-insensitive)
 */

/**
 * EJEMPLO 3.4 - FILTRAR POR ROL
 * 
 * GET http://localhost:5000/api/v1/users?rol=SUPERVISOR
 * Authorization: Bearer <token>
 */

/**
 * EJEMPLO 3.5 - FILTRAR SOLO ACTIVOS
 * 
 * GET http://localhost:5000/api/v1/users?activo=true
 * Authorization: Bearer <token>
 */

/**
 * EJEMPLO 3.6 - COMBINACIÓN DE FILTROS (más realista)
 * 
 * GET http://localhost:5000/api/v1/users?page=1&limit=10&search=supervisor&rol=SUPERVISOR&activo=true
 * Authorization: Bearer <token>
 * 
 * Busca: "supervisor" en nombre/email, rol supervisor, solo activos, página 1, 10 por página
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 4️⃣ OBTENER USUARIO ESPECÍFICO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 4.1 - OBTENER USUARIO POR ID
 * 
 * GET http://localhost:5000/api/v1/users/507f1f77bcf86cd799439011
 * Authorization: Bearer <token>
 * 
 * El ID debe ser un MongoID válido
 */

// Response (Status 200):
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Administrador",
    "email": "admin@efagram.com",
    "roles": ["ADMIN_SISTEMA"],
    "activo": true,
    "avatar": null,
    "ultimo_acceso": "2026-04-20T12:30:00Z",
    "createdAt": "2026-04-20T10:00:00Z",
    "updatedAt": "2026-04-20T12:30:00Z"
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5️⃣ ACTUALIZAR USUARIO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 5.1 - ACTUALIZAR DATOS DEL USUARIO
 * 
 * PUT http://localhost:5000/api/v1/users/507f1f77bcf86cd799439011
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * 
 * Puede actualizar: nombre, email, avatar (usuario propietario)
 * Con permisos admin también: roles, activo
 */
{
  "nombre": "Administrador Sistema Actualizado",
  "email": "admin-nuevo@efagram.com",
  "avatar": "https://example.com/new-avatar.jpg"
}

// Response (Status 200):
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Administrador Sistema Actualizado",
    "email": "admin-nuevo@efagram.com",
    "roles": ["ADMIN_SISTEMA"],
    "activo": true,
    "avatar": "https://example.com/new-avatar.jpg",
    "updatedAt": "2026-04-20T13:00:00Z"
  }
}

/**
 * EJEMPLO 5.2 - ACTUALIZAR MÚLTIPLES CAMPOS
 * 
 * PUT http://localhost:5000/api/v1/users/507f1f77bcf86cd799439012
 * Authorization: Bearer <token_admin>
 * Content-Type: application/json
 * 
 * Solo admin puede actualizar roles y estado
 */
{
  "nombre": "Supervisor Modificado",
  "email": "supervisor-nuevo@efagram.com",
  "roles": ["SUPERVISOR", "JEFE_OPERACIONES"],
  "activo": true
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6️⃣ CAMBIAR CONTRASEÑA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 6.1 - CAMBIAR CONTRASEÑA PROPIA
 * 
 * PUT http://localhost:5000/api/v1/auth/change-password
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * 
 * El usuario puede cambiar su propia contraseña
 */
{
  "currentPassword": "PasswordActual123",
  "newPassword": "PasswordNueva456"
}

/**
 * EJEMPLO 6.2 - ADMIN CAMBIA CONTRASEÑA DE OTRO USUARIO
 * 
 * PUT http://localhost:5000/api/v1/users/507f1f77bcf86cd799439012/password
 * Authorization: Bearer <token_admin>
 * Content-Type: application/json
 * 
 * Admin puede cambiar contraseña a cualquier usuario
 */
{
  "newPassword": "NuevaContrasena123456"
}

// Response (Status 200):
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7️⃣ CAMBIAR ROLES (SOLO ADMIN)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 7.1 - CAMBIAR ROLES DE UN USUARIO
 * 
 * PUT http://localhost:5000/api/v1/users/507f1f77bcf86cd799439012/roles
 * Authorization: Bearer <token_admin>
 * Content-Type: application/json
 * 
 * Solo el administrador puede cambiar roles
 */
{
  "roles": ["SUPERVISOR", "JEFE_OPERACIONES"]
}

// Response (Status 200):
{
  "success": true,
  "message": "Roles del usuario actualizados exitosamente",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "nombre": "Supervisor Principal",
    "email": "supervisor@efagram.com",
    "roles": ["SUPERVISOR", "JEFE_OPERACIONES"],
    "activo": true
  }
}

/**
 * EJEMPLO 7.2 - CAMBIAR A TALENTO HUMANO
 * 
 * PUT http://localhost:5000/api/v1/users/507f1f77bcf86cd799439012/roles
 * Authorization: Bearer <token_admin>
 * Content-Type: application/json
 */
{
  "roles": ["TALENTO_HUMANO"]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8️⃣ ACTIVAR/DESACTIVAR USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 8.1 - DESACTIVAR USUARIO (soft delete)
 * 
 * PUT http://localhost:5000/api/v1/users/507f1f77bcf86cd799439012/deactivate
 * Authorization: Bearer <token_admin>
 * 
 * El usuario sigue existiendo en BD pero no puede hacer login
 * No se puede desactivar si es el último admin
 */

// Response (Status 200):
{
  "success": true,
  "message": "Usuario desactivado exitosamente"
}

/**
 * EJEMPLO 8.2 - ACTIVAR USUARIO
 * 
 * PUT http://localhost:5000/api/v1/users/507f1f77bcf86cd799439012/activate
 * Authorization: Bearer <token_admin>
 * 
 * Reactiva un usuario desactivado
 */

// Response (Status 200):
{
  "success": true,
  "message": "Usuario activado exitosamente"
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9️⃣ ELIMINAR USUARIO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 9.1 - ELIMINAR USUARIO (hard delete - PERMANENTE)
 * 
 * DELETE http://localhost:5000/api/v1/users/507f1f77bcf86cd799439012
 * Authorization: Bearer <token_admin>
 * 
 * El usuario se elimina completamente de la base de datos
 * No se puede eliminar si es el último admin
 * 
 * ADVERTENCIA: Esta acción es IRREVERSIBLE
 */

// Response (Status 200):
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔟 INFORMACIÓN DE ROLES Y PERMISOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJEMPLO 10.1 - OBTENER LISTA DE ROLES DISPONIBLES
 * 
 * GET http://localhost:5000/api/v1/users/roles/list
 * Authorization: Bearer <token>
 * 
 * Cualquier usuario autenticado puede ver los roles disponibles
 */

// Response (Status 200):
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "ADMIN_SISTEMA",
        "nombre": "Administrador del Sistema",
        "descripcion": "Acceso total al sistema, gestión de usuarios, configuración",
        "nivel": 1,
        "color": "#FF0000"
      },
      {
        "id": "TALENTO_HUMANO",
        "nombre": "Talento Humano",
        "descripcion": "Gestión de usuarios, nómina, recursos humanos",
        "nivel": 2,
        "color": "#0066CC"
      },
      {
        "id": "SUPERVISOR",
        "nombre": "Supervisor",
        "descripcion": "Supervisión de proyectos, gestión de actividades y reportes",
        "nivel": 3,
        "color": "#FF9900"
      },
      {
        "id": "JEFE_OPERACIONES",
        "nombre": "Jefe de Operaciones",
        "descripcion": "Gestión operativa, coordinación de equipos y proyectos",
        "nivel": 4,
        "color": "#00AA00"
      },
      {
        "id": "TRABAJADOR",
        "nombre": "Trabajador",
        "descripcion": "Ejecución de actividades y registro de tareas",
        "nivel": 5,
        "color": "#666666"
      }
    ]
  }
}

/**
 * EJEMPLO 10.2 - OBTENER PERMISOS DE UN ROL ESPECÍFICO
 * 
 * GET http://localhost:5000/api/v1/users/roles/SUPERVISOR/permissions
 * Authorization: Bearer <token_admin>
 * 
 * Obtiene todos los permisos que tiene un rol específico
 */

// Response (Status 200):
{
  "success": true,
  "data": {
    "rol": "SUPERVISOR",
    "info": {
      "nombre": "Supervisor",
      "descripcion": "Supervisión de proyectos, gestión de actividades y reportes",
      "nivel": 3,
      "color": "#FF9900"
    },
    "permisos": [
      "users:list",
      "users:view",
      "proyectos:list",
      "proyectos:view",
      "proyectos:create",
      "proyectos:update",
      "controlSemanal:view",
      "controlSemanal:update",
      "reportes:view",
      "reportes:download"
    ],
    "totalPermisos": 10
  }
}

/**
 * EJEMPLO 10.3 - OBTENER ESTADÍSTICAS DE USUARIOS
 * 
 * GET http://localhost:5000/api/v1/users/stats/dashboard
 * Authorization: Bearer <token_admin>
 * 
 * Solo admin puede ver estadísticas completas
 */

// Response (Status 200):
{
  "success": true,
  "data": {
    "totalUsuarios": 50,
    "usuariosActivos": 45,
    "usuariosInactivos": 5,
    "porRol": {
      "ADMIN_SISTEMA": 2,
      "TALENTO_HUMANO": 3,
      "SUPERVISOR": 8,
      "JEFE_OPERACIONES": 12,
      "TRABAJADOR": 25,
      "ADMIN_FINCA": 0,
      "SISTEMAS": 0
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎓 EJEMPLO COMPLETO: CREAR USUARIO DESDE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FLUJO COMPLETO RECOMENDADO:
 * 
 * 1. VERIFICAR QUE EL ADMIN TIENE PERMISO
 *    - El middleware authorize verifica que tenga rol ADMIN o TALENTO_HUMANO
 * 
 * 2. OBTENER LISTA DE ROLES DISPONIBLES
 *    GET /api/v1/users/roles/list
 *    - Mostrar select con opciones
 * 
 * 3. RELLENAR FORMULARIO
 *    - Nombre: Campo de texto
 *    - Email: Campo email (validar formato)
 *    - Contraseña: Campo password
 *    - Rol: Select con opciones de /roles/list
 * 
 * 4. CREAR USUARIO
 *    POST /api/v1/users
 *    Body: {nombre, email, password, roles: ["SELECTED_ROLE"]}
 * 
 * 5. SI ÉXITO (Status 201)
 *    - Mostrar modal de éxito con datos del usuario
 *    - Mostrar los tokens generados
 *    - Opción de copiar credenciales
 *    - Opción de usar tokens para pre-llenar login
 * 
 * 6. SI ERROR
 *    - Mostrar error específico
 *    - Ejemplo: "El email ya está registrado"
 *    - Permitir reintentar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 💾 CÓDIGOS DE HTTP ESPERADOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 200 OK
 *   - Solicitud exitosa
 *   - Respuesta con datos
 * 
 * 201 CREATED
 *   - Usuario creado exitosamente
 *   - Incluye tokens automáticos
 * 
 * 400 BAD REQUEST
 *   - Datos inválidos o incompletos
 *   - Ejemplo: "El nombre es obligatorio"
 *   - Ejemplo: "Email inválido"
 * 
 * 401 UNAUTHORIZED
 *   - Token faltante: "Token de autenticación requerido"
 *   - Token inválido: "Token inválido o expirado"
 *   - Usuario inactivo: "Usuario inactivo"
 * 
 * 403 FORBIDDEN
 *   - Permisos insuficientes
 *   - Ejemplo: "No tienes permisos para acceder a este recurso"
 *   - Ejemplo: "No tienes permisos para crear usuarios"
 * 
 * 404 NOT FOUND
 *   - Usuario no encontrado
 * 
 * 409 CONFLICT
 *   - Email ya existe
 * 
 * 500 INTERNAL SERVER ERROR
 *   - Error del servidor
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 HEADERS REQUERIDOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Authorization Header Requerido (excepto login/register):
 * 
 * Authorization: Bearer <token_jwt>
 * 
 * Donde <token_jwt> es el token recibido al hacer login o al crear usuario
 * 
 * Ejemplo:
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImVtYWlsIjoiYWRtaW5AZWZhZ3JhbS5jb20iLCJyb2xlcyI6WyJBRE1JTl9TSVNURVNBIF0sIm5hbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3MTM2MTY0MDAsImV4cCI6MTcxMzcwMjgwMH0.xxxx
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ FIN DE EJEMPLOS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  documentacion: 'Ver ejemplos en el código anterior'
};
