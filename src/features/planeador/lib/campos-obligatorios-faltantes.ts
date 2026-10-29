import type { Actividad } from "@/features/planeador/api/types/actividad"
import { ROTULO_ACTIVIDAD_FALLBACK, rotuloEnMinuscula } from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { esEstudianteDeLaActividad } from "@/features/planeador/lib/adaptacion-estudiantes"
import { recuperacionFaltantes } from "@/features/planeador/lib/recuperacion-faltantes"
import { plainTextInvalidChars } from "@/lib/text-input"

/**
 * Tope de "Observaciones del docente" (Seguimiento). La columna es
 * `TACTIVIDAD.OBSERVACIONES_DOCENTE VARCHAR(4000)` y el backend no valida el
 * largo (`fn_actividad_crear/actualizar`); el form ya acotaba a 500 y se mantiene.
 */
export const OBSERVACIONES_DOCENTE_MAX = 500

/** Seguimiento en pantalla: no Formativo y con al menos una adaptación. */
function seguimientoVisible(values: Actividad, esFormativa: boolean): boolean {
  return !esFormativa && (values.adaptaciones ?? []).length > 0
}

/**
 * Caracteres fuera de `PLAIN_TEXT_PUNCT_PATTERN` en "Observaciones del docente"
 * (texto libre del docente junto a "¿Genera evidencias?"). Oculto no se valida.
 */
export function observacionesCaracteresInvalidos(values: Actividad, esFormativa: boolean): string[] {
  if (!seguimientoVisible(values, esFormativa)) return []
  return plainTextInvalidChars(values.observaciones ?? "", { puntuacion: true })
}

/**
 * Campos obligatorios del form de actividad: los comparten el aviso y la marca
 * inline de cada campo. Lo que le falta al instrumento vive en `instrumento-faltantes.ts`.
 */
export interface CamposObligatoriosContexto {
  /** Solo se lee si el referente exige instrumento de evaluación. */
  camposEfectivos?: {
    evaluacion: { requerido: boolean }
    /** Solo se exige si existe en el form (`visible`, sumativa) y el backend lo pide (`requerido`). */
    ponderacion?: { visible: boolean; requerido: boolean; modo: string | null } | null
  } | null
  /** Referente Formativo: no hay Bloque 5 (instrumento) ni Seguimiento. */
  esFormativa: boolean
  /** El grupo elegido tiene matrículas Cursando. */
  grupoTieneEstudiantes: boolean
  /** Rótulo de asignatura del referente del grado; por defecto "Asignatura". */
  subjectLabel?: string
}

/**
 * Se destildó a todos los estudiantes. Se frena antes de guardar: al crear, la
 * lista vacía se manda como "todo el grupo". Sin estudiantes en el grupo no se exige.
 */
export function faltanEstudiantes(values: Actividad, grupoTieneEstudiantes: boolean): boolean {
  return (
    values.grupoId != null &&
    grupoTieneEstudiantes &&
    !values.asignarTodoElGrupo &&
    (values.matriculasIds ?? []).length === 0
  )
}

/**
 * "¿Genera evidencias? = Sí" pide el tipo. Regla del form, el backend no lo exige;
 * solo cuenta con Seguimiento en pantalla (no Formativo y con adaptaciones).
 */
export function faltaTipoEvidencia(values: Actividad, esFormativa: boolean): boolean {
  return seguimientoVisible(values, esFormativa) && values.generaEvidencias && !values.tipoEvidencia
}

/** Campos vacíos con su nombre en pantalla, en el orden del form. */
export function camposObligatoriosFaltantes(
  values: Actividad,
  { camposEfectivos, esFormativa, grupoTieneEstudiantes, subjectLabel = "Asignatura" }: CamposObligatoriosContexto,
): string[] {
  // Regla 13: el rótulo de la actividad, nunca "actividad" fija.
  const rotuloLower = rotuloEnMinuscula(values.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK)
  // "Es una recuperación" va primero en el form: sus campos encabezan la lista.
  const faltantes: string[] = recuperacionFaltantes(values, rotuloLower)
  if (values.grupoId == null) faltantes.push("Grado / Grupo")
  if (values.asignaturaId == null) faltantes.push(subjectLabel)
  if (faltanEstudiantes(values, grupoTieneEstudiantes)) faltantes.push(`Estudiantes de la ${rotuloLower}`)
  if (!values.nombre?.trim()) faltantes.push(`Nombre de la ${rotuloLower}`)
  if (!values.tipo) faltantes.push(`Tipo de ${rotuloLower}`)
  if (!values.fechaInicio) faltantes.push("Fecha inicio")
  if (!values.fechaCierre) faltantes.push("Fecha de entrega o cierre")
  if (!esFormativa && camposEfectivos?.evaluacion.requerido && !values.instrumento) {
    faltantes.push("Instrumento de evaluación")
  }
  // Mismas condiciones con las que `EvaluacionSection` muestra el campo: oculto no se exige.
  const ponderacion = camposEfectivos?.ponderacion
  if (!esFormativa && values.esEvaluativa && ponderacion?.visible && ponderacion.requerido) {
    if (ponderacion.modo === "PUNTAJE") {
      if (values.notaMaxima == null || Number.isNaN(values.notaMaxima)) faltantes.push("Puntaje")
    } else if (!(values.ponderacion > 0)) {
      faltantes.push("Ponderación (%)")
    }
  }
  // Regla 47: el backend rechaza "Estudiantes específicos" sin nadie, ya creada la actividad.
  ;(values.adaptaciones ?? []).forEach((adaptacion, i) => {
    if (
      adaptacion.aplicaA === "Estudiantes específicos" &&
      !adaptacion.estudiantesIds.some((id) => esEstudianteDeLaActividad(values, id))
    ) {
      faltantes.push(`Estudiantes de la adaptación ${i + 1}`)
    }
  })
  if (faltaTipoEvidencia(values, esFormativa)) faltantes.push("Tipo de evidencia")
  if (observacionesCaracteresInvalidos(values, esFormativa).length > 0) {
    faltantes.push("Observaciones del docente (caracteres no permitidos)")
  }
  return faltantes
}

/** "Otro" del catálogo se ve como instrumento personalizado. */
function nombreInstrumento(instrumento: string | undefined): string {
  if (!instrumento) return "Instrumento de evaluación"
  return instrumento === "Otro" ? "Instrumento personalizado" : instrumento
}

/**
 * Un solo aviso con todo lo que falta: la pantalla muestra uno a la vez. El
 * instrumento incompleto va en la lista y luego se detalla. `null` si no falta nada.
 */
export function avisoCamposObligatorios(
  campos: string[],
  instrumento: { nombre: string | undefined; faltantes: string[] },
): string | null {
  const conInstrumento = instrumento.faltantes.length > 0
  const nombre = nombreInstrumento(instrumento.nombre)
  const lista = conInstrumento ? [...campos, nombre] : campos
  if (lista.length === 0) return null
  const aviso = `Complete los campos obligatorios: ${lista.join(", ")}.`
  return conInstrumento ? `${aviso} ${nombre}: ${instrumento.faltantes.join(" ")}` : aviso
}
