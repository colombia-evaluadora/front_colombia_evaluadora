import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

import { actividadesQueryKey } from "@/features/planeador/api/query/use-actividades-query"
import { resolveTipoActividadId } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import { resolveInstrumentoEvaluacionId } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import type { Actividad } from "@/features/planeador/api/types/actividad"

/**
 * `POST /planeador/actividades` (confirmado real, colección Postman
 * `planeador-guia-completa`). Obligatorios reales: TITULO, FK_TASIGNATURA,
 * FK_TLV_TIPO_ACTIVIDAD, FK_TLV_JERARQUIA. La UNIDAD es opcional
 * (`FK_TUNIDAD`) — sin ella la actividad nace "huérfana".
 *
 * `FK_TLV_JERARQUIA` queda fijo en 439 ("Actividad"): "Criterio" (440) solo
 * tiene sentido dentro del referente curricular (enunciados/evidencias),
 * que todavía no está cableado en el front — cuando se aborde esa fase, acá
 * se agrega el select de las dos opciones.
 *
 * Fuera de alcance por ahora (necesitan sus propios endpoints — 4.8/4.9 —
 * y el segundo depende del referente): ADAPTACIONES, CRITERIOS.
 * `MATERIALES` tampoco viaja acá: tiene su propia ruta de reemplazo
 * completo (`useUpdateMaterialesActividad`, `update-materiales-actividad.ts`)
 * que el caller llama DESPUÉS de crear, ya con el id real (mismo criterio
 * que `EVIDENCIAS` nuevas al editar en `planeador-editar-actividad-page.tsx`).
 * `ASIGNAR_TODO_EL_GRUPO`/`FK_TMATRICULAS` (asignación de estudiantes): ver
 * `Actividad.matriculasIds` — el campo "Estudiantes" del form.
 *
 * `EVIDENCIAS` (ids de nivel 2 del referente curricular de la unidad, ver
 * `use-unidad-referente-query.ts`) SÍ viaja acá — confirmado por la
 * colección Postman `planeador-flujo-unidad-actividad`, paso 7, que la
 * manda directo en este mismo body junto con `FK_TUNIDAD`.
 */
interface CreateActividadResponse {
  /** PK real de la actividad recién creada — lo necesita el caller para
   *  guardar los materiales de apoyo en un segundo paso (ver arriba). */
  id: number
}

async function createActividad(actividad: Actividad): Promise<CreateActividadResponse> {
  if (env.ENABLE_API_MOCKING) {
    const created = await api.post<Actividad>("/eval-col/planeador/actividades", actividad)
    return { id: created.id }
  }
  if (actividad.gradoId == null || actividad.grupoId == null || actividad.asignaturaId == null) {
    throw new Error("Elegí grado, grupo y asignatura antes de guardar.")
  }
  const tipoActividadId = await resolveTipoActividadId(actividad.tipo)
  const body: Record<string, unknown> = {
    TITULO: actividad.nombre,
    FK_TASIGNATURA: actividad.asignaturaId,
    FK_TGRUPO: actividad.grupoId,
    FK_TLV_TIPO_ACTIVIDAD: tipoActividadId,
    // 439 = "Actividad" (TIPO_JERARQUIA_ACTIVIDAD) — ver nota arriba.
    FK_TLV_JERARQUIA: 439,
    ES_EVALUATIVA: actividad.esEvaluativa ? "S" : "N",
    FECHA_INICIO: actividad.fechaInicio,
    FECHA_CIERRE: actividad.fechaCierre,
    MATERIAL_REQUERIDO: actividad.materiales,
  }
  // "Estudiantes" (mutuamente excluyentes, ver el comentario de
  // `Actividad.matriculasIds`): sin ninguno elegido a mano, todo el grupo
  // — mismo comportamiento que antes de que existiera este campo.
  if (actividad.matriculasIds.length > 0) {
    body.FK_TMATRICULAS = actividad.matriculasIds
  } else {
    body.ASIGNAR_TODO_EL_GRUPO = true
  }
  if (actividad.unidad.id !== 0) {
    body.FK_TUNIDAD = actividad.unidad.id
    if (actividad.evidenciasIds.length > 0) {
      body.EVIDENCIAS = actividad.evidenciasIds
    }
  }
  // Alternativos, no coexisten (ver el comentario de `Actividad.notaMaxima`):
  // `PONDERACION` cuando la unidad calcula por "Ponderado", `NOTA_MAXIMA`
  // cuando calcula por "Suma de puntos" — con "Promedio simple" ninguno de
  // los dos se manda. El form ya solo deja cargado el que corresponde (ver
  // el `onValueChange` de "Unidad temática asociada" en
  // `form-editar-actividad.tsx`), así que acá alcanza con mirar cuál trae
  // valor.
  if (actividad.esEvaluativa && actividad.notaMaxima != null) {
    body.NOTA_MAXIMA = actividad.notaMaxima
  } else if (actividad.esEvaluativa && actividad.ponderacion > 0) {
    body.PONDERACION = actividad.ponderacion
  }
  // Necesario ANTES de poder definir la estructura del instrumento
  // (`PUT .../instrumento`, `update-instrumento-actividad.ts`): ese endpoint
  // exige que `TACTIVIDAD.FK_TLV_INSTRUMENTO_EVALUACION` ya coincida con lo
  // que se está definiendo (400/22023 si no calza).
  if (actividad.esEvaluativa) {
    const instrumentoId = await resolveInstrumentoEvaluacionId(actividad.instrumento)
    if (instrumentoId != null) body.FK_TLV_INSTRUMENTO_EVALUACION = instrumentoId
  }
  // El motor devuelve `{"rows":[{"<nombre_función>": <pk>}]}` — el pk es el
  // primer (y único) campo de la fila (mismo contrato que `POST /unidades`,
  // confirmado en la colección Postman `planeador-flujo-unidad-actividad`).
  const row = await evalCol.postRow<Record<string, number>>("/planeador/actividades", body)
  const [pk] = Object.values(row)
  if (pk == null) throw new Error("La creación de la actividad no devolvió su identificador.")
  return { id: pk }
}

interface UseCreateActividadOptions {
  mutationConfig?: MutationConfig<typeof createActividad>
}

export function useCreateActividad({ mutationConfig }: UseCreateActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: createActividad,
    onSuccess: (...args) => {
      // Invalida el listado para que la nueva actividad aparezca al volver
      // al Planeador (mismo criterio que `useCreateReservation`).
      queryClient.invalidateQueries({ queryKey: actividadesQueryKey() })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
