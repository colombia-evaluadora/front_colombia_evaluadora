import { useMutation } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import {
  buildCalificacion,
  type CalificarCeldaInput,
} from "@/features/planeador/api/mutations/use-calificar-celda"

interface PrevisualizarNotaResult {
  porcentaje: number | null
  nota_homologada: number | null
}

/** `POST .../calificar/vista-previa`: la nota que dejaría calificar, sin
 *  guardar ni abrir solicitud. Mismo body que `calificar`. */
function previsualizarNota(input: CalificarCeldaInput): Promise<PrevisualizarNotaResult> {
  return evalCol.postRow(
    `/planeador/actividades/estudiantes/${input.pkTactividadEstudiante}/calificar/vista-previa`,
    { CALIFICACION: JSON.stringify(buildCalificacion(input)), FECHA: input.fecha },
  )
}

export function usePrevisualizarNotaMutation() {
  return useMutation({ mutationFn: previsualizarNota })
}
