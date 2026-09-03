import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"


export type MatriculaMoveKind = "promover" | "reubicar" | "corregir"

export interface MoveMatriculaInput {
  kind: MatriculaMoveKind
  ids: number[]
  grupoDestino: number
  /** Obligatorio para promover/reubicar; corregir no lo pide. */
  motivo?: string
  /** Obligatorio para promover/reubicar; corregir no lo pide. */
  soporte?: File | null
}

interface MoveMatriculaEstadoRef {
  id: number
  nombre: string
}

interface MoveMatriculaEstudianteResult {
  pkTmatriculaAnterior: number
  pkTmatriculaNueva: number | null
  estudiante: { pkTestudiante: number; documento: string; nombre: string }
  anterior: { fkTgrado: number; grado: string; fkTgrupo: number; grupo: string }
  nuevo: { fkTgrado: number; grado: string; fkTgrupo: number; grupo: string }
  estadoAnterior: MoveMatriculaEstadoRef
}

export interface MoveMatriculaResult {
  mensaje: string
  tipoCambio: MatriculaMoveKind
  procesadas: number
  estadoAplicado: MoveMatriculaEstadoRef | null
  estadoNuevas: MoveMatriculaEstadoRef | null
  motivo: string | null
  soporte: number | null
  destino: {
    fkTgrupo: number
    grupo: string
    fkTgrado: number
    grado: string
    fkTsede: number
    fkTperiodoAcademico: number
  }
  matriculas: MoveMatriculaEstudianteResult[]
}

async function moveMatricula(input: MoveMatriculaInput): Promise<MoveMatriculaResult> {
  const path = `/eval-col/cobertura-academica/matricula/${input.kind}`

  if (input.kind === "corregir") {
    return api.post(path, { IDS: input.ids, GRUPO_DESTINO: input.grupoDestino })
  }

  const form = new FormData()
  form.append("IDS", `{${input.ids.join(",")}}`)
  form.append("GRUPO_DESTINO", String(input.grupoDestino))
  if (input.motivo) form.append("MOTIVO", input.motivo)
  if (input.soporte) form.append("SOPORTE", input.soporte)

  return api.post(`/files${path}`, form)
}

interface UseMoveMatriculaOptions {
  mutationConfig?: MutationConfig<typeof moveMatricula>
}

export function useMoveMatricula({ mutationConfig }: UseMoveMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: moveMatricula,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
