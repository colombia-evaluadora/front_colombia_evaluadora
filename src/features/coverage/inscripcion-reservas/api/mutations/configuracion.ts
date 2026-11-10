import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { configuracionKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-configuracion-query"
import {
  INSCRIPCIONES_BASE,
  datos,
  inscripcionesKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type {
  ModificarGrupoInput,
  ModificarPeriodoInput,
  ResultadoCopia,
} from "@/features/coverage/inscripcion-reservas/api/types/configuracion"

const CONFIG = `${INSCRIPCIONES_BASE}/configuracion`

function modificarGrupo({
  id,
  fechaCierre,
  modoAdmision,
  criterios,
  desempate,
  documentosRequeridos,
}: ModificarGrupoInput) {
  return evalCol.put(`${CONFIG}/grupos/${id}`, {
    FECHA_CIERRE: fechaCierre,
    MODO_ADMISION: modoAdmision,
    CRITERIOS: criterios.map(Number),
    DESEMPATE: desempate,
    DOCUMENTOS: documentosRequeridos.map(Number),
  })
}

export function useModificarGrupoAdmision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: modificarGrupo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configuracionKeys.all })
      // La lista de inscripciones lee el desempate y la fecha de sorteo del grupo.
      queryClient.invalidateQueries({ queryKey: inscripcionesKeys.all })
    },
  })
}

type ItemCopia = { id: number; periodo: string; motivo?: string }

async function copiarPeriodo({
  id,
  destinos,
}: {
  id: string
  destinos: string[]
}): Promise<ResultadoCopia> {
  const r = datos(
    await evalCol.postRow<{ datos: { copiados: ItemCopia[]; noCopiados: ItemCopia[] } }>(
      `${CONFIG}/periodos/${id}/copiar`,
      {
        DESTINOS: destinos.map(Number),
      },
    ),
  )
  return {
    copiados: r.copiados.map((c) => ({ id: String(c.id), periodo: c.periodo })),
    noCopiados: r.noCopiados.map((c) => ({
      id: String(c.id),
      periodo: c.periodo,
      motivo: c.motivo ?? "",
    })),
  }
}

/** Copia liberación, traslados, plazo y confirmación del período origen a los destinos. */
export function useCopiarConfigPeriodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: copiarPeriodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: configuracionKeys.all }),
  })
}

function modificarPeriodo({
  id,
  fechaLiberacionReservas,
  modoTraslado,
  plazoRespuestaTraslado,
  requiereConfirmacionAcudiente,
}: ModificarPeriodoInput) {
  return evalCol.put(`${CONFIG}/periodos/${id}`, {
    FECHA_LIBERACION_RESERVAS: fechaLiberacionReservas,
    MODO_TRASLADO: modoTraslado,
    PLAZO_RESPUESTA_TRASLADO: plazoRespuestaTraslado,
    REQUIERE_CONFIRMACION_ACUDIENTE: requiereConfirmacionAcudiente,
  })
}

export function useModificarPeriodoInscripcion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: modificarPeriodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: configuracionKeys.all }),
  })
}
