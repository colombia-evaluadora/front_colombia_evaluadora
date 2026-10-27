import { plainTextInvalidChars } from "@/lib/text-input"
import type { UnidadInfoGeneral } from "@/features/planeador/api/mutations/update-unidad"

/**
 * Límites de la unidad: los mismos que valida el back en
 * `fn_unidad_validar_campos` / `fn_unidad_validar_contenidos_titulos`
 * (sso V492.1). Si el back cambia uno, cambialo acá también.
 */
export const UNIDAD_LIMITES = {
  nombre: 150,
  descripcion: 500,
  objetivo: 250,
  seccionTitulo: 200,
  seccionDescripcion: 500,
} as const

/**
 * Clave de cada error = id del control en el DOM, para poder enfocar el
 * primero al enviar (`enfocarPrimerError`). Las listas usan la posición.
 */
export const unidadCampoId = {
  grado: "unidad-grado",
  asignatura: "unidad-asignatura",
  nombre: "unidad-nombre",
  descripcion: "unidad-descripcion",
  objetivo: (i: number) => `unidad-objetivo-${i}`,
  seccionTitulo: (i: number) => `unidad-seccion-${i}-titulo`,
  seccionDescripcion: (i: number) => `unidad-seccion-${i}-descripcion`,
} as const

export type UnidadErrores = Record<string, string>

function mensajeCaracteres(campo: string, invalidos: string[]): string {
  const lista = invalidos.map((c) => (c.trim() ? `"${c}"` : "salto o tabulación")).join(" ")
  return `${campo} solo admite letras (con tilde, diéresis o ñ), números, espacios, guiones y apóstrofos. Quita: ${lista}`
}

/** Valida un texto: vacío (si es obligatorio), largo máximo y caracteres permitidos. */
function validarTexto(
  valor: string | undefined,
  { campo, max, obligatorio, mensajeVacio }: { campo: string; max: number; obligatorio: boolean; mensajeVacio?: string },
): string | undefined {
  const texto = (valor ?? "").trim()
  if (!texto) return obligatorio ? (mensajeVacio ?? `${campo} es obligatorio`) : undefined
  if (texto.length > max) return `${campo} admite máximo ${max} caracteres (tiene ${texto.length})`
  // Los saltos de línea se permiten (descripciones en textarea); el resto de
  // "espacios" raros (tabulación) también, mismo `\s` que el back.
  const invalidos = plainTextInvalidChars(texto)
  if (invalidos.length > 0) return mensajeCaracteres(campo, invalidos)
  return undefined
}

/**
 * Validación de "Información general" de la unidad (alta y edición). Devuelve
 * los errores indexados por id de control y en el orden visual del form, así
 * el primero es el que hay que enfocar. Los mensajes del backend
 * (`fn_unidad_validar_*`) quedan solo como respaldo.
 */
export function validarUnidadDraft(draft: UnidadInfoGeneral): UnidadErrores {
  const errores: UnidadErrores = {}
  const poner = (id: string, msg: string | undefined) => {
    if (msg) errores[id] = msg
  }

  if (draft.gradoId == null) poner(unidadCampoId.grado, "Selecciona el grado")
  if (draft.asignaturaId == null) poner(unidadCampoId.asignatura, "Selecciona la asignatura")

  poner(
    unidadCampoId.nombre,
    validarTexto(draft.nombre, { campo: "El nombre", max: UNIDAD_LIMITES.nombre, obligatorio: true }),
  )
  poner(
    unidadCampoId.descripcion,
    validarTexto(draft.descripcion, { campo: "La descripción", max: UNIDAD_LIMITES.descripcion, obligatorio: false }),
  )

  ;(draft.objetivos ?? []).forEach((objetivo, i) => {
    poner(
      unidadCampoId.objetivo(i),
      validarTexto(objetivo, {
        campo: `El objetivo ${i + 1}`,
        max: UNIDAD_LIMITES.objetivo,
        obligatorio: true,
        mensajeVacio: `El objetivo ${i + 1} está vacío: escríbelo o quítalo de la lista`,
      }),
    )
  })

  ;(draft.contenidos ?? []).forEach((seccion, i) => {
    poner(
      unidadCampoId.seccionTitulo(i),
      validarTexto(seccion.titulo, {
        campo: `El título de la sección ${i + 1}`,
        max: UNIDAD_LIMITES.seccionTitulo,
        obligatorio: false,
      }),
    )
    poner(
      unidadCampoId.seccionDescripcion(i),
      validarTexto(seccion.descripcion, {
        campo: `La descripción de la sección ${i + 1}`,
        max: UNIDAD_LIMITES.seccionDescripcion,
        obligatorio: true,
        mensajeVacio: `La descripción de la sección ${i + 1} está vacía: escríbela o quita la sección`,
      }),
    )
  })

  return errores
}

/** Lleva el foco (y el scroll) al primer control con error. */
export function enfocarPrimerError(errores: UnidadErrores) {
  const primero = Object.keys(errores)[0]
  if (!primero) return
  // Tras el re-render que pinta los errores.
  requestAnimationFrame(() => {
    const el = document.getElementById(primero)
    if (!el) return
    el.scrollIntoView({ block: "center", behavior: "smooth" })
    el.focus({ preventScroll: true })
  })
}

/** Aviso de página al intentar guardar con errores (el detalle va en cada campo). */
export const UNIDAD_ERRORES_MENSAJE = "Revisa los campos marcados en rojo antes de guardar."
