// backend/src/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 🆕 MÉTODO: Obtener la nómina completa de usuarios para el Administrador
const getUsers = async (req, res) => {
  try {
    // Buscamos todos los usuarios, excluimos el password por seguridad y ordenamos por creación
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error("Error en getUsers:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error al obtener el listado de usuarios."
    });
  }
};

// MÉTODO: Inicio de sesión con control de estado y activación en primer acceso
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validación de campos obligatorios
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Por favor, completa todos los campos obligatorios." 
      });
    }

    // 2. Búsqueda del usuario en MongoDB Atlas
    const userFound = await User.findOne({ email });

    // 3. 🆕 VALIDACIÓN DE ESTADO: Si está 'inactivo' no puede pasar bajo ninguna circunstancia
    if (userFound && (userFound.estado === 'inactive' || userFound.estado === 'inactivo')) {
      return res.status(403).json({
        success: false,
        message: "Tu cuenta se encuentra inactiva. Por favor, contactá al administrador."
      });
    }

    // 4. Validar contraseña con Bcrypt
    const isMatch = userFound ? await bcrypt.compare(password, userFound.password) : false;

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "El correo electrónico o la contraseña son incorrectos."
      });
    }

    // 🎯 4.5. ACTUALIZACIÓN AUTOMÁTICA DE ESTADO (Primer inicio de sesión)
    // Si la contraseña es correcta y está pendiente, lo pasamos a activo e impactamos en Atlas.
    let primerAcceso = false;
    if (userFound.estado === 'pendiente') {
      userFound.estado = 'activo';
      await userFound.save(); // 🔥 Cambia el estado físicamente en la Base de Datos
      primerAcceso = true;
      console.log(`[Consorcia] Cuenta activada con éxito en primer acceso: ${userFound.email}`);
    }

    // 5. GENERAR EL TOKEN JWT
    const token = jwt.sign(
      { id: userFound._id, role: userFound.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 6. Respuesta exitosa incluyendo banderas de control y nuevos campos actualizados
    return res.status(200).json({
      success: true,
      message: primerAcceso 
        ? "¡Primer inicio de sesión detectado! Tu cuenta ha sido activada con éxito."
        : `¡Inicio de sesión exitoso! Bienvenido, ${userFound.name}`,
      token, 
      user: {
        name: userFound.name,
        email: userFound.email,
        role: userFound.role,
        unidadFuncional: userFound.unidadFuncional,
        telefono: userFound.telefono,
        estado: userFound.estado, // 👈 Ahora va a viajar como 'activo' al Frontend en el primer login
        debeCambiarPassword: userFound.debeCambiarPassword 
      }
    });

  } catch (error) {
    console.error("Error en loginUser:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error interno en el servidor."
    });
  }
};

module.exports = {
  loginUser,
  getUsers // 🆕 Exportamos el nuevo método
};