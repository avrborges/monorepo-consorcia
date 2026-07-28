// backend/src/scripts/migrarAMultitenant.ts
/**
 * Script de migración one-shot: Multi-Tenant Fase M1.4
 *
 * Objetivo: conectar la base de datos actual (mono-tenant) al nuevo modelo
 * multi-tenant creando:
 *   1. Un Consorcio "por defecto" que agrupa todos los datos existentes.
 *   2. Una Membresia activa para cada User existente, con el rol legacy
 *      mapeado desde user.role.
 *
 * IMPORTANTE:
 * - Este script NO modifica UnidadFuncional ni AuditLog (queda para M2).
 * - Es IDEMPOTENTE: puede correrse varias veces sin duplicar registros.
 * - Soporta modo dry-run para simular sin escribir cambios.
 *
 * Uso:
 *   # Simular sin ejecutar cambios (recomendado la primera vez):
 *   npx ts-node src/scripts/migrarAMultitenant.ts --dry-run
 *
 *   # Ejecutar cambios reales:
 *   npx ts-node src/scripts/migrarAMultitenant.ts
 */

import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";

import Consorcio from "../models/Consorcio";
import Membresia from "../models/Membresia";
import User, { type RolUsuario } from "../models/User";

// Cargar variables de entorno desde backend/.env
dotenv.config({ path: path.join(__dirname, "../../.env") });

/* ============================================================
 * CONFIGURACIÓN
 * ============================================================ */

const CONSORCIO_DEFAULT_NOMBRE =
  process.env.CONSORCIO_DEFAULT_NOMBRE || "Edificio Principal";
const CONSORCIO_DEFAULT_DIRECCION =
  process.env.CONSORCIO_DEFAULT_DIRECCION || "Sin especificar";
const CONSORCIO_DEFAULT_CUIT = process.env.CONSORCIO_DEFAULT_CUIT || "";
const CONSORCIO_DEFAULT_LOCALIDAD = process.env.CONSORCIO_DEFAULT_LOCALIDAD || "";
const CONSORCIO_DEFAULT_PROVINCIA = process.env.CONSORCIO_DEFAULT_PROVINCIA || "";
const CONSORCIO_DEFAULT_CP = process.env.CONSORCIO_DEFAULT_CP || "";

const DRY_RUN = process.argv.includes("--dry-run");

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
 * MAPEO: user.role legacy → RolMembresia
 * ============================================================
 *
 * Actualmente el User tiene un campo `role` con 5 valores. Todos mapean 1:1
 * al nuevo `RolMembresia`. Esta función existe para hacerlo explícito y
 * facilitar cambios futuros si el mapeo se complica.
 */
const mapearRolLegacy = (roleLegacy: RolUsuario): RolUsuario => {
  return roleLegacy;
};

/* ============================================================
 * PASO 1: Crear o recuperar consorcio por defecto
 * ============================================================ */

const crearOObtenerConsorcio = async () => {
  log.header("PASO 1: Consorcio por defecto");

  const existente = await Consorcio.findOne({ nombre: CONSORCIO_DEFAULT_NOMBRE });

  if (existente) {
    log.info(`Consorcio ya existe: "${existente.nombre}" (id: ${existente._id})`);
    return existente;
  }

  log.info(`Consorcio no existe. Se creará: "${CONSORCIO_DEFAULT_NOMBRE}"`);
  log.info(`  Dirección: ${CONSORCIO_DEFAULT_DIRECCION}`);
  if (CONSORCIO_DEFAULT_CUIT) log.info(`  CUIT: ${CONSORCIO_DEFAULT_CUIT}`);
  if (CONSORCIO_DEFAULT_LOCALIDAD) log.info(`  Localidad: ${CONSORCIO_DEFAULT_LOCALIDAD}`);
  if (CONSORCIO_DEFAULT_PROVINCIA) log.info(`  Provincia: ${CONSORCIO_DEFAULT_PROVINCIA}`);

  if (DRY_RUN) {
    log.dryrun("Se crearía el consorcio (simulación).");
    // Retornamos un objeto ficticio para que el resto del script pueda simular
    return {
      _id: new mongoose.Types.ObjectId(),
      nombre: CONSORCIO_DEFAULT_NOMBRE,
    } as unknown as Awaited<ReturnType<typeof Consorcio.findOne>>;
  }

  const nuevo = await Consorcio.create({
    nombre: CONSORCIO_DEFAULT_NOMBRE,
    direccion: CONSORCIO_DEFAULT_DIRECCION,
    cuit: CONSORCIO_DEFAULT_CUIT,
    localidad: CONSORCIO_DEFAULT_LOCALIDAD,
    provincia: CONSORCIO_DEFAULT_PROVINCIA,
    codigoPostal: CONSORCIO_DEFAULT_CP,
    activo: true,
  });

  log.ok(`Consorcio creado (id: ${nuevo._id})`);
  return nuevo;
};

/* ============================================================
 * PASO 2: Crear membresías para users existentes
 * ============================================================ */

const crearMembresiasParaUsuarios = async (consorcioId: mongoose.Types.ObjectId) => {
  log.header("PASO 2: Membresias para usuarios existentes");

  const users = await User.find({}).select("_id name email role");
  log.info(`Encontrados ${users.length} usuarios en la base.`);

  if (users.length === 0) {
    log.info("No hay usuarios para migrar.");
    return { creadas: 0, ignoradas: 0 };
  }

  let creadas = 0;
  let ignoradas = 0;

  for (const user of users) {
    const roleMembresia = mapearRolLegacy(user.role);

    // Verificar si ya existe una membresía activa con este rol en este consorcio
    const yaExiste = await Membresia.findOne({
      userId: user._id,
      consorcioId,
      role: roleMembresia,
      estado: "activa",
    });

    if (yaExiste) {
      log.info(`⏭  ${user.name} (${user.email}) → ya tiene membresía "${roleMembresia}"`);
      ignoradas++;
      continue;
    }

    if (DRY_RUN) {
      log.dryrun(`Se crearía membresía "${roleMembresia}" para ${user.name} (${user.email})`);
      creadas++;
      continue;
    }

    await Membresia.create({
      userId: user._id,
      consorcioId,
      role: roleMembresia,
      estado: "activa",
    });

    log.ok(`Membresía creada: ${user.name} → "${roleMembresia}"`);
    creadas++;
  }

  return { creadas, ignoradas };
};

/* ============================================================
 * MAIN
 * ============================================================ */

const main = async () => {
  const inicio = Date.now();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  🚀 MIGRACIÓN A MULTI-TENANT — Fase M1.4`);
  console.log(`  Modo: ${DRY_RUN ? "🧪 DRY-RUN (simulación)" : "✍️  EJECUCIÓN REAL"}`);
  console.log(`${"═".repeat(60)}`);

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI no está definida en el entorno (.env)");
    }

    await mongoose.connect(process.env.MONGO_URI);
    log.header("Conexión a MongoDB");
    log.ok("Conectado a MongoDB Atlas");

    // Paso 1: Consorcio
    const consorcio = await crearOObtenerConsorcio();
    if (!consorcio) {
      throw new Error("No se pudo crear ni recuperar el consorcio por defecto.");
    }
    const consorcioId = consorcio._id as mongoose.Types.ObjectId;

    // Paso 2: Membresías
    const { creadas, ignoradas } = await crearMembresiasParaUsuarios(consorcioId);

    // Resumen final
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  📊 RESUMEN DE MIGRACIÓN`);
    console.log(`${"═".repeat(60)}`);
    console.log(`  Consorcio por defecto: "${consorcio.nombre}"`);
    console.log(`  Membresias creadas:    ${creadas}`);
    console.log(`  Membresias ignoradas:  ${ignoradas} (ya existían)`);
    console.log(`  Tiempo total:          ${((Date.now() - inicio) / 1000).toFixed(2)}s`);
    console.log(`  Modo:                  ${DRY_RUN ? "🧪 DRY-RUN (sin cambios)" : "✅ EJECUTADO"}`);
    console.log(`${"═".repeat(60)}\n`);

    if (DRY_RUN) {
      console.log(`💡 Ejecutá sin --dry-run para aplicar los cambios reales.\n`);
    } else {
      console.log(`🎊 Migración completada exitosamente.\n`);
    }
  } catch (error) {
    log.err("Error durante la migración:");
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log.info("Conexión a MongoDB cerrada.");
  }
};

main();