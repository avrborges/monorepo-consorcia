// backend/src/scripts/limpiarAuditlogs.ts
import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";

import AuditLog from "../models/AuditLog";

// Cargar variables de entorno desde backend/.env
dotenv.config({ path: path.join(__dirname, "../../.env") });

const limpiarAuditlogs = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI no está definida en el entorno (.env)");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB Atlas");

    const antes = await AuditLog.countDocuments();
    console.log(`📊 Cantidad de auditlogs actuales: ${antes}`);

    if (antes === 0) {
      console.log("ℹ️  No hay auditlogs para eliminar. Nada que hacer.");
      return;
    }

    const resultado = await AuditLog.deleteMany({});
    console.log(`🧹 Auditlogs eliminados: ${resultado.deletedCount}`);

    const despues = await AuditLog.countDocuments();
    console.log(`✅ Cantidad de auditlogs remanentes: ${despues}`);
    console.log("🎉 Limpieza completada. Colección auditlogs vacía y lista para el shape nuevo.");
  } catch (error) {
    console.error("❌ Error al limpiar auditlogs:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 Conexión a MongoDB cerrada de forma segura.");
  }
};

limpiarAuditlogs();