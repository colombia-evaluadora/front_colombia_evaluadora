/**
 * Arma las sagas del planeador a partir de lo que el formulario guarda
 * (Fase 3). Copia el orden y las condiciones EXACTAS de los `handleSubmit`
 * de `planeador-crear-actividad-page.tsx` y
 * `planeador-editar-actividad-page.tsx` (P19): qué paso se manda y cuándo.
 */
import { newTmpId, type TmpId } from "@/lib/offline/outbox/tmp-id"
import type { SagaInput, SagaStepInput } from "@/lib/offline/outbox/saga"
import { OUTBOX_FILE_PREFIX } from "@/lib/offline/outbox/write-request"

import { tieneDefinicionInstrumento } from "@/features/planeador/api/mutations/update-instrumento-actividad"
import type { UnidadInfoGeneral } from "@/features/planeador/api/mutations/update-unidad"
import type { Actividad, Adaptacion, InstrumentoPermitido, Recurso } from "@/features/planeador/api/types/actividad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { adaptacionesConEstudiantesDeLaActividad } from "@/features/planeador/lib/adaptacion-estudiantes"
import { fingerprintActividad, fingerprintUnidad, versionCheckOf } from "@/features/planeador/offline/fingerprint"
import { SAGA_KINDS } from "@/features/planeador/offline/saga-handlers"

export const SAGA_LABELS = {
  crear: "Crear la actividad",
  unidad: "Unidad temática asociada",
  editar: "Datos de la actividad",
  materiales: "Materiales de apoyo",
  instrumento: "Instrumento de evaluación",
  estudiantes: "Estudiantes de la actividad",
  adaptaciones: "Adaptaciones curriculares",
  criterio: "Criterio de la unidad",
  unidadCrear: "Crear la unidad",
  unidadEditar: "Datos de la unidad",
} as const

async function blobUrlAFile(url: string, nombre: string): Promise<File> {
  const blob = await fetch(url).then((r) => r.blob())
  return new File([blob], nombre, { type: blob.type })
}

/**
 * Copia como `File` los adjuntos nuevos (URLs `blob:`, que mueren al
 * recargar) y los reemplaza por `outbox-file:<clave>`; el `File` viaja al
 * store `blobs` al encolar. Los ya guardados conservan su `archivoId`/
 * `fkTarchivo`: el PUT es de reemplazo total y omitirlos los borraría.
 */
export async function extraerArchivos(
  recursos: Recurso[],
  adaptaciones: Adaptacion[],
): Promise<{ recursos: Recurso[]; adaptaciones: Adaptacion[]; filesMateriales: Record<string, File>; filesAdaptaciones: Record<string, File> }> {
  const filesMateriales: Record<string, File> = {}
  const filesAdaptaciones: Record<string, File> = {}
  const recursosOut: Recurso[] = []
  for (const [i, recurso] of recursos.entries()) {
    if (recurso.tipo === "Archivo" && recurso.url.startsWith("blob:")) {
      const key = `rec-${i}`
      filesMateriales[key] = await blobUrlAFile(recurso.url, recurso.fuente || "archivo")
      recursosOut.push({ ...recurso, url: `${OUTBOX_FILE_PREFIX}${key}` })
    } else {
      recursosOut.push(recurso)
    }
  }
  const adaptacionesOut: Adaptacion[] = []
  for (const [i, adaptacion] of adaptaciones.entries()) {
    const archivos = []
    for (const [j, archivo] of (adaptacion.archivos ?? []).entries()) {
      if (archivo.fkTarchivo === undefined && archivo.blobUrl?.startsWith("blob:")) {
        const key = `ad-${i}-${j}`
        filesAdaptaciones[key] = await blobUrlAFile(archivo.blobUrl, archivo.nombre || "plantilla")
        archivos.push({ ...archivo, blobUrl: `${OUTBOX_FILE_PREFIX}${key}` })
      } else {
        archivos.push(archivo)
      }
    }
    adaptacionesOut.push({ ...adaptacion, archivos })
  }
  return { recursos: recursosOut, adaptaciones: adaptacionesOut, filesMateriales, filesAdaptaciones }
}

/** El instrumento no necesita recursos/adaptaciones (y así no viajan dos veces). */
function paraInstrumento(values: Actividad): Actividad {
  return { ...values, recursos: [], adaptaciones: [] }
}

export interface CrearActividadSaga extends SagaInput {
  sagaId: string
  tmpId: TmpId
}

export async function buildCrearActividadSaga(values: Actividad): Promise<CrearActividadSaga> {
  const sagaId = crypto.randomUUID()
  const tmpId = newTmpId()
  const adaptacionesBase = values.adaptaciones.length > 0 ? adaptacionesConEstudiantesDeLaActividad(values) : []
  const { recursos, adaptaciones, filesMateriales, filesAdaptaciones } = await extraerArchivos(values.recursos, adaptacionesBase)
  const steps: SagaStepInput[] = [
    { kind: SAGA_KINDS.actividadCrear, label: SAGA_LABELS.crear, payload: { tmpId, actividad: { ...values, recursos, adaptaciones } } },
  ]
  if (values.recursos.length > 0) {
    steps.push({
      kind: SAGA_KINDS.actividadMateriales,
      label: SAGA_LABELS.materiales,
      payload: { actividadId: tmpId, recursos },
      files: filesMateriales,
    })
  }
  if (values.esEvaluativa && tieneDefinicionInstrumento(values)) {
    steps.push({
      kind: SAGA_KINDS.actividadInstrumento,
      label: SAGA_LABELS.instrumento,
      payload: { actividadId: tmpId, actividad: paraInstrumento(values) },
    })
  }
  if (values.adaptaciones.length > 0) {
    steps.push({
      kind: SAGA_KINDS.actividadAdaptaciones,
      label: SAGA_LABELS.adaptaciones,
      payload: { actividadId: tmpId, adaptaciones },
      files: filesAdaptaciones,
    })
  }
  // Hermanos: cada criterio solo necesita la actividad (equivale al `allSettled`).
  for (const criterioUnidadId of values.criteriosUnidadIds) {
    steps.push({
      kind: SAGA_KINDS.actividadCriterio,
      label: SAGA_LABELS.criterio,
      payload: { actividadId: tmpId, criterioUnidadId },
      after: [0],
    })
  }
  return { sagaId, tmpId, target: `actividad:${tmpId}`, titulo: `Crear "${values.nombre || "actividad"}"`, steps }
}

export interface EditarActividadContexto {
  /** Detalle tal como lo vio el docente al abrir el formulario. */
  actividad: Actividad
  /** Unidades del docente (método de cálculo de la nueva unidad). */
  unidades: Pick<UnidadTematica, "id" | "metodoCalculo">[]
  instrumentosPermitidos?: InstrumentoPermitido[]
}

export async function buildEditarActividadSaga(
  values: Actividad,
  { actividad, unidades, instrumentosPermitidos }: EditarActividadContexto,
): Promise<SagaInput & { sagaId: string }> {
  const sagaId = crypto.randomUUID()
  const actividadId = actividad.id
  // Versión del servidor (BE-3B); la huella solo si el detalle no la trae.
  const check = versionCheckOf(actividad.version, () => fingerprintActividad(actividad))
  const steps: SagaStepInput[] = []
  const unidadAnteriorId = actividad.unidad.id
  const unidadNuevaId = values.unidad.id
  if (unidadNuevaId !== unidadAnteriorId) {
    const esPonderado = unidades.find((u) => u.id === unidadNuevaId)?.metodoCalculo === "Ponderado"
    steps.push({
      kind: SAGA_KINDS.actividadUnidad,
      label: SAGA_LABELS.unidad,
      payload: {
        actividadId,
        link:
          unidadNuevaId === 0
            ? null
            : {
                unidadId: unidadNuevaId,
                ponderacion: esPonderado ? values.ponderacion : 0,
                omitirPonderacion: !esPonderado,
                permitirMoverDeUnidad: unidadAnteriorId !== 0,
              },
      },
    })
  }

  const recursosCambiaron = JSON.stringify(values.recursos) !== JSON.stringify(actividad.recursos)
  const adaptacionesBase = adaptacionesConEstudiantesDeLaActividad(values)
  const adaptacionesCambiaron = JSON.stringify(adaptacionesBase) !== JSON.stringify(actividad.adaptaciones)
  const { recursos, adaptaciones, filesMateriales, filesAdaptaciones } = await extraerArchivos(
    recursosCambiaron ? values.recursos : [],
    adaptacionesCambiaron ? adaptacionesBase : [],
  )

  steps.push({ kind: SAGA_KINDS.actividadEditar, label: SAGA_LABELS.editar, payload: {
      actividadId,
      data: {
        ...values,
        recursos: recursosCambiaron ? recursos : values.recursos,
        adaptaciones: adaptacionesCambiaron ? adaptaciones : values.adaptaciones,
      },
    },
  })
  if (recursosCambiaron) {
    steps.push({
      kind: SAGA_KINDS.actividadMateriales,
      label: SAGA_LABELS.materiales,
      payload: { actividadId, recursos },
      files: filesMateriales,
    })
  }
  if (values.esEvaluativa && tieneDefinicionInstrumento(values)) {
    steps.push({
      kind: SAGA_KINDS.actividadInstrumento,
      label: SAGA_LABELS.instrumento,
      payload: { actividadId, actividad: paraInstrumento(values), instrumentosPermitidos },
    })
  }
  const estudiantesCambiaron =
    values.asignarTodoElGrupo !== actividad.asignarTodoElGrupo ||
    (!values.asignarTodoElGrupo &&
      JSON.stringify([...values.matriculasIds].sort((a, b) => a - b)) !==
        JSON.stringify([...actividad.matriculasIds].sort((a, b) => a - b)))
  if (estudiantesCambiaron) {
    steps.push({
      kind: SAGA_KINDS.actividadEstudiantes,
      label: SAGA_LABELS.estudiantes,
      payload: { actividadId, matriculasIds: values.matriculasIds, asignarTodoElGrupo: values.asignarTodoElGrupo },
    })
  }
  if (adaptacionesCambiaron) {
    steps.push({
      kind: SAGA_KINDS.actividadAdaptaciones,
      label: SAGA_LABELS.adaptaciones,
      payload: { actividadId, adaptaciones },
      files: filesAdaptaciones,
    })
  }
  // La verificación contra el servidor va en el PRIMER paso (antes de escribir nada).
  steps[0] = { ...steps[0], payload: { ...steps[0].payload, check } }
  return { sagaId, target: `actividad:${actividadId}`, titulo: `Editar "${values.nombre || actividad.nombre}"`, steps }
}

export function buildCrearUnidadSaga(data: UnidadInfoGeneral): SagaInput & { sagaId: string; tmpId: TmpId } {
  const tmpId = newTmpId()
  return {
    sagaId: crypto.randomUUID(),
    tmpId,
    target: `unidad:${tmpId}`,
    titulo: `Crear "${data.nombre || "unidad"}"`,
    steps: [{ kind: SAGA_KINDS.unidadCrear, label: SAGA_LABELS.unidadCrear, payload: { tmpId, data } }],
  }
}

export function buildEditarUnidadSaga(unidad: UnidadTematica, data: UnidadInfoGeneral): SagaInput & { sagaId: string } {
  return {
    sagaId: crypto.randomUUID(),
    target: `unidad:${unidad.id}`,
    titulo: `Editar "${data.nombre || unidad.nombre}"`,
    steps: [
      {
        kind: SAGA_KINDS.unidadEditar,
        label: SAGA_LABELS.unidadEditar,
        payload: { unidadId: unidad.id, data, check: versionCheckOf(unidad.version, () => fingerprintUnidad(unidad)) },
      },
    ],
  }
}
