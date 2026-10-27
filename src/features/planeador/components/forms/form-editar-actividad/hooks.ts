import { useEffect, useRef } from "react"
import { useSelector } from "@tanstack/react-form"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import {
  useConfiguracionActividadQuery,
  useConfiguracionContextoActividadQuery,
} from "@/features/planeador/api/query/use-configuracion-actividad-query"
import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"
import { ROTULO_ACTIVIDAD_FALLBACK, rotuloEnMinuscula } from "@/features/planeador/api/query/use-rotulo-actividad-query"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import { type CampoRecuperacion, erroresRecuperacion } from "@/features/planeador/lib/recuperacion-faltantes"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"

export function useErrorObligatorio(form: FormActividad, vacio: boolean): boolean {
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  return submissionAttempts > 0 && vacio
}

export const ERROR_OBLIGATORIO = [{ message: "Este campo es obligatorio." }]

export function useErrorRecuperacion(form: FormActividad, campo: CampoRecuperacion): string | undefined {
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  const rotuloLower = useSelector(form.store, (state) =>
    rotuloEnMinuscula(state.values.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK),
  )
  const error = useSelector(form.store, (state) => erroresRecuperacion(state.values, rotuloLower)[campo])
  return submissionAttempts > 0 ? error : undefined
}

/** Grado + Asignatura elegidos (por id): habilita el resto del form. */
export function useHasGradoAsignatura(form: FormActividad): boolean {
  const gradoId = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  return gradoId != null && asignaturaId != null
}

/**
 * `true` cuando la recuperación hereda de otra actividad (`destino = ACTIVIDAD` con origen
 * elegido): Grado/Grupo, Asignatura, Unidad, Nombre y "¿Es sumativa?" quedan bloqueados (heredados);
 * estudiantes, recursos, fechas e instrumento siguen editables.
 */
export function useRecuperacionBloqueaCampos(form: FormActividad): boolean {
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  const destino = useSelector(form.store, (state) => state.values.recuperacionDestino)
  const recuperacionActividadId = useSelector(form.store, (state) => state.values.recuperacionActividadId)
  return esRecuperacion && destino === "ACTIVIDAD" && recuperacionActividadId != null
}

/**
 * Al elegir la actividad a recuperar copia Grado/Grupo, Asignatura, Nombre (+ " (R)") y
 * estudiantes. `aplicadoRef` evita volver a pisarlos en cada render con el mismo origen.
 */
export function useRecuperacionAutoFill(form: FormActividad) {
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  const destino = useSelector(form.store, (state) => state.values.recuperacionDestino)
  const recuperacionActividadId = useSelector(form.store, (state) => state.values.recuperacionActividadId)
  const activo = esRecuperacion && destino === "ACTIVIDAD" && recuperacionActividadId != null
  const { data: original } = useActividadDetalleQuery(activo ? recuperacionActividadId : undefined)
  // Con el origen ya guardado no se copia al abrir: pisaría lo editado y ensuciaría el form.
  const aplicadoRef = useRef<number | undefined>(form.options.defaultValues?.recuperacionActividadId)

  useEffect(() => {
    if (!activo || !original) return
    if (aplicadoRef.current === recuperacionActividadId) return
    aplicadoRef.current = recuperacionActividadId
    form.setFieldValue("gradoId", original.gradoId)
    form.setFieldValue("grado", original.grado)
    form.setFieldValue("grupoId", original.grupoId)
    form.setFieldValue("grupo", original.grupo)
    form.setFieldValue("asignaturaId", original.asignaturaId)
    form.setFieldValue("asignatura", original.asignatura)
    form.setFieldValue("nombre", `${original.nombre} (R)`)
    // Solo quedan marcados los estudiantes que ya tenía la actividad original.
    form.setFieldValue("matriculasIds", original.matriculasIds)
    form.setFieldValue("asignarTodoElGrupo", false)
  }, [activo, recuperacionActividadId, original, form])
}

/**
 * `campos_disponibles.evaluacion` ya viene resuelto por el backend y manda sobre cualquier
 * derivación en el cliente. Se calcula una vez porque `esFormativa` también apaga Adaptaciones y Seguimiento.
 */
export function useCamposEvaluacionEfectivos(
  form: FormActividad,
  camposDisponibles: Actividad["camposDisponibles"],
  actividadUnidadId: number,
) {
  const unidadIdRaw = useSelector(form.store, (state) => state.values.unidad.id)
  const unidadId = unidadIdRaw || undefined
  const gradoId = useSelector(form.store, (state) => state.values.gradoId)
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  const esEvaluativaValue = useSelector(form.store, (state) => state.values.esEvaluativa)

  // La foto solo aplica mientras la unidad sea la misma con la que se tomó.
  const camposDisponiblesAplica = camposDisponibles != null && (unidadId ?? 0) === actividadUnidadId

  // Con Grado/Asignatura vaciados la foto ya no aplica.
  const sinGradoNiAsignatura = gradoId == null && asignaturaId == null
  // Sin unidad ni foto vigente se resuelve en vivo por grado/asignatura.
  const sinUnidadNiDetalle = unidadId == null && !camposDisponiblesAplica
  // Con unidad se resuelve en vivo por `useConfiguracionActividadQuery`.
  const { data: configuracionEnVivo } = useConfiguracionActividadQuery(
    !camposDisponiblesAplica && unidadId != null ? unidadId : undefined,
    esEvaluativaValue,
  )
  // Se pide siempre con `ES_EVALUATIVA=S` para obtener "¿el referente es evaluativo?" puro:
  // con el `false` actual del toggle, nunca se podría volver a "Sí".
  const { data: configuracionReferente } = useConfiguracionActividadQuery(unidadId, true)
  const { data: referenteDeGradoAsignatura } = useReferenteCurricularQuery(
    sinUnidadNiDetalle ? gradoId : undefined,
    sinUnidadNiDetalle ? asignaturaId : undefined,
  )
  // `campos_disponibles` para una actividad sin unidad (huérfana o recuperación autocompletada).
  const { data: configuracionContexto } = useConfiguracionContextoActividadQuery(
    sinUnidadNiDetalle ? grupoId : undefined,
    sinUnidadNiDetalle ? asignaturaId : undefined,
    esEvaluativaValue,
  )

  // `TIPO_EVALUACION` del referente: decide qué tipos de escala admite `EscalaValoracionSection`.
  const { data: unidadReferente } = useUnidadReferenteQuery(unidadId)
  const tipoEvaluacion =
    unidadId != null ? (unidadReferente?.tipoEvaluacion ?? null) : (referenteDeGradoAsignatura?.tipoEvaluacion ?? null)

  // Fuente efectiva: la foto si sigue aplicando, si no la configuración en vivo.
  const camposEfectivos = camposDisponiblesAplica
    ? camposDisponibles
    : unidadId != null
      ? configuracionEnVivo
      : configuracionContexto

  // `esFormativa` nunca sale de `camposEfectivos`: varía con el toggle actual.
  const esFormativa =
    unidadId != null
      ? configuracionReferente != null && configuracionReferente.evaluacion.visible === false
      : !sinGradoNiAsignatura && (referenteDeGradoAsignatura?.esFormativo ?? false)

  return { camposEfectivos, esFormativa, tipoEvaluacion }
}
