// backend/src/scripts/migrarOcupaciones.ts
/**
 * Script de migración one-shot: Ocupaciones Fase M5.2
 *
 * Objetivo: poblar el nuevo modelo `Ocupacion` (historial con desde/hasta)
 * a partir de los campos legacy `propietario` / `inquilino` que hoy viven
 * embebidos en cada `UnidadFuncional`.
 *
 * Por cada UnidadFuncional existente:
 *   - Si tiene `propietario`, crea una Ocupacion activa tipo "propietario".
 *   - Si tiene `inquilino`,   crea una Ocupacion activa tipo "inquilino".
 *
 * Cada Ocupacion se crea con:
 *   - desde = createdAt de la UF (aproximación al inicio de la ocupación),
 *             con fallback a new Date() si la UF no tiene timestamps.
 *   - hasta = null (ocupación vigente).
 *
 * IMPORTANTE:
 * - Este script NO modifica UnidadFuncional (los campos legacy se mantienen
 *   durante la etapa de dual-write). Solo CREA registros en `Ocupacion`.
 * - Es IDEMPOTENTE: verifica que no exista ya una ocupación ACTIVA para el
 *   mismo {unidadId, userId, tipo} antes de crear. Puede correrse N veces
 *   sin duplicar registros.
 * - Soporta modo dry-run para simular sin escribir cambios.
 *
 * Uso:
 *   # Simular sin ejecutar cambios (recomendado la primera vez):
 *   npx ts-node src/scripts/migrarOcupaciones.ts --dry-run
 *
 *   # Ejecutar cambios reales:
 *   npx ts-node src/scripts/migrarOcupaciones.ts
 */

import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";

import UnidadFuncional from "../models/UnidadFuncional";
import Ocupacion, { type TipoOcupacion } from "../models/Ocupacion";

// Cargar variables de entorno desde backend/.env
dotenv.config({ path: path.join(__dirname, "../../.env") });

/* ============================================================
 * CONFIGURACIÓN
 * ============================================================ */

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
 * HELPER: Crear una ocupación de forma idempotente
 * ============================================================
 *
 * Verifica que no exista ya una ocupación ACTIVA (hasta: null) para el
 * mismo {unidadId, userId, tipo}. Si existe, la ignora. Si no, la crea
 * (o simula su creación en dry-run).
 *
 * Retorna "creada" | "ignorada" para alimentar los contadores.
 */
const migrarOcupacionIdempotente = async (params: {
  unidadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tipo: TipoOcupacion;
  desde: Date;
  etiqueta: string; // texto legible para el log (ej: "Piso 3 Depto B")
}): Promise<"creada" | "ignorada"> => {
  const { unidadId, userId, tipo, desde, etiqueta } = params;

  const yaExiste = await Ocupacion.findOne({
    unidadId,
    userId,
    tipo,
    hasta: null,
  });

  if (yaExiste) {
    log.info(`⏭  ${etiqueta} → ya tiene ocupación activa "${tipo}"`);
    return "ignorada";
  }

  if (DRY_RUN) {
    log.dryrun(
      `Se crearía ocupación "${tipo}" para ${etiqueta} (desde: ${desde.toISOString()})`
    );
    return "creada";
  }

  await Ocupacion.create({
    unidadId,
    userId,
    tipo,
    desde,
    hasta: null,
  });

  log.ok(`Ocupación creada: ${etiqueta} → "${tipo}"`);
  return "creada";
};

/* ============================================================
 * PASO 1: Migrar propietarios/inquilinos legacy a Ocupacion
 * ============================================================ */

const migrarOcupaciones = async () => {
  log.header("PASO 1: Migración de ocupaciones legacy");

  // Traemos todas las UF con sus campos legacy + createdAt para `desde`.
  const unidades = await UnidadFuncional.find({}).select(
    "_id piso departamento propietario inquilino createdAt"
  );

  log.info(`Encontradas ${unidades.length} unidades funcionales en la base.`);

  if (unidades.length === 0) {
    log.info("No hay unidades para migrar.");
    return { creadas: 0, ignoradas: 0, sinOcupantes: 0 };
  }

  let creadas = 0;
  let ignoradas = 0;
  let sinOcupantes = 0;

  for (const unidad of unidades) {
    const etiqueta = `Piso ${unidad.piso} Depto ${unidad.departamento}`;

    // `desde` = createdAt de la UF, con fallback defensivo a "ahora".
    // Usamos un acceso laxo por si el modelo no declara timestamps.
    const createdAt = (unidad as unknown as { createdAt?: Date }).createdAt;
    const desde = createdAt instanceof Date ? createdAt : new Date();

    // Los campos legacy están tipados como `IUser | ObjectId` porque el schema
    // permite populate. En este script NO populamos, así que en runtime siempre
    // son ObjectId → casteamos de forma segura para satisfacer a TS strict.
    const propietarioId = (unidad.propietario ?? null) as mongoose.Types.ObjectId | null;
    const inquilinoId = (unidad.inquilino ?? null) as mongoose.Types.ObjectId | null;

    // Unidad sin ningún ocupante legacy → nada que migrar.
    if (!propietarioId && !inquilinoId) {
      sinOcupantes++;
      continue;
    }

    // Propietario legacy → ocupación tipo "propietario"
    if (propietarioId) {
      const resultado = await migrarOcupacionIdempotente({
        unidadId: unidad._id,
        userId: propietarioId,
        tipo: "propietario",
        desde,
        etiqueta,
      });
      if (resultado === "creada") creadas++;
      else ignoradas++;
    }

    // Inquilino legacy → ocupación tipo "inquilino"
    if (inquilinoId) {
      const resultado = await migrarOcupacionIdempotente({
        unidadId: unidad._id,
        userId: inquilinoId,
        tipo: "inquilino",
        desde,
        etiqueta,
      });
      if (resultado === "creada") creadas++;
      else ignoradas++;
    }
  }

  return { creadas, ignoradas, sinOcupantes };
};

/* ============================================================
 * MAIN
 * ============================================================ */

const main = async () => {
  const inicio = Date.now();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  🚀 MIGRACIÓN DE OCUPACIONES — Fase M5.2`);
  console.log(`  Modo: ${DRY_RUN ? "🧪 DRY-RUN (simulación)" : "✍️  EJECUCIÓN REAL"}`);
  console.log(`${"═".repeat(60)}`);

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI no está definida en el entorno (.env)");
    }

    await mongoose.connect(process.env.MONGO_URI);
    log.header("Conexión a MongoDB");
    log.ok("Conectado a MongoDB Atlas");

    // Paso 1: Migración de ocupaciones
    const { creadas, ignoradas, sinOcupantes } = await migrarOcupaciones();

    // Resumen final
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  📊 RESUMEN DE MIGRACIÓN`);
    console.log(`${"═".repeat(60)}`);
    console.log(`  Ocupaciones creadas:    ${creadas}`);
    console.log(`  Ocupaciones ignoradas:  ${ignoradas} (ya existían activas)`);
    console.log(`  Unidades sin ocupantes: ${sinOcupantes}`);
    console.log(`  Tiempo total:           ${((Date.now() - inicio) / 1000).toFixed(2)}s`);
    console.log(`  Modo:                   ${DRY_RUN ? "🧪 DRY-RUN (sin cambios)" : "✅ EJECUTADO"}`);
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
