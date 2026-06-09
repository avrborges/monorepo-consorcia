// backend/src/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

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

    // 3. Si el usuario existe, validamos la contraseña encriptada con Bcrypt
    // Si no existe, evitamos evaluar bcrypt para mitigar ataques de temporización (timing attacks)
    const isMatch = userFound ? await bcrypt.compare(password, userFound.password) : false;

    // 4. Validación unificada (Ciberseguridad: no revelamos si falló el email o la contraseña)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "El correo electrónico o la contraseña son incorrectos."
      });
    }

    // 5. Respuesta exitosa
    return res.status(200).json({
      success: true,
      message: `¡Inicio de sesión exitoso! Bienvenido de nuevo, ${userFound.name}`,
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