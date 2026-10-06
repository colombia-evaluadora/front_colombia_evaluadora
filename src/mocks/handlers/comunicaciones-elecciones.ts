import { http, HttpResponse, delay } from "msw"

import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { conversaciones } from "@/mocks/db/comunicaciones"
import { elecciones, simularVotos } from "@/mocks/db/comunicaciones-elecciones"

const URL = (path: string) => `/api/eval-col/comunicaciones/${path}`

interface CrearEleccionBody {
  NOMBRE?: string
  DESCRIPCION?: string
  FECHA_INICIO?: string | null
  FECHA_CIERRE?: string | null
  FK_JORNADA?: number
  VER_RESULTADOS?: "S" | "N"
  COMENTARIOS?: "S" | "N"
  CANDIDATOS?: Array<{ NOMBRE: string; NUMERO: string; LEMA: string; FOTO_URL: string | null }>
}

export const comunicacionesEleccionesHandlers = [
  http.get(URL("conversaciones/:id/eleccion"), async ({ params }) => {
    await delay(200)
    const e = elecciones.find((x) => x.conversacionId === Number(params.id))
    if (!e) return HttpResponse.json({ message: "Este canal no tiene una elección." }, { status: 404 })
    simularVotos(e)
    return HttpResponse.json({ rows: [e] })
  }),

  http.post(URL("elecciones"), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as CrearEleccionBody
    const nombre = body.NOMBRE?.trim()
    const candidatos = body.CANDIDATOS ?? []
    if (!nombre || !body.FK_JORNADA) {
      return HttpResponse.json({ message: "Completa el nombre y la jornada." }, { status: 400 })
    }
    if (candidatos.length < 2) {
      return HttpResponse.json({ message: "Agrega al menos dos candidatos." }, { status: 400 })
    }
    if (conversaciones.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      return HttpResponse.json({ message: `Ya existe un canal llamado ${nombre}.` }, { status: 409 })
    }
    const canal: Conversacion = {
      id: Math.max(0, ...conversaciones.map((c) => c.id)) + 1,
      nombre,
      tipo: "CANAL",
      categoria: "VOTACION",
      noLeidos: 0,
      actividadAbierta: true,
      esBot: false,
      totalMiembros: 300,
      miembrosDestacados: ["Andrés Gómez"],
      silenciadoHasta: null,
      archivada: false,
    }
    conversaciones.push(canal)
    elecciones.push({
      conversacionId: canal.id,
      nombre,
      descripcion: body.DESCRIPCION ?? "",
      fechaInicio: body.FECHA_INICIO ?? null,
      fechaCierre: body.FECHA_CIERRE ?? null,
      jornadaId: body.FK_JORNADA,
      verResultadosEnVivo: body.VER_RESULTADOS === "S",
      permitirComentarios: body.COMENTARIOS === "S",
      candidatos: candidatos.map((c, i) => ({
        id: i + 1,
        nombre: c.NOMBRE,
        numero: c.NUMERO,
        lema: c.LEMA,
        fotoUrl: c.FOTO_URL,
        votos: 0,
      })),
      votosEnBlanco: 0,
      totalHabilitados: 300,
      vieronCanal: 0,
      creadoPor: "Andrés Gómez",
      esCreador: true,
    })
    return HttpResponse.json({ rows: [canal] })
  }),
]
