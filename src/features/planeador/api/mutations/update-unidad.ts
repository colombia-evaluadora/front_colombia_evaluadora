import { useMutation, useQueryClient } from "@tanstack/react-query"
import { writeConfig, type WriteRequest } from "@/lib/offline/outbox/write-request"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"
import { resolveCalculoDefinitivaId } from "@/features/planeador/api/query/catalogos-lista-valor"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { invalidarInformes } from "@/features/academic-management/reports/api/query/invalidar-informes"

/** Sin `criterios`/`actividades`: se editan aparte en sus pestañas. */
export type UnidadInfoGeneral = Omit<UnidadTematica, "id" | "criterios" | "actividades">

/**
 * El backend exige título en todos los contenidos o en ninguno (22023):
 * `CONTENIDOS_TITULOS` solo viaja si todas las secciones tienen uno.
 */
export function contenidosABody(
  contenidos: UnidadInfoGeneral["contenidos"],
): { CONTENIDOS: string[]; CONTENIDOS_TITULOS?: string[] } {
  const descripciones = contenidos.map((c) => c.descripcion)
  const titulos = contenidos.map((c) => c.titulo?.trim() ?? "")
  const todosConTitulo = contenidos.length > 0 && titulos.every((t) => t !== "")
  return todosConTitulo ? { CONTENIDOS: descripciones, CONTENIDOS_TITULOS: titulos } : { CONTENIDOS: descripciones }
}

export interface UpdateUnidadInput {
  unidadId: number
  data: UnidadInfoGeneral
  /** Versión que vio el docente (`UnidadTematica.version`) → `BASE_VERSION` (409 si cambió). */
  baseVersion?: number | null
}

/** Actividad cuyo peso/puntaje se convirtió al cambiar el cálculo de la unidad (Regla 28). */
export interface ActividadAfectada {
  pk: number
  titulo: string
}

interface UpdateUnidadResponse {
  status: "ok" | "error"
  message?: string
  unidad?: UnidadTematica
  /** `actividades_afectadas` del backend real; el mock siempre lo deja vacío. */
  actividadesAfectadas: ActividadAfectada[]
}

interface UpdateUnidadRealRow {
  fn_unidad_actualizar: number
  actividades_afectadas?: ActividadAfectada[]
}

/** PUT parcial: campo ausente preserva el valor; grado/asignatura solo si se re-eligieron. */
export async function updateUnidad(
  { unidadId, data, baseVersion }: UpdateUnidadInput,
  req?: WriteRequest,
): Promise<UpdateUnidadResponse> {
  if (env.ENABLE_API_MOCKING) {
    const result = await api.put<Omit<UpdateUnidadResponse, "actividadesAfectadas">>(
      `/eval-col/planeador/unidades/${unidadId}`,
      baseVersion != null ? { ...data, BASE_VERSION: baseVersion } : data,
      writeConfig(req),
    )
    return { ...result, actividadesAfectadas: [] }
  }
  const body: Record<string, unknown> = {
    NOMBRE: data.nombre,
    DESCRIPCION: data.descripcion,
    OBJETIVOS: data.objetivos,
    ...contenidosABody(data.contenidos),
    FK_TLV_CALCULO_DEFINITIVA: await resolveCalculoDefinitivaId(data.metodoCalculo),
  }
  if (data.gradoId != null) body.FK_TGRADO = data.gradoId
  if (data.asignaturaId != null) body.FK_TASIGNATURA = data.asignaturaId
  // Sin `FK_TLV_INSTRUMENTO_EVALUACION`: el instrumento se deriva de las actividades.
  // `ENUNCIADOS` reemplaza la lista completa: un array vacío desvincula todos.
  body.ENUNCIADOS = data.enunciadosDba.map((enunciado) => enunciado.id)
  if (baseVersion != null) body.BASE_VERSION = baseVersion
  const row = await api.put<UpdateUnidadRealRow>(`/eval-col/planeador/unidades/${unidadId}`, body, writeConfig(req))
  return { status: "ok", actividadesAfectadas: row.actividades_afectadas ?? [] }
}

interface UseUpdateUnidadOptions {
  mutationConfig?: MutationConfig<typeof updateUnidad>
}

/** Invalida detalle y listado: el nombre/área de la card también puede cambiar. */
export function useUpdateUnidad({ mutationConfig }: UseUpdateUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: (input: UpdateUnidadInput) => updateUnidad(input),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidad.detalle(variables.unidadId) })
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidades.all })
      // La nota de la asignatura puede cambiar: tabla y alertas de Informes.
      invalidarInformes(queryClient)
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
