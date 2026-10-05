import type { MetodoCalculo } from "@/features/planeador/api/types/unidad-tematica"
import { articuloDefinidoRotulo, pluralizarRotulo } from "@/features/planeador/lib/rotulo-gramatica"

/**
 * `METODO_CALCULO_INFO` con el rótulo real de la actividad (Regla 13) en vez
 * de "actividad(es)" fijo — lo usa el form de la unidad, donde el rótulo ya
 * está resuelto por Grado/Asignatura. `METODO_CALCULO_INFO` se conserva tal
 * cual para el form de actividad, que tiene su propio tratamiento.
 */
export function metodoCalculoInfo(
  rotuloActividad: string,
): Record<MetodoCalculo, { label: string; description: string }> {
  const lower = rotuloActividad.charAt(0).toLowerCase() + rotuloActividad.slice(1)
  const plural = pluralizarRotulo(lower)
  const todas = articuloDefinidoRotulo(rotuloActividad) === "el" ? "todos los" : "todas las"
  return {
    Ponderado: {
      label: `Ponderar ${plural}`,
      description: `Cada ${lower} tiene un porcentaje asignado según su peso.`,
    },
    "Promedio simple": {
      label: `Promediar ${plural}`,
      description: `Se calcula el promedio aritmético de ${todas} ${plural}`,
    },
    "Suma de puntos": {
      label: `Sumatoria de ${plural}`,
      description: `Se suman los puntajes obtenidos en ${todas} ${plural}`,
    },
  }
}
