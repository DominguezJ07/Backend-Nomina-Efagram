# 📋 ESTRUCTURA DE NOVEDADES - GUÍA PARA FRONTEND

## 📊 1. ESTRUCTURA DEL MODELO

```javascript
{
  // ─── IDENTIFICACIÓN ───────────────────────────────────────────────────────
  _id: ObjectId,                    // ID único de MongoDB
  codigo: String,                   // Código único (generado automáticamente)
  
  // ─── FECHA ────────────────────────────────────────────────────────────────
  fecha: Date,                      // REQUERIDO - Fecha de la novedad (ISO 8601)
  
  // ─── TRABAJADOR / EMPLEADO ────────────────────────────────────────────────
  trabajador: {                     // REQUERIDO - ID de la persona
    _id: ObjectId,
    nombres: String,
    apellidos: String,
    documento: String
  },
  
  // ─── CUADRILLA ────────────────────────────────────────────────────────────
  cuadrilla: {                      // OPCIONAL - ID de la cuadrilla
    _id: ObjectId,
    nombre: String,
    codigo: String
  },
  
  // ─── FINCA ────────────────────────────────────────────────────────────────
  finca: {                          // OPCIONAL - ID de la finca
    _id: ObjectId,
    nombre: String,
    codigo: String
  },
  
  // ─── SUBPROYECTO ──────────────────────────────────────────────────────────
  subproyecto: {                    // OPCIONAL - ID del subproyecto
    _id: ObjectId,
    nombre: String
  },
  
  // ─── TIPO DE NOVEDAD ──────────────────────────────────────────────────────
  tipo: String,                     // REQUERIDO - Ver tipos disponibles abajo
  
  // ─── HORAS Y DURACIÓN ─────────────────────────────────────────────────────
  horas: Number,                    // OPCIONAL - Horas no trabajadas (0-24)
  dias: Number,                     // OPCIONAL - Días (default: 1, mín: 0.5)
  
  // ─── RANGO DE FECHAS ──────────────────────────────────────────────────────
  fecha_inicio: Date,               // OPCIONAL - Inicio del rango
  fecha_fin: Date,                  // OPCIONAL - Fin del rango
  
  // ─── DESCRIPCIÓN ──────────────────────────────────────────────────────────
  descripcion: String,              // REQUERIDO - 10-500 caracteres
  
  // ─── DOCUMENTACIÓN ────────────────────────────────────────────────────────
  documento_soporte: String,        // OPCIONAL - URL o referencia
  afecta_nomina: Boolean,           // OPCIONAL - Default: true
  
  // ─── REGISTRO ─────────────────────────────────────────────────────────────
  registrado_por: {                 // REQUERIDO - Quién registra
    _id: ObjectId,
    nombres: String,
    apellidos: String
  },
  
  // ─── APROBACIÓN ───────────────────────────────────────────────────────────
  requiere_aprobacion: Boolean,     // OPCIONAL - Default: false
  aprobado: Boolean,                // null, true, o false
  aprobado_por: {                   // Quién aprueba
    _id: ObjectId,
    nombres: String,
    apellidos: String
  },
  fecha_aprobacion: Date,           // Cuándo se aprobó
  motivo_rechazo: String,           // Razón del rechazo (si aplica)
  
  // ─── ESTADO ───────────────────────────────────────────────────────────────
  estado: String,                   // PENDIENTE, APROBADA, RECHAZADA, ANULADA
  
  // ─── OBSERVACIONES ────────────────────────────────────────────────────────
  observaciones: String,            // OPCIONAL - Max 1000 caracteres
  
  // ─── METADATA ─────────────────────────────────────────────────────────────
  createdAt: Date,                  // Cuándo se creó
  updatedAt: Date                   // Última actualización
}
```

---

## 🏷️ 2. TIPOS DE NOVEDADES DISPONIBLES

```javascript
const TIPOS_NOVEDAD = {
  LLUVIA: 'LLUVIA',                 // No trabaja por lluvia
  INSUMOS: 'INSUMOS',               // No hay insumos
  HERRAMIENTAS: 'HERRAMIENTAS',     // No hay herramientas
  PERMISO: 'PERMISO',               // Permiso del trabajador
  AUSENCIA: 'AUSENCIA',             // Ausencia no justificada
  INCAPACIDAD: 'INCAPACIDAD',       // Incapacidad médica
  ACCIDENTE_TRABAJO: 'ACCIDENTE_TRABAJO', // Accidente en el trabajo
  SUSPENSION: 'SUSPENSION',         // Suspensión disciplinaria
  VACACIONES: 'VACACIONES',         // Período de vacaciones
  LICENCIA: 'LICENCIA',             // Licencia especial
  OTRO: 'OTRO'                      // Otro tipo
}
```

---

## ✅ 3. CAMPOS REQUERIDOS vs OPCIONALES

### PARA CREAR NOVEDAD - Mínimo requerido:

```javascript
{
  "fecha": "2026-04-20T10:30:00Z",     // ✅ OBLIGATORIO
  "trabajador": "507f1f77bcf86cd799439011", // ✅ OBLIGATORIO
  "tipo": "LLUVIA",                     // ✅ OBLIGATORIO
  "descripcion": "No hubo trabajo por lluvia intensa" // ✅ OBLIGATORIO (10-500 caracteres)
}
```

### OPCIONAL - Campos adicionales:

```javascript
{
  "cuadrilla": "507f...",              // ❌ OPCIONAL (antes REQUERIDO)
  "finca": "507f...",                  // ❌ OPCIONAL
  "horas": 8,                          // ❌ OPCIONAL (0-24)
  "dias": 1,                           // ❌ OPCIONAL (default: 1, mín: 0.5)
  "fecha_inicio": "2026-04-20T00:00:00Z", // ❌ OPCIONAL
  "fecha_fin": "2026-04-21T23:59:59Z",    // ❌ OPCIONAL
  "afecta_nomina": true,               // ❌ OPCIONAL (default: true)
  "documento_soporte": "url/documento", // ❌ OPCIONAL
  "requiere_aprobacion": false,        // ❌ OPCIONAL (default: false)
  "observaciones": "Lluvia de 3 horas", // ❌ OPCIONAL (max: 1000)
  "registrado_por": "507f..."          // ❌ OPCIONAL (se auto-resuelve)
}
```

---

## 🔌 4. ENDPOINTS DISPONIBLES

### Crear Novedad
```
POST /api/v1/novedades
Authorization: Bearer <token>
Content-Type: application/json

{
  "fecha": "2026-04-20",
  "trabajador": "507f...",
  "tipo": "LLUVIA",
  "descripcion": "Lluvia intensa"
}
```

### Obtener todas las novedades (con filtros)
```
GET /api/v1/novedades?trabajador=507f...&tipo=LLUVIA&estado=PENDIENTE&fecha_inicio=2026-04-01&fecha_fin=2026-04-30
Authorization: Bearer <token>
```

**Query Parameters:**
- `trabajador` - ID del trabajador
- `tipo` - Tipo de novedad
- `estado` - PENDIENTE, APROBADA, RECHAZADA, ANULADA
- `cuadrilla` - ID de cuadrilla
- `finca` - ID de finca
- `fecha_inicio` - Fecha inicio (ISO 8601)
- `fecha_fin` - Fecha fin (ISO 8601)

### Obtener una novedad específica
```
GET /api/v1/novedades/:id
Authorization: Bearer <token>
```

### Novedades por Trabajador
```
GET /api/v1/novedades/trabajador/:trabajadorId
Authorization: Bearer <token>
```

### Novedades por Cuadrilla
```
GET /api/v1/novedades/cuadrilla/:cuadrillaId
Authorization: Bearer <token>
```

### Novedades por Finca
```
GET /api/v1/novedades/finca/:fincaId
Authorization: Bearer <token>
```

### Resumen de Horas Lluvia
```
GET /api/v1/novedades/resumen/horas-lluvia
Authorization: Bearer <token>
```

### Actualizar Novedad
```
PUT /api/v1/novedades/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "descripcion": "Nueva descripción",
  "afecta_nomina": false
}
```

### Aprobar Novedad
```
POST /api/v1/novedades/:id/aprobar
Authorization: Bearer <token>
Content-Type: application/json

{
  "aprobado_por": "507f..." // OPCIONAL
}
```

### Rechazar Novedad
```
POST /api/v1/novedades/:id/rechazar
Authorization: Bearer <token>
Content-Type: application/json

{
  "motivo": "No cumple con los requisitos mínimos de documentación"
}
```

### Eliminar Novedad
```
DELETE /api/v1/novedades/:id
Authorization: Bearer <token>
```

---

## 📝 5. EJEMPLO DE FLUJO COMPLETO

### PASO 1: Crear una Novedad

```javascript
const crearNovedad = async () => {
  const response = await fetch('http://localhost:5000/api/v1/novedades', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fecha: '2026-04-20',
      trabajador: '507f1f77bcf86cd799439011',
      tipo: 'LLUVIA',
      descripcion: 'No se trabajó por lluvia intensa en la zona',
      dias: 1,
      afecta_nomina: true
    })
  });
  
  const data = await response.json();
  console.log(data);
  // Respuesta:
  // {
  //   "success": true,
  //   "data": { ... novedad creada ... }
  // }
}
```

### PASO 2: Obtener Novedades con Filtros

```javascript
const obtenerNovedades = async () => {
  const params = new URLSearchParams({
    fecha_inicio: '2026-04-01',
    fecha_fin: '2026-04-30',
    estado: 'PENDIENTE',
    tipo: 'LLUVIA'
  });
  
  const response = await fetch(
    `http://localhost:5000/api/v1/novedades?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  console.log(data);
  // Respuesta:
  // {
  //   "success": true,
  //   "count": 5,
  //   "data": [ ... novedades ... ]
  // }
}
```

### PASO 3: Aprobar una Novedad

```javascript
const aprobarNovedad = async (novedadId) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/novedades/${novedadId}/aprobar`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }
  );
  
  const data = await response.json();
  console.log(data);
}
```

### PASO 4: Rechazar una Novedad

```javascript
const rechazarNovedad = async (novedadId) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/novedades/${novedadId}/rechazar`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        motivo: 'Falta documentación de soporte para esta ausencia'
      })
    }
  );
  
  const data = await response.json();
  console.log(data);
}
```

---

## 🎨 6. COMPONENTES RECOMENDADOS PARA FRONTEND

### A. Modal de Crear Novedad

```
┌─ Crear Novedad ─────────────────────────────┐
│                                              │
│ Fecha:*             [20/04/2026]             │
│                                              │
│ Trabajador:*        [Select/Dropdown]       │
│                                              │
│ Tipo:*              [Select] LLUVIA         │
│                                              │
│ Descripción:*       [Textarea]              │
│                     "Min 10 caracteres"     │
│                                              │
│ Días:               [Input] 1 día           │
│                                              │
│ Horas:              [Input] (opcional)      │
│                                              │
│ Cuadrilla:          [Select] (opcional)     │
│                                              │
│ ☑ Afecta Nómina                             │
│ ☐ Requiere Aprobación                       │
│                                              │
│ [Cancelar]  [Crear]                         │
└──────────────────────────────────────────────┘
```

### B. Tabla de Novedades

```
┌─────────────────────────────────────────────────────────────────┐
│ Fecha    │ Trabajador      │ Tipo         │ Estado     │ Acciones │
├─────────────────────────────────────────────────────────────────┤
│ 20/04    │ Juan Pérez      │ LLUVIA       │ PENDIENTE  │ ✓ ✗ ⋯   │
│ 19/04    │ María García    │ INCAPACIDAD  │ APROBADA   │ ⋯       │
│ 18/04    │ Carlos López    │ PERMISO      │ RECHAZADA  │ ⋯       │
│ 17/04    │ Ana Rodríguez   │ VACACIONES   │ APROBADA   │ ⋯       │
└─────────────────────────────────────────────────────────────────┘

Acciones:
✓ = Aprobar
✗ = Rechazar
⋯ = Ver Detalle / Editar / Eliminar
```

### C. Vista Detalle de Novedad

```
┌─ Detalles de Novedad ───────────────────────┐
│                                              │
│ Código: NOV-2026-04-001                     │
│ Estado: PENDIENTE                           │
│ Fecha: 20/04/2026                           │
│                                              │
│ ─ Información ─                              │
│ Trabajador: Juan Pérez (Doc: 1234567890)   │
│ Cuadrilla: -                                │
│ Finca: Finca Central                        │
│                                              │
│ ─ Novedad ─                                  │
│ Tipo: LLUVIA                                │
│ Descripción: No se trabajó por lluvia...   │
│ Duración: 1 día                             │
│ Afecta Nómina: Sí                          │
│                                              │
│ ─ Estado de Aprobación ─                    │
│ Registrado por: Admin (20/04/2026 10:30)   │
│ Requiere Aprobación: No                     │
│ Aprobado por: -                             │
│                                              │
│ [Editar]  [Aprobar]  [Rechazar]  [Cerrar]  │
└──────────────────────────────────────────────┘
```

---

## 🔑 7. PERMISOS POR ROL

```
CREAR NOVEDAD:
✅ ADMIN_SISTEMA
✅ JEFE_OPERACIONES
✅ SUPERVISOR
✅ TALENTO_HUMANO

APROBAR/RECHAZAR NOVEDAD:
✅ ADMIN_SISTEMA
✅ JEFE_OPERACIONES
✅ TALENTO_HUMANO

VER NOVEDADES:
✅ Todos los roles autenticados
```

---

## 🎯 8. VALIDACIONES EN FRONTEND

```javascript
const validarNovedad = (novedad) => {
  const errores = [];
  
  // Fecha
  if (!novedad.fecha) {
    errores.push('La fecha es obligatoria');
  }
  
  // Trabajador
  if (!novedad.trabajador) {
    errores.push('El trabajador es obligatorio');
  }
  
  // Tipo
  if (!novedad.tipo) {
    errores.push('El tipo de novedad es obligatorio');
  }
  const tiposValidos = ['LLUVIA', 'INSUMOS', 'HERRAMIENTAS', 'PERMISO', 
                        'AUSENCIA', 'INCAPACIDAD', 'ACCIDENTE_TRABAJO', 
                        'SUSPENSION', 'VACACIONES', 'LICENCIA', 'OTRO'];
  if (!tiposValidos.includes(novedad.tipo)) {
    errores.push('Tipo de novedad inválido');
  }
  
  // Descripción
  if (!novedad.descripcion) {
    errores.push('La descripción es obligatoria');
  }
  if (novedad.descripcion && novedad.descripcion.length < 10) {
    errores.push('La descripción debe tener mínimo 10 caracteres');
  }
  if (novedad.descripcion && novedad.descripcion.length > 500) {
    errores.push('La descripción no puede exceder 500 caracteres');
  }
  
  // Horas (opcional pero validar si está presente)
  if (novedad.horas !== null && novedad.horas !== undefined) {
    if (novedad.horas < 0 || novedad.horas > 24) {
      errores.push('Las horas deben estar entre 0 y 24');
    }
  }
  
  // Días (opcional pero validar si está presente)
  if (novedad.dias && novedad.dias < 0.5) {
    errores.push('Los días deben ser mínimo 0.5');
  }
  
  // Observaciones (max 1000)
  if (novedad.observaciones && novedad.observaciones.length > 1000) {
    errores.push('Las observaciones no pueden exceder 1000 caracteres');
  }
  
  return errores;
};
```

---

## 📱 9. ESTADOS Y FLUJOS

### Estados de una Novedad:
- **PENDIENTE** - Acaba de crearse
- **APROBADA** - Fue aprobada
- **RECHAZADA** - Fue rechazada
- **ANULADA** - Fue anulada

### Flujo típico:
```
CREAR → PENDIENTE → [APROBAR/RECHAZAR] → APROBADA/RECHAZADA → [ANULAR]
```

---

## 🚀 10. MEJOR PRÁCTICA - OBTENER DATOS PARA SELECTS

```javascript
// Obtener trabajadores
GET /api/v1/personas?activo=true

// Obtener cuadrillas
GET /api/v1/cuadrillas

// Obtener fincas
GET /api/v1/fincas

// Obtener subproyectos
GET /api/v1/subproyectos
```

---

**¡Listo para implementar en el frontend!**
