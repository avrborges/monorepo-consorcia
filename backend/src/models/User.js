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
    enum: ['superadmin','admin', 'consejo', 'propietario', 'inquilino'], 
    default: 'propietario' 
  }
}, {
  timestamps: true 
});

// 🔥 MIDDLEWARE CORREGIDO: En versiones modernas de Mongoose con async/await, NO usamos next()
userSchema.pre('save', async function() {
  // Si la contraseña no se modificó, salimos directamente
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // Al usar async/await, Mongoose sabe que terminó cuando la función llega al final
  } catch (error) {
    // Si hay un error, lo lanzamos para que lo ataje el catch del seed.js o del controlador
    throw error; 
  }
});

module.exports = mongoose.model('User', userSchema);