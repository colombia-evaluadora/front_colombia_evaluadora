import { useMutation, useQueryClient } from "@tanstack/react-query"
import { writeConfig, type WriteRequest } from "@/lib/offline/outbox/write-request"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

import { invalidarListadosActividades } from "@/features/planeador/api/query/invalidar-listados-actividades"
import { resolveTipoActividadId } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import { resolveInstrumentoEvaluacionId } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import { resolveModalidadId } from "@/features/planeador/api/query/use-modalidad-catalog"
import { resolveTipoEvidenciaId } from "@/features/planeador/api/query/use-tipo-evidencia-catalog"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import { toRecuperacionBody } from "@/features/planeador/api/mutations/recuperacion-body"

/**
 * `FK_TLV_JERARQUIA` fijo en 439 ("Actividad"); 440 ("Criterio") llega con el referente curricular.
 * Materiales, adaptaciones y criterios van por sus rutas propias, después de crear con el id real.
 */
interface CreateActividadResponse {
  /** PK de la actividad creada; el caller la usa para guardar materiales. */
  id: number
}

export async function createActividad(actividad: Actividad, req?: WriteRequest): Promise<CreateActividadResponse> {
  if (env.ENABLE_API_MOCKING) {
    const created = await api.post<Actividad>("/eval-col/planeador/actividades", actividad, writeConfig(req))
    return { id: created.id }
  }
  if (actividad.gradoId == null || actividad.grupoId == null || actividad.asignaturaId == null) {
    throw new Error("Elegí grado, grupo y asignatura antes de guardar.")
  }
  const [tipoActividadId, tipoEvidenciaId, modalidadId, instrumentoId, recuperacion] = await Promise.all([
    resolveTipoActividadId(actividad.tipo),
    actividad.tipoEvidencia ? resolveTipoEvidenciaId(actividad.tipoEvidencia) : undefined,
    actividad.modalidad ? resolveModalidadId(actividad.modalidad) : undefined,
    actividad.esEvaluativa ? resolveInstrumentoEvaluacionId(actividad.instrumento) : undefined,
    actividad.esEvaluativa && actividad.esRecuperacion && actividad.recuperacionDestino ? toRecuperacionBody(actividad) : undefined,
  ])
  const body: Record<string, unknown> = {
    TITULO: actividad.nombre,
    DESCRIPCION: actividad.descripcion ?? "",
    FK_TASIGNATURA: actividad.asignaturaId,
    FK_TGRUPO: actividad.grupoId,
    FK_TLV_TIPO_ACTIVIDAD: tipoActividadId,
    // 439 = "Actividad" (TIPO_JERARQUIA_ACTIVIDAD).
    FK_TLV_JERARQUIA: 439,
    ES_EVALUATIVA: actividad.esEvaluativa ? "S" : "N",
    FECHA_INICIO: actividad.fechaInicio,
    FECHA_CIERRE: actividad.fechaCierre,
    MATERIAL_REQUERIDO: actividad.materiales,
    // Convención "S"/"N": el backend castea a `bool_sn`.
    GENERA_EVIDENCIAS: actividad.generaEvidencias ? "S" : "N",
    REQUIERE_VALIDACION_COORDINADOR: actividad.requiereValidacion ? "S" : "N",
    OBSERVACIONES_DOCENTE: actividad.observaciones,
  }
  // Catálogos best-effort: si no resuelven, se omite el campo en vez de arriesgar un valor rechazado.
  if (actividad.tipoEvidencia) {
    if (tipoEvidenciaId != null) body.FK_TLV_TIPO_EVIDENCIA = tipoEvidenciaId
  }
  // Solo el instrumento personalizado ("Otro") tiene estos campos.
  if (actividad.instrumento === "Otro") {
    const { instrumentoPersonalizado } = actividad
    body.REQUIERE_ARCHIVO = instrumentoPersonalizado.requiereArchivo ? "S" : "N"
    body.REQUIERE_TEXTO = instrumentoPersonalizado.requiereRespuestaTexto ? "S" : "N"
    if (instrumentoPersonalizado.descripcion) body.DESCRIPCION_INSTRUMENTO = instrumentoPersonalizado.descripcion
  }
  // `SEMANA_CRONOGRAMA` va tal cual: admite número o rango ("10-12").
  if (actividad.duracionEstimada) body.DURACION_ESTIMADA = Number(actividad.duracionEstimada)
  if (actividad.semana) body.SEMANA_CRONOGRAMA = actividad.semana
  if (actividad.modalidad) {
    if (modalidadId != null) body.FK_TLV_MODALIDAD = modalidadId
  }
  // Mutuamente excluyentes: sin estudiantes elegidos se asigna todo el grupo.
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
  // `PONDERACION` y `NOTA_MAXIMA` son excluyentes (según el cálculo de la unidad); el form deja solo uno.
  if (actividad.esEvaluativa && actividad.notaMaxima != null) {
    body.NOTA_MAXIMA = actividad.notaMaxima
  } else if (actividad.esEvaluativa && actividad.ponderacion > 0) {
    body.PONDERACION = actividad.ponderacion
  }
  // Debe ir antes de `PUT .../instrumento`: ese endpoint exige que el instrumento ya coincida (400/22023).
  if (actividad.esEvaluativa) {
    if (instrumentoId != null) body.FK_TLV_INSTRUMENTO_EVALUACION = instrumentoId
  }
  // El backend exige `fkActividadRecuperar`/`valorPonderacion` según destino/cálculo; sin
  // `recuperacionDestino` (catálogos no expuestos) se omite para no mandar un JSONB incompleto.
  if (actividad.esEvaluativa && actividad.esRecuperacion && actividad.recuperacionDestino) {
    body.RECUPERACION = recuperacion
  }
  // El motor devuelve `{rows:[{<función>: pk}]}`: el pk es el único campo de la fila.
  const row = await evalCol.postRow<Record<string, number>>("/planeador/actividades", body, writeConfig(req))
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
    mutationFn: (actividad: Actividad) => createActividad(actividad),
    onSuccess: (...args) => {
      invalidarListadosActividades(queryClient)
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
