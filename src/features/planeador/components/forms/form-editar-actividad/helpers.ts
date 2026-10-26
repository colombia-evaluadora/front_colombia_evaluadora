import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"

/**
 * Tras un guardado fallido lleva la vista y el foco al primer campo inválido de este form.
 * Doble `requestAnimationFrame`: `submissionAttempts` se actualiza async y hay que esperar el re-render.
 */
export function scrollToFirstInvalidField(formEl: HTMLFormElement) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const invalido = formEl.querySelector<HTMLElement>('[data-invalid="true"], [aria-invalid="true"]')
      if (!invalido) return
      invalido.scrollIntoView({ behavior: "smooth", block: "center" })
      // Si lo marcado no es enfocable (el `<Field>`), se enfoca el primer control de adentro.
      const foco = invalido.matches("input, select, textarea, button, [tabindex]")
        ? invalido
        : invalido.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]")
      foco?.focus({ preventScroll: true })
    })
  })
}

/** Id aleatorio para items nuevos; el PK real lo asigna el backend. */
export function cryptoId(): number {
  return Math.floor(Math.random() * 1_000_000_000)
}

export function formatDiaCorto(value: string): string {
  const [, m, d] = value.split("-")
  return `${d}/${m}`
}

/**
 * Alta: pone el predeterminado de Listas valor. Si el form sigue limpio, también
 * pasa a ser la base del `isDirty` para no pedir confirmación al salir sin tocar nada.
 */
export function precargarPredeterminado<K extends "tipo" | "instrumento">(
  form: FormActividad,
  name: K,
  value: Actividad[K],
) {
  const limpio = form.state.isDefaultValue
  form.setFieldValue(name, value as never)
  if (limpio) form.reset(form.state.values)
}
