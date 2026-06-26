// backend/src/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MÉTODO: Obtener la nómina completa de usuarios para el Administrador
const getUsers = async (req, res) => {
  try {
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

// MÉTODO: Registrar un nuevo usuario desde el Panel de Administración
const crearUsuario = async (req, res) => {
  try {
    const { name, email, role, unidadFuncional, telefono } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "El nombre completo es obligatorio." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "El correo electrónico es obligatorio." });
    }

    const usuarioExistente = await User.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(400).json({ 
        success: false, 
        message: "Ya existe un usuario registrado con este correo electrónico." 
      });
    }

    const prefijoEmail = email.split('@')[0];
    const passwordProvisoria = `${prefijoEmail}2026!`;

    const nuevoUsuario = new User({
      name: name.trim(),
      email: email.trim(),
      password: passwordProvisoria,
      role: role || 'propietario',
      unidadFuncional: unidadFuncional || "",
      telefono: telefono || "",
      estado: 'pendiente',
      debeCambiarPassword: true
    });

    await nuevoUsuario.save();

    return res.status(201).json({ 
      success: true, 
      message: "Usuario registrado con éxito en estado pendiente.",
      user: {
        id: nuevoUsuario._id,
        name: nuevoUsuario.name,
        email: nuevoUsuario.email,
        role: nuevoUsuario.role,
        passwordProvisoria
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

// MÉTODO: Alternar el estado del usuario (Activar / Inactivar)
const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado." 
      });
    }

    const nuevoEstado = usuario.estado === 'inactivo' ? 'activo' : 'inactivo';
    usuario.estado = nuevoEstado;

    await usuario.save();

    return res.status(200).json({
      success: true,
      message: `El usuario ha sido marcado como ${nuevoEstado} con éxito.`,
      estado: nuevoEstado
    });

  } catch (error) {
    console.error("Error en toggleStatus:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Hubo un error en el servidor al cambiar el estado del usuario." 
    });
  }
};

// 🆕 MÉTODO: Eliminar definitivamente un usuario de la base de datos
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscamos y removemos el documento en un solo paso asincrónico
    const usuarioEliminado = await User.findByIdAndDelete(id);

    if (!usuarioEliminado) {
      return res.status(404).json({
        success: false,
        message: "El usuario que intenta eliminar ya no existe en el sistema."
      });
    }

    return res.status(200).json({
      success: true,
      message: `La cuenta de ${usuarioEliminado.name} ha sido eliminada definitivamente.`
    });

  } catch (error) {
    console.error("Error en eliminarUsuario:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error interno en el servidor al intentar eliminar el usuario."
    });
  }
};

// MÉTODO: Inicio de sesión con control de estado y activación en primer acceso
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Por favor, completa todos los campos obligatorios." 
      });
    }

    const userFound = await User.findOne({ email });

    if (userFound && (userFound.estado === 'inactive' || userFound.estado === 'inactivo')) {
      return res.status(403).json({
        success: false,
        message: "Tu cuenta se encuentra inactiva. Por favor, contactá al administrador."
      });
    }

    const isMatch = userFound ? await bcrypt.compare(password, userFound.password) : false;

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "El correo electrónico o la contraseña son incorrectos."
      });
    }

    let primerAcceso = false;
    if (userFound.estado === 'pendiente') {
      userFound.estado = 'activo';
      await userFound.save();
      primerAcceso = true;
      console.log(`[Consorcia] Cuenta activada con éxito en primer acceso: ${userFound.email}`);
    }

    const token = jwt.sign(
      { id: userFound._id, role: userFound.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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
        estado: userFound.estado,
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
  crearUsuario,
  toggleStatus,
  eliminarUsuario // 🆕 Exportación añadida de forma prolija
};