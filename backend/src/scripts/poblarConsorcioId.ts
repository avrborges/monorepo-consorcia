// backend/src/scripts/poblarConsorcioId.ts
/**
 * Script de migración #2: Fase M2.4
 *
 * Objetivo: Poblar el campo `consorcioId` en todas las entidades que lo
 * agregaron como opcional en M2.2 y M2.3:
 *   - UnidadFuncional
 *   - AuditLog
 *
 * También completa la limpieza de M2.1 seteando `rolGlobal: "user"` en
 * usuarios que no lo tengan explícito.
 *
 * Estrategia: todos los registros existentes se asocian al consorcio
 * "por defecto" creado en M1.4 (mismo tenant que sus membresías).
 *
 * IMPORTANTE:
 * - IDEMPOTENTE: puede correrse varias veces sin duplicar cambios.
 * - Soporta modo dry-run para simular sin escribir.
 * - Es prerequisito para M2.5 (hacer consorcioId obligatorio).
 *
 * Uso:
 *   # Simular (recomendado la primera vez):
 *   npx ts-node src/scripts/poblarConsorcioId.ts --dry-run
 *
 *   # Ejecutar cambios reales:
 *   npx ts-node src/scripts/poblarConsorcioId.ts
 */

import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";

import Consorcio from "../models/Consorcio";
import UnidadFuncional from "../models/UnidadFuncional";
import AuditLog from "../models/AuditLog";
import User from "../models/User";

// Cargar variables de entorno desde backend/.env
dotenv.config({ path: path.join(__dirname, "../../.env") });

/* ============================================================
 * CONFIGURACIÓN
 * ============================================================ */

const CONSORCIO_DEFAULT_NOMBRE =
  process.env.CONSORCIO_DEFAULT_NOMBRE || "Edificio Principal";

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
 * PASO 1: Recuperar consorcio por defecto
 * ============================================================ */

const obtenerConsorcioDefault = async () => {
  log.header("PASO 1: Recuperar consorcio por defecto");

  const consorcio = await Consorcio.findOne({ nombre: CONSORCIO_DEFAULT_NOMBRE });

  if (!consorcio) {
    log.err(
      `No se encontró el consorcio "${CONSORCIO_DEFAULT_NOMBRE}". ¿Ejecutaste M1.4 primero?`
    );
    log.info("Ejecutá: npx ts-node src/scripts/migrarAMultitenant.ts");
    throw new Error("Consorcio por defecto no existe. Correr M1.4 antes de M2.4.");
  }

  log.ok(`Consorcio recuperado: "${consorcio.nombre}" (id: ${consorcio._id})`);
  return consorcio;
};

/* ============================================================
 * PASO 2: Poblar consorcioId en UnidadFuncional
 * ============================================================ */

const poblarConsorcioEnUnidades = async (
  consorcioId: mongoose.Types.ObjectId
) => {
  log.header("PASO 2: Poblar consorcioId en UnidadFuncional");

  const totalUnidades = await UnidadFuncional.countDocuments({});
  const sinConsorcio = await UnidadFuncional.countDocuments({
    consorcioId: { $exists: false },
  });
  const conConsorcio = totalUnidades - sinConsorcio;

  log.info(`Total unidades en la base: ${totalUnidades}`);
  log.info(`Ya tienen consorcioId:     ${conConsorcio}`);
  log.info(`Faltan por actualizar:     ${sinConsorcio}`);

  if (sinConsorcio === 0) {
    log.ok("Todas las unidades ya tienen consorcioId. Nada que hacer.");
    return { actualizados: 0, ignorados: totalUnidades };
  }

  if (DRY_RUN) {
    log.dryrun(`Se actualizarían ${sinConsorcio} unidades con consorcioId=${consorcioId}`);
    return { actualizados: sinConsorcio, ignorados: conConsorcio };
  }

  const resultado = await UnidadFuncional.updateMany(
    { consorcioId: { $exists: false } },
    { $set: { consorcioId } }
  );

  log.ok(`Unidades actualizadas: ${resultado.modifiedCount}`);
  return { actualizados: resultado.modifiedCount, ignorados: conConsorcio };
};

/* ============================================================
 * PASO 3: Poblar consorcioId en AuditLog
 * ============================================================ */

const poblarConsorcioEnAuditLogs = async (
  consorcioId: mongoose.Types.ObjectId
) => {
  log.header("PASO 3: Poblar consorcioId en AuditLog");

  const totalLogs = await AuditLog.countDocuments({});
  const sinConsorcio = await AuditLog.countDocuments({
    consorcioId: { $exists: false },
  });
  const conConsorcio = totalLogs - sinConsorcio;

  log.info(`Total logs en la base:  ${totalLogs}`);
  log.info(`Ya tienen consorcioId:  ${conConsorcio}`);
  log.info(`Faltan por actualizar:  ${sinConsorcio}`);

  if (sinConsorcio === 0) {
    log.ok("Todos los logs ya tienen consorcioId. Nada que hacer.");
    return { actualizados: 0, ignorados: totalLogs };
  }

  if (DRY_RUN) {
    log.dryrun(`Se actualizarían ${sinConsorcio} logs con consorcioId=${consorcioId}`);
    return { actualizados: sinConsorcio, ignorados: conConsorcio };
  }

  const resultado = await AuditLog.updateMany(
    { consorcioId: { $exists: false } },
    { $set: { consorcioId } }
  );

  log.ok(`Logs actualizados: ${resultado.modifiedCount}`);
  return { actualizados: resultado.modifiedCount, ignorados: conConsorcio };
};

/* ============================================================
 * PASO 4: Setear rolGlobal en Users (limpieza de M2.1)
 * ============================================================ */

const setearRolGlobalEnUsers = async () => {
  log.header("PASO 4: Setear rolGlobal en Users (limpieza M2.1)");

  const totalUsers = await User.countDocuments({});
  const sinRolGlobal = await User.countDocuments({
    rolGlobal: { $exists: false },
  });
  const conRolGlobal = totalUsers - sinRolGlobal;

  log.info(`Total usuarios en la base: ${totalUsers}`);
  log.info(`Ya tienen rolGlobal:       ${conRolGlobal}`);
  log.info(`Faltan por actualizar:     ${sinRolGlobal}`);

  if (sinRolGlobal === 0) {
    log.ok("Todos los usuarios ya tienen rolGlobal. Nada que hacer.");
    return { actualizados: 0, ignorados: totalUsers };
  }

  if (DRY_RUN) {
    log.dryrun(`Se actualizarían ${sinRolGlobal} usuarios con rolGlobal="user"`);
    return { actualizados: sinRolGlobal, ignorados: conRolGlobal };
  }

  const resultado = await User.updateMany(
    { rolGlobal: { $exists: false } },
    { $set: { rolGlobal: "user" } }
  );

  log.ok(`Usuarios actualizados: ${resultado.modifiedCount}`);
  return { actualizados: resultado.modifiedCount, ignorados: conRolGlobal };
};

/* ============================================================
 * MAIN
 * ============================================================ */

const main = async () => {
  const inicio = Date.now();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  🚀 MIGRACIÓN #2 — Fase M2.4`);
  console.log(`  Poblar consorcioId + limpiar rolGlobal`);
  console.log(`  Modo: ${DRY_RUN ? "🧪 DRY-RUN (simulación)" : "✍️  EJECUCIÓN REAL"}`);
  console.log(`${"═".repeat(60)}`);

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI no está definida en el entorno (.env)");
    }

    await mongoose.connect(process.env.MONGO_URI);
    log.header("Conexión a MongoDB");
    log.ok("Conectado a MongoDB Atlas");

    // Paso 1: Recuperar consorcio por defecto
    const consorcio = await obtenerConsorcioDefault();
    const consorcioId = consorcio._id as mongoose.Types.ObjectId;

    // Paso 2: Poblar unidades
    const resUnidades = await poblarConsorcioEnUnidades(consorcioId);

    // Paso 3: Poblar audit logs
    const resAudit = await poblarConsorcioEnAuditLogs(consorcioId);

    // Paso 4: Setear rolGlobal en users
    const resUsers = await setearRolGlobalEnUsers();

    // Resumen final
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  📊 RESUMEN DE MIGRACIÓN #2`);
    console.log(`${"═".repeat(60)}`);
    console.log(`  Consorcio por defecto:       "${consorcio.nombre}"`);
    console.log(`  Unidades actualizadas:       ${resUnidades.actualizados}`);
    console.log(`  Unidades ignoradas:          ${resUnidades.ignorados} (ya tenían consorcioId)`);
    console.log(`  Audit logs actualizados:     ${resAudit.actualizados}`);
    console.log(`  Audit logs ignorados:        ${resAudit.ignorados} (ya tenían consorcioId)`);
    console.log(`  Usuarios actualizados:       ${resUsers.actualizados}`);
    console.log(`  Usuarios ignorados:          ${resUsers.ignorados} (ya tenían rolGlobal)`);
    console.log(`  Tiempo total:                ${((Date.now() - inicio) / 1000).toFixed(2)}s`);
    console.log(`  Modo:                        ${DRY_RUN ? "🧪 DRY-RUN (sin cambios)" : "✅ EJECUTADO"}`);
    console.log(`${"═".repeat(60)}\n`);

    if (DRY_RUN) {
      console.log(`💡 Ejecutá sin --dry-run para aplicar los cambios reales.\n`);
    } else {
      console.log(`🎊 Migración #2 completada exitosamente.\n`);
      console.log(`✨ Prerequisito para M2.5 cumplido:`);
      console.log(`   Todos los registros tienen consorcioId poblado.\n`);
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