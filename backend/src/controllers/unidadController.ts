// backend/src/controllers/unidadController.ts
import type { Request, Response } from "express";
import { Types } from "mongoose";

import UnidadFuncional, {
  type EstadoOcupacion,
} from "../models/UnidadFuncional";

/* ============================================================
 * TIPOS DE PAYLOAD
 * ============================================================ */

interface CrearUnidadBody {
  piso?: string;
  departamento?: string;
  coeficiente?: number;
  estadoOcupacion?: EstadoOcupacion;
}

interface VincularHabitantesBody {
  propietarioId?: string | null;
  inquilinoId?: string | null;
}

interface ParamsId {
  id: string;
  [key: string]: string;
}

/* ============================================================
 * HELPER: Serializar mensaje de error de forma segura
 * ============================================================ */

/**
 * `catch (error)` viene tipado como `unknown` en TS moderno.
 * Este helper extrae el mensaje de manera segura sin romper el tipado.
 */
const obtenerMensajeError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

/* ============================================================
 * MÉTODO: Obtener todas las unidades funcionales populando habitantes
 * ============================================================ */
export const getUnidades = async (_req: Request, res: Response) => {
  try {
    const unidades = await UnidadFuncional.find()
      .populate("propietario", "name email telefono")
      .populate("inquilino", "name email telefono")
      .sort({ piso: 1, departamento: 1 });

    return res.status(200).json({
      ok: true,
      unidades,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al obtener las unidades funcionales.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * MÉTODO: Crear una nueva Unidad Funcional
 * ============================================================ */
export const crearUnidad = async (
  req: Request<unknown, unknown, CrearUnidadBody>,
  res: Response
) => {
  try {
    const { piso, departamento, coeficiente, estadoOcupacion } = req.body;

    // Validación estricta de campos obligatorios
    if (!piso || !departamento) {
      return res.status(400).json({
        ok: false,
        msg: "El piso y el departamento son datos obligatorios.",
      });
    }

    // Comprobamos duplicados en el mismo piso/departamento para evitar inconsistencias
    const unidadExistente = await UnidadFuncional.findOne({ piso, departamento });
    if (unidadExistente) {
      return res.status(400).json({
        ok: false,
        msg: `La unidad ${piso}° "${departamento}" ya se encuentra registrada.`,
      });
    }

    // Instanciamos el documento
    const nuevaUnidad = new UnidadFuncional({
      piso,
      departamento,
      coeficiente: coeficiente || 0,
      estadoOcupacion: estadoOcupacion || "vacio",
    });

    await nuevaUnidad.save();

    // Retornamos la unidad creada con éxito para que impacte directo en el plano del frontend
    return res.status(201).json({
      ok: true,
      msg: "Unidad funcional dada de alta con éxito.",
      unidad: nuevaUnidad,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al dar de alta la unidad funcional.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * MÉTODO: Vincular / desvincular usuarios (propietario/inquilino) a una U.F.
 * ============================================================ */
export const vincularHabitantes = async (
  req: Request<ParamsId, unknown, VincularHabitantesBody>,
  res: Response
) => {
  const { id } = req.params;
  const { propietarioId, inquilinoId } = req.body;

  try {
    const unidad = await UnidadFuncional.findById(id);

    if (!unidad) {
      return res.status(404).json({
        ok: false,
        msg: "Unidad funcional no encontrada.",
      });
    }

    // Asignación de referencias (si viene vacío o null, se limpia la U.F.)
    unidad.propietario = propietarioId ? new Types.ObjectId(propietarioId) : null;
    unidad.inquilino = inquilinoId ? new Types.ObjectId(inquilinoId) : null;

    // Lógica automática de estado de ocupación
    if (unidad.inquilino) {
      unidad.estadoOcupacion = "inquilino";
    } else if (unidad.propietario) {
      unidad.estadoOcupacion = "propietario";
    } else {
      unidad.estadoOcupacion = "vacio";
    }

    await unidad.save();

    // Populamos para retornar el objeto completo actualizado al frontend
    const unidadActualizada = await UnidadFuncional.findById(id)
      .populate("propietario", "name email telefono")
      .populate("inquilino", "name email telefono");

    return res.status(200).json({
      ok: true,
      msg: "Habitantes vinculados correctamente.",
      unidad: unidadActualizada,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al procesar la vinculación.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * MÉTODO: Eliminar una Unidad Funcional por su ID
 * ============================================================ */
export const eliminarUnidad = async (
  req: Request<ParamsId>,
  res: Response
) => {
  try {
    const { id } = req.params;

    // Buscamos si la unidad existe
    const unidad = await UnidadFuncional.findById(id);
    if (!unidad) {
      return res.status(404).json({
        ok: false,
        msg: "La unidad funcional no existe o ya fue eliminada.",
      });
    }

    // Eliminamos la unidad
    await UnidadFuncional.findByIdAndDelete(id);

    return res.status(200).json({
      ok: true,
      msg: "Unidad funcional eliminada con éxito.",
      idEliminado: id, // Retornamos el id para facilitar el filtrado del estado en React
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al eliminar la unidad funcional.",
      error: obtenerMensajeError(error),
    });
  }
};