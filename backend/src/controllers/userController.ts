// backend/src/controllers/userController.ts
import type { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";

import User, { type RolUsuario } from "../models/User";
import UnidadFuncional from "../models/UnidadFuncional";
import AuditLog from "../models/AuditLog";
import Membresia from "../models/Membresia";
import Consorcio from "../models/Consorcio";

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
  unidadId?: string | null;
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
  unidadId?: string | null;
  telefono?: string;
}

interface OlvidePasswordBody {
  email?: string;
}

interface ResetPasswordBody {
  token?: string;
  password?: string;
}

interface CambiarConsorcioBody {
  consorcioId?: string;
  marcarComoDefault?: boolean;
}

interface ParamsId {
  id: string;
  [key: string]: string;
}

/* ============================================================
 * HELPER: Obtener consorcio activo de la sesión (interface mínima)
 * ============================================================ */

interface RequestConConsorcio {
  activeConsorcioId?: string;
}

const obtenerConsorcioActivo = (req: RequestConConsorcio): string | null => {
  return req.activeConsorcioId || null;
};

/* ============================================================
 * HELPER: Sincronizar UF ↔ User (bidireccional)
 * ============================================================ */

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

  if (unidadIdAnterior && rolOcupaRanura(roleAnterior)) {
    const ufVieja = await UnidadFuncional.findById(unidadIdAnterior);
    if (ufVieja) {
      const campo = roleAnterior;
      if (ufVieja[campo]?.toString() === userId) {
        ufVieja[campo] = null;
        if (ufVieja.inquilino) ufVieja.estadoOcupacion = "inquilino";
        else if (ufVieja.propietario) ufVieja.estadoOcupacion = "propietario";
        else ufVieja.estadoOcupacion = "vacio";
        await ufVieja.save();
      }
    }
  }

  if (unidadIdNueva && rolOcupaRanura(roleNueva)) {
    const ufNueva = await UnidadFuncional.findById(unidadIdNueva);
    if (ufNueva) {
      const campo = roleNueva;
      const desplazadoId = ufNueva[campo]?.toString();
      if (desplazadoId && desplazadoId !== userId) {
        cambiosDeUnidadId.set(desplazadoId, null);
      }
      ufNueva[campo] = new mongoose.Types.ObjectId(userId);
      if (ufNueva.inquilino) ufNueva.estadoOcupacion = "inquilino";
      else if (ufNueva.propietario) ufNueva.estadoOcupacion = "propietario";
      else ufNueva.estadoOcupacion = "vacio";
      await ufNueva.save();
    }
  }

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
 * HELPER: Generar JWT multi-tenant (Fase M2.6.3)
 * ============================================================ */
interface GenerarJwtParams {
  userId: string;
  rolGlobal: "user" | "super_admin_global";
  activeConsorcioId: string;
  roleEnConsorcioActivo: "superadmin" | "admin" | "consejo" | "propietario" | "inquilino";
}

const generarJwtMultiTenant = ({
  userId,
  rolGlobal,
  activeConsorcioId,
  roleEnConsorcioActivo,
}: GenerarJwtParams): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET no está configurado en las variables de entorno.");
  }

  const signOptions: SignOptions = { expiresIn: "24h" };

  return jwt.sign(
    {
      id: userId,
      rolGlobal,
      activeConsorcioId,
      roleEnConsorcioActivo,
    },
    process.env.JWT_SECRET,
    signOptions
  );
};

/* ============================================================
 * HELPER: Mapear membresía a shape del selector post-login
 * ============================================================ */

interface MembresiaConConsorcioPopulado {
  _id: mongoose.Types.ObjectId;
  role: string;
  esDefault: boolean;
  consorcioId: {
    _id: mongoose.Types.ObjectId;
    nombre: string;
    direccion: string;
    activo: boolean;
  } | null;
}

const mapearMembresiaParaSelector = (m: MembresiaConConsorcioPopulado) => {
  const consorcio = m.consorcioId;
  if (!consorcio) {
    throw new Error("Membresía sin consorcio populado (bug de datos).");
  }
  return {
    _id: m._id.toString(),
    role: m.role,
    esDefault: m.esDefault,
    consorcio: {
      _id: consorcio._id.toString(),
      nombre: consorcio.nombre,
      direccion: consorcio.direccion,
    },
  };
};

/* ============================================================
 * MÉTODO: Obtener usuarios del consorcio activo (multi-tenant)
 * ============================================================
 *
 * 🆕 Fase M2.8.3: en vez de devolver todos los usuarios, devuelve solo
 * los que tienen membresía ACTIVA en el consorcio activo. Además,
 * sobreescribe el `role` de cada usuario con el rol de SU membresía en
 * este consorcio (Opción A: el rol es contextual al consorcio).
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const consorcioId = obtenerConsorcioActivo(req);
    if (!consorcioId) {
      return res.status(403).json({
        success: false,
        message: "No hay un consorcio activo en tu sesión.",
      });
    }

    // 1. Traer membresías activas del consorcio activo
    const membresias = await Membresia.find({
      consorcioId,
      estado: "activa",
    });

    if (membresias.length === 0) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    // 2. Map de userId → rol en ESTE consorcio (Opción A)
    //    Si un usuario tiene múltiples membresías en el mismo consorcio,
    //    se prioriza el rol "mayor" según jerarquía.
    const jerarquia: Record<string, number> = {
      superadmin: 5,
      admin: 4,
      consejo: 3,
      propietario: 2,
      inquilino: 1,
    };

    const rolePorUserId = new Map<string, RolUsuario>();
    membresias.forEach((m) => {
      const uid = m.userId.toString();
      const rolExistente = rolePorUserId.get(uid);
      if (!rolExistente || jerarquia[m.role] > jerarquia[rolExistente]) {
        rolePorUserId.set(uid, m.role);
      }
    });

    // 3. Traer los usuarios correspondientes
    const userIds = Array.from(rolePorUserId.keys());
    const users = await User.find({ _id: { $in: userIds } })
      .select("-password")
      .sort({ createdAt: -1 });

    // 4. Sobreescribir el role de cada user con el de su membresía (Opción A)
    const usersConRolContextual = users.map((u) => {
      const rolEnConsorcio = rolePorUserId.get(u._id.toString());
      const userObj = u.toObject();
      return {
        ...userObj,
        role: rolEnConsorcio || userObj.role,
      };
    });

    return res.status(200).json({
      success: true,
      users: usersConRolContextual,
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
 * MÉTODO: Registrar un nuevo usuario (multi-tenant)
 * ============================================================
 *
 * 🆕 Fase M2.8.3: además de crear el User, crea una Membresia activa
 * en el consorcio activo con el rol dado (MVP simple: email único global).
 */
export const crearUsuario = async (
  req: Request<unknown, unknown, CrearUsuarioBody>,
  res: Response
) => {
  try {
    const { name, email, role, unidadFuncional, unidadId, telefono } = req.body;

    const consorcioId = obtenerConsorcioActivo(req as RequestConConsorcio);
    if (!consorcioId) {
      return res.status(403).json({
        success: false,
        message: "No hay un consorcio activo en tu sesión.",
      });
    }

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

    // MVP simple: email único global. Si ya existe → error.
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un usuario registrado con este correo electrónico.",
      });
    }

    if (unidadId) {
      const unidadExiste = await UnidadFuncional.findById(unidadId);
      if (!unidadExiste) {
        return res.status(400).json({
          success: false,
          message: "La unidad funcional seleccionada no existe en el sistema.",
        });
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 24);

    const roleFinal = role || "propietario";

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

    // 🆕 Crear la membresía en el consorcio activo (Fase M2.8.3)
    await Membresia.create({
      userId: nuevoUsuario._id,
      consorcioId,
      role: roleFinal,
      estado: "activa",
      esDefault: false,
    });

    if (nuevoUsuario.unidadId) {
      await sincronizarUnidadDesdeUser({
        userId: nuevoUsuario._id.toString(),
        unidadIdAnterior: null,
        unidadIdNueva: nuevoUsuario.unidadId.toString(),
        roleAnterior: roleFinal,
        roleNueva: roleFinal,
      });
    }

    const baseUrl = obtenerFrontendUrl(req);
    const urlActivacion = `${baseUrl}/activar-cuenta?token=${encodeURIComponent(token)}`;

    enviarMailInvitacion(nuevoUsuario.email, nuevoUsuario.name, urlActivacion).catch((err) =>
      console.error("Error al enviar mail de invitación:", err)
    );

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
 * MÉTODO: Inicio de sesión (multi-tenant)
 * ============================================================
 *
 * Maneja 5 escenarios según las membresías del usuario:
 *
 *   A) 0 membresías activas → 403 ErrorSinMembresias
 *   B) 1 membresía activa → 200 LoginConToken con esa membresía
 *   C1/D1) N membresías, sin default → 200 RequiereSeleccionConsorcio
 *   C2/D2) N membresías, con default → 200 LoginConToken con la default
 */
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

    /* ============================================================
     * 🆕 LÓGICA MULTI-TENANT: Detectar caso A/B/C1/C2
     * ============================================================ */

    const membresiasRaw = await Membresia.find({
      userId: userFound._id,
      estado: "activa",
    }).populate("consorcioId", "nombre direccion activo");

    const membresiasValidas = membresiasRaw.filter((m) => {
      const consorcio = m.consorcioId as unknown as {
        _id: mongoose.Types.ObjectId;
        activo: boolean;
      } | null;
      return consorcio && consorcio.activo === true;
    });

    const userPayload = {
      _id: userFound._id.toString(),
      name: userFound.name,
      email: userFound.email,
      role: userFound.role,
      rolGlobal: userFound.rolGlobal,
      unidadFuncional: userFound.unidadFuncional,
      telefono: userFound.telefono,
      estado: userFound.estado,
      debeCambiarPassword: userFound.debeCambiarPassword,
    };

    /* CASO A: Usuario sin membresías activas */
    if (membresiasValidas.length === 0) {
      return res.status(403).json({
        success: false,
        motivo: "SIN_MEMBRESIAS",
        message:
          "Tu cuenta no tiene acceso a ningún consorcio activo. Contactá al administrador.",
      });
    }

    /* CASO B: Una única membresía activa */
    if (membresiasValidas.length === 1) {
      const membresia = membresiasValidas[0];
      const consorcio = membresia.consorcioId as unknown as {
        _id: mongoose.Types.ObjectId;
        nombre: string;
        direccion: string;
      };

      const token = generarJwtMultiTenant({
        userId: userFound._id.toString(),
        rolGlobal: userFound.rolGlobal,
        activeConsorcioId: consorcio._id.toString(),
        roleEnConsorcioActivo: membresia.role,
      });

      return res.status(200).json({
        success: true,
        message: `¡Inicio de sesión exitoso! Bienvenido, ${userFound.name}`,
        token,
        user: userPayload,
        activeConsorcio: {
          _id: consorcio._id.toString(),
          nombre: consorcio.nombre,
          direccion: consorcio.direccion,
        },
        roleEnConsorcioActivo: membresia.role,
        rolGlobal: userFound.rolGlobal,
      });
    }

    /* CASOS C/D: Múltiples membresías activas */
    const membresiaDefault = membresiasValidas.find((m) => m.esDefault === true);

    if (membresiaDefault) {
      /* CASO C2/D2: Tiene default → entrar directo */
      const consorcio = membresiaDefault.consorcioId as unknown as {
        _id: mongoose.Types.ObjectId;
        nombre: string;
        direccion: string;
      };

      const token = generarJwtMultiTenant({
        userId: userFound._id.toString(),
        rolGlobal: userFound.rolGlobal,
        activeConsorcioId: consorcio._id.toString(),
        roleEnConsorcioActivo: membresiaDefault.role,
      });

      return res.status(200).json({
        success: true,
        message: `¡Inicio de sesión exitoso! Bienvenido, ${userFound.name}`,
        token,
        user: userPayload,
        activeConsorcio: {
          _id: consorcio._id.toString(),
          nombre: consorcio.nombre,
          direccion: consorcio.direccion,
        },
        roleEnConsorcioActivo: membresiaDefault.role,
        rolGlobal: userFound.rolGlobal,
      });
    }

    /* CASO C1/D1: Sin default → mostrar selector */
    const membresiasDisponibles = membresiasValidas.map((m) =>
      mapearMembresiaParaSelector(m as unknown as MembresiaConConsorcioPopulado)
    );

    return res.status(200).json({
      success: true,
      requiereSeleccionConsorcio: true,
      user: userPayload,
      rolGlobal: userFound.rolGlobal,
      membresiasDisponibles,
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
 * MÉTODO: Reenviar link de invitación
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
      message: "Hubo un error interno en el servidor al intentar reenviar la invitación.",
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
 * MÉTODO: Obtener historial de auditoría (multi-tenant)
 * ============================================================
 *
 * 🆕 Fase M2.8.3: filtra los logs por el consorcio activo.
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const consorcioId = obtenerConsorcioActivo(req);
    if (!consorcioId) {
      return res.status(403).json({
        success: false,
        message: "No hay un consorcio activo en tu sesión.",
      });
    }

    const logs = await AuditLog.find({ consorcioId })
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

/* ============================================================
 * MÉTODO: Solicitar recuperación de contraseña
 * ============================================================
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

    // 🎯 Auditoría del reset (auto-servicio). Buscamos una membresía del
    //    usuario para scopear el log al consorcio correspondiente.
    const membresiaDelUser = await Membresia.findOne({
      userId: usuario._id,
      estado: "activa",
    });

    await registrarLog({
      req: { user: usuario, activeConsorcioId: membresiaDelUser?.consorcioId?.toString() },
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

/* ============================================================
 * MÉTODO: Cambiar consorcio activo (multi-tenant)
 * ============================================================
 *
 * Permite a un usuario autenticado cambiar el consorcio con el que
 * está trabajando, generando un JWT nuevo con `activeConsorcioId`
 * actualizado. Opcionalmente marca ese consorcio como default.
 *
 * Ruta protegida: POST /users/cambiar-consorcio (cualquier user autenticado)
 */
export const cambiarConsorcio = async (
  req: Request<unknown, unknown, CambiarConsorcioBody>,
  res: Response
) => {
  try {
    const { consorcioId, marcarComoDefault } = req.body;

    const usuario = req.user;
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "No autorizado. Iniciá sesión nuevamente.",
      });
    }

    if (!consorcioId) {
      return res.status(400).json({
        success: false,
        message: "El ID del consorcio es obligatorio.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(consorcioId)) {
      return res.status(400).json({
        success: false,
        message: "El ID del consorcio no tiene un formato válido.",
      });
    }

    const userId = usuario._id.toString();

    const membresia = await Membresia.findOne({
      userId,
      consorcioId,
      estado: "activa",
    }).populate("consorcioId", "nombre direccion activo");

    if (!membresia) {
      return res.status(403).json({
        success: false,
        message: "No tenés acceso a ese consorcio.",
      });
    }

    const consorcio = membresia.consorcioId as unknown as {
      _id: mongoose.Types.ObjectId;
      nombre: string;
      direccion: string;
      activo: boolean;
    };

    if (!consorcio || !consorcio.activo) {
      return res.status(403).json({
        success: false,
        message: "El consorcio seleccionado no está activo.",
      });
    }

    if (marcarComoDefault === true) {
      await Membresia.updateMany({ userId }, { esDefault: false });
      membresia.esDefault = true;
      await membresia.save();
    }

    const token = generarJwtMultiTenant({
      userId,
      rolGlobal: usuario.rolGlobal,
      activeConsorcioId: consorcio._id.toString(),
      roleEnConsorcioActivo: membresia.role,
    });

    return res.status(200).json({
      success: true,
      message: `Consorcio activo cambiado a "${consorcio.nombre}".`,
      token,
      user: {
        _id: usuario._id.toString(),
        name: usuario.name,
        email: usuario.email,
        role: usuario.role,
        rolGlobal: usuario.rolGlobal,
        unidadFuncional: usuario.unidadFuncional,
        telefono: usuario.telefono,
        estado: usuario.estado,
        debeCambiarPassword: usuario.debeCambiarPassword,
      },
      activeConsorcio: {
        _id: consorcio._id.toString(),
        nombre: consorcio.nombre,
        direccion: consorcio.direccion,
      },
      roleEnConsorcioActivo: membresia.role,
      rolGlobal: usuario.rolGlobal,
    });
  } catch (error) {
    console.error("Error en cambiarConsorcio:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error al cambiar de consorcio.",
    });
  }
};
