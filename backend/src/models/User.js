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
    required: [true, 'La contraseña es obligatoria'] 
  },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'consejo', 'propietario', 'inquilino'], 
    default: 'propietario' 
  },
  // 🆕 CAMPO: Unidad Funcional (ej: "Piso 3 depto B")
  unidadFuncional: {
    type: String,
    trim: true,
    default: ""
  },
  // 🆕 CAMPO: Teléfono de contacto
  telefono: {
    type: String,
    trim: true,
    default: ""
  },
  // 🆕 CAMPO: Estado inicializado obligatoriamente en 'pendiente'
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'pendiente'],
    default: 'pendiente' 
  },
  // 🆕 CAMPO: Flag para saber si se loguea por primera vez con clave provisoria/vencida
  debeCambiarPassword: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true 
});

// 🔥 MIDDLEWARE: Se mantiene intacto y óptimo con async/await
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error; 
  }
});

module.exports = mongoose.model('User', userSchema);