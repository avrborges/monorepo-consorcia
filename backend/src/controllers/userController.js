// backend/src/controllers/userController.js

// Usuario simulado (Mock) para pruebas de desarrollo antes de conectar la Base de Datos
const MOCK_USER = {
  email: "admin@admin.com",
  password: "Admin123", // Recuerda que en producción esto irá encriptado
  name: "Carlos Administración",
  role: "admin"
};

const loginUser = (req, res) => {
  const { email, password } = req.body;

  // 1. Validar que vengan ambos campos
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Por favor, completa todos los campos obligatorios." 
    });
  }

  // 2. Simular verificación de credenciales
  if (email === MOCK_USER.email && password === MOCK_USER.password) {
    // Éxito: Devolvemos los datos básicos necesarios para el frontend
    return res.status(200).json({
      success: true,
      message: "¡Inicio de sesión exitoso!",
      user: {
        name: MOCK_USER.name,
        email: MOCK_USER.email,
        role: MOCK_USER.role
      }
    });
  } else {
    // Error de autenticación
    return res.status(401).json({
      success: false,
      message: "El correo electrónico o la contraseña son incorrectos."
    });
  }
};

module.exports = {
  loginUser
};