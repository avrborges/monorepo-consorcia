// backend/src/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // 🆕 Importamos JWT

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

    // 3. Validar contraseña con Bcrypt
    const isMatch = userFound ? await bcrypt.compare(password, userFound.password) : false;

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "El correo electrónico o la contraseña son incorrectos."
      });
    }

    // 4. 🆕 GENERAR EL TOKEN JWT
    // Guardamos el ID y el rol dentro del token. Expira en 24 horas.
    const token = jwt.sign(
      { id: userFound._id, role: userFound.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 5. Respuesta exitosa (Ahora incluye el Token)
    return res.status(200).json({
      success: true,
      message: `¡Inicio de sesión exitoso! Bienvenido de nuevo, ${userFound.name}`,
      token, // 🆕 Enviamos el token al Frontend
      user: {
        name: userFound.name,
        email: userFound.email,
        role: userFound.role
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
  loginUser
};