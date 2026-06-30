// backend/src/scripts/seed.js
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs'); // 🔒 Importación explícita de bcryptjs
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require(path.join(__dirname, '../models/User'));

const crearUsuariosIniciales = async () => {
  try {
    // 🌐 Conexión a la base de datos
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI no está definida en el entorno (.env)");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado a MongoDB Atlas para insertar usuarios semilla...");

    // 🧹 Limpieza preventiva de usuarios previos
    await User.deleteMany({});
    console.log("Base de datos de usuarios limpia.");

    // 🔑 Generamos los hashes de las contraseñas manualmente antes de insertar
    console.log("Encriptando contraseñas con bcryptjs...");
    const saltRounds = 10;
    const hashSuper = await bcrypt.hash("Super123", saltRounds);
    const hashAdmin = await bcrypt.hash("Admin123", saltRounds);
    const hashConsejo = await bcrypt.hash("Consejo123", saltRounds);
    const hashProp = await bcrypt.hash("Prop123", saltRounds);
    const hashInq = await bcrypt.hash("Inq123", saltRounds);

    // 👥 Definición de la suite de usuarios con sus claves ya encriptadas
    const usuariosPrueba = [
      {
        name: "Super Admin",
        email: "superadmin@consorcia.com.ar",
        password: hashSuper, 
        role: "superadmin",
        estado: "activo",
        debeCambiarPassword: false
      },
      {
        name: "Alejandro Borges",
        email: "admin@consorcia.com.ar",
        password: hashAdmin, 
        role: "admin",
        estado: "activo",
        debeCambiarPassword: false
      },
      {
        name: "Consejo de Administración",
        email: "consejo@consorcia.com.ar",
        password: hashConsejo, 
        role: "consejo",
        estado: "activo",
        debeCambiarPassword: false
      },
      {
        name: "Propietario Prueba",
        email: "propietario@consorcia.com.ar",
        password: hashProp, 
        role: "propietario",
        estado: "activo",
        debeCambiarPassword: false
      },
      {
        name: "Inquilino Prueba",
        email: "inquilino@consorcia.com.ar",
        password: hashInq, 
        role: "inquilino",
        estado: "activo",
        debeCambiarPassword: false
      }
    ];

    console.log("Insertando registros en bloque (insertMany)...");
    
    // Al usar insertMany con contraseñas ya hasheadas, el middleware pre('save') 
    // de tu modelo no alterará el hash (ya que detectará que 'password' no viene vacío)
    const usuariosInsertados = await User.insertMany(usuariosPrueba);
    
    console.log(`\n¡${usuariosInsertados.length} usuarios de prueba insertados con éxito! 🎉`);
    usuariosInsertados.forEach(u => {
      console.log(` - ${u.name} [${u.role.toUpperCase()}] -> ${u.email} (${u.estado})`);
    });

  } catch (error) {
    console.error("❌ Error al insertar los usuarios de prueba:", error);
  } finally {
    // 🔌 Cierre seguro de conexiones
    await mongoose.connection.close();
    console.log("Conexión a MongoDB cerrada de forma segura.");
  }
};

crearUsuariosIniciales();