// backend/src/scripts/promoverSuperAdminGlobal.ts
/**
 * Script one-shot: promover un usuario existente a `super_admin_global`.
 *
 * Setea `rolGlobal = "super_admin_global"` en un usuario identificado por su
 * email. Es la forma más segura de habilitar el ABM de consorcios (M6) para
 * QA, porque reutiliza un usuario que YA tiene password, membresía y consorcio
 * → queda listo para loguear sin pasos extra.
 *
 * - Es IDEMPOTENTE: si el usuario ya es super_admin_global, no hace nada.
 * - Soporta modo dry-run para simular sin escribir.
 * - También permite DEGRADAR (volver a "user") con la flag --revocar.
 *
 * Uso:
 *   # Simular (recomendado la primera vez):
 *   npx ts-node src/scripts/promoverSuperAdminGlobal.ts --email=alejandro@ejemplo.com --dry-run
 *
 *   # Ejecutar la promoción real:
 *   npx ts-node src/scripts/promoverSuperAdminGlobal.ts --email=alejandro@ejemplo.com
 *
 *   # Revocar (volver a rol global "user"):
 *   npx ts-node src/scripts/promoverSuperAdminGlobal.ts --email=alejandro@ejemplo.com --revocar
 *
 * ⚠️ Después de correrlo, el usuario debe CERRAR SESIÓN y volver a loguearse,
 *    para que el nuevo JWT incluya rolGlobal = "super_admin_global".
 */

import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";

import User from "../models/User";

// Cargar variables de entorno desde backend/.env
dotenv.config({ path: path.join(__dirname, "../../.env") });

/* ============================================================
 * CONFIGURACIÓN (lectura de argumentos)
 * ============================================================ */

const DRY_RUN = process.argv.includes("--dry-run");
const REVOCAR = process.argv.includes("--revocar");

// Extrae el valor de --email=...
const emailArg = process.argv.find((arg) => arg.startsWith("--email="));
const EMAIL = emailArg ? emailArg.split("=")[1]?.trim().toLowerCase() : undefined;

// Rol global objetivo según la operación.
const ROL_OBJETIVO = REVOCAR ? "user" : "super_admin_global";

/* ============================================================
 * HELPERS DE OUTPUT
 * ============================================================ */

const log = {
  header: (msg: string) => console.log(`\n🎯 ${msg}\n${"─".repeat(60)}`),
  info: (msg: string) => console.log(`   ${msg}`),
  ok: (msg: string) => console.log(`   ✅ ${msg}`),
  warn: (msg: string) => console.log(`   ⚠️  ${msg}`),
  err: (msg: string) => console.log(`   ❌ ${msg}`),
  dryrun: (msg: string) => console.log(`   🧪 [DRY-RUN] ${msg}`),
};

/* ============================================================
 * MAIN
 * ============================================================ */

const main = async () => {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  🚀 PROMOVER USUARIO A SUPER_ADMIN_GLOBAL — M6`);
  console.log(`  Operación: ${REVOCAR ? "🔻 REVOCAR (→ user)" : "🔺 PROMOVER (→ super_admin_global)"}`);
  console.log(`  Modo: ${DRY_RUN ? "🧪 DRY-RUN (simulación)" : "✍️  EJECUCIÓN REAL"}`);
  console.log(`${"═".repeat(60)}`);

  // Validación de argumentos
  if (!EMAIL) {
    log.err("Falta el argumento --email=<correo>.");
    log.info("Ejemplo: npx ts-node src/scripts/promoverSuperAdminGlobal.ts --email=alejandro@ejemplo.com");
    process.exit(1);
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI no está definida en el entorno (.env)");
    }

    await mongoose.connect(process.env.MONGO_URI);
    log.header("Conexión a MongoDB");
    log.ok("Conectado a MongoDB Atlas");

    // Buscar el usuario por email
    log.header(`Buscando usuario: ${EMAIL}`);
    const usuario = await User.findOne({ email: EMAIL });

    if (!usuario) {
      log.err(`No se encontró ningún usuario con el email "${EMAIL}".`);
      log.info("Verificá el email o creá el usuario primero desde la app.");
      await mongoose.connection.close();
      process.exit(1);
    }

    // Acceso laxo a rolGlobal por si el modelo aún no lo declara explícitamente.
    const rolGlobalActual =
      (usuario as unknown as { rolGlobal?: string }).rolGlobal || "user";

    log.info(`Usuario encontrado: ${usuario.name} (${usuario.email})`);
    log.info(`Rol global actual:  ${rolGlobalActual}`);
    log.info(`Rol global objetivo: ${ROL_OBJETIVO}`);

    // Idempotencia: ¿ya está en el estado deseado?
    if (rolGlobalActual === ROL_OBJETIVO) {
      log.warn(`El usuario ya tiene rolGlobal="${ROL_OBJETIVO}". No hay cambios que aplicar.`);
      await mongoose.connection.close();
      log.info("Conexión a MongoDB cerrada.");
      return;
    }

    if (DRY_RUN) {
      log.dryrun(
        `Se cambiaría rolGlobal de "${rolGlobalActual}" → "${ROL_OBJETIVO}" para ${usuario.email}`
      );
      log.info("Ejecutá sin --dry-run para aplicar el cambio real.");
      await mongoose.connection.close();
      log.info("Conexión a MongoDB cerrada.");
      return;
    }

    // Aplicar el cambio
    (usuario as unknown as { rolGlobal: string }).rolGlobal = ROL_OBJETIVO;
    await usuario.save();

    log.header("Resultado");
    log.ok(`rolGlobal actualizado: "${rolGlobalActual}" → "${ROL_OBJETIVO}"`);

    console.log(`\n${"═".repeat(60)}`);
    if (REVOCAR) {
      console.log(`  🔻 Usuario ${usuario.email} degradado a rol global "user".`);
    } else {
      console.log(`  🎊 Usuario ${usuario.email} ahora es SUPER_ADMIN_GLOBAL.`);
    }
    console.log(`  ⚠️  IMPORTANTE: cerrá sesión y volvé a loguearte para que el`);
    console.log(`     nuevo JWT incluya el rolGlobal actualizado.`);
    console.log(`${"═".repeat(60)}\n`);
  } catch (error) {
    log.err("Error durante la operación:");
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log.info("Conexión a MongoDB cerrada.");
  }
};

main();
