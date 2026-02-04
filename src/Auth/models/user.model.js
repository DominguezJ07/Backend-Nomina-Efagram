const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../../config/constants');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [50, 'El nombre no puede tener más de 50 caracteres']
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
  roles: [{
    type: String,
    enum: Object.values(ROLES),
    default: [ROLES.TRABAJADOR]
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

// Índices
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
    email: this.email,
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

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;