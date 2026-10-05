import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"
import { resolveCalculoDefinitivaId } from "@/features/planeador/api/query/use-calculo-definitiva-catalog"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/** Todo menos `criterios`/`actividades`: esas listas se editan aparte, desde
 *  las pestañas Rúbricas/Actividades del panel. */
export type UnidadInfoGeneral = Omit<UnidadTematica, "id" | "criterios" | "actividades">

/**
 * `CONTENIDOS`/`CONTENIDOS_TITULOS` (sso V492, §4) para el body de
 * `POST`/`PUT /planeador/unidades`. El backend real
 * (`fn_unidad_validar_contenidos_titulos`) es TODO O NADA para los
 * títulos: si `CONTENIDOS_TITULOS` viaja, tiene que traer un título NO
 * VACÍO por cada contenido, en la misma posición — mezclar secciones con y
 * sin título en el mismo guardado tira 22023. Por eso acá solo se manda
 * cuando TODAS las secciones ya tienen uno; mientras falte alguno, se omite
 * por completo (la Descripción, que es el dato principal, se guarda
 * siempre) — compartido por `create-unidad.ts`/`update-unidad.ts` para no
 * duplicar esta regla en los dos lugares.
 */
export function contenidosABody(
  contenidos: UnidadInfoGeneral["contenidos"],
): { CONTENIDOS: string[]; CONTENIDOS_TITULOS?: string[] } {
  const descripciones = contenidos.map((c) => c.descripcion)
  const titulos = contenidos.map((c) => c.titulo?.trim() ?? "")
  const todosConTitulo = contenidos.length > 0 && titulos.every((t) => t !== "")
  return todosConTitulo ? { CONTENIDOS: descripciones, CONTENIDOS_TITULOS: titulos } : { CONTENIDOS: descripciones }
}

interface UpdateUnidadInput {
  unidadId: number
  data: UnidadInfoGeneral
}

/** Una actividad cuyo peso (%) o puntaje se CONVIRTIÓ automáticamente al
 *  cambiar el criterio de cálculo de la unidad con actividades ya
 *  vinculadas (Regla 28) — informativo, el valor ya quedó guardado. */
export interface ActividadAfectada {
  pk: number
  titulo: string
}

interface UpdateUnidadResponse {
  status: "ok" | "error"
  message?: string
  unidad?: UnidadTematica
  /** Solo en el backend real: `actividades_afectadas` ([], si el criterio
   *  de cálculo no cambió o la unidad no tenía actividades vinculadas). El
   *  mock no modela esta conversión, así que ahí siempre queda vacío. */
  actividadesAfectadas: ActividadAfectada[]
}

interface UpdateUnidadRealRow {
  fn_unidad_actualizar: number
  actividades_afectadas?: ActividadAfectada[]
}

/**
 * `PUT /planeador/unidades/:id` (confirmado real) — pese al verbo, el
 * backend lo trata como PATCH parcial: campo ausente preserva el valor
 * actual. Por eso `FK_TGRADO`/`FK_TASIGNATURA` solo se mandan si el
 * docente re-eligió grado/asignatura en este form (`gradoId`/`asignaturaId`
 * resueltos) — si no los tocó, se omiten y el backend conserva lo que la
 * unidad ya tenía, en vez de mandar un id viejo/adivinado.
 */
async function updateUnidad({ unidadId, data }: UpdateUnidadInput): Promise<UpdateUnidadResponse> {
  if (env.ENABLE_API_MOCKING) {
    const result = await api.put<Omit<UpdateUnidadResponse, "actividadesAfectadas">>(
      `/eval-col/planeador/unidades/${unidadId}`,
      data,
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
  // NO se manda `FK_TLV_INSTRUMENTO_EVALUACION`: desde el backend real (sso
  // V488) esa columna de `TUNIDAD` ya no existe — el instrumento de la
  // unidad se deriva de sus actividades vinculadas (solo lectura, ver
  // `UnidadDetallePanel`). `PUT /planeador/unidades/:id` descarta ese campo
  // en silencio si se lo manda; se dejó de intentar por completo.
  //
  // `ENUNCIADOS` (sso V492): reemplazo COMPLETO de los enunciados
  // relacionados a la unidad — se desactivan los que no vienen en el array
  // y se relacionan/reactivan los que sí, en una sola llamada. Antes de
  // V492 el PUT no aceptaba esta lista y editar una unidad ya creada solo
  // podía SACAR enunciados (uno por uno, `PATCH .../unidades/enunciados/
  // :pkRelacion`) — agregar uno nuevo desde el picker de "Derechos Básicos
  // de Aprendizaje" al editar se perdía en silencio (ver
  // `planeador-editar-unidad-page.tsx`). `data.enunciadosDba` siempre es un
  // array (nunca `undefined`, ver `UNIDAD_DRAFT_VACIO`), así que se manda
  // tal cual: un array vacío es una desvinculación total válida.
  body.ENUNCIADOS = data.enunciadosDba.map((enunciado) => enunciado.id)
  const row = await api.put<UpdateUnidadRealRow>(`/eval-col/planeador/unidades/${unidadId}`, body)
  return { status: "ok", actividadesAfectadas: row.actividades_afectadas ?? [] }
}

interface UseUpdateUnidadOptions {
  mutationConfig?: MutationConfig<typeof updateUnidad>
}

/**
 * Edita los campos de "Información general" de una unidad. Invalida el
 * detalle (el panel muestra los datos nuevos) y el listado (el nombre/área
 * de la card del rail también pueden haber cambiado).
 */
export function useUpdateUnidad({ mutationConfig }: UseUpdateUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateUnidad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidad.detalle(variables.unidadId) })
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidades.all })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
