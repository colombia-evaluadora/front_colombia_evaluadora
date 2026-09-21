import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

import { actividadesQueryKey } from "@/features/planeador/api/query/use-actividades-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { resolveTipoActividadId } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import { resolveInstrumentoEvaluacionId } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import { resolveModalidadId } from "@/features/planeador/api/query/use-modalidad-catalog"
import type { Actividad } from "@/features/planeador/api/types/actividad"

interface UpdateActividadInput {
  actividadId: number
  data: Actividad
}

/**
 * `PUT /planeador/actividades/:id` (confirmado real) — igual que en unidad,
 * el PUT es parcial: campo ausente preserva el valor actual. Por eso
 * `FK_TGRUPO`/`FK_TASIGNATURA` solo se mandan si el docente re-eligió
 * grado/grupo/asignatura en este form (`gradoId`/`grupoId`/`asignaturaId`
 * resueltos) — si no los tocó, se omiten.
 *
 * No toca `FK_TUNIDAD`: reasignar la unidad de la actividad se resuelve
 * ANTES de llamar a este mutation, en `handleSubmit` de
 * `planeador-editar-actividad-page.tsx`, contra las rutas dedicadas
 * (`useLinkActividadUnidad`/`useUnlinkActividadUnidad`) — son las únicas que
 * conocen la `ponderacion` que exige esa unidad. Mandar `FK_TUNIDAD` acá
 * también duplicaba la escritura y el backend terminaba validando la
 * `PONDERACION` de esta actividad (el peso en la nota final, campo
 * distinto) contra la unidad recién vinculada, con 400 de por medio.
 *
 * Tampoco toca "Estudiantes": `FK_TMATRICULAS`/`ASIGNAR_TODO_EL_GRUPO`
 * tienen su propio endpoint suelto (`PUT .../estudiantes`, ver
 * `set-estudiantes-actividad.ts`) documentado junto con evidencias/
 * criterios/materiales/adaptaciones como "cambios puntuales" — antes se
 * mandaba `FK_TMATRICULAS` acá mismo, pero por ese camino nunca se podía
 * mandar `ASIGNAR_TODO_EL_GRUPO` (no había forma de volver una actividad a
 * "todo el grupo" después de haberla puntualizado).
 *
 * Mismo alcance acotado que `create-actividad.ts` fuera de esto: no toca
 * materiales, adaptaciones, evidencias ni criterios.
 */
async function updateActividad({ actividadId, data }: UpdateActividadInput): Promise<unknown> {
  if (env.ENABLE_API_MOCKING) {
    return api.put(`/eval-col/planeador/actividades/${actividadId}`, data)
  }
  const body: Record<string, unknown> = {
    TITULO: data.nombre,
    ES_EVALUATIVA: data.esEvaluativa ? "S" : "N",
    FECHA_INICIO: data.fechaInicio,
    FECHA_CIERRE: data.fechaCierre,
    MATERIAL_REQUERIDO: data.materiales,
    // Mismo arreglo que `create-actividad.ts`: "Seguimiento" se capturaba
    // pero nunca viajaba en el PUT.
    GENERA_EVIDENCIAS: data.generaEvidencias ? "S" : "N",
    OBSERVACIONES_DOCENTE: data.observaciones,
  }
  // Mismo arreglo que `create-actividad.ts`: se capturaban en el form pero
  // nunca viajaban en el PUT.
  if (data.duracionEstimada) body.DURACION_ESTIMADA = Number(data.duracionEstimada)
  if (data.semana) body.SEMANA_CRONOGRAMA = data.semana
  // Ver el comentario de `resolveModalidadId`: categoría sin confirmar
  // contra el backend real, best-effort.
  if (data.modalidad) {
    const modalidadId = await resolveModalidadId(data.modalidad)
    if (modalidadId != null) body.FK_TLV_MODALIDAD = modalidadId
  }
  if (data.grupoId != null) body.FK_TGRUPO = data.grupoId
  if (data.asignaturaId != null) body.FK_TASIGNATURA = data.asignaturaId
  const tipoActividadId = await resolveTipoActividadId(data.tipo)
  if (tipoActividadId != null) body.FK_TLV_TIPO_ACTIVIDAD = tipoActividadId
  // Alternativos, no coexisten (ver el comentario de `Actividad.notaMaxima`
  // y el mismo branch en `create-actividad.ts`): `NOTA_MAXIMA` cuando la
  // unidad calcula por "Suma de puntos", `PONDERACION` cuando calcula por
  // "Ponderado" — el form ya deja cargado solo el que corresponde.
  if (data.esEvaluativa && data.notaMaxima != null) body.NOTA_MAXIMA = data.notaMaxima
  else if (data.esEvaluativa && data.ponderacion > 0) body.PONDERACION = data.ponderacion
  // Necesario ANTES de poder (re)definir la estructura del instrumento
  // (`PUT .../instrumento`, `update-instrumento-actividad.ts`): ese endpoint
  // exige que `TACTIVIDAD.FK_TLV_INSTRUMENTO_EVALUACION` ya coincida con lo
  // que se está definiendo (400/22023 si no calza).
  if (data.esEvaluativa) {
    const instrumentoId = await resolveInstrumentoEvaluacionId(data.instrumento)
    if (instrumentoId != null) body.FK_TLV_INSTRUMENTO_EVALUACION = instrumentoId
  }
  // `REQUIERE_ARCHIVO`/`REQUIERE_TEXTO`/`DESCRIPCION_INSTRUMENTO` — mismo
  // nombre confirmado que `create-actividad.ts` (ver su comentario), solo
  // aplican con el instrumento personalizado ("Otro").
  if (data.instrumento === "Otro") {
    const { instrumentoPersonalizado } = data
    body.REQUIERE_ARCHIVO = instrumentoPersonalizado.requiereArchivo ? "S" : "N"
    body.REQUIERE_TEXTO = instrumentoPersonalizado.requiereRespuestaTexto ? "S" : "N"
    if (instrumentoPersonalizado.descripcion) body.DESCRIPCION_INSTRUMENTO = instrumentoPersonalizado.descripcion
  }
  // `RECUPERACION` (configurarla) y `QUITAR_RECUPERACION` (volverla a
  // normal) son excluyentes — mismo contrato que `p_recuperacion`/
  // `p_quitar_recuperacion` de `fn_actividad_actualizar`. `recuperacionDestino`
  // solo llega lleno si el backend ya expone los catálogos
  // (`campos_disponibles.recuperacion`, ver `RecuperacionSection` — todavía
  // no desplegado en producción a la fecha de este comentario, confirmado
  // contra una respuesta real de `GET .../configuracion-actividad`).
  //
  // NUNCA se manda `QUITAR_RECUPERACION` sin esa prueba de que el backend
  // soporta el parámetro: mandarlo siempre que `esRecuperacion` sea `false`
  // (el caso de la inmensa mayoría de las actividades, que no son
  // recuperación) rompía el PUT general de CUALQUIER actividad mientras el
  // backend no reconociera ese parámetro — no solo el flujo de recuperación.
  if (data.esEvaluativa && data.esRecuperacion && data.recuperacionDestino) {
    body.RECUPERACION = {
      destino: data.recuperacionDestino,
      fkActividadRecuperar: data.recuperacionActividadId,
      tipoAplicacion: data.recuperacionTipoAplicacion,
      // Regla `tipoCalculoOcultoSi` de `campos_disponibles.recuperacion.
      // reglas`: con REEMPLAZAR el campo se omite del todo (no se manda
      // `""`) — la guía dice "si no viene se guarda PROMEDIADO", no "si
      // viene vacío"; un string vacío no es un valor del catálogo y el
      // backend podría rechazarlo en vez de aplicar el default.
      tipoCalculo:
        data.recuperacionTipoAplicacion === "REEMPLAZAR" ? undefined : data.recuperacionTipoCalculo,
      valorPonderacion: data.recuperacionValorPonderacion,
    }
  }
  return api.put(`/eval-col/planeador/actividades/${actividadId}`, body)
}

interface UseUpdateActividadOptions {
  mutationConfig?: MutationConfig<typeof updateActividad>
}

export function useUpdateActividad({ mutationConfig }: UseUpdateActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateActividad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: actividadDetalleQueryKey(variables.actividadId) })
      queryClient.invalidateQueries({ queryKey: actividadesQueryKey() })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
