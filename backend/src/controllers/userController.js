// backend/src/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // 🆕 Nativo de Node.js, no requiere instalación
const { enviarMailInvitacion } = require('../services/emailService'); // 🆕 Nuestro cartero

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

    const emailLimpio = email.trim().toLowerCase();
    const usuarioExistente = await User.findOne({ email: emailLimpio });
    if (usuarioExistente) {
      return res.status(400).json({ 
        success: false, 
        message: "Ya existe un usuario registrado con este correo electrónico." 
      });
    }

    // 🆕 1. Generar token de 64 caracteres y su vencimiento (24hs)
    const token = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 24);

    // 🆕 2. Creamos el usuario SIN contraseña
    const nuevoUsuario = new User({
      name: name.trim(),
      email: emailLimpio,
      role: role || 'propietario',
      unidadFuncional: unidadFuncional || "",
      telefono: telefono || "",
      estado: 'pendiente',
      debeCambiarPassword: true,
      tokenActivacion: token,
      tokenExpiracion: expiracion
    });

    await nuevoUsuario.save();

    // 🆕 3. Armar la URL y disparar el correo en segundo plano
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const urlActivacion = `${baseUrl}/activar-cuenta?token=${token}`;

    enviarMailInvitacion(nuevoUsuario.email, nuevoUsuario.name, urlActivacion)
      .catch(err => console.error("Error al enviar mail de invitación:", err));

    return res.status(201).json({ 
      success: true, 
      message: "Usuario registrado con éxito. Se ha enviado el correo de invitación.",
      user: {
        id: nuevoUsuario._id,
        name: nuevoUsuario.name,
        email: nuevoUsuario.email,
        role: nuevoUsuario.role,
        estado: nuevoUsuario.estado
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

// 🆕 MÉTODO NUEVO: Activar cuenta desde el link del correo
const activarCuenta = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: "El token y la contraseña son obligatorios." });
    }

    // Buscamos al usuario que tenga este token y que no esté vencido
    const usuario = await User.findOne({
      tokenActivacion: token,
      tokenExpiracion: { $gt: new Date() } // El vencimiento debe ser mayor a "ahora"
    });

    if (!usuario) {
      return res.status(400).json({ 
        success: false, 
        message: "El enlace de activación es inválido o ha expirado. Solicitá uno nuevo al administrador." 
      });
    }

    // Actualizamos los datos. El middleware pre('save') de User.js encriptará la clave.
    usuario.password = password;
    usuario.estado = 'activo';
    usuario.debeCambiarPassword = false;
    usuario.tokenActivacion = null; // Destruimos el token para que no se use 2 veces
    usuario.tokenExpiracion = null;

    await usuario.save();

    return res.status(200).json({
      success: true,
      message: "Tu cuenta ha sido activada exitosamente. Ya podés iniciar sesión."
    });

  } catch (error) {
    console.error("Error en activarCuenta:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error al intentar activar la cuenta."
    });
  }
};

// MÉTODO: Alternar el estado del usuario (Activar / Inactivar)
const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
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
    return res.status(500).json({ success: false, message: "Hubo un error en el servidor al cambiar el estado." });
  }
};

// MÉTODO: Eliminar definitivamente un usuario de la base de datos
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioEliminado = await User.findByIdAndDelete(id);

    if (!usuarioEliminado) {
      return res.status(404).json({ success: false, message: "El usuario que intenta eliminar ya no existe." });
    }

    return res.status(200).json({
      success: true,
      message: `La cuenta de ${usuarioEliminado.name} ha sido eliminada definitivamente.`
    });

  } catch (error) {
    console.error("Error en eliminarUsuario:", error);
    return res.status(500).json({ success: false, message: "Error interno al intentar eliminar el usuario." });
  }
};

// MÉTODO: Inicio de sesión
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Por favor, completa todos los campos obligatorios." });
    }

    const userFound = await User.findOne({ email: email.toLowerCase() });

    // 🆕 Frenamos al usuario si su cuenta sigue pendiente (no activó desde el mail)
    if (userFound && userFound.estado === 'pendiente') {
      return res.status(403).json({
        success: false,
        message: "Tu cuenta aún no está activada. Revisá tu correo electrónico para activarla."
      });
    }

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

    const token = jwt.sign(
      { id: userFound._id, role: userFound.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: `¡Inicio de sesión exitoso! Bienvenido, ${userFound.name}`,
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
    return res.status(500).json({ success: false, message: "Hubo un error interno en el servidor." });
  }
};

// 🆕 MÉTODO NUEVO: Reenviar link de invitación a un usuario con cuenta pendiente
const reenviarInvitacion = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
    }

    // Validación crucial: solo reenviar si sigue pendiente
    if (usuario.estado !== 'pendiente') {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede reenviar la invitación porque el usuario ya está ${usuario.estado}.` 
      });
    }

    // 1. Generar nuevo token y extender expiración (24 horas más)
    const nuevoToken = crypto.randomBytes(32).toString('hex');
    const nuevaExpiracion = new Date();
    nuevaExpiracion.setHours(nuevaExpiracion.getHours() + 24);

    // 2. Actualizar los campos del usuario en la base de datos
    usuario.tokenActivacion = nuevoToken;
    usuario.tokenExpiracion = nuevaExpiracion;
    await usuario.save();

    // 3. Armar la nueva URL y disparar el correo de invitación
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const urlActivacion = `${baseUrl}/activar-cuenta?token=${nuevoToken}`;

    // Despachamos el mail en segundo plano
    enviarMailInvitacion(usuario.email, usuario.name, urlActivacion)
      .catch(err => console.error("Error al reenviar mail de invitación:", err));

    return res.status(200).json({
      success: true,
      message: `Se ha reenviado el correo de invitación a ${usuario.email} de forma exitosa.`
    });

  } catch (error) {
    console.error("Error en reenviarInvitacion:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error interno en el servidor al intentar reenviar la invitación."
    });
  }
};

module.exports = {
  loginUser,
  getUsers,
  crearUsuario,
  activarCuenta, // 🆕 Exportamos la nueva función
  toggleStatus,
  eliminarUsuario,
  reenviarInvitacion
};