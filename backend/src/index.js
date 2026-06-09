const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Enrutador de usuarios
app.use('/api/users', userRoutes);

// Conexión a MongoDB Atlas mediante Mongoose
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('============== 💾 ==============');
    console.log('¡Conectado exitosamente a MONGODB ATLAS (Nube)!');
    console.log('=================================');
    
    // 💻 CORRECCIÓN CLAVE: Agregamos '0.0.0.0' para abrir el servidor a la red local
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en red local: http://192.168.1.38:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error crítico al conectar a MongoDB Atlas:', error);
  });