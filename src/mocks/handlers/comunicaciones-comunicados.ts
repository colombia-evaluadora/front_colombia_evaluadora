import { http, HttpResponse, delay } from "msw"

import type { Audiencia, Conversacion } from "@/features/comunicaciones/chat/api/types"
import { conversaciones } from "@/mocks/db/comunicaciones"
import { comunicados } from "@/mocks/db/comunicaciones-comunicados"

const URL = (path: string) => `/api/eval-col/comunicaciones/${path}`

interface CrearComunicadoBody {
  TITULO?: string
  DESCRIPCION?: string
  AUDIENCIA?: Audiencia[]
  PUBLICAR_EN?: string
  CONTENIDO_HTML?: string
}

export const comunicacionesComunicadosHandlers = [
  http.get(URL("conversaciones/:id/comunicado"), async ({ params }) => {
    await delay(200)
    const c = comunicados.find((x) => x.conversacionId === Number(params.id))
    if (!c) return HttpResponse.json({ message: "Este canal no tiene un comunicado." }, { status: 404 })
    return HttpResponse.json({ rows: [c] })
  }),

  http.post(URL("comunicados"), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as CrearComunicadoBody
    const titulo = body.TITULO?.trim()
    if (!titulo || !body.AUDIENCIA?.length || !body.PUBLICAR_EN || !body.CONTENIDO_HTML?.trim()) {
      return HttpResponse.json(
        { message: "Completa el título, la audiencia, la fecha y el contenido." },
        { status: 400 },
      )
    }
    if (conversaciones.some((c) => c.nombre.toLowerCase() === titulo.toLowerCase())) {
      return HttpResponse.json({ message: `Ya existe un canal llamado ${titulo}.` }, { status: 409 })
    }
    const canal: Conversacion = {
      id: Math.max(0, ...conversaciones.map((c) => c.id)) + 1,
      nombre: titulo,
      tipo: "CANAL",
      categoria: "ANUNCIO",
      noLeidos: 0,
      actividadAbierta: false,
      esBot: false,
      totalMiembros: 410,
      miembrosDestacados: ["Andrés Gómez"],
      silenciadoHasta: null,
      archivada: false,
    }
    conversaciones.push(canal)
    comunicados.push({
      conversacionId: canal.id,
      titulo,
      descripcion: body.DESCRIPCION ?? "",
      audiencia: body.AUDIENCIA,
      publicarEn: body.PUBLICAR_EN,
      contenidoHtml: body.CONTENIDO_HTML,
      publicadoPor: "Andrés Gómez",
      esCreador: true,
    })
    return HttpResponse.json({ rows: [canal] })
  }),
]
