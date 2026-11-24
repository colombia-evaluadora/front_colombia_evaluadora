import { HttpResponse, delay, http } from "msw"

import { rejectWithoutCaptcha } from "@/mocks/handlers/_captcha"

/**
 * Mock de la verificación pública de boletines (QR).
 * Códigos: "VIG..." → VIGENTE, "ACT..." → ACTUALIZADO, "REE..." →
 * REEMPLAZADO, cualquier otro → NO_VALIDO.
 * PDF: `ultimos4 = "1234"` es válido; tras 3 intentos fallidos por código → 429.
 * El PDF exige `X-Captcha-Token` (403 antes de mirar los dígitos), como
 * reporting-service; el estado no.
 */
const estadoPorCodigo = (codigo: string) => {
  const c = codigo.toUpperCase()
  if (c.startsWith("VIG")) return "VIGENTE"
  if (c.startsWith("ACT")) return "ACTUALIZADO"
  if (c.startsWith("REE")) return "REEMPLAZADO"
  return "NO_VALIDO"
}

export const BOLETIN_MOCK_ULTIMOS4 = "1234"

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

/**
 * Ruta común /verificar/<código>. Carné (tres bloques de cuatro hexadecimales):
 * empieza en "A" → VIGENTE, "B" → REEMPLAZADO, "C" → ANULADO, "D" → vigente
 * sin matrícula Cursando, otro → NO_VALIDO. Los códigos del mock del boletín
 * (VIG…, ACT…, REE…) responden BOLETIN.
 */
const CARNE = /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/

/**
 * Gestión Estudiantil: tres bloques de cuatro con alguna letra G-Z. Primera letra:
 * "S" → certificado de servicio social, "M" → mención de honor, "C" → constancia de estudio; segunda letra:
 * V vigente, A actualizado, R reemplazado, N anulado; otra → NO_VALIDO.
 */
function documentoGe(c: string) {
  const tipo =
    c[0] === "S" ? "SERVICIO_SOCIAL_CERTIFICADO" : c[0] === "M" ? "MENCION_HONOR" : c[0] === "C" ? "CONSTANCIA_ESTUDIO" : null
  const estado = { V: "VIGENTE", A: "ACTUALIZADO", R: "REEMPLAZADO", N: "ANULADO" }[c[1]]
  if (!tipo || !estado) return { tipo: null, estado: "NO_VALIDO" }
  return {
    tipo,
    estado,
    emitidoEn: "2027-03-15",
    ...(estado === "REEMPLAZADO" ? { reemplazadoEn: "2027-06-01" } : {}),
    institucion: "Institución Educativa de Prueba",
    dane: "105001000123",
    titular: "Ana S. P. G.",
  }
}

function documentoPorCodigo(codigo: string) {
  const c = codigo.trim().toUpperCase()
  if (/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(c) && !CARNE.test(c)) return documentoGe(c)
  if (!CARNE.test(c)) return { tipo: estadoPorCodigo(c) === "NO_VALIDO" ? null : "BOLETIN", estado: estadoPorCodigo(c) }
  const estado = { A: "VIGENTE", B: "REEMPLAZADO", C: "ANULADO", D: "VIGENTE" }[c[0]] ?? "NO_VALIDO"
  if (estado === "NO_VALIDO") return { tipo: "CARNE", estado }
  return {
    tipo: "CARNE",
    estado,
    emitidoEn: "2027-02-10",
    reemplazadoEn: estado === "REEMPLAZADO" ? "2027-05-03" : null,
    vigencia: "2027-11-30",
    matriculaVigente: c[0] === "A" || c[0] === "B",
    institucion: "Institución Educativa de Prueba",
    dane: "105001000123",
    titular: "Ana S. P. G.",
    documentoUltimos4: "4321",
    sede: "Sede Principal",
    jornada: "Mañana",
    gradoGrupo: "Noveno · 9°A",
    anio: "2027",
  }
}

export const verificacionBoletinHandlers = [
  http.get("*/reportes/public/documento/:codigo", async ({ params }) => {
    await delay(300)
    return HttpResponse.json(documentoPorCodigo(String(params.codigo)))
  }),
  http.post("*/reportes/public/boletin/:codigo/pdf", async ({ params, request }) => {
    await delay(400)
    const rejected = rejectWithoutCaptcha(request)
    if (rejected) return rejected
    const codigo = String(params.codigo)
    if (estadoPorCodigo(codigo) === "NO_VALIDO") return new HttpResponse(null, { status: 404 })
    const fallidos = intentosFallidos.get(codigo) ?? 0
    if (fallidos >= 3) return new HttpResponse(null, { status: 429 })
    const body = (await request.json().catch(() => ({}))) as { ultimos4?: string }
    if (body.ultimos4 !== BOLETIN_MOCK_ULTIMOS4) {
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
