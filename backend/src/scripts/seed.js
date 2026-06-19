const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const User = require(path.join(__dirname, '../models/User'));

const crearUsuariosIniciales = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado a Atlas para insertar usuarios de prueba...");

    // Limpiamos usuarios previos para arrancar con un estado limpio y controlado
    await User.deleteMany({});
    console.log("Base de datos de usuarios limpia.");

    // Definición de la suite de usuarios iniciales por rol
    const usuariosPrueba = [
      {
        name: "Super Admin",
        email: "superadmin@consorcia.com.ar",
        password: "Super123",
        role: "superadmin"
      },
      {
        name: "Alejandro Borges",
        email: "admin@consorcia.com.ar",
        password: "Admin123",
        role: "admin"
      },
      {
        name: "Consejo de Administración",
        email: "consejo@consorcia.com.ar",
        password: "Consejo123",
        role: "consejo"
      },
      {
        name: "Propietario Prueba",
        email: "propietario@consorcia.com.ar",
        password: "Prop123",
        role: "propietario"
      },
      {
        name: "Inquilino Prueba",
        email: "inquilino@consorcia.com.ar",
        password: "Inq123",
        role: "inquilino"
      }
    ];

    // Insertamos todos los documentos en bloque
    const usuariosInsertados = await User.insertMany(usuariosPrueba);
    
    console.log(`\n¡${usuariosInsertados.length} usuarios de prueba insertados con éxito! 🎉`);
    usuariosInsertados.forEach(u => {
      console.log(` - ${u.name} [${u.role.toUpperCase()}] -> ${u.email}`);
    });

    mongoose.connection.close();
    console.log("\nConexión a MongoDB cerrada.");
  } catch (error) {
    console.error("Error al insertar los usuarios de prueba:", error);
  }
};

crearUsuariosIniciales();