import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { subirSoporteConvivencia } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"

const BASE = "/gestion-estudiantil/convivencia/procesos"

const anularProceso = (i: { procesoId: number; motivo: string }) =>
  evalCol.postRow(`${BASE}/${i.procesoId}/anular`, { MOTIVO: i.motivo.trim() })

/** `POST /procesos/:ID/anular`; invalida todo Convivencia (los procesos cuelgan de `convivenciaKeys.all`). */
export function useAnularProceso({ mutationConfig }: { mutationConfig?: MutationConfig<typeof anularProceso> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: anularProceso,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: convivenciaKeys.all })
      onSuccess?.(...args)
    },
  })
}

export interface AbrirProcesoInput {
  matricula: number
  fecha: string
  responsable: number
  anotaciones: number[]
  caso: number | null
  cargos: { fk_comportamiento: number; fk_clasificacion: number; norma: string; descripcion: string }[]
  pruebas: { descripcion: string; archivo: File | null }[]
}

export interface ProcesoAbierto {
  id: number
  numero: string
  mensaje: string
  plazo_descargos: string | null
  acudiente_nombre: string | null
}

/** `POST /procesos` (§2.2): sube antes el archivo de cada prueba con el soporte de Convivencia. */
async function abrirProceso(i: AbrirProcesoInput) {
  const pruebas = await Promise.all(
    i.pruebas.map(async (p) => ({
      descripcion: p.descripcion.trim(),
      fk_archivo: p.archivo ? await subirSoporteConvivencia(p.archivo) : null,
    })),
  )
  const r = await evalCol.postRow<{ resultado: ProcesoAbierto }>(BASE, {
    FK_MATRICULA: i.matricula,
    FECHA_APERTURA: i.fecha,
    FK_RESPONSABLE: i.responsable,
    ANOTACIONES: i.anotaciones.length ? i.anotaciones : null,
    FK_CASO: i.caso,
    CARGOS: i.cargos.map((c) => ({ ...c, norma: c.norma.trim(), descripcion: c.descripcion.trim() })),
    PRUEBAS: pruebas,
  })
  return r.resultado
}

export function useAbrirProceso({ mutationConfig }: { mutationConfig?: MutationConfig<typeof abrirProceso> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: abrirProceso,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: convivenciaKeys.all })
      onSuccess?.(...args)
    },
  })
}
