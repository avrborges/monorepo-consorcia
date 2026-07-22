// backend/src/controllers/userController.ts
import type { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";

import User, { type RolUsuario } from "../models/User";
import UnidadFuncional from "../models/UnidadFuncional";
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
  unidadFuncional?: string;   // 🔴 DEPRECADO — se mantiene por compatibilidad
  unidadId?: string | null;   // 🆕 Nueva referencia a la UF
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
  unidadFuncional?: string;   // 🔴 DEPRECADO — se mantiene por compatibilidad
  unidadId?: string | null;   // 🆕 Nueva referencia (null = desvincular)
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
 * HELPER: Sincronizar UF ↔ User (bidireccional)
 * ============================================================
 *
 * Cierra el círculo de consistencia cuando desde el ABM de Usuarios
 * se asigna, cambia o remueve una UF. Actualiza las 2 UF afectadas
 * (la vieja de la que sale el user, la nueva a la que entra).
 *
 * Reglas de negocio:
 * - Solo `propietario` e `inquilino` ocupan ranura en la UF.
 *   Los demás roles (admin, superadmin, consejo) tienen unidadId
 *   informativo pero no ocupan ranura.
 * - Si la ranura de la UF nueva ya está ocupada por otro usuario,
 *   ese desplazado queda con `unidadId = null` (sobreescritura silenciosa).
 * - El estadoOcupacion de cada UF afectada se recalcula automáticamente.
 */
interface SincronizarUnidadParams {
  userId: string;
  unidadIdAnterior: string | null;
  unidadIdNueva: string | null;
  roleAnterior: RolUsuario;
  roleNueva: RolUsuario;
}

const rolOcupaRanura = (role: RolUsuario): role is "propietario" | "inquilino" => {
  return role === "propietario" || role === "inquilino";
};

const sincronizarUnidadDesdeUser = async ({
  userId,
  unidadIdAnterior,
  unidadIdNueva,
  roleAnterior,
  roleNueva,
}: SincronizarUnidadParams): Promise<void> => {
  const cambiosDeUnidadId = new Map<string, string | null>();

  // 1️⃣ Si tenía UF anterior con rol apto → liberar la ranura correspondiente
  if (unidadIdAnterior && rolOcupaRanura(roleAnterior)) {
    const ufVieja = await UnidadFuncional.findById(unidadIdAnterior);
    if (ufVieja) {
      const campo = roleAnterior; // "propietario" o "inquilino"
      if (ufVieja[campo]?.toString() === userId) {
        ufVieja[campo] = null;
        // Recalcular estadoOcupacion
        if (ufVieja.inquilino) ufVieja.estadoOcupacion = "inquilino";
        else if (ufVieja.propietario) ufVieja.estadoOcupacion = "propietario";
        else ufVieja.estadoOcupacion = "vacio";
        await ufVieja.save();
      }
    }
  }

  // 2️⃣ Si tiene UF nueva con rol apto → ocupar la ranura correspondiente
  if (unidadIdNueva && rolOcupaRanura(roleNueva)) {
    const ufNueva = await UnidadFuncional.findById(unidadIdNueva);
    if (ufNueva) {
      const campo = roleNueva; // "propietario" o "inquilino"
      // Si ya había otro usuario en esa ranura → desplazarlo
      const desplazadoId = ufNueva[campo]?.toString();
      if (desplazadoId && desplazadoId !== userId) {
        cambiosDeUnidadId.set(desplazadoId, null);
      }
      ufNueva[campo] = new mongoose.Types.ObjectId(userId);
      // Recalcular estadoOcupacion
      if (ufNueva.inquilino) ufNueva.estadoOcupacion = "inquilino";
      else if (ufNueva.propietario) ufNueva.estadoOcupacion = "propietario";
      else ufNueva.estadoOcupacion = "vacio";
      await ufNueva.save();
    }
  }

  // 3️⃣ Actualizar unidadId Y unidadFuncional de los usuarios desplazados
  //    (unidadFuncional = "" porque quedan sin unidad tras ser desplazados)
  if (cambiosDeUnidadId.size > 0) {
    await Promise.all(
      Array.from(cambiosDeUnidadId.entries()).map(([uid, value]) =>
        User.findByIdAndUpdate(uid, {
          unidadId: value,
          unidadFuncional: "",
        })
      )
    );
  }
};

/* ============================================================
 * HELPER: Resolver URL del frontend para links de activación
 * ============================================================ */

interface RequestConHeaders {
  get(name: string): string | undefined;
}

const obtenerFrontendUrl = (req: RequestConHeaders): string => {
  const frontendUrlEnv = process.env.FRONTEND_URL;

  if (frontendUrlEnv && frontendUrlEnv.toLowerCase() !== "auto") {
    return frontendUrlEnv.replace(/\/$/, "");
  }

  const origin = req.get("origin");
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  const referer = req.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin.replace(/\/$/, "");
    } catch {
      // Si Referer no es válido, continuamos con fallback final.
    }
  }

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
    const { name, email, role, unidadFuncional, unidadId, telefono } = req.body;

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

    // 🎯 Si se envió unidadId, verificar que la UF exista
    if (unidadId) {
      const unidadExiste = await UnidadFuncional.findById(unidadId);
      if (!unidadExiste) {
        return res.status(400).json({
          success: false,
          message: "La unidad funcional seleccionada no existe en el sistema.",
        });
      }
    }

    // 1. Generar token de 64 caracteres y vencimiento de 24 hs
    const token = crypto.randomBytes(32).toString("hex");

    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 24);

    const roleFinal = role || "propietario";

    // 2. Creamos el usuario SIN contraseña
    const nuevoUsuario = new User({
      name: name.trim(),
      email: emailLimpio,
      role: roleFinal,
      unidadFuncional: unidadFuncional || "",
      unidadId: unidadId || null,
      telefono: telefono || "",
      estado: "pendiente",
      debeCambiarPassword: true,
      tokenActivacion: token,
      tokenExpiracion: expiracion,
    });

    await nuevoUsuario.save();

    // 🎯 Sincronizar UF ↔ User (Fase 3.5)
    if (nuevoUsuario.unidadId) {
      await sincronizarUnidadDesdeUser({
        userId: nuevoUsuario._id.toString(),
        unidadIdAnterior: null,
        unidadIdNueva: nuevoUsuario.unidadId.toString(),
        roleAnterior: roleFinal,
        roleNueva: roleFinal,
      });
    }

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
          unidadId: nuevoUsuario.unidadId?.toString() || null,
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

    const nuevoToken = crypto.randomBytes(32).toString("hex");

    const nuevaExpiracion = new Date();
    nuevaExpiracion.setHours(nuevaExpiracion.getHours() + 24);

    usuario.tokenActivacion = nuevoToken;
    usuario.tokenExpiracion = nuevaExpiracion;

    await usuario.save();

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
    const { name, email, role, unidadFuncional, unidadId, telefono } = req.body;

    const usuario = await User.findById(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "El usuario que intentás editar no existe.",
      });
    }

    // 🎯 Snapshot del estado ANTERIOR (necesario para sincronización de UF)
    const roleAnterior = usuario.role;
    const unidadIdAnterior = usuario.unidadId?.toString() || null;

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

    // 🎯 Manejo de unidadId: si viene undefined, no se toca. Si viene null o "", se desvincula.
    //    Si viene un string válido, se valida que la UF exista.
    if (unidadId !== undefined) {
      if (unidadId === null || unidadId === "") {
        usuario.unidadId = null;
      } else {
        const unidadExiste = await UnidadFuncional.findById(unidadId);
        if (!unidadExiste) {
          return res.status(400).json({
            success: false,
            message: "La unidad funcional seleccionada no existe en el sistema.",
          });
        }
        usuario.unidadId = unidadExiste._id;
      }
    }

    const usuarioActualizado = await usuario.save();

    // 🎯 Sincronizar UF ↔ User si cambió unidadId o role (Fase 3.5)
    const unidadIdNueva = usuarioActualizado.unidadId?.toString() || null;
    const roleNueva = usuarioActualizado.role;

    if (unidadIdAnterior !== unidadIdNueva || roleAnterior !== roleNueva) {
      await sincronizarUnidadDesdeUser({
        userId: usuarioActualizado._id.toString(),
        unidadIdAnterior,
        unidadIdNueva,
        roleAnterior,
        roleNueva,
      });
    }

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
          unidadId: usuarioActualizado.unidadId?.toString() || null,
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

    if (usuario && usuario.estado === "activo") {
      const token = crypto.randomBytes(32).toString("hex");

      const expiracion = new Date();
      expiracion.setHours(expiracion.getHours() + 1);

      usuario.tokenActivacion = token;
      usuario.tokenExpiracion = expiracion;
      await usuario.save();

      const baseUrl = obtenerFrontendUrl(req);
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      void enviarEmailResetPassword({
        email: usuario.email,
        name: usuario.name,
        resetLink,
      });
    }

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

    if (usuario.estado !== "activo") {
      return res.status(403).json({
        success: false,
        message:
          "No es posible restablecer la contraseña de esta cuenta. Contactá al administrador.",
      });
    }

    usuario.password = password;
    usuario.tokenActivacion = null;
    usuario.tokenExpiracion = null;
    usuario.debeCambiarPassword = false;

    await usuario.save();

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