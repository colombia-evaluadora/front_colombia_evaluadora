import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Conversacion } from "@/features/comunicaciones/chat/api/types"

export interface CandidatoNuevo {
  nombre: string
  numero: string
  lema: string
  foto: File | null
}

export interface CrearEleccionInput {
  nombre: string
  descripcion: string
  fechaInicio: string | null
  fechaCierre: string | null
  jornadaId: number
  verResultadosEnVivo: boolean
  permitirComentarios: boolean
  candidatos: CandidatoNuevo[]
}

// TODO: con el backend real las fotos irán por `postMultipart` (lib/files.ts).
// El mock recibe una URL local del navegador, válida solo en esta sesión.
async function crearEleccion(v: CrearEleccionInput) {
  return evalCol.postRow<Conversacion>("/comunicaciones/elecciones", {
    NOMBRE: v.nombre,
    DESCRIPCION: v.descripcion,
    FECHA_INICIO: v.fechaInicio,
    FECHA_CIERRE: v.fechaCierre,
    FK_JORNADA: v.jornadaId,
    VER_RESULTADOS: v.verResultadosEnVivo ? "S" : "N",
    COMENTARIOS: v.permitirComentarios ? "S" : "N",
    CANDIDATOS: v.candidatos.map((c) => ({
      NOMBRE: c.nombre,
      NUMERO: c.numero,
      LEMA: c.lema,
      FOTO_URL: c.foto ? URL.createObjectURL(c.foto) : null,
    })),
  })
}

export function useCrearEleccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: crearEleccion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
  })
}
