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
    
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error crítico al conectar a MongoDB Atlas:', error);
  });