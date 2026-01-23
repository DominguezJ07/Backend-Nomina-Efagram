const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../../config/constants');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  apellidos: {
    type: String,
    required: [true, 'Los apellidos son obligatorios'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor ingrese un email válido'
    ]
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  tipo_doc: {
    type: String,
    required: [true, 'El tipo de documento es obligatorio'],
    enum: ['CC', 'CE', 'TI', 'PA'],
    default: 'CC'
  },
  num_doc: {
    type: String,
    required: [true, 'El número de documento es obligatorio'],
    unique: true,
    trim: true
  },
  telefono: {
    type: String,
    trim: true
  },
  roles: [{
    type: String,
    enum: Object.values(ROLES),
    default: ['TRABAJADOR']
  }],
  activo: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String,
    default: null
  },
  ultimo_acceso: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true,
  versionKey: false
});

// Índices (sin duplicar con unique: true)
userSchema.index({ roles: 1 });

// Encriptar password antes de guardar
userSchema.pre('save', async function() {
  // Solo encriptar si el password fue modificado
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Método para obtener datos públicos del usuario
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    nombre: this.nombre,
    apellidos: this.apellidos,
    email: this.email,
    tipo_doc: this.tipo_doc,
    num_doc: this.num_doc,
    telefono: this.telefono,
    roles: this.roles,
    activo: this.activo,
    avatar: this.avatar,
    createdAt: this.createdAt
  };
};

// Método estático para buscar usuario activo por email
userSchema.statics.findActiveByEmail = function(email) {
  return this.findOne({ email, activo: true }).select('+password');
};

// Virtual para nombre completo
userSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellidos}`;
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;