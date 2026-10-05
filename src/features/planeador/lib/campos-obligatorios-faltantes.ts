import type { Actividad } from "@/features/planeador/api/types/actividad"
import { ROTULO_ACTIVIDAD_FALLBACK, rotuloEnMinuscula } from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { esEstudianteDeLaActividad } from "@/features/planeador/lib/adaptacion-estudiantes"

/**
 * Reglas de "campo obligatorio" del form Crear/Editar actividad
 * (`form-editar-actividad.tsx`), en funciones puras (sin hooks) para que las
 * compartan el aviso de "Complete los campos obligatorios" (lista de nombres)
 * y la marca roja inline de cada campo (`data-invalid` + `FieldError`) — una
 * sola regla, nunca dos versiones que se desincronicen — y para poder
 * testearlas.
 *
 * La definición del instrumento de evaluación (criterios de la rúbrica,
 * ítems de la lista de cotejo, niveles de la escala…) NO va acá: vive en
 * `instrumento-faltantes.ts` (espejo de los validadores de sso V496.5) y se
 * une a este aviso en `avisoCamposObligatorios`.
 */
export interface CamposObligatoriosContexto {
  /** `camposEfectivos` de `useCamposEvaluacionEfectivos`: solo se lee si el
   *  referente exige elegir instrumento de evaluación. */
  camposEfectivos?: { evaluacion: { requerido: boolean } } | null
  /** Referente Formativo: no hay Bloque 5 (instrumento) ni Seguimiento. */
  esFormativa: boolean
  /** El grupo elegido tiene matrículas en estado Cursando (el padrón de
   *  `useActividadMatriculasGrupoQuery` no está vacío). */
  grupoTieneEstudiantes: boolean
}

/**
 * "Estudiantes de la {rótulo}" quedó en "Ningún estudiante": el docente
 * destildó a todos (`asignarTodoElGrupo: false` + `matriculasIds` vacío).
 *
 * El backend exige al menos un estudiante cuando el grupo tiene a quién
 * asignar (sso V496.1 `fn_actividad_validar_estudiantes_minimo`, llamada al
 * crear y al cambiar los estudiantes, V496.2). Al EDITAR el front manda la
 * lista vacía tal cual (`set-estudiantes-actividad.ts`) y el backend la
 * rechaza DESPUÉS de guardar el resto de la actividad; al CREAR,
 * `create-actividad.ts` convierte la lista vacía en `ASIGNAR_TODO_EL_GRUPO`
 * y la actividad terminaba asignada a todo el grupo, justo lo contrario de lo
 * que mostraba el campo. En los dos casos hay que frenarlo antes.
 *
 * Sin estudiantes en el grupo no hay a quién elegir: el backend lo deja
 * pasar y acá tampoco se exige.
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
 * "Tipo de evidencia" de la sección Seguimiento. El backend no lo exige
 * (`FK_TLV_TIPO_EVIDENCIA` es opcional, sso V496.1 `fn_actividad_validar_
 * catalogo` deja pasar `NULL`), pero es regla del formulario: "¿Genera
 * evidencias? = Sí" sin decir de qué tipo no tiene sentido (el campo solo se
 * habilita con Sí). Solo aplica mientras Seguimiento está en pantalla
 * (`SeguimientoSection`: referente no Formativo y al menos una adaptación);
 * una sección oculta nunca bloquea el guardado. "¿Requiere validación del
 * coordinador?" y "¿Genera evidencias?" siempre tienen valor (Sí/No) y
 * "Observaciones del docente" es opcional.
 */
export function faltaTipoEvidencia(values: Actividad, esFormativa: boolean): boolean {
  const seguimientoVisible = !esFormativa && (values.adaptaciones ?? []).length > 0
  return seguimientoVisible && values.generaEvidencias && !values.tipoEvidencia
}

/** Campos obligatorios vacíos, con el nombre que se ve en pantalla y en el
 *  orden en que aparecen en el form. */
export function camposObligatoriosFaltantes(
  values: Actividad,
  { camposEfectivos, esFormativa, grupoTieneEstudiantes }: CamposObligatoriosContexto,
): string[] {
  // Usa el rótulo que ya trae `values` de la actividad original, no el live
  // de `useRotuloActividadQuery` que sí leen los `<FieldLabel>` — mismo
  // criterio, nunca "actividad" fija.
  const rotuloLower = rotuloEnMinuscula(values.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK)
  const faltantes: string[] = []
  if (values.grupoId == null) faltantes.push("Grado / Grupo")
  if (values.asignaturaId == null) faltantes.push("Asignatura")
  if (faltanEstudiantes(values, grupoTieneEstudiantes)) faltantes.push(`Estudiantes de la ${rotuloLower}`)
  if (!values.nombre?.trim()) faltantes.push(`Nombre de la ${rotuloLower}`)
  if (!values.tipo) faltantes.push(`Tipo de ${rotuloLower}`)
  if (!values.fechaInicio) faltantes.push("Fecha inicio")
  if (!values.fechaCierre) faltantes.push("Fecha de entrega o cierre")
  if (!esFormativa && camposEfectivos?.evaluacion.requerido && !values.instrumento) {
    faltantes.push("Instrumento de evaluación")
  }
  // Regla 47: "Estudiantes específicos" sin nadie (de la actividad) lo
  // rechaza el backend (`fn_actividad_validar_adaptaciones`, V496.1) — se
  // frena acá para no crear la actividad y fallar recién en el `PUT
  // .../adaptaciones`.
  ;(values.adaptaciones ?? []).forEach((adaptacion, i) => {
    if (
      adaptacion.aplicaA === "Estudiantes específicos" &&
      !adaptacion.estudiantesIds.some((id) => esEstudianteDeLaActividad(values, id))
    ) {
      faltantes.push(`Estudiantes de la adaptación ${i + 1}`)
    }
  })
  if (faltaTipoEvidencia(values, esFormativa)) faltantes.push("Tipo de evidencia")
  return faltantes
}

/** Nombre visible del instrumento elegido (el "Otro" del catálogo se ve
 *  como instrumento personalizado). */
function nombreInstrumento(instrumento: string | undefined): string {
  if (!instrumento) return "Instrumento de evaluación"
  return instrumento === "Otro" ? "Instrumento personalizado" : instrumento
}

/**
 * UN solo aviso con TODO lo que falta (la pantalla muestra un aviso a la
 * vez: si se mandaran dos, el segundo pisaría al primero). El instrumento
 * incompleto entra en la lista de campos con su nombre ("Rúbrica") y
 * después se detalla qué le falta:
 *
 *   "Complete los campos obligatorios: Nombre de la actividad, Rúbrica.
 *    Rúbrica: La rúbrica necesita al menos un criterio."
 *
 * `null` si no falta nada.
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
