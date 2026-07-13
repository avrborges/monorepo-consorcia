const mongoose = require('mongoose');

const UnidadFuncionalSchema = new mongoose.Schema(
  {
    piso: { 
      type: String, 
      required: [true, 'El piso es obligatorio.'], 
      trim: true 
    },
    departamento: { 
      type: String, 
      required: [true, 'El departamento es obligatorio.'], 
      trim: true 
    },
    coeficiente: { 
      type: Number, 
      required: [true, 'El coeficiente es obligatorio para calcular las expensas.'],
      min: [0, 'El coeficiente no puede ser negativo.'],
      max: [1, 'El coeficiente no puede ser mayor a 1.']
    },
    propietario: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', // Debe coincidir exactamente con el nombre de tu modelo en User.js
      default: null 
    },
    inquilino: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      default: null 
    },
    estadoOcupacion: { 
      type: String, 
      enum: ['propietario', 'inquilino', 'vacio'], 
      default: 'vacio' 
    },
    metrosCuadrados: { 
      type: Number, 
      default: 0 
    },
    notas: { 
      type: String, 
      trim: true 
    }
  },
  { 
    timestamps: true 
  }
);

// Índice compuesto único para que no pueda existir, por ejemplo, dos veces el "Piso 2 Dpto A"
UnidadFuncionalSchema.index({ piso: 1, departamento: 1 }, { unique: true });

module.exports = mongoose.model('UnidadFuncional', UnidadFuncionalSchema);