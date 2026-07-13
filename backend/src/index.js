const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const os = require('os'); 
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const unidadRoutes = require('./routes/unidadRoutes'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Enrutadores
app.use('/api/users', userRoutes);
app.use('/api/unidades', unidadRoutes); 

// Conexión a MongoDB Atlas mediante Mongoose
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';
    
    for (const interfaceName in networkInterfaces) {
      for (const iface of networkInterfaces[interfaceName]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIP = iface.address;
        }
      }
    }

    console.log('\n============== 💾 MONGODB ==============');
    console.log('¡Conectado exitosamente a MONGODB ATLAS (Nube)!');
    console.log('========================================');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor Consorcia API activo:`);
      console.log(`   • En esta PC: http://localhost:${PORT}`);
      console.log(`   • En la Red:  http://${localIP}:${PORT}\n`);
    });
  })
  .catch((error) => {
    console.error('❌ Error crítico al conectar a MongoDB Atlas:', error);
  });