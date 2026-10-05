import type {
  Actividad,
  Criterio,
  EscalaValoracion,
  ListaCotejo,
  Rubrica,
} from "@/features/planeador/api/types/actividad"

/**
 * Qué le falta a la definición del instrumento de evaluación (Bloque 5) para
 * que `PUT .../actividades/:id/instrumento` la acepte — espejo, en el front,
 * de los validadores del backend (sso V496.5:
 * `fn_actividad_validar_rubrica_definicion`, `..._cotejo_definicion`,
 * `..._escala_definicion`, `..._otro_definicion`).
 *
 * Por qué hace falta: el guardado de la actividad es multi-paso (actividad →
 * … → instrumento) y la definición del instrumento viaja en un PUT APARTE,
 * DESPUÉS de crear/actualizar la actividad. Si el front dejaba pasar un
 * instrumento incompleto, la actividad quedaba guardada y recién ahí el
 * backend rechazaba el instrumento — al crear, ese error se perdía con la
 * navegación de vuelta al Planeador y el docente veía "Actividad creada
 * correctamente" (bug de QA: "no sale mensaje de error"). Peor: con una
 * escala de valoración vacía, o "Otro" con el método elegido pero sin
 * definir, `tieneDefinicionInstrumento` daba `false` y el PUT ni se
 * mandaba — la actividad quedaba sin instrumento sin ningún aviso. Con esta
 * validación el guardado no arranca hasta que el instrumento esté completo.
 *
 * Los mensajes van en el mismo orden que el validador real (el primero que
 * falla es el que el backend devolvería), uno por regla rota, sin repetir.
 *
 * Función pura (sin hooks): la usan el `onSubmit` del form (para frenar el
 * guardado y armar el aviso) y sus tests.
 */
export interface FaltantesInstrumentoOptions {
  /**
   * `true` si la Unidad vinculada calcula su definitiva por Ponderado o Suma
   * de puntos — ahí el puntaje de cada nivel de rúbrica / elemento de lista
   * de cotejo es obligatorio (sso: `p_requiere_puntaje`). Con Promedio
   * simple, o sin unidad, un nivel/elemento sin puntaje pesa 1. Mismo
   * criterio que `puntajeObligatorio` de `RubricasSection`/
   * `ListaCotejoSection`.
   */
  puntajeObligatorio: boolean
}

const PUNTAJE_MAXIMO = 100

function puntajeFueraDeRango(valor: number | undefined): boolean {
  return valor != null && (!Number.isFinite(valor) || valor < 0 || valor > PUNTAJE_MAXIMO)
}

function hayRepetidos(valores: number[]): boolean {
  return new Set(valores).size !== valores.length
}

/** Niveles tal como viajan al backend: "Excelente" (si tiene contenido) +
 *  los intermedios — mismo armado que `criterioABody` en
 *  `update-instrumento-actividad.ts`. */
function nivelesDeCriterio(criterio: Criterio): { descripcion: string; ponderacion?: number }[] {
  const niveles: { descripcion: string; ponderacion?: number }[] = []
  if (criterio.excelente.trim() || criterio.excelentePonderacion != null) {
    niveles.push({ descripcion: criterio.excelente, ponderacion: criterio.excelentePonderacion })
  }
  niveles.push(...criterio.niveles)
  return niveles
}

export function faltantesRubrica(rubrica: Rubrica, { puntajeObligatorio }: FaltantesInstrumentoOptions): string[] {
  if (rubrica.criterios.length === 0) return ["La rúbrica necesita al menos un criterio."]
  const faltantes = new Set<string>()
  rubrica.criterios.forEach((criterio, index) => {
    const etiqueta = criterio.nombre.trim() ? `"${criterio.nombre.trim()}"` : `${index + 1}`
    if (!criterio.nombre.trim()) faltantes.add(`El criterio ${index + 1} de la rúbrica no tiene nombre.`)
    const niveles = nivelesDeCriterio(criterio)
    if (niveles.length === 0) {
      faltantes.add(`El criterio ${etiqueta} de la rúbrica necesita al menos un nivel de desempeño.`)
      return
    }
    if (niveles.some((n) => !n.descripcion.trim())) {
      faltantes.add(`Cada nivel del criterio ${etiqueta} necesita su descripción o juicio de valor.`)
    }
    if (puntajeObligatorio && niveles.some((n) => n.ponderacion == null)) {
      faltantes.add(`Cada nivel del criterio ${etiqueta} necesita su puntaje.`)
    }
    if (niveles.some((n) => puntajeFueraDeRango(n.ponderacion))) {
      faltantes.add(`Cada nivel del criterio ${etiqueta} necesita un puntaje entre 0 y ${PUNTAJE_MAXIMO}.`)
    }
    const puntajes = niveles.map((n) => n.ponderacion).filter((p): p is number => p != null)
    if (puntajeObligatorio && puntajes.length === niveles.length) {
      if (hayRepetidos(puntajes)) faltantes.add(`El criterio ${etiqueta} tiene dos niveles con el mismo puntaje.`)
      else if (Math.max(...puntajes) === 0) {
        faltantes.add(`El criterio ${etiqueta} necesita al menos un nivel con puntaje mayor que 0.`)
      }
    }
  })
  return [...faltantes]
}

export function faltantesListaCotejo(
  listaCotejo: ListaCotejo,
  { puntajeObligatorio }: FaltantesInstrumentoOptions,
): string[] {
  const { items } = listaCotejo
  if (items.length === 0) return ["La lista de cotejo necesita al menos un ítem."]
  const faltantes: string[] = []
  if (items.some((item) => !item.descripcion.trim())) {
    faltantes.push("Cada ítem de la lista de cotejo necesita su descripción.")
  }
  if (puntajeObligatorio && items.some((item) => item.ponderacion == null)) {
    faltantes.push("Cada ítem de la lista de cotejo necesita su puntaje.")
  }
  if (items.some((item) => puntajeFueraDeRango(item.ponderacion))) {
    faltantes.push(`El puntaje de cada ítem de la lista de cotejo debe estar entre 0 y ${PUNTAJE_MAXIMO}.`)
  } else if (items.reduce((total, item) => total + (item.ponderacion ?? 1), 0) === 0) {
    // Un ítem sin puntaje pesa 1: solo falla si todos traen 0 explícito.
    faltantes.push("Todos los ítems de la lista de cotejo tienen puntaje 0: el total posible no puede ser 0.")
  }
  return faltantes
}

/** El backend acepta números de hasta tres cifras enteras (`^-?\d{1,3}`). */
function valorEscalaValido(valor: number): boolean {
  return Number.isFinite(valor) && Math.abs(valor) < 1000
}

export function faltantesEscala(escala: EscalaValoracion): string[] {
  if (escala.tipo === "Numérica") {
    const { valorMinimo, valorMaximo } = escala
    if (valorMinimo == null || valorMaximo == null) {
      return ["La escala numérica necesita valor mínimo y valor máximo."]
    }
    if (!valorEscalaValido(valorMinimo) || !valorEscalaValido(valorMaximo)) {
      return ["Los valores mínimo y máximo de la escala deben ser números de hasta tres cifras."]
    }
    if (valorMinimo >= valorMaximo) {
      return [`En la escala el valor mínimo (${valorMinimo}) debe ser menor que el máximo (${valorMaximo}).`]
    }
    return []
  }
  const { niveles } = escala
  if (niveles.length === 0) return ["La escala cualitativa necesita al menos un nivel."]
  const faltantes: string[] = []
  // A diferencia de rúbrica/lista de cotejo, el puntaje de cada nivel de la
  // escala es SIEMPRE obligatorio en el backend (no depende de la unidad).
  if (niveles.some((n) => n.ponderacion == null || puntajeFueraDeRango(n.ponderacion))) {
    faltantes.push(`Cada nivel de la escala necesita un puntaje entre 0 y ${PUNTAJE_MAXIMO}.`)
  }
  if (niveles.some((n) => !n.descripcion.trim())) {
    faltantes.push("Cada nivel de la escala necesita su interpretación o descriptor.")
  }
  const puntajes = niveles.map((n) => n.ponderacion).filter((p): p is number => p != null)
  if (puntajes.length === niveles.length) {
    if (hayRepetidos(puntajes)) faltantes.push("La escala tiene dos niveles con el mismo puntaje.")
    else if (Math.max(...puntajes) === 0) faltantes.push("La escala necesita al menos un nivel con puntaje mayor que 0.")
  }
  return faltantes
}

function faltantesPorMetodo(metodo: string, actividad: Actividad, options: FaltantesInstrumentoOptions): string[] {
  if (metodo === "Lista de cotejo") return faltantesListaCotejo(actividad.listaCotejo, options)
  if (metodo === "Escala de valoración") return faltantesEscala(actividad.escalaValoracion)
  return faltantesRubrica(actividad.rubrica, options)
}

/**
 * Faltantes del instrumento ACTUALMENTE elegido. Vacío si la actividad no es
 * sumativa o todavía no tiene instrumento (eso lo avisa
 * `camposObligatoriosFaltantes` del form, si el referente lo exige).
 */
export function faltantesInstrumento(actividad: Actividad, options: FaltantesInstrumentoOptions): string[] {
  if (!actividad.esEvaluativa || !actividad.instrumento) return []
  if (actividad.instrumento === "Lista de cotejo") return faltantesListaCotejo(actividad.listaCotejo, options)
  if (actividad.instrumento === "Escala de valoración") return faltantesEscala(actividad.escalaValoracion)
  if (actividad.instrumento === "Otro") {
    const { tipoEvidenciaEsperada, metodoValoracion } = actividad.instrumentoPersonalizado
    const faltantes: string[] = []
    if (!tipoEvidenciaEsperada) faltantes.push("Indique el tipo de evidencia esperada del instrumento personalizado.")
    if (!metodoValoracion) {
      faltantes.push("Indique el método de valoración del instrumento personalizado.")
      return faltantes
    }
    return [...faltantes, ...faltantesPorMetodo(metodoValoracion, actividad, options)]
  }
  return faltantesRubrica(actividad.rubrica, options)
}
