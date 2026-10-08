import DOMPurify from "dompurify"

// Etiquetas que produce el editor del comunicado. Todo lo demás (scripts,
// iframes, manejadores on*) se descarta antes de guardar y antes de mostrar.
const ETIQUETAS = ["p", "br", "strong", "em", "u", "s", "a", "span", "ul", "ol", "li", "img", "blockquote", "code", "pre", "h1", "h2", "h3"]
const ATRIBUTOS = ["href", "target", "rel", "src", "alt", "style"]

export function htmlSeguro(html: string) {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ETIQUETAS, ALLOWED_ATTR: ATRIBUTOS })
}

// El editor deja `<p></p>` cuando está vacío.
export const htmlVacio = (html: string) =>
  !html.replace(/<p>\s*<\/p>|<br\s*\/?>/g, "").replace(/<[^>]+>/g, "").trim() &&
  !/<img\b/i.test(html)

// Clases para mostrar el HTML del editor con el mismo aspecto que al escribirlo.
export const CLASES_HTML =
  "text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_img]:my-2 [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:min-h-[1lh] [&_ul]:list-disc [&_ul]:pl-6"
