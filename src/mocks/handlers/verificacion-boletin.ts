import { HttpResponse, delay, http } from "msw"

/**
 * Mock de la verificación pública de boletines (QR).
 * Códigos: "VIG..." → VIGENTE, "ACT..." → ACTUALIZADO, "REE..." →
 * REEMPLAZADO, cualquier otro → NO_VALIDO.
 * PDF: `ultimos4 = "1234"` es válido; tras 3 intentos fallidos por código → 429.
 */
const estadoPorCodigo = (codigo: string) => {
  const c = codigo.toUpperCase()
  if (c.startsWith("VIG")) return "VIGENTE"
  if (c.startsWith("ACT")) return "ACTUALIZADO"
  if (c.startsWith("REE")) return "REEMPLAZADO"
  return "NO_VALIDO"
}

const intentosFallidos = new Map<string, number>()

// PDF mínimo de una página, suficiente para el visor embebido.
const PDF_MINIMO = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 20 Tf 60 760 Td (Boletin de prueba - version vigente) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`

export const verificacionBoletinHandlers = [
  http.post("*/reportes/public/boletin/:codigo/pdf", async ({ params, request }) => {
    await delay(400)
    const codigo = String(params.codigo)
    if (estadoPorCodigo(codigo) === "NO_VALIDO") return new HttpResponse(null, { status: 404 })
    const fallidos = intentosFallidos.get(codigo) ?? 0
    if (fallidos >= 3) return new HttpResponse(null, { status: 429 })
    const body = (await request.json().catch(() => ({}))) as { ultimos4?: string }
    if (body.ultimos4 !== "1234") {
      intentosFallidos.set(codigo, fallidos + 1)
      return new HttpResponse(null, { status: 403 })
    }
    intentosFallidos.delete(codigo)
    return new HttpResponse(PDF_MINIMO, { headers: { "Content-Type": "application/pdf" } })
  }),
  http.get("*/reportes/public/boletin/:codigo", async ({ params }) => {
    await delay(300)
    const estado = estadoPorCodigo(String(params.codigo))
    if (estado === "NO_VALIDO") return HttpResponse.json({ estado })
    return HttpResponse.json({
      estado,
      emitidoEn: "2026-06-20T15:30:00Z",
      actualizadoEn: estado === "VIGENTE" ? null : "2026-07-02T10:05:00Z",
      institucion: "Institución Educativa de Prueba",
      sede: "Sede Principal",
      periodo: "Periodo 2 · 2026",
    })
  }),
]
