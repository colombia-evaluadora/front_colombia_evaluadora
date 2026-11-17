import { http, HttpResponse, delay } from "msw"

import { inscripcionDemoOriginal } from "@/features/publico/consultar/datos-demo"
import {
  UUID_AUTORIZAR,
  UUID_CODIGO,
  UUID_CONSULTAR,
} from "@/features/publico/consultar/api/consulta-publica"

// Consultar inscripción pública (sso V426): `POST /eval-col/public/service` con `{uuid, params}`
// y respuesta `[{datos}]`. Vista previa: cualquier código de 6 dígitos vale si número y
// documento son de una inscripción de ejemplo (`datos-demo.ts`).
const NO_COINCIDE = {
  encontrada: false,
  mensaje: "Los datos no coinciden o el código no es correcto. Revíselos e intente de nuevo.",
}

const responder = (datos: unknown) => HttpResponse.json([{ datos }])

interface PublicServiceBody {
  uuid: string
  params: Record<string, unknown>
}

function inscripcionDe(params: Record<string, unknown>) {
  const codigo = String(params["BODY.CODIGO"] ?? "")
  if (!/^\d{6}$/.test(codigo)) return null
  return inscripcionDemoOriginal(String(params["BODY.NUMERO"] ?? ""), String(params["BODY.DOCUMENTO"] ?? ""))
}

export const inscripcionPublicaHandlers = [
  http.post("*/api/eval-col/public/service", async ({ request }) => {
    const { uuid, params = {} } = (await request.json()) as PublicServiceBody
    await delay(300)
    if (uuid === UUID_CODIGO) return responder({ enviado: true })

    if (uuid === UUID_CONSULTAR) {
      const i = inscripcionDe(params)
      if (!i) return responder(NO_COINCIDE)
      return responder({
        encontrada: true,
        numeroInscripcion: i.numero,
        estado: i.estado,
        aspirante: i.aspirante,
        grupoAdmision: i.grupoAdmision,
        opciones: i.opciones.map((o) => ({
          preferencia: o.numero,
          grado: i.grado,
          establecimiento: o.establecimiento,
          sede: o.sede,
          jornada: o.jornada,
          numeroSorteo: o.sorteo,
          estado: o.estado,
          // Solo la vista previa: el back real no los manda.
          posicion: o.posicion,
          reservada: o.reservada,
          elegida: o.elegida,
        })),
        autorizaciones: structuredClone(i.autorizaciones),
        plazo: i.plazo,
        sorteo: i.sorteo,
      })
    }

    if (uuid === UUID_AUTORIZAR) {
      const i = inscripcionDe(params)
      if (!i) return responder(NO_COINCIDE)
      const ids = (params["BODY.ESTABLECIMIENTOS"] as number[] | undefined)?.map(Number) ?? []
      if (!ids.length || ids.some((id) => !i.autorizaciones.some((a) => a.establecimientoId === id))) {
        return HttpResponse.json({ message: "Hay establecimientos que no son de la inscripción." }, { status: 400 })
      }
      for (const a of i.autorizaciones) if (ids.includes(a.establecimientoId)) a.autorizado = true
      return responder({ encontrada: true, autorizaciones: structuredClone(i.autorizaciones) })
    }

    return HttpResponse.json({ message: "Servicio público no encontrado." }, { status: 404 })
  }),
]
