const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require(path.join(__dirname, 'models/User'));

const crearUsuarioInicial = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado a Atlas para insertar usuario...");

    // Limpiamos usuarios previos si existieran para evitar duplicados
    await User.deleteMany({});

    // Creamos el usuario Administrador de prueba
    const usuarioAdmin = new User({
      name: "Admin Admin",
      email: "admin@consorcia.com.ar",
      password: "Admin123", // Texto plano por ahora
      role: "admin"
    });

    await usuarioAdmin.save();
    console.log("¡Usuario de prueba insertado con éxito en MongoDB Atlas! 🎉");
    
    mongoose.connection.close();
  } catch (error) {
    console.error("Error al insertar el usuario:", error);
  }
};

crearUsuarioInicial();