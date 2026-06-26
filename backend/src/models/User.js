// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'El nombre es obligatorio'], 
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'El correo electrónico es obligatorio'], 
    unique: true, 
    trim: true, 
    lowercase: true 
  },
  password: { 
    type: String, 
    // 🔥 MODIFICACIÓN: Pasa a false. El admin no ingresa clave al crearlo, 
    // el usuario la define después a través del mail.
    required: false 
  },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'consejo', 'propietario', 'inquilino'], 
    default: 'propietario' 
  },
  unidadFuncional: {
    type: String,
    trim: true,
    default: ""
  },
  telefono: {
    type: String,
    trim: true,
    default: ""
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'pendiente'],
    default: 'pendiente' 
  },
  debeCambiarPassword: {
    type: Boolean,
    default: true
  },
  // 🆕 NUEVO: Token para el link del mail
  tokenActivacion: {
    type: String,
    default: null
  },
  // 🆕 NUEVO: Vencimiento del link
  tokenExpiracion: {
    type: Date,
    default: null
  }
}, {
  timestamps: true 
});

// 🔥 MIDDLEWARE: Corregido para evitar errores de referencia
userSchema.pre('save', async function() {
  // 1. Si la contraseña no se modificó o no existe (ej: al crear usuario pendiente), 
  // simplemente salimos de la función.
  if (!this.isModified('password') || !this.password) return;

  // 2. Si hay contraseña, la hasheamos.
  // Al ser una función 'async', si ocurre un error, Mongoose lo capturará automáticamente
  // siempre que la promesa sea rechazada (por eso no necesitamos 'next').
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);