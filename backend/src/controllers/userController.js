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
      users // 💡 Nota: Asegurate de que tu frontend (`ListaUsuarios.tsx`) lea `datos.users` en vez de `datos.data`
    });
  } catch (error) {
    console.error("Error en getUsers:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error al obtener el listado de usuarios."
    });
  }
};

// 🆕 MÉTODO: Registrar un nuevo usuario desde el Panel de Administración
const crearUsuario = async (req, res) => {
  try {
    const { name, email, role, unidadFuncional, telefono } = req.body;

    // 1. Validaciones de campos obligatorios requeridos por el Schema
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "El nombre completo es obligatorio." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "El correo electrónico es obligatorio." });
    }

    // 2. Controlar duplicados en la base de datos
    const usuarioExistente = await User.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(400).json({ 
        success: false, 
        message: "Ya existe un usuario registrado con este correo electrónico." 
      });
    }

    // 3. Generar Contraseña Provisoria Obligatoria (Evita errores del Schema)
    // Toma la primera parte del mail antes del '@' y le concatena un patrón común
    const prefijoEmail = email.split('@')[0];
    const passwordProvisoria = `${prefijoEmail}2026!`;

    // 4. Crear instancia alineada estrictamente al Schema Real
    const nuevoUsuario = new User({
      name: name.trim(),
      email: email.trim(),
      password: passwordProvisoria, // El hook pre('save') del Schema la encriptará automáticamente
      role: role || 'propietario',
      unidadFuncional: unidadFuncional || "",
      telefono: telefono || "",
      estado: 'pendiente', // Inicializado obligatoriamente en pendiente
      debeCambiarPassword: true // Bandera de control para obligar el cambio en el primer login
    });

    // 5. Guardar físicamente en MongoDB Atlas
    await nuevoUsuario.save();

    // 6. Respuesta de éxito devolviendo la clave provisional generada
    return res.status(201).json({ 
      success: true, 
      message: "Usuario registrado con éxito en estado pendiente.",
      user: {
        id: nuevoUsuario._id,
        name: nuevoUsuario.name,
        email: nuevoUsuario.email,
        role: nuevoUsuario.role,
        passwordProvisoria // Se le expone al admin para que pueda notificársela al usuario
      }
    });

  } catch (error) {
    console.error("Error en crearUsuario:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Hubo un error interno en el servidor al procesar el alta." 
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

    // 3. VALIDACIÓN DE ESTADO: Si está 'inactivo' no puede pasar bajo ninguna circunstancia
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
        estado: userFound.estado, // Ahora viaja como 'activo' al Frontend en el primer login
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
  getUsers,
  crearUsuario // 🆕 Exportamos el nuevo método de alta
};