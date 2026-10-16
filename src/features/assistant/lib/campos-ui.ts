import type { CampoUi } from "@/features/assistant/api/types"

// Utilidades para que cada pantalla arme su registro de UI asistida sin
// repetir lo mismo: opciones de catálogos, resolver el valor que manda el
// agente contra esas opciones y señalar un campo en pantalla.
//
// El agente manda los valores de lista tal como los declaró la definición
// (`opciones[].valor`), pero se tolera también la etiqueta o el código: el
// backend ya validó contra la definición, esto es solo robustez del lado del
// front. NUNCA se envía el formulario desde acá: solo se toca el modelo.

export interface OpcionCatalogo {
  id: number
  name: string
  code?: string
}

export type OpcionesUi = NonNullable<CampoUi["opciones"]>

/** Catálogo `{ id, name }` → opciones del contrato (valor = id como texto). */
export function opcionesDeCatalogo(items: OpcionCatalogo[] | undefined): OpcionesUi {
  return (items ?? []).map((item) => ({ valor: String(item.id), etiqueta: item.name }))
}

/** Sin tildes, mayúsculas ni espacios de más (para comparar etiquetas). */
export function plegarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

/** Busca en un catálogo el ítem que corresponde al valor del agente (id, código o nombre). */
export function resolverCatalogo<T extends OpcionCatalogo>(items: T[] | undefined, valor: unknown): T | null {
  if (valor == null || valor === "") return null
  const texto = plegarTexto(String(valor))
  return (
    (items ?? []).find((item) => String(item.id) === String(valor)) ??
    (items ?? []).find((item) => plegarTexto(item.name) === texto || (item.code != null && plegarTexto(item.code) === texto)) ??
    null
  )
}

/** Busca en opciones `{ valor, etiqueta }` y devuelve el `valor` canónico. */
export function resolverOpcion(opciones: OpcionesUi, valor: unknown): string | null {
  if (valor == null || valor === "") return null
  const texto = plegarTexto(String(valor))
  const encontrada =
    opciones.find((o) => o.valor === String(valor)) ??
    opciones.find((o) => plegarTexto(o.etiqueta) === texto || plegarTexto(o.valor) === texto)
  return encontrada ? encontrada.valor : null
}

/** `true`/`"S"`/`"si"` → true; `false`/`"N"`/`"no"` → false; otro → null. */
export function aBooleano(valor: unknown): boolean | null {
  if (typeof valor === "boolean") return valor
  const texto = plegarTexto(String(valor ?? ""))
  if (["true", "s", "si", "1", "y", "yes"].includes(texto)) return true
  if (["false", "n", "no", "0"].includes(texto)) return false
  return null
}

/** Texto plano o `""` (los campos de texto nunca reciben HTML: React lo escapa). */
export function aTexto(valor: unknown): string {
  if (valor == null) return ""
  return typeof valor === "string" ? valor : String(valor)
}

/** Número finito o `null`. Acepta coma decimal. */
export function aNumero(valor: unknown): number | null {
  if (valor == null || valor === "") return null
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/** Fecha `AAAA-MM-DD` (el contrato) o `null`. */
export function aFecha(valor: unknown): string | null {
  const texto = aTexto(valor).trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null
}

const CLASES_RESALTADO = ["ring-2", "ring-primary", "ring-offset-2", "rounded-md", "transition-shadow"]

/**
 * Señala un campo: lo trae a la vista, le da foco y lo marca con un anillo
 * unos segundos. Recibe ids de elemento (el primero que exista gana) para que
 * cada formulario diga dónde vive cada campo sin exponer selectores al agente.
 * Se reintenta en el siguiente frame por si el campo aparece al abrir una
 * sección o pestaña en la misma acción.
 */
export function resaltarElemento(ids: string | string[] | undefined, intentos = 3) {
  if (!ids || typeof document === "undefined") return
  const lista = Array.isArray(ids) ? ids : [ids]
  const elemento = lista.map((id) => document.getElementById(id)).find(Boolean)
  if (!elemento) {
    if (intentos > 0) requestAnimationFrame(() => setTimeout(() => resaltarElemento(lista, intentos - 1), 60))
    return
  }
  const destino = (elemento.closest("[data-slot='field']") as HTMLElement | null) ?? elemento
  destino.scrollIntoView({ behavior: "smooth", block: "center" })
  if (typeof (elemento as HTMLElement).focus === "function") (elemento as HTMLElement).focus({ preventScroll: true })
  destino.classList.add(...CLASES_RESALTADO)
  setTimeout(() => destino.classList.remove(...CLASES_RESALTADO), 2500)
}

/**
 * Convierte el valor que manda el agente para un filtro a la forma del valor
 * actual de ese filtro en el formulario del listado: lista si el filtro es
 * multi-valor, texto si es texto, número si es número.
 */
export function valorFiltroComo(actual: unknown, valor: unknown): unknown {
  if (Array.isArray(actual)) {
    if (valor == null || valor === "") return []
    return (Array.isArray(valor) ? valor : String(valor).split(",")).map((v) => aTexto(v).trim()).filter(Boolean)
  }
  if (typeof actual === "number") return aNumero(valor) ?? undefined
  if (typeof actual === "boolean") return aBooleano(valor) ?? undefined
  if (valor == null) return ""
  return Array.isArray(valor) ? valor.map(aTexto).join(",") : aTexto(valor)
}
