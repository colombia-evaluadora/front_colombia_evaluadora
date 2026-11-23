// Validadores y ayudas de formulario comunes a Gestión Estudiantil.

/** Mensaje de largo fuera de rango, o `undefined` si cumple. */
export function errorLargo(valor: string, min: number, max: number, campo: string): string | undefined {
  const n = valor.trim().length
  if (!n) return `${campo} ${obligatorioSegun(campo)}.`
  if (n < min || n > max) return `${campo} debe tener entre ${min} y ${max} caracteres.`
  return undefined
}

/** «es obligatorio» concordado con el artículo del campo («La descripción es obligatoria.», «Los motivos son obligatorios.»). */
export function obligatorioSegun(campo: string): string {
  const articulo = campo.trim().split(/\s+/)[0]?.toLowerCase()
  if (articulo === "la") return "es obligatoria"
  if (articulo === "las") return "son obligatorias"
  if (articulo === "los") return "son obligatorios"
  return "es obligatorio"
}

/** Lleva el foco y la vista al primer campo marcado con error del formulario. */
export function enfocarPrimerError() {
  // Tras el render que pinta los errores (y abre las secciones plegadas).
  setTimeout(() => {
    const marcado = document.querySelector<HTMLElement>("[data-invalid], [aria-invalid=true]")
    if (!marcado) return
    // El marcado puede ser el Field o el contenedor del combobox: se enfoca su control.
    const FOCO = "input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])"
    const campo = marcado.matches(FOCO) ? marcado : (marcado.querySelector<HTMLElement>(FOCO) ?? marcado)
    campo.scrollIntoView({ block: "center", behavior: "smooth" })
    campo.focus({ preventScroll: true })
  }, 50)
}
