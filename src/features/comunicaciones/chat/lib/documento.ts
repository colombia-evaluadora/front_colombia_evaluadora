import { htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"

// HTML completo con el estilo base del documento, para descargar e imprimir.
function paginaHtml(titulo: string, html: string) {
  const t = titulo.replace(/[<>&]/g, "")
  return `<!doctype html><html><head><meta charset="utf-8"><title>${t}</title><style>body{font-family:Arial,sans-serif;font-size:14px;line-height:1.5;margin:2cm}img{max-width:100%}</style></head><body>${htmlSeguro(html)}</body></html>`
}

// Word abre HTML con extensión .doc, así que el documento editado se descarga
// sin depender del servidor. TODO: descargar el original desde el file-service.
export function descargarDocumento(nombre: string, html: string) {
  const blob = new Blob(["﻿", paginaHtml(nombre, html)], { type: "application/msword" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre.replace(/\.(docx?|html?)$/i, "") + ".doc"
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// Imprime en un iframe oculto para no abrir otra pestaña.
export function imprimirHtml(titulo: string, html: string) {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0"
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc || !iframe.contentWindow) return iframe.remove()
  doc.open()
  doc.write(paginaHtml(titulo, html))
  doc.close()
  iframe.contentWindow.addEventListener("afterprint", () => iframe.remove())
  iframe.contentWindow.focus()
  iframe.contentWindow.print()
}
