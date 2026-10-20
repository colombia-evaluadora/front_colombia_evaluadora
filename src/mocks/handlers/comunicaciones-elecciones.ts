import { http, HttpResponse, delay } from "msw"
import { notificarEleccionAbierta } from "@/mocks/db/comunicaciones-notificaciones-puente"

import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { conversaciones } from "@/mocks/db/comunicaciones"
import type { GrupoVotantes } from "@/features/comunicaciones/chat/api/types"
import { findUserByToken } from "@/mocks/db/auth"
import { FUNCIONARIOS, GRADOS, votantesDe } from "@/mocks/db/comunicaciones-votantes"
import {
  eleccionCerrada,
  elecciones,
  simularVotos,
  votantes,
  yaVoto,
} from "@/mocks/db/comunicaciones-elecciones"

const URL = (path: string) => `/api/eval-col/comunicaciones/${path}`

// Mismo patrón que los mocks de asistencia: el usuario sale del Bearer.
export function usuarioDe(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "") ?? ""
  return findUserByToken(token)
}

interface CrearEleccionBody {
  NOMBRE?: string
  DESCRIPCION?: string
  FECHA_INICIO?: string | null
  FECHA_CIERRE?: string | null
  FK_JORNADA?: number
  VER_RESULTADOS?: "S" | "N"
  VOTANTES?: number[]
  CANDIDATOS?: Array<{ NOMBRE: string; NUMERO: string; LEMA: string; FOTO_URL: string | null }>
}

export const comunicacionesEleccionesHandlers = [
  http.get(URL("votantes/opciones"), async () => {
    await delay(150)
    return HttpResponse.json({ rows: [{ grados: GRADOS, funcionarios: FUNCIONARIOS }] })
  }),

  http.post(URL("votantes/query"), async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as { GRUPO: GrupoVotantes; VALOR: string }
    return HttpResponse.json({ rows: votantesDe(body.GRUPO, body.VALOR) })
  }),

  http.post(URL("conversaciones/:id/eleccion/votar"), async ({ params, request }) => {
    await delay(250)
    const e = elecciones.find((x) => x.conversacionId === Number(params.id))
    const correo = usuarioDe(request)?.email
    if (!e || !correo) return HttpResponse.json({ message: "Este canal no tiene una elección." }, { status: 404 })
    if (eleccionCerrada(e)) return HttpResponse.json({ message: "La votación ya está cerrada." }, { status: 409 })
    if (e.fechaInicio && Date.parse(e.fechaInicio) > Date.now()) {
      return HttpResponse.json({ message: "La votación aún no ha abierto." }, { status: 409 })
    }
    if (yaVoto(e.conversacionId, correo)) {
      return HttpResponse.json({ message: "Ya votaste en esta elección." }, { status: 409 })
    }
    const body = (await request.json()) as { FK_CANDIDATO: number | null }
    if (body.FK_CANDIDATO == null) e.votosEnBlanco += 1
    else {
      const c = e.candidatos.find((x) => x.id === body.FK_CANDIDATO)
      if (!c) return HttpResponse.json({ message: "El candidato no existe." }, { status: 400 })
      c.votos += 1
    }
    const lista = votantes.get(e.conversacionId) ?? new Set<string>()
    lista.add(correo)
    votantes.set(e.conversacionId, lista)
    // Quien vota nunca es quien la creó.
    return HttpResponse.json({ rows: [{ ...e, esCreador: false, yaVoto: true }] })
  }),

  http.patch(URL("conversaciones/:id/eleccion/cerrar"), async ({ params }) => {
    await delay(200)
    const e = elecciones.find((x) => x.conversacionId === Number(params.id))
    const conv = conversaciones.find((c) => c.id === Number(params.id))
    if (!e || !conv) return HttpResponse.json({ message: "Este canal no tiene una elección." }, { status: 404 })
    if (e.cerradaManualmente || (e.fechaCierre && Date.parse(e.fechaCierre) <= Date.now())) {
      return HttpResponse.json({ message: "La votación ya está cerrada." }, { status: 409 })
    }
    e.cerradaManualmente = true
    conv.actividadAbierta = false
    return HttpResponse.json({ rows: [conv] })
  }),

  http.get(URL("conversaciones/:id/eleccion"), async ({ params, request }) => {
    await delay(200)
    const e = elecciones.find((x) => x.conversacionId === Number(params.id))
    if (!e) return HttpResponse.json({ message: "Este canal no tiene una elección." }, { status: 404 })
    simularVotos(e)
    const user = usuarioDe(request)
    const esEstudiante = user?.roles.includes("CEVAL-ESTUDIANTE") ?? false
    return HttpResponse.json({
      rows: [{ ...e, esCreador: e.esCreador && !esEstudiante, yaVoto: yaVoto(e.conversacionId, user?.email) }],
    })
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
    // Campana única: el aviso "entra a votar" va a la bandeja general.
    notificarEleccionAbierta(canal.id, nombre)
    elecciones.push({
      conversacionId: canal.id,
      nombre,
      descripcion: body.DESCRIPCION ?? "",
      fechaInicio: body.FECHA_INICIO ?? null,
      fechaCierre: body.FECHA_CIERRE ?? null,
      jornadaId: body.FK_JORNADA,
      verResultadosEnVivo: body.VER_RESULTADOS === "S",
      candidatos: candidatos.map((c, i) => ({
        id: i + 1,
        nombre: c.NOMBRE,
        numero: c.NUMERO,
        lema: c.LEMA,
        fotoUrl: c.FOTO_URL,
        votos: 0,
      })),
      votosEnBlanco: 0,
      cerradaManualmente: false,
      yaVoto: false,
      totalHabilitados: body.VOTANTES?.length || 300,
      vieronCanal: 0,
      creadoPor: "Andrés Gómez",
      esCreador: true,
    })
    return HttpResponse.json({ rows: [canal] })
  }),
]
