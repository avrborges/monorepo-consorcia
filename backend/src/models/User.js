const mongoose = require('mongoose');
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
    enum: ['admin','consejo','propietario','inquilino'], // Roles restringidos para el ecosistema de Consorcia
    default: 'propietario'
  }
}, {
  // timestamps crea automáticamente los campos "createdAt" y "updatedAt" (clave para auditorías de consorcios)
  timestamps: true 
});

module.exports = mongoose.model('User', userSchema);