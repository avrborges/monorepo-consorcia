// backend/src/controllers/userController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { enviarMailInvitacion } = require("../services/emailService");
const { registrarLog } = require("../services/loggerService");

/* ============================================================
 * HELPER: Resolver URL del frontend para links de activación
 * ============================================================ */
const obtenerFrontendUrl = (req) => {
  const frontendUrlEnv = process.env.FRONTEND_URL;

  /*
   * Caso 1:
   * Si FRONTEND_URL tiene una URL fija real, la usamos.
   *
   * Ejemplos:
   * FRONTEND_URL=https://consorcia.com
   * FRONTEND_URL=http://localhost:5173
   * FRONTEND_URL=http://192.168.1.38:5173
   */
  if (frontendUrlEnv && frontendUrlEnv.toLowerCase() !== "auto") {
    return frontendUrlEnv.replace(/\/$/, "");
  }

  /*
   * Caso 2:
   * Si FRONTEND_URL=auto, intentamos usar Origin.
   *
   * Ejemplos:
   * Origin: http://localhost:5173
   * Origin: http://192.168.0.55:5173
   */
  const origin = req.get("origin");

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  /*
   * Caso 3:
   * Si no vino Origin, intentamos usar Referer.
   */
  const referer = req.get("referer");

  if (referer) {
    try {
      return new URL(referer).origin.replace(/\/$/, "");
    } catch {
      // Si Referer no es válido, continuamos con fallback final.
    }
  }

  /*
   * Caso 4:
   * Fallback final para desarrollo local.
   */
  return "http://localhost:5173";
};

/* ============================================================
 * MÉTODO: Obtener la nómina completa de usuarios para el Administrador
 * ============================================================ */
const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error en getUsers:", error);

    return res.status(500).json({
      success: false,
      message: "Hubo un error al obtener el listado de usuarios.",
    });
  }
};

/* ============================================================
 * MÉTODO: Registrar un nuevo usuario desde el Panel de Administración
 * ============================================================ */
const crearUsuario = async (req, res) => {
  try {
    const { name, email, role, unidadFuncional, telefono } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "El nombre completo es obligatorio.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "El correo electrónico es obligatorio.",
      });
    }

    const emailLimpio = email.trim().toLowerCase();

    const usuarioExistente = await User.findOne({ email: emailLimpio });

    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un usuario registrado con este correo electrónico.",
      });
    }

    // 1. Generar token de 64 caracteres y vencimiento de 24 hs
    const token = crypto.randomBytes(32).toString("hex");

    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 24);

    // 2. Creamos el usuario SIN contraseña
    const nuevoUsuario = new User({
      name: name.trim(),
      email: emailLimpio,
      role: role || "propietario",
      unidadFuncional: unidadFuncional || "",
      telefono: telefono || "",
      estado: "pendiente",
      debeCambiarPassword: true,
      tokenActivacion: token,
      tokenExpiracion: expiracion,
    });

    await nuevoUsuario.save();

    // 3. Armar URL de activación dinámica y disparar correo en segundo plano
    const baseUrl = obtenerFrontendUrl(req);
    const urlActivacion = `${baseUrl}/activar-cuenta?token=${encodeURIComponent(
      token
    )}`;

    enviarMailInvitacion(
      nuevoUsuario.email,
      nuevoUsuario.name,
      urlActivacion
    ).catch((err) =>
      console.error("Error al enviar mail de invitación:", err)
    );

    // 4. Registrar acción en el Log de Auditoría
    await registrarLog(req, "USUARIO_CREADO", nuevoUsuario._id, {
      nombreUsuario: nuevoUsuario.name,
      cambios: {
        email: nuevoUsuario.email,
        role: nuevoUsuario.role,
        unidadFuncional: nuevoUsuario.unidadFuncional,
      },
    });

    return res.status(201).json({
      success: true,
      message:
        "Usuario registrado con éxito. Se ha enviado el correo de invitación.",
      user: {
        id: nuevoUsuario._id,
        name: nuevoUsuario.name,
        email: nuevoUsuario.email,
        role: nuevoUsuario.role,
        estado: nuevoUsuario.estado,
      },
    });
  } catch (error) {
    console.error("Error en crearUsuario:", error);

    return res.status(500).json({
      success: false,
      message: "Hubo un error interno en el servidor al procesar el alta.",
    });
  }
};

/* ============================================================
 * MÉTODO: Activar cuenta desde el link del correo
 * ============================================================ */
const activarCuenta = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "El token y la contraseña son obligatorios.",
      });
    }

    const usuario = await User.findOne({
      tokenActivacion: token,
      tokenExpiracion: { $gt: new Date() },
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        message:
          "El enlace de activación es inválido o ha expirado. Solicitá uno nuevo al administrador.",
      });
    }

    /*
     * El middleware pre("save") del modelo User debería encriptar la clave.
     */
    usuario.password = password;
    usuario.estado = "activo";
    usuario.debeCambiarPassword = false;
    usuario.tokenActivacion = null;
    usuario.tokenExpiracion = null;

    await usuario.save();

    return res.status(200).json({
      success: true,
      message: "Tu cuenta ha sido activada exitosamente. Ya podés iniciar sesión.",
    });
  } catch (error) {
    console.error("Error en activarCuenta:", error);

    return res.status(500).json({
      success: false,
      message: "Hubo un error al intentar activar la cuenta.",
    });
  }
};

/* ============================================================
 * MÉTODO: Alternar el estado del usuario
 * ============================================================ */
const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await User.findById(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado.",
      });
    }

    const nuevoEstado = usuario.estado === "inactivo" ? "activo" : "inactivo";
    usuario.estado = nuevoEstado;

    await usuario.save();

    await registrarLog(req, "USUARIO_EDITADO", usuario._id, {
      nombreUsuario: usuario.name,
      cambios: { estado: nuevoEstado },
    });

    return res.status(200).json({
      success: true,
      message: `El usuario ha sido marcado como ${nuevoEstado} con éxito.`,
      estado: nuevoEstado,
    });
  } catch (error) {
    console.error("Error en toggleStatus:", error);

    return res.status(500).json({
      success: false,
      message: "Hubo un error en el servidor al cambiar el estado.",
    });
  }
};

/* ============================================================
 * MÉTODO: Eliminar definitivamente un usuario
 * ============================================================ */
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuarioEliminado = await User.findByIdAndDelete(id);

    if (!usuarioEliminado) {
      return res.status(404).json({
        success: false,
        message: "El usuario que intenta eliminar ya no existe.",
      });
    }

    await registrarLog(req, "USUARIO_ELIMINADO", id, {
      nombreUsuario: usuarioEliminado.name,
      cambios: {
        email: usuarioEliminado.email,
        role: usuarioEliminado.role,
      },
    });

    return res.status(200).json({
      success: true,
      message: `La cuenta de ${usuarioEliminado.name} ha sido eliminada definitivamente.`,
    });
  } catch (error) {
    console.error("Error en eliminarUsuario:", error);

    return res.status(500).json({
      success: false,
      message: "Error interno al intentar eliminar el usuario.",
    });
  }
};

/* ============================================================
 * MÉTODO: Inicio de sesión
 * ============================================================ */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Por favor, completa todos los campos obligatorios.",
      });
    }

    const emailLimpio = email.trim().toLowerCase();

    const userFound = await User.findOne({ email: emailLimpio });

    if (userFound && userFound.estado === "pendiente") {
      return res.status(403).json({
        success: false,
        message:
          "Tu cuenta aún no está activada. Revisá tu correo electrónico para activarla.",
      });
    }

    if (
      userFound &&
      (userFound.estado === "inactive" || userFound.estado === "inactivo")
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Tu cuenta se encuentra inactiva. Por favor, contactá al administrador.",
      });
    }

    const isMatch = userFound
      ? await bcrypt.compare(password, userFound.password)
      : false;

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "El correo electrónico o la contraseña son incorrectos.",
      });
    }

    const token = jwt.sign(
      {
        id: userFound._id,
        role: userFound.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
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
        debeCambiarPassword: userFound.debeCambiarPassword,
      },
    });
  } catch (error) {
    console.error("Error en loginUser:", error);

    return res.status(500).json({
      success: false,
      message: "Hubo un error interno en el servidor.",
    });
  }
};

/* ============================================================
 * MÉTODO: Reenviar link de invitación a usuario pendiente
 * ============================================================ */
const reenviarInvitacion = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await User.findById(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado.",
      });
    }

    if (usuario.estado !== "pendiente") {
      return res.status(400).json({
        success: false,
        message: `No se puede reenviar la invitación porque el usuario ya está ${usuario.estado}.`,
      });
    }

    // 1. Generar nuevo token y extender expiración por 24 horas
    const nuevoToken = crypto.randomBytes(32).toString("hex");

    const nuevaExpiracion = new Date();
    nuevaExpiracion.setHours(nuevaExpiracion.getHours() + 24);

    // 2. Actualizar token en la base
    usuario.tokenActivacion = nuevoToken;
    usuario.tokenExpiracion = nuevaExpiracion;

    await usuario.save();

    // 3. Armar URL dinámica y disparar correo
    const baseUrl = obtenerFrontendUrl(req);
    const urlActivacion = `${baseUrl}/activar-cuenta?token=${encodeURIComponent(
      nuevoToken
    )}`;

    enviarMailInvitacion(usuario.email, usuario.name, urlActivacion).catch(
      (err) => console.error("Error al reenviar mail de invitación:", err)
    );

    return res.status(200).json({
      success: true,
      message: `Se ha reenviado el correo de invitación a ${usuario.email} de forma exitosa.`,
    });
  } catch (error) {
    console.error("Error en reenviarInvitacion:", error);

    return res.status(500).json({
      success: false,
      message:
        "Hubo un error interno en el servidor al intentar reenviar la invitación.",
    });
  }
};

/* ============================================================
 * MÉTODO: Editar datos de usuario
 * ============================================================ */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, unidadFuncional, telefono } = req.body;

    const usuario = await User.findById(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "El usuario que intentás editar no existe.",
      });
    }

    if (email && email.trim().toLowerCase() !== usuario.email) {
      const emailLimpio = email.trim().toLowerCase();

      const emailDuplicado = await User.findOne({
        email: emailLimpio,
        _id: { $ne: usuario._id },
      });

      if (emailDuplicado) {
        return res.status(400).json({
          success: false,
          message: "El correo electrónico ya está registrado por otro usuario.",
        });
      }

      usuario.email = emailLimpio;
    }

    usuario.name = name ? name.trim() : usuario.name;
    usuario.role = role || usuario.role;
    usuario.unidadFuncional =
      typeof unidadFuncional === "string" ? unidadFuncional : usuario.unidadFuncional;
    usuario.telefono = typeof telefono === "string" ? telefono : usuario.telefono;

    const usuarioActualizado = await usuario.save();

    await registrarLog(req, "USUARIO_EDITADO", usuarioActualizado._id, {
      nombreUsuario: usuarioActualizado.name,
      cambios: {
        name: usuarioActualizado.name,
        email: usuarioActualizado.email,
        role: usuarioActualizado.role,
        unidadFuncional: usuarioActualizado.unidadFuncional,
        telefono: usuarioActualizado.telefono,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Usuario actualizado correctamente.",
      user: usuarioActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al procesar la actualización.",
    });
  }
};

/* ============================================================
 * MÉTODO: Obtener historial de auditoría
 * ============================================================ */
const getAuditLogs = async (req, res) => {
  try {
    const AuditLog = require("../models/AuditLog");

    const logs = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("Error en getAuditLogs:", error);

    return res.status(500).json({
      success: false,
      message: "Hubo un error al obtener el historial de auditoría.",
    });
  }
};

module.exports = {
  loginUser,
  getUsers,
  crearUsuario,
  activarCuenta,
  toggleStatus,
  eliminarUsuario,
  reenviarInvitacion,
  updateUser,
  getAuditLogs,
};