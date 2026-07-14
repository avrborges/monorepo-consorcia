// backend/src/scripts/seed.ts
import mongoose from "mongoose";
import path from "path";
import bcrypt from "bcryptjs"; // 🔒 Encriptación explícita
import dotenv from "dotenv";

import User, { type RolUsuario, type EstadoUsuario } from "../models/User";

// Cargar variables de entorno desde backend/.env
dotenv.config({ path: path.join(__dirname, "../../.env") });

/* ============================================================
 * TIPOS
 * ============================================================ */

interface UsuarioSemilla {
  name: string;
  email: string;
  passwordPlano: string;
  role: RolUsuario;
  estado: EstadoUsuario;
  debeCambiarPassword: boolean;
}

/* ============================================================
 * DEFINICIÓN DE USUARIOS SEMILLA
 * ============================================================ */

const USUARIOS_SEMILLA: UsuarioSemilla[] = [
  {
    name: "Super Admin",
    email: "superadmin@consorcia.com.ar",
    passwordPlano: "Super123",
    role: "superadmin",
    estado: "activo",
    debeCambiarPassword: false,
  },
  {
    name: "Alejandro Borges",
    email: "admin@consorcia.com.ar",
    passwordPlano: "Admin123",
    role: "admin",
    estado: "activo",
    debeCambiarPassword: false,
  },
  {
    name: "Consejo de Administración",
    email: "consejo@consorcia.com.ar",
    passwordPlano: "Consejo123",
    role: "consejo",
    estado: "activo",
    debeCambiarPassword: false,
  },
  {
    name: "Propietario Prueba",
    email: "propietario@consorcia.com.ar",
    passwordPlano: "Prop123",
    role: "propietario",
    estado: "activo",
    debeCambiarPassword: false,
  },
  {
    name: "Inquilino Prueba",
    email: "inquilino@consorcia.com.ar",
    passwordPlano: "Inq123",
    role: "inquilino",
    estado: "activo",
    debeCambiarPassword: false,
  },
];

/* ============================================================
 * PROCESO PRINCIPAL DE SEEDING (IDEMPOTENTE)
 * ============================================================ */

const crearUsuariosIniciales = async (): Promise<void> => {
  try {
    // 🌐 Validación y conexión a la base de datos
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI no está definida en el entorno (.env)");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB Atlas para sembrar usuarios...\n");

    // 🔒 Preparación de encriptación
    const saltRounds = 10;

    // 📊 Contadores para el reporte final
    const insertados: string[] = [];
    const yaExistentes: string[] = [];

    console.log("🔍 Verificando cada usuario semilla (modo idempotente)...\n");

    for (const semilla of USUARIOS_SEMILLA) {
      const emailLimpio = semilla.email.trim().toLowerCase();

      // Verificamos si el usuario ya existe
      const yaExiste = await User.findOne({ email: emailLimpio });

      if (yaExiste) {
        yaExistentes.push(`${semilla.name} [${semilla.role.toUpperCase()}] -> ${emailLimpio}`);
        continue;
      }

      // No existe → lo creamos con la contraseña hasheada
      const passwordHasheada = await bcrypt.hash(semilla.passwordPlano, saltRounds);

      const nuevo = await User.create({
        name: semilla.name,
        email: emailLimpio,
        password: passwordHasheada,
        role: semilla.role,
        estado: semilla.estado,
        debeCambiarPassword: semilla.debeCambiarPassword,
      });

      insertados.push(`${nuevo.name} [${nuevo.role.toUpperCase()}] -> ${nuevo.email}`);
    }

    /* ============================================================
     * REPORTE FINAL
     * ============================================================ */

    console.log("─".repeat(70));
    console.log("📋 REPORTE DE SEEDING\n");

    if (insertados.length > 0) {
      console.log(`🎉 Usuarios insertados (${insertados.length}):`);
      insertados.forEach((u) => console.log(`   ✅ ${u}`));
    } else {
      console.log("ℹ️  No se insertó ningún usuario nuevo.");
    }

    console.log("");

    if (yaExistentes.length > 0) {
      console.log(`⏭️  Usuarios ya existentes (preservados) (${yaExistentes.length}):`);
      yaExistentes.forEach((u) => console.log(`   ✓ ${u}`));
    }

    console.log("─".repeat(70));
    console.log("✨ Proceso finalizado. La base no fue modificada para usuarios existentes.\n");
  } catch (error) {
    console.error("❌ Error durante el proceso de seeding:", error);
  } finally {
    // 🔌 Cierre seguro de conexión
    await mongoose.connection.close();
    console.log("🔒 Conexión a MongoDB cerrada de forma segura.");
  }
};

// Ejecutamos el seeding
crearUsuariosIniciales();