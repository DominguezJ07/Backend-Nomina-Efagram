// Estados del sistema
const ESTADOS = {
  PROYECTO: {
    PLANEADO: 'PLANEADO',
    EN_NEGOCIACION: 'EN_NEGOCIACION',
    ACTIVO: 'ACTIVO',
    CERRADO: 'CERRADO',
    CANCELADO: 'CANCELADO'
  },
 
  PAL: { // Proyecto-Actividad-Lote
    PENDIENTE: 'PENDIENTE',
    EN_EJECUCION: 'EN_EJECUCION',
    CUMPLIDA: 'CUMPLIDA',
    REPROGRAMADA: 'REPROGRAMADA',
    REEMPLAZADA: 'REEMPLAZADA',
    CANCELADA: 'CANCELADA'
  },
 
  PERSONA: {
    ACTIVO: 'ACTIVO',
    INACTIVO: 'INACTIVO'
  },
 
  SEMANA: {
    ABIERTA: 'ABIERTA',
    REVISADA: 'REVISADA',
    CERRADA: 'CERRADA',
    BLOQUEADA: 'BLOQUEADA'
  },
 
  PERIODO: {
    ABIERTO: 'ABIERTO',
    EN_REVISION: 'EN_REVISION',
    CERRADO: 'CERRADO',
    REABIERTO: 'REABIERTO'
  },
 
  NOMINA: {
    PENDIENTE: 'PENDIENTE',
    VALIDADO: 'VALIDADO',
    PAGADO: 'PAGADO'
  },

  REGISTRO: {
    PENDIENTE: 'PENDIENTE',
    APROBADO: 'APROBADO',
    RECHAZADO: 'RECHAZADO',
    CORREGIDO: 'CORREGIDO'
  }
};

// Estados de Proyecto (exportación individual)
const ESTADOS_PROYECTO = {
  PLANEADO: 'PLANEADO',
  EN_NEGOCIACION: 'EN_NEGOCIACION',
  ACTIVO: 'ACTIVO',
  CERRADO: 'CERRADO',
  CANCELADO: 'CANCELADO'
};

// Estados de PAL (exportación individual)
const ESTADOS_PAL = {
  PENDIENTE: 'PENDIENTE',
  EN_EJECUCION: 'EN_EJECUCION',
  CUMPLIDA: 'CUMPLIDA',
  REPROGRAMADA: 'REPROGRAMADA',
  REEMPLAZADA: 'REEMPLAZADA',
  CANCELADA: 'CANCELADA'
};

// Estados de Registro Diario
const ESTADOS_REGISTRO = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
  CORREGIDO: 'CORREGIDO'
};

// Estados de Semana Operativa
const ESTADOS_SEMANA = {
  ABIERTA: 'ABIERTA',
  CERRADA: 'CERRADA',
  BLOQUEADA: 'BLOQUEADA'
};
 
// Unidades de medida
const UNIDADES_MEDIDA = {
  HECTAREA: 'HECTAREA',
  ARBOL: 'ARBOL',
  METRO: 'METRO',
  METRO_CUADRADO: 'METRO_CUADRADO',
  KILOGRAMO: 'KILOGRAMO',
  LITRO: 'LITRO',
  JORNAL: 'JORNAL',
  UNIDAD: 'UNIDAD'
};
 
 
// Tipos de contrato
const TIPOS_CONTRATO = {
  FIJO_TODO_COSTO: 'FIJO_TODO_COSTO',
  VARIABLE: 'VARIABLE',
  OTRO: 'OTRO'
};
 
// Roles del sistema
const ROLES = {
  SUPERVISOR: 'SUPERVISOR',
  JEFE_OPERACIONES: 'JEFE_OPERACIONES',
  TRABAJADOR: 'TRABAJADOR',
  ADMIN_FINCA: 'ADMIN_FINCA',
  ADMIN_SISTEMA: 'ADMIN_SISTEMA',
  TALENTO_HUMANO: 'TALENTO_HUMANO',
  SISTEMAS: 'SISTEMAS'
};

// Zonas territoriales
const ZONAS = {
  NORTE: { codigo: 1, nombre: 'Norte' },
  SUR: { codigo: 2, nombre: 'Sur' },
  CENTRO: { codigo: 3, nombre: 'Centro' }
};
 
// Tipos de novedad
const TIPOS_NOVEDAD = {
  LLUVIA: 'LLUVIA',
  INSUMOS: 'INSUMOS',
  HERRAMIENTAS: 'HERRAMIENTAS',
  PERMISO: 'PERMISO',
  AUSENCIA: 'AUSENCIA',
  INCAPACIDAD: 'INCAPACIDAD',
  ACCIDENTE_TRABAJO: 'ACCIDENTE_TRABAJO',
  SUSPENSION: 'SUSPENSION',
  VACACIONES: 'VACACIONES',
  LICENCIA: 'LICENCIA',
  OTRO: 'OTRO'
};
 
// Estados de novedad
const ESTADOS_NOVEDAD = {
  PENDIENTE: 'PENDIENTE',
  APROBADA: 'APROBADA',
  RECHAZADA: 'RECHAZADA',
  ANULADA: 'ANULADA'
};
// Semana operativa (jueves a jueves)
const SEMANA_OPERATIVA = {
  DIA_INICIO: 4, // Jueves (0=Domingo, 4=Jueves)
  DIA_CIERRE: 4  // Jueves
};
 
// Límites y validaciones
const LIMITES = {
  MAX_PRECIO: 999999999.99,
  MIN_PRECIO: 0.01,
  MAX_META: 999999999.99,
  MIN_META: 0.01,
  MAX_CANTIDAD: 999999999.99,
  MIN_CANTIDAD: 0,
  DECIMALES_PRECIO: 2,
  DECIMALES_CANTIDAD: 2
};
 
// Mensajes de error comunes
const MENSAJES_ERROR = {
  NO_AUTORIZADO: 'No tienes autorización para realizar esta acción',
  TOKEN_INVALIDO: 'Token inválido o expirado',
  CREDENCIALES_INVALIDAS: 'Credenciales inválidas',
  REGISTRO_NO_ENCONTRADO: 'Registro no encontrado',
  META_NO_CUMPLIDA: 'La meta mínima no ha sido cumplida',
  META_NO_PUEDE_DISMINUIR: 'La meta mínima no puede disminuir',
  TERRITORIO_NO_AUTORIZADO: 'No tienes autorización en este territorio',
  PROYECTO_NO_CERRABLE: 'El proyecto no puede cerrarse con metas incumplidas',
  PRECIO_SMURFIT_INMUTABLE: 'El precio del cliente Smurfit no puede modificarse',
  REGISTRO_DUPLICADO: 'Ya existe un registro con estos datos',
  FECHA_INVALIDA: 'Rango de fechas inválido',
  SEMANA_CERRADA: 'No se pueden hacer cambios en una semana cerrada'
};

module.exports = {
  ESTADOS,
  ESTADOS_PROYECTO,
  ESTADOS_PAL,
  ESTADOS_REGISTRO,
  ESTADOS_SEMANA,
  UNIDADES_MEDIDA,
  TIPOS_CONTRATO,
  ROLES,
  ZONAS,
  TIPOS_NOVEDAD,
  SEMANA_OPERATIVA,
  LIMITES,
  MENSAJES_ERROR
};