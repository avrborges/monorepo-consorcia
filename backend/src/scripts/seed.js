// src/scripts/seed.js

const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs'); // 💡 IMPORTANTE: Importamos bcrypt para hashear
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require(path.join(__dirname, '../models/User'));

const crearUsuariosIniciales = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado a Atlas para insertar usuarios de prueba...");

    // Limpiamos usuarios previos
    await User.deleteMany({});
    console.log("Base de datos de usuarios limpia.");

    // Generamos los hashes de las contraseñas usando un "salt" de 10 rondas (estándar)
    console.log("Encriptando contraseñas de prueba...");
    const hashSuper = await bcrypt.hash("Super123", 10);
    const hashAdmin = await bcrypt.hash("Admin123", 10);
    const hashConsejo = await bcrypt.hash("Consejo123", 10);
    const hashProp = await bcrypt.hash("Prop123", 10);
    const hashInq = await bcrypt.hash("Inq123", 10);

    // Definición de la suite de usuarios con sus claves encriptadas
    const usuariosPrueba = [
      {
        name: "Super Admin",
        email: "superadmin@consorcia.com.ar",
        password: hashSuper, // 🔒 Guardamos el hash
        role: "superadmin"
      },
      {
        name: "Alejandro Borges",
        email: "admin@consorcia.com.ar",
        password: hashAdmin, // 🔒 Guardamos el hash
        role: "admin"
      },
      {
        name: "Consejo de Administración",
        email: "consejo@consorcia.com.ar",
        password: hashConsejo, // 🔒 Guardamos el hash
        role: "consejo"
      },
      {
        name: "Propietario Prueba",
        email: "propietario@consorcia.com.ar",
        password: hashProp, // 🔒 Guardamos el hash
        role: "propietario"
      },
      {
        name: "Inquilino Prueba",
        email: "inquilino@consorcia.com.ar",
        password: hashInq, // 🔒 Guardamos el hash
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
    console.log("\nConexión a MongoDB cerrada de forma segura.");
  } catch (error) {
    console.error("Error al insertar los usuarios de prueba:", error);
  }
};

crearUsuariosIniciales();