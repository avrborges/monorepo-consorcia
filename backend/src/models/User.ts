// backend/src/models/User.ts
import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";
import bcrypt from "bcryptjs";

/* ============================================================
 * TIPOS Y CONSTANTES
 * ============================================================ */

export type RolUsuario =
  | "superadmin"
  | "admin"
  | "consejo"
  | "propietario"
  | "inquilino";

export type EstadoUsuario = "activo" | "inactivo" | "pendiente";

const ROLES_VALIDOS: RolUsuario[] = [
  "superadmin",
  "admin",
  "consejo",
  "propietario",
  "inquilino",
];

const ESTADOS_VALIDOS: EstadoUsuario[] = ["activo", "inactivo", "pendiente"];

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ============================================================
 * INTERFACES
 * ============================================================ */

/**
 * Estructura de datos de un Usuario (sin métodos ni props internas de Mongoose).
 * Sirve como contrato del dominio para el resto del backend.
 */
export interface IUser {
  name: string;
  email: string;
  password?: string;
  role: RolUsuario;

  /**
   * 🔴 DEPRECADO — Campo legacy de texto libre.
   * Se mantiene por compatibilidad durante la migración.
   * A eliminar en Fase 6 del sprint "Consistencia Usuarios ↔ Unidades".
   */
  unidadFuncional: string;

  /**
   * 🆕 Referencia a la Unidad Funcional a la que está vinculado el usuario.
   * `null` para usuarios sin unidad asignada (admins, superadmins, o usuarios
   * propietarios/inquilinos aún no vinculados).
   */
  unidadId: Types.ObjectId | null;

  telefono: string;
  estado: EstadoUsuario;
  debeCambiarPassword: boolean;
  tokenActivacion: string | null;
  tokenExpiracion: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Métodos de instancia disponibles en documentos User.
 */
export interface IUserMethods {
  compararPassword(passwordIngresada: string): Promise<boolean>;
}

/**
 * Tipo del Model (necesario para registrar métodos e hidratación tipada).
 */
export type UserModel = Model<IUser, {}, IUserMethods>;

/**
 * Tipo del documento hidratado (con métodos + props de Mongoose).
 * Usalo en controllers cuando trabajes con un usuario obtenido de la DB.
 */
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

/* ============================================================
 * SCHEMA
 * ============================================================ */
const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [80, "El nombre no puede superar los 80 caracteres"],
    },

    email: {
      type: String,
      required: [true, "El correo electrónico es obligatorio"],
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      match: [REGEX_EMAIL, "El correo electrónico no tiene un formato válido"],
      maxlength: [120, "El correo electrónico no puede superar los 120 caracteres"],
    },

    /*
     * El password no es obligatorio al crear usuarios desde el panel admin.
     * El usuario lo define luego desde el link de activación.
     */
    password: {
      type: String,
      required: false,
      minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
    },

    role: {
      type: String,
      enum: {
        values: ROLES_VALIDOS,
        message: "El rol asignado no es válido",
      },
      default: "propietario",
      index: true,
    },

    /*
     * 🔴 DEPRECADO — Campo legacy de texto libre.
     * Se mantiene por compatibilidad. Se eliminará en Fase 6.
     */
    unidadFuncional: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "La unidad funcional no puede superar los 80 caracteres"],
    },

    /*
     * 🆕 Referencia a la Unidad Funcional vinculada.
     * `null` en usuarios sin unidad asignada (admins, superadmins, etc.).
     */
    unidadId: {
      type: Schema.Types.ObjectId,
      ref: "UnidadFuncional",
      default: null,
      index: true,
    },

    telefono: {
      type: String,
      trim: true,
      default: "",
      maxlength: [40, "El teléfono no puede superar los 40 caracteres"],
    },

    estado: {
      type: String,
      enum: {
        values: ESTADOS_VALIDOS,
        message: "El estado del usuario no es válido",
      },
      default: "pendiente",
      index: true,
    },

    debeCambiarPassword: {
      type: Boolean,
      default: true,
    },

    /*
     * Token temporal para activación de cuenta.
     * Se genera al crear o reenviar invitación.
     */
    tokenActivacion: {
      type: String,
      default: null,
      index: true,
    },

    /*
     * Fecha de vencimiento del token de activación.
     */
    tokenExpiracion: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================================================
 * MIDDLEWARE: Hash de contraseña
 * ============================================================ */
userSchema.pre("save", async function (this: UserDocument) {
  /*
   * Si la contraseña no cambió o no existe, no hacemos nada.
   * Esto permite crear usuarios pendientes sin password.
   */
  if (!this.isModified("password") || !this.password) return;

  /*
   * Defensa adicional:
   * Si por algún motivo ya viene hasheada, evitamos hashearla otra vez.
   */
  const pareceHashBcrypt =
    typeof this.password === "string" &&
    (this.password.startsWith("$2a$") ||
      this.password.startsWith("$2b$") ||
      this.password.startsWith("$2y$"));

  if (pareceHashBcrypt) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ============================================================
 * MÉTODOS DE INSTANCIA
 * ============================================================ */

/**
 * Permite comparar una contraseña plana contra el hash guardado.
 * No obliga a modificar loginUser ahora, pero queda disponible para refactor futuro.
 */
userSchema.methods.compararPassword = async function (
  this: UserDocument,
  passwordIngresada: string
): Promise<boolean> {
  if (!this.password || !passwordIngresada) return false;
  return bcrypt.compare(passwordIngresada, this.password);
};

/* ============================================================
 * EXPORT
 * ============================================================ */
const User =
  (mongoose.models.User as UserModel) ||
  mongoose.model<IUser, UserModel>("User", userSchema);

export default User;