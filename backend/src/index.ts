// backend/src/index.ts

// 🎯 IMPORTANTE: dotenv debe cargarse ANTES de cualquier otro import,
// porque los ES modules son "hoisted" y algunos módulos (como emailService)
// leen process.env en el top-level durante su carga.
import "dotenv/config";

import express, { type Application } from "express";
import cors from "cors";
import mongoose from "mongoose";
import os from "os";

// 🛡️ Registro central de modelos Mongoose (Fase M2.8 fix).
//    Importamos todos los modelos acá para garantizar que se registren en
//    Mongoose al arrancar. Sin esto, los transpiladores (ts-node/tsx/swc)
//    hacen tree-shaking de los imports "no usados directamente", lo que
//    rompe los .populate() de referencias (ej: populate("consorcioId")).
import "./models/User";
import "./models/Consorcio";
import "./models/Membresia";
import "./models/Ocupacion";
import "./models/UnidadFuncional";
import "./models/AuditLog";

import userRoutes from "./routes/userRoutes";
import unidadRoutes from "./routes/unidadRoutes";
import consorcioRoutes from "./routes/consorcioRoutes"; // 🆕 M6.0

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 5000;

/* ============================================================
 * MIDDLEWARES GLOBALES
 * ============================================================ */
app.use(cors());
app.use(express.json());

/* ============================================================
 * ENRUTADORES
 * ============================================================ */
app.use("/api/users", userRoutes);
app.use("/api/unidades", unidadRoutes);
app.use("/api/consorcios", consorcioRoutes); // 🆕 M6.0 — Configuración del consorcio

/* ============================================================
 * HELPER: Detectar la IP local para mostrar la URL de acceso en red
 * ============================================================ */
const obtenerIPLocal = (): string => {
  const networkInterfaces = os.networkInterfaces();

  for (const interfaceName in networkInterfaces) {
    const ifaces = networkInterfaces[interfaceName];
    if (!ifaces) continue;

    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }

  return "localhost";
};

/* ============================================================
 * CONEXIÓN A MONGODB + ARRANQUE DEL SERVER
 * ============================================================ */
if (!process.env.MONGO_URI) {
  console.error("❌ La variable MONGO_URI no está definida en el entorno (.env)");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const localIP = obtenerIPLocal();

    console.log("\n============== 💾 MONGODB ==============");
    console.log("¡Conectado exitosamente a MONGODB ATLAS (Nube)!");
    console.log("========================================");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor Consorcia API activo:`);
      console.log(`   • En esta PC: http://localhost:${PORT}`);
      console.log(`   • En la Red:  http://${localIP}:${PORT}\n`);
    });
  })
  .catch((error: unknown) => {
    console.error("❌ Error crítico al conectar a MongoDB Atlas:", error);
    process.exit(1);
  });
