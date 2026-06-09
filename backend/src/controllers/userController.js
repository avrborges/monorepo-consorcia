// backend/src/controllers/userController.js
const User = require('../models/User');

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

    // 3. Validación de existencia de usuario y coincidencia de contraseña
    if (!userFound || userFound.password !== password) {
      return res.status(401).json({
        success: false,
        message: "El correo electrónico o la contraseña son incorrectos."
      });
    }

    // 4. Respuesta exitosa
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