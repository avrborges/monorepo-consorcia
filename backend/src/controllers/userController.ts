// backend/src/controllers/userController.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";

import User, { type RolUsuario } from "../models/User";
import AuditLog from "../models/AuditLog";
import { enviarMailInvitacion, enviarEmailResetPassword } from "../services/emailService";
import { registrarLog } from "../services/loggerService";

/* ============================================================
 * TIPOS DE PAYLOAD
 * ============================================================ */

interface CrearUsuarioBody {
  name?: string;
  email?: string;
  role?: RolUsuario;
  unidadFuncional?: string;
  telefono?: string;
}

interface ActivarCuentaBody {
  token?: string;
  password?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

interface UpdateUserBody {
  name?: string;
  email?: string;
  role?: RolUsuario;
  unidadFuncional?: string;
  telefono?: string;
}

interface OlvidePasswordBody {
  email?: string;
}

interface ResetPasswordBody {
  token?: string;
  password?: string;
}

interface ParamsId {
  id: string;
  [key: string]: string;
}

/* ============================================================
 * HELPER: Resolver URL del frontend para links de activación
 * ============================================================ */

/**
 * Interface mínima que necesita `obtenerFrontendUrl` de la petición.
 * Solo usa `req.get("origin")` y `req.get("referer")`, así que no depende
 * de los generics del tipo `Request` de Express.
 */
interface RequestConHeaders {
  get(name: string): string | undefined;
}

const obtenerFrontendUrl = (req: RequestConHeaders): string => {
  const frontendUrlEnv = process.env.FRONTEND_URL;

  /*
   * Caso 1: Si FRONTEND_URL tiene una URL fija real, la usamos.
   *   FRONTEND_URL=https://consorcia.com
   *   FRONTEND_URL=http://localhost:5173
   *   FRONTEND_URL=http://192.168.1.38:5173
   */
  if (frontendUrlEnv && frontendUrlEnv.toLowerCase() !== "auto") {
    return frontendUrlEnv.replace(/\/$/, "");
  }

  /*
   * Caso 2: Si FRONTEND_URL=auto, intentamos usar Origin.
   */
  const origin = req.get("origin");
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  /*
   * Caso 3: Si no vino Origin, intentamos usar Referer.
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
   * Caso 4: Fallback final para desarrollo local.
   */
  return "http://localhost:5173";
};

/* ============================================================
 * MÉTODO: Obtener la nómina completa de usuarios para el Administrador
 * ============================================================ */
export const getUsers = async (_req: Request, res: Response) => {
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
export const crearUsuario = async (
  req: Request<unknown, unknown, CrearUsuarioBody>,
  res: Response
) => {
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
    const urlActivacion = `${baseUrl}/activar-cuenta?token=${encodeURIComponent(token)}`;

    enviarMailInvitacion(nuevoUsuario.email, nuevoUsuario.name, urlActivacion).catch((err) =>
      console.error("Error al enviar mail de invitación:", err)
    );

    // 4. Registrar acción en el Log de Auditoría
    await registrarLog({
      req,
      accion: "USUARIO_CREADO",
      tipoEntidad: "USUARIO",
      entidadId: nuevoUsuario._id,
      detalles: {
        nombreEntidad: nuevoUsuario.name,
        cambios: {
          email: nuevoUsuario.email,
          role: nuevoUsuario.role,
          unidadFuncional: nuevoUsuario.unidadFuncional,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Usuario registrado con éxito. Se ha enviado el correo de invitación.",
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
export const activarCuenta = async (
  req: Request<unknown, unknown, ActivarCuentaBody>,
  res: Response
) => {
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
export const toggleStatus = async (req: Request<ParamsId>, res: Response) => {
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

    await registrarLog({
      req,
      accion: "USUARIO_EDITADO",
      tipoEntidad: "USUARIO",
      entidadId: usuario._id,
      detalles: {
        nombreEntidad: usuario.name,
        cambios: { estado: nuevoEstado },
      },
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
export const eliminarUsuario = async (req: Request<ParamsId>, res: Response) => {
  try {
    const { id } = req.params;

    const usuarioEliminado = await User.findByIdAndDelete(id);

    if (!usuarioEliminado) {
      return res.status(404).json({
        success: false,
        message: "El usuario que intenta eliminar ya no existe.",
      });
    }

    await registrarLog({
      req,
      accion: "USUARIO_ELIMINADO",
      tipoEntidad: "USUARIO",
      entidadId: id,
      detalles: {
        nombreEntidad: usuarioEliminado.name,
        cambios: {
          email: usuarioEliminado.email,
          role: usuarioEliminado.role,
        },
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
export const loginUser = async (
  req: Request<unknown, unknown, LoginBody>,
  res: Response
) => {
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

    if (userFound && userFound.estado === "inactivo") {
      return res.status(403).json({
        success: false,
        message:
          "Tu cuenta se encuentra inactiva. Por favor, contactá al administrador.",
      });
    }

    const isMatch =
      userFound && userFound.password
        ? await bcrypt.compare(password, userFound.password)
        : false;

    if (!userFound || !isMatch) {
      return res.status(401).json({
        success: false,
        message: "El correo electrónico o la contraseña son incorrectos.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET no está configurado en las variables de entorno.");
      return res.status(500).json({
        success: false,
        message: "Error de configuración del servidor.",
      });
    }

    const signOptions: SignOptions = { expiresIn: "24h" };

    const token = jwt.sign(
      {
        id: userFound._id.toString(),
        role: userFound.role,
      },
      process.env.JWT_SECRET,
      signOptions
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
export const reenviarInvitacion = async (req: Request<ParamsId>, res: Response) => {
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
    const urlActivacion = `${baseUrl}/activar-cuenta?token=${encodeURIComponent(nuevoToken)}`;

    enviarMailInvitacion(usuario.email, usuario.name, urlActivacion).catch((err) =>
      console.error("Error al reenviar mail de invitación:", err)
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
export const updateUser = async (
  req: Request<ParamsId, unknown, UpdateUserBody>,
  res: Response
) => {
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

    await registrarLog({
      req,
      accion: "USUARIO_EDITADO",
      tipoEntidad: "USUARIO",
      entidadId: usuarioActualizado._id,
      detalles: {
        nombreEntidad: usuarioActualizado.name,
        cambios: {
          name: usuarioActualizado.name,
          email: usuarioActualizado.email,
          role: usuarioActualizado.role,
          unidadFuncional: usuarioActualizado.unidadFuncional,
          telefono: usuarioActualizado.telefono,
        },
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
export const getAuditLogs = async (_req: Request, res: Response) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(100);

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


/* ============================================================
 * MÉTODO: Solicitar recuperación de contraseña
 * ============================================================
 *
 * Genera un token de reset y envía un email con el link.
 *
 * 🛡️ SIEMPRE responde con mensaje genérico de éxito, exista o no el email.
 *     Esto previene enumeración de usuarios (un atacante no puede
 *     distinguir "email registrado" de "email no registrado").
 *
 * Ruta pública: POST /users/olvide-password
 */
export const olvidePassword = async (
  req: Request<unknown, unknown, OlvidePasswordBody>,
  res: Response
) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "El correo electrónico es obligatorio.",
      });
    }

    const emailLimpio = email.trim().toLowerCase();
    const usuario = await User.findOne({ email: emailLimpio });

    // 🎯 Solo generamos token y enviamos email si el usuario existe Y está activo.
    //    Un usuario "pendiente" (nunca activó) debe usar el flujo de activación.
    //    Un usuario "inactivo" (dado de baja) no debe poder resetear.
    if (usuario && usuario.estado === "activo") {
      // 1. Generar token seguro de 64 caracteres
      const token = crypto.randomBytes(32).toString("hex");

      // 2. Expiración de 1 hora (más estricta que activación por seguridad)
      const expiracion = new Date();
      expiracion.setHours(expiracion.getHours() + 1);

      // 3. Guardar token en el usuario (reutilizamos los mismos campos)
      usuario.tokenActivacion = token;
      usuario.tokenExpiracion = expiracion;
      await usuario.save();

      // 4. Armar URL dinámica y enviar email (fire-and-forget)
      const baseUrl = obtenerFrontendUrl(req);
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      // No usamos await ni catch — enviarEmailResetPassword es fire-and-forget
      // y retorna false silenciosamente si falla (loguea internamente).
      void enviarEmailResetPassword({
        email: usuario.email,
        name: usuario.name,
        resetLink,
      });
    }

    // 🛡️ SIEMPRE respuesta genérica — previene enumeración
    return res.status(200).json({
      success: true,
      message:
        "Si el correo electrónico existe en nuestros registros, recibirás un mensaje con las instrucciones para restablecer tu contraseña.",
    });
  } catch (error) {
    console.error("Error en olvidePassword:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error interno en el servidor.",
    });
  }
};

/* ============================================================
 * MÉTODO: Confirmar reset de contraseña
 * ============================================================
 *
 * Valida el token de reset y actualiza la contraseña del usuario.
 *
 * Ruta pública: POST /users/reset-password
 */
export const resetPassword = async (
  req: Request<unknown, unknown, ResetPasswordBody>,
  res: Response
) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "El token y la nueva contraseña son obligatorios.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "La contraseña debe tener al menos 6 caracteres.",
      });
    }

    // Buscar usuario con token válido y no expirado
    const usuario = await User.findOne({
      tokenActivacion: token,
      tokenExpiracion: { $gt: new Date() },
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        message:
          "El enlace de recuperación es inválido o ha expirado. Solicitá uno nuevo desde el login.",
      });
    }

    // 🛡️ Guard: solo permitimos reset a usuarios activos.
    //     Si por algún motivo el usuario pasó a "inactivo" entre la solicitud
    //     y el reset, no permitimos la operación.
    if (usuario.estado !== "activo") {
      return res.status(403).json({
        success: false,
        message:
          "No es posible restablecer la contraseña de esta cuenta. Contactá al administrador.",
      });
    }

    /*
     * El middleware pre("save") del modelo User hashea automáticamente
     * la contraseña antes de guardar.
     */
    usuario.password = password;
    usuario.tokenActivacion = null;
    usuario.tokenExpiracion = null;
    usuario.debeCambiarPassword = false;

    await usuario.save();

    // 🎯 Registrar en auditoría (auto-registro: el propio usuario es el "admin")
    await registrarLog({
      req: { user: usuario },
      accion: "USUARIO_EDITADO",
      tipoEntidad: "USUARIO",
      entidadId: usuario._id,
      detalles: {
        nombreEntidad: usuario.name,
        cambios: { accion: "reset_password" },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Contraseña restablecida con éxito. Ya podés iniciar sesión.",
    });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error al intentar restablecer la contraseña.",
    });
  }
};