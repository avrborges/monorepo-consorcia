// backend/src/index.js
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARES
// Permite que tu frontend de Vite (ej. http://localhost:5173) consulte al backend sin bloqueos de CORS
app.use(cors()); 
app.use(express.json());

// RUTAS GLOBALES
app.use('/api/users', userRoutes);

// Ruta de testeo inicial
app.get('/', (req, res) => {
  res.send('Consorcia API funcionando correctamente 🚀');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});