# 📱 GUÍA DE IMPLEMENTACIÓN - FRONTEND (Barras de Progreso)

## 🎯 Objetivo
Implementar **barras de progreso dinámicas** que se llenan automáticamente cuando se registran actividades diarias en el backend.

---

## 📋 Estructura de Datos Retornada

### Endpoint: `GET /api/v1/progreso/proyecto/:proyectoId`

```json
{
  "success": true,
  "data": {
    "_id": "6xxx",
    "codigo": "PRY-001",
    "nombre": "Proyecto Palmira",
    "porcentaje": 72,
    "cantidad_ejecutada_total": 150,
    "cantidad_proyectada_total": 208,
    "total_subproyectos": 2,
    "estado": "EN_PROGRESO",
    "subproyectos": [
      {
        "_id": "5xxx",
        "codigo": "SUB-001",
        "nombre": "Preparación de Terreno",
        "porcentaje": 85,
        "cantidad_ejecutada": 100,
        "cantidad_proyectada": 118,
        "total_contratos": 2,
        "estado": "EN_PROGRESO",
        "contratos": [
          {
            "_id": "4xxx",
            "codigo": "CON-001",
            "porcentaje": 100,
            "cantidad_ejecutada": 50,
            "cantidad_proyectada": 50,
            "total_programaciones": 3,
            "estado": "COMPLETADO",
            "programaciones": [
              {
                "_id": "3xxx",
                "nombre": "Limpieza de Finca",
                "cantidad_proyectada": 20,
                "cantidad_ejecutada": 20,
                "porcentaje": 100,
                "estado": "COMPLETADA",
                "registros_diarios": 7
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## 🛠️ Pasos de Implementación

### **PASO 1: Crear Servicio API**

**Archivo:** `src/services/progresoAPI.js` (o similar)

```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1'; // Cambiar según tu URL

export const progresoAPI = {
  /**
   * Obtener progreso completo de un Proyecto
   * Incluye: Subproyectos, Contratos, Programaciones
   */
  getProgresoProyecto: (proyectoId) => {
    return axios.get(`${API_BASE}/progreso/proyecto/${proyectoId}`);
  },

  /**
   * Obtener progreso de un Subproyecto
   * Incluye: Contratos, Programaciones
   */
  getProgresoSubproyecto: (subproyectoId) => {
    return axios.get(`${API_BASE}/progreso/subproyecto/${subproyectoId}`);
  },

  /**
   * Obtener progreso de un Contrato
   * Incluye: Programaciones
   */
  getProgresoContrato: (contratoId) => {
    return axios.get(`${API_BASE}/progreso/contrato/${contratoId}`);
  },

  /**
   * Crear un Registro Diario
   * ESTO DISPARA AUTOMÁTICAMENTE EL RECALCULÓ EN CASCADA
   */
  crearRegistroDiario: (data) => {
    return axios.post(`${API_BASE}/registros-diarios-programacion`, data);
  },

  /**
   * Actualizar un Registro Diario
   * ESTO TAMBIÉN DISPARA EL RECALCULÓ EN CASCADA
   */
  actualizarRegistroDiario: (registroId, data) => {
    return axios.put(`${API_BASE}/registros-diarios-programacion/${registroId}`, data);
  },
};
```

---

### **PASO 2: Crear Componente de Barra de Progreso**

**Archivo:** `src/components/BarraProgreso.vue` (o `.jsx`)

```vue
<template>
  <div class="barra-progreso">
    <!-- NOMBRE Y PORCENTAJE -->
    <div class="header">
      <span class="nombre">{{ nombre }}</span>
      <span class="porcentaje">{{ porcentaje }}%</span>
    </div>

    <!-- BARRA -->
    <div class="contenedor-barra">
      <div class="barra" :style="{ width: porcentaje + '%' }">
        <span v-if="porcentaje > 10" class="texto-barra">{{ porcentaje }}%</span>
      </div>
    </div>

    <!-- INFO ADICIONAL -->
    <div class="info">
      <span class="cantidad">{{ cantidadEjecutada }} / {{ cantidadProyectada }}</span>
      <span class="estado" :class="estadoClase">{{ estado }}</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    nombre: {
      type: String,
      required: true,
    },
    porcentaje: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    cantidadEjecutada: {
      type: Number,
      required: true,
    },
    cantidadProyectada: {
      type: Number,
      required: true,
    },
    estado: {
      type: String,
      default: 'PENDIENTE',
    },
  },
  computed: {
    estadoClase() {
      return {
        'estado-pendiente': this.estado === 'PENDIENTE',
        'estado-progreso': this.estado === 'EN_PROGRESO',
        'estado-completado': this.estado === 'COMPLETADO',
      };
    },
  },
};
</script>

<style scoped>
.barra-progreso {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 8px;
  background: #f5f5f5;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: 600;
}

.nombre {
  color: #333;
  font-size: 14px;
}

.porcentaje {
  color: #0066cc;
  font-size: 16px;
  font-weight: bold;
}

.contenedor-barra {
  width: 100%;
  height: 25px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.barra {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #45a049);
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.texto-barra {
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3);
}

.info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.cantidad {
  color: #666;
}

.estado {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.estado-pendiente {
  background: #fff3cd;
  color: #856404;
}

.estado-progreso {
  background: #d1ecf1;
  color: #0c5460;
}

.estado-completado {
  background: #d4edda;
  color: #155724;
}
</style>
```

---

### **PASO 3: Crear Componente de Vista de Proyecto**

**Archivo:** `src/views/VistaProyecto.vue`

```vue
<template>
  <div class="vista-proyecto">
    <!-- ENCABEZADO -->
    <div class="encabezado">
      <h1>{{ proyecto.nombre }}</h1>
      <p>Código: {{ proyecto.codigo }}</p>
    </div>

    <!-- BARRA PRINCIPAL DEL PROYECTO -->
    <div class="seccion-principal">
      <h2>Progreso General</h2>
      <BarraProgreso
        :nombre="`${proyecto.nombre}`"
        :porcentaje="proyecto.porcentaje"
        :cantidadEjecutada="proyecto.cantidad_ejecutada_total"
        :cantidadProyectada="proyecto.cantidad_proyectada_total"
        :estado="proyecto.estado"
      />
    </div>

    <!-- SUBPROYECTOS -->
    <div class="seccion-subproyectos">
      <h2>Subproyectos ({{ proyecto.total_subproyectos }})</h2>

      <div v-for="subproyecto in proyecto.subproyectos" :key="subproyecto._id" class="subproyecto">
        <!-- Barra del Subproyecto -->
        <BarraProgreso
          :nombre="`${subproyecto.nombre} (${subproyecto.total_contratos} contratos)`"
          :porcentaje="subproyecto.porcentaje"
          :cantidadEjecutada="subproyecto.cantidad_ejecutada"
          :cantidadProyectada="subproyecto.cantidad_proyectada"
          :estado="subproyecto.estado"
        />

        <!-- Contratos del Subproyecto -->
        <div v-if="subproyecto.contratos" class="contratos">
          <h3>Contratos</h3>
          <div v-for="contrato in subproyecto.contratos" :key="contrato._id" class="contrato">
            <!-- Barra del Contrato -->
            <BarraProgreso
              :nombre="`${contrato.codigo} (${contrato.total_programaciones} programaciones)`"
              :porcentaje="contrato.porcentaje"
              :cantidadEjecutada="contrato.cantidad_ejecutada"
              :cantidadProyectada="contrato.cantidad_proyectada"
              :estado="contrato.estado"
            />

            <!-- Programaciones del Contrato (Colapsable) -->
            <div v-if="mostrarProgramaciones[contrato._id]" class="programaciones">
              <h4>Programaciones</h4>
              <div v-for="prog in contrato.programaciones" :key="prog._id" class="programacion">
                <BarraProgreso
                  :nombre="`${prog.nombre} (${prog.registros_diarios} registros)`"
                  :porcentaje="prog.porcentaje"
                  :cantidadEjecutada="prog.cantidad_ejecutada"
                  :cantidadProyectada="prog.cantidad_proyectada"
                  :estado="prog.estado"
                />
              </div>
            </div>

            <button
              @click="toggleProgramaciones(contrato._id)"
              class="btn-expandir"
            >
              {{ mostrarProgramaciones[contrato._id] ? 'Ocultar' : 'Ver' }} Programaciones
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CARGAR -->
    <div v-if="cargando" class="spinner">Cargando...</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
import BarraProgreso from '@/components/BarraProgreso.vue';
import { progresoAPI } from '@/services/progresoAPI';

export default {
  name: 'VistaProyecto',
  components: { BarraProgreso },
  data() {
    return {
      proyecto: null,
      cargando: false,
      error: null,
      mostrarProgramaciones: {},
    };
  },
  computed: {
    proyectoId() {
      return this.$route.params.proyectoId;
    },
  },
  mounted() {
    this.cargarProgreso();
  },
  methods: {
    async cargarProgreso() {
      try {
        this.cargando = true;
        this.error = null;
        const response = await progresoAPI.getProgresoProyecto(this.proyectoId);
        this.proyecto = response.data.data;
      } catch (err) {
        this.error = `Error al cargar progreso: ${err.message}`;
        console.error(err);
      } finally {
        this.cargando = false;
      }
    },
    toggleProgramaciones(contratoId) {
      this.$set(
        this.mostrarProgramaciones,
        contratoId,
        !this.mostrarProgramaciones[contratoId]
      );
    },
    // Refrescar cada 10 segundos (opcional)
    iniciarActualizacionAutomatica() {
      setInterval(() => {
        this.cargarProgreso();
      }, 10000);
    },
  },
};
</script>

<style scoped>
.vista-proyecto {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.encabezado {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #0066cc;
}

.encabezado h1 {
  margin: 0;
  color: #333;
}

.encabezado p {
  margin: 5px 0 0;
  color: #666;
  font-size: 14px;
}

.seccion-principal {
  margin-bottom: 40px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.seccion-principal h2 {
  margin-top: 0;
  color: #333;
}

.seccion-subproyectos {
  margin-top: 40px;
}

.seccion-subproyectos h2 {
  color: #333;
  margin-bottom: 20px;
}

.subproyecto {
  background: #fff;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #0066cc;
}

.contratos {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.contratos h3 {
  color: #555;
  margin: 0 0 15px;
}

.contrato {
  background: #f9f9f9;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 6px;
  border-left: 3px solid #4caf50;
}

.programaciones {
  margin-top: 15px;
  padding: 15px;
  background: #f0f0f0;
  border-radius: 4px;
}

.programaciones h4 {
  margin: 0 0 10px;
  color: #666;
}

.programacion {
  background: white;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
}

.btn-expandir {
  margin-top: 10px;
  padding: 8px 12px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.3s;
}

.btn-expandir:hover {
  background: #0052a3;
}

.spinner {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.error {
  padding: 15px;
  background: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  margin-bottom: 20px;
}
</style>
```

---

### **PASO 4: Crear Componente para Registrar Actividades**

**Archivo:** `src/components/FormularioRegistroDiario.vue`

```vue
<template>
  <div class="formulario-registro">
    <h3>Registrar Actividad Diaria</h3>

    <form @submit.prevent="enviar">
      <!-- Programación (Dropdown) -->
      <div class="campo">
        <label>Programación</label>
        <select v-model="formData.programacion_id" required>
          <option value="">Seleccionar programación...</option>
          <option v-for="prog in programaciones" :key="prog._id" :value="prog._id">
            {{ prog.actividad?.nombre }} - Contrato: {{ prog.contrato?.codigo }}
          </option>
        </select>
      </div>

      <!-- Fecha -->
      <div class="campo">
        <label>Fecha</label>
        <input v-model="formData.fecha" type="date" required />
      </div>

      <!-- Cantidad Ejecutada -->
      <div class="campo">
        <label>Cantidad Ejecutada</label>
        <input
          v-model.number="formData.cantidad_ejecutada"
          type="number"
          step="0.01"
          min="0"
          required
        />
      </div>

      <!-- Observaciones -->
      <div class="campo">
        <label>Observaciones</label>
        <textarea
          v-model="formData.observaciones"
          rows="3"
          placeholder="Notas sobre la jornada..."
        ></textarea>
      </div>

      <!-- Botones -->
      <div class="botones">
        <button type="submit" :disabled="enviando" class="btn-primario">
          {{ enviando ? 'Guardando...' : 'Guardar Registro' }}
        </button>
        <button type="button" @click="limpiar" class="btn-secundario">
          Cancelar
        </button>
      </div>

      <!-- Mensajes -->
      <div v-if="mensaje" :class="['mensaje', tipoMensaje]">
        {{ mensaje }}
      </div>
    </form>
  </div>
</template>

<script>
import { progresoAPI } from '@/services/progresoAPI';

export default {
  name: 'FormularioRegistroDiario',
  props: {
    programaciones: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      formData: {
        programacion_id: '',
        fecha: new Date().toISOString().split('T')[0],
        cantidad_ejecutada: 0,
        observaciones: '',
      },
      enviando: false,
      mensaje: '',
      tipoMensaje: '',
    };
  },
  methods: {
    async enviar() {
      try {
        this.enviando = true;
        await progresoAPI.crearRegistroDiario(this.formData);

        this.mensaje = '✅ Registro guardado. Las barras se actualizarán automáticamente.';
        this.tipoMensaje = 'exito';
        this.limpiar();

        // Emitir evento para que el padre recargue
        this.$emit('registroGuardado');

        setTimeout(() => (this.mensaje = ''), 3000);
      } catch (error) {
        this.mensaje = `❌ Error: ${error.response?.data?.message || error.message}`;
        this.tipoMensaje = 'error';
        console.error(error);
      } finally {
        this.enviando = false;
      }
    },
    limpiar() {
      this.formData = {
        programacion_id: '',
        fecha: new Date().toISOString().split('T')[0],
        cantidad_ejecutada: 0,
        observaciones: '',
      };
    },
  },
};
</script>

<style scoped>
.formulario-registro {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.formulario-registro h3 {
  margin-top: 0;
  color: #333;
}

.campo {
  margin-bottom: 15px;
}

.campo label {
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-weight: 600;
  font-size: 14px;
}

.campo input,
.campo select,
.campo textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.campo input:focus,
.campo select:focus,
.campo textarea:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
}

.botones {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-primario,
.btn-secundario {
  flex: 1;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primario {
  background: #0066cc;
  color: white;
}

.btn-primario:hover:not(:disabled) {
  background: #0052a3;
}

.btn-primario:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secundario {
  background: #e0e0e0;
  color: #333;
}

.btn-secundario:hover {
  background: #d0d0d0;
}

.mensaje {
  margin-top: 15px;
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.mensaje.exito {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.mensaje.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
```

---

### **PASO 5: Integrar en la Ruta**

**Archivo:** `src/router/index.js` (o donde tengas tus rutas)

```javascript
{
  path: '/proyectos/:proyectoId/progreso',
  name: 'ProgresoProyecto',
  component: () => import('@/views/VistaProyecto.vue'),
  meta: { requiresAuth: true }
}
```

---

## ⚡ Flujo de Actualización Automática

```
Usuario crea Registro Diario
         ↓
FormularioRegistroDiario.enviar()
         ↓
progresoAPI.crearRegistroDiario()
         ↓
POST /api/v1/registros-diarios-programacion
         ↓
[BACKEND] Cascada de recálculo automática
         ↓
VistaProyecto.cargarProgreso()
         ↓
GET /api/v1/progreso/proyecto/:proyectoId
         ↓
Componente BarraProgreso actualiza valores
         ↓
✅ BARRAS LLENAS AUTOMÁTICAMENTE
```

---

## 🔄 Actualización Automática (Opcional)

Si quieres que las barras se actualicen **sin que el usuario haga nada**, agrega esto a `VistaProyecto.vue`:

```javascript
mounted() {
  this.cargarProgreso();
  // Actualizar cada 30 segundos
  setInterval(() => this.cargarProgreso(), 30000);
}
```

---

## 📝 Resumen de Componentes Necesarios

| Componente | Propósito |
|-----------|-----------|
| `BarraProgreso.vue` | Mostrar barra visual del progreso |
| `VistaProyecto.vue` | Vista principal con jerarquía completa |
| `FormularioRegistroDiario.vue` | Crear/actualizar registros diarios |
| `progresoAPI.js` | Servicio para llamadas API |

---

## 🧪 Ejemplo de Uso Completo

```vue
<template>
  <div>
    <!-- Formulario para registrar actividades -->
    <FormularioRegistroDiario
      :programaciones="programaciones"
      @registroGuardado="cargarProgreso"
    />

    <!-- Vista de progreso -->
    <VistaProyecto :proyectoId="proyectoId" />
  </div>
</template>

<script>
import FormularioRegistroDiario from '@/components/FormularioRegistroDiario.vue';
import VistaProyecto from '@/views/VistaProyecto.vue';

export default {
  components: { FormularioRegistroDiario, VistaProyecto },
  data() {
    return {
      proyectoId: this.$route.params.proyectoId,
    };
  },
};
</script>
```

---

## ✅ Checklist

- [ ] Crear `progresoAPI.js`
- [ ] Crear componente `BarraProgreso.vue`
- [ ] Crear vista `VistaProyecto.vue`
- [ ] Crear componente `FormularioRegistroDiario.vue`
- [ ] Agregar rutas en router
- [ ] Probar flujo completo
- [ ] Ajustar estilos según tu diseño

---

**¡Listo!** Implementa estos pasos y tendrás barras de progreso 100% funcionales. 🚀
