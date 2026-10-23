import { http, HttpResponse, delay } from "msw"
import { consumirBorradorActividad } from "@/mocks/handlers/comunicaciones-borradores-actividad"

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
  // "Editar Comunicado": texto siempre; audiencia y fecha solo mientras siga programado.
  http.patch(URL("conversaciones/:id/comunicado"), async ({ params, request }) => {
    await delay(250)
    const c = comunicados.find((x) => x.conversacionId === Number(params.id))
    if (!c) return HttpResponse.json({ message: "Este canal no tiene un comunicado." }, { status: 404 })
    const body = (await request.json()) as CrearComunicadoBody
    const titulo = body.TITULO?.trim()
    if (!titulo || !body.AUDIENCIA?.length || !body.PUBLICAR_EN || !body.CONTENIDO_HTML?.trim()) {
      return HttpResponse.json({ message: "Completa el título, la audiencia, la fecha y el contenido." }, { status: 400 })
    }
    const publicado = new Date(c.publicarEn) <= new Date()
    const cambiaAudiencia = [...body.AUDIENCIA].sort().join() !== [...c.audiencia].sort().join()
    const cambiaFecha = new Date(body.PUBLICAR_EN).getTime() !== new Date(c.publicarEn).getTime()
    if (publicado && (cambiaAudiencia || cambiaFecha)) {
      return HttpResponse.json({ message: "El comunicado ya se publicó: solo puedes cambiar el título, la descripción y el contenido." }, { status: 409 })
    }
    Object.assign(c, {
      titulo,
      descripcion: body.DESCRIPCION ?? "",
      audiencia: body.AUDIENCIA,
      publicarEn: body.PUBLICAR_EN,
      contenidoHtml: body.CONTENIDO_HTML,
    })
    const conv = conversaciones.find((x) => x.id === c.conversacionId)
    if (conv) conv.nombre = titulo
    // Guardar la edición desde su borrador (?borrador) lo elimina, como comms-service.
    consumirBorradorActividad(request)
    return HttpResponse.json({ rows: [c] })
  }),

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
      creadoPor: "Andrés Gómez",
      esCreador: true,
    }
    conversaciones.push(canal)
    consumirBorradorActividad(request)
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
