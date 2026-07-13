const UnidadFuncional = require('../models/UnidadFuncional');

/**
 * Obtiene todas las unidades funcionales populando los datos de sus habitantes.
 */
exports.getUnidades = async (req, res) => {
  try {
    const unidades = await UnidadFuncional.find()
      .populate('propietario', 'name email telefono')
      .populate('inquilino', 'name email telefono')
      .sort({ piso: 1, departamento: 1 });

    return res.status(200).json({
      ok: true,
      unidades,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: 'Error al obtener las unidades funcionales.',
      error: error.message,
    });
  }
};

/**
 * Vincula o desvincula usuarios (propietario/inquilino) a una U.F.
 */
exports.vincularHabitantes = async (req, res) => {
  const { id } = req.params;
  const { propietarioId, inquilinoId } = req.body;

  try {
    const unidad = await UnidadFuncional.findById(id);

    if (!unidad) {
      return res.status(404).json({ ok: false, msg: 'Unidad funcional no encontrada.' });
    }

    // Asignación de referencias (si viene vacío o null, se limpia la U.F.)
    unidad.propietario = propietarioId || null;
    unidad.inquilino = inquilinoId || null;

    // Lógica automática de estado de ocupación
    if (unidad.inquilino) {
      unidad.estadoOcupacion = 'inquilino';
    } else if (unidad.propietario) {
      unidad.estadoOcupacion = 'propietario';
    } else {
      unidad.estadoOcupacion = 'vacio';
    }

    await unidad.save();

    // Populamos para retornar el objeto completo actualizado al frontend
    const unidadActualizada = await UnidadFuncional.findById(id)
      .populate('propietario', 'name email telefono')
      .populate('inquilino', 'name email telefono');

    return res.status(200).json({
      ok: true,
      msg: 'Habitantes vinculados correctamente.',
      unidad: unidadActualizada,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: 'Error al procesar la vinculación.',
      error: error.message,
    });
  }
};