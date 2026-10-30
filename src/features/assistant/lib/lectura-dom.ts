import type { CampoUi, FormularioUi, TipoCampoUi } from "@/features/assistant/api/types"

// Lectura genérica por DOM de los formularios que NO se registraron en la UI
// asistida (`useFormularioAsistente` / `useFormularioTanstackAsistente`).
//
// Es SOLO LECTURA: el código `pantalla.lectura` no está en el registro del
// backend, así que cualquier RELLENAR sobre él se rechaza allá. Escribir en
// el DOM rompería Base UI y TanStack Form (no se enteran del cambio), por eso
// el relleno exige un registro explícito.
//
// Se basa en lo accesible: `<label for>`, `aria-label(ledby)`, `aria-invalid`,
// `aria-required`/`required` y el `data-slot` de `ui/field.tsx`.

export const CODIGO_LECTURA_DOM = "pantalla.lectura" as const

/** Contenedor del chat del asistente: lo que esté adentro nunca se lee. */
export const ATRIBUTO_ASISTENTE = "data-asistente-chat"

const MAX_CAMPOS = 40
const MAX_TEXTO = 120
/** Campos que nunca se leen, aunque estén en pantalla. */
const TIPOS_EXCLUIDOS = new Set(["password", "hidden", "file", "submit", "button", "reset", "image"])

const SELECTOR =
  "input, textarea, select, [role='combobox'], [role='checkbox'], [role='switch'], [role='radiogroup']"

function recortar(texto: string | null | undefined): string {
  return (texto ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXTO)
}

function etiquetaDe(el: HTMLElement): string {
  const porAria = el.getAttribute("aria-label")
  if (porAria) return recortar(porAria)
  const ids = el.getAttribute("aria-labelledby")
  if (ids) {
    const texto = ids
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
    if (recortar(texto)) return recortar(texto)
  }
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (label?.textContent) return recortar(label.textContent)
  }
  const envolvente = el.closest("label")
  if (envolvente?.textContent) return recortar(envolvente.textContent)
  const campo = el.closest("[data-slot='field']")
  const label = campo?.querySelector("[data-slot='field-label']")
  if (label?.textContent) return recortar(label.textContent)
  return recortar(el.getAttribute("placeholder") ?? el.getAttribute("name") ?? "")
}

function tipoDe(el: HTMLElement): TipoCampoUi {
  const role = el.getAttribute("role")
  if (role === "combobox" || el.tagName === "SELECT") return "select"
  if (role === "checkbox" || role === "switch") return "checkbox"
  if (role === "radiogroup") return "radio"
  if (el.tagName === "TEXTAREA") return "textarea"
  const tipo = (el as HTMLInputElement).type
  if (tipo === "checkbox") return "checkbox"
  if (tipo === "radio") return "radio"
  if (tipo === "email" || tipo === "tel" || tipo === "number" || tipo === "date") return tipo
  return "text"
}

function valorDe(el: HTMLElement, tipo: TipoCampoUi): unknown {
  if (tipo === "checkbox") {
    if (el instanceof HTMLInputElement) return el.checked
    return el.getAttribute("aria-checked") === "true"
  }
  if (el instanceof HTMLSelectElement) return recortar(el.selectedOptions[0]?.textContent)
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    // Un input de combobox muestra la etiqueta elegida; en los demás es el valor.
    return recortar(el.value)
  }
  // Trigger de un select de Base UI: el texto visible es la opción elegida.
  return recortar(el.textContent)
}

function errorDe(el: HTMLElement): string | undefined {
  const describedby = el.getAttribute("aria-describedby")
  const porAria = describedby
    ?.split(/\s+/)
    .map((id) => document.getElementById(id))
    .find((n) => n?.getAttribute("data-slot") === "field-error" || n?.getAttribute("role") === "alert")
  const enCampo = el.closest("[data-slot='field']")?.querySelector("[data-slot='field-error']")
  const texto = recortar((porAria ?? enCampo)?.textContent)
  if (texto) return texto
  return el.getAttribute("aria-invalid") === "true" ? "Valor no válido" : undefined
}

function visible(el: HTMLElement): boolean {
  if (el.closest(`[${ATRIBUTO_ASISTENTE}]`)) return false
  if (el.closest("[hidden], [aria-hidden='true'], [inert]")) return false
  return el.getClientRects().length > 0
}

/**
 * Formularios en pantalla leídos del DOM, como un solo formulario de solo
 * lectura. `null` si no hay campos. El diálogo abierto (si hay) manda: lo de
 * detrás no es lo que la persona está mirando.
 */
export function leerFormularioDom(raiz: ParentNode | null = typeof document !== "undefined" ? document : null): FormularioUi | null {
  if (!raiz) return null
  const dialogo = [...raiz.querySelectorAll<HTMLElement>("[role='dialog'], [role='alertdialog']")]
    .filter((d) => visible(d))
    .at(-1)
  const ambito: ParentNode = dialogo ?? raiz
  const vistos = new Set<string>()
  const campos: CampoUi[] = []
  for (const el of ambito.querySelectorAll<HTMLElement>(SELECTOR)) {
    if (campos.length >= MAX_CAMPOS) break
    if (TIPOS_EXCLUIDOS.has((el as HTMLInputElement).type) || !visible(el)) continue
    // Un input dentro de un combobox/radiogroup ya se lee con su contenedor.
    if (el.parentElement?.closest("[role='combobox'], [role='radiogroup']")) continue
    const etiqueta = etiquetaDe(el)
    if (!etiqueta) continue
    const nombre = recortar(el.id || el.getAttribute("name") || etiqueta).slice(0, 60)
    if (vistos.has(nombre)) continue
    vistos.add(nombre)
    const tipo = tipoDe(el)
    const error = errorDe(el)
    const obligatorio =
      el.hasAttribute("required") || el.getAttribute("aria-required") === "true" || /\*\s*$/.test(etiqueta)
    campos.push({
      nombre,
      etiqueta: etiqueta.replace(/\s*\*\s*$/, ""),
      tipo,
      ...(obligatorio ? { obligatorio: true } : {}),
      valor: valorDe(el, tipo),
      ...(error ? { error } : {}),
    })
  }
  return campos.length > 0 ? { codigo: CODIGO_LECTURA_DOM, entidad: "", campos } : null
}
