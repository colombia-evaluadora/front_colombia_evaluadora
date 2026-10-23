import { http, HttpResponse, delay } from "msw"
import { consumirBorradorActividad } from "@/mocks/handlers/comunicaciones-borradores-actividad"
import { notificarEleccionAbierta, notificarResultados } from "@/mocks/db/comunicaciones-notificaciones-puente"

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
  COMENTARIOS?: "S" | "N"
  VOTANTES?: number[]
  CANDIDATOS?: Array<{ NOMBRE: string; NUMERO: string; LEMA: string; FOTO_URL: string | null }>
}

// PDF mínimo válido de una página para el informe final en modo mock (el real lo arma comms-service).
function pdfMinimo(lineas: string[]) {
  const texto = lineas
    .map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 56 ${740 - i * 22} Td (${l.replace(/[()\\]/g, "")}) Tj ET`)
    .join("\n")
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${texto.length} >>\nstream\n${texto}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ]
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  objetos.forEach((o, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  // Latin-1 para que las tildes salgan con WinAnsiEncoding.
  return Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 0xff)
}

export const comunicacionesEleccionesHandlers = [
  // Informe final del proceso electoral: como comms-service, solo quien la creó y ya cerrada.
  http.get(URL("conversaciones/:id/eleccion/informe"), async ({ params, request }) => {
    await delay(400)
    const e = elecciones.find((x) => x.conversacionId === Number(params.id))
    if (!e) return HttpResponse.json({ message: "Este canal no tiene una elección." }, { status: 404 })
    if (usuarioDe(request)?.roles.includes("CEVAL-ESTUDIANTE")) {
      return HttpResponse.json({ message: "Solo quien gestiona la elección puede generar el informe." }, { status: 403 })
    }
    if (!eleccionCerrada(e)) {
      return HttpResponse.json({ message: "El informe se genera cuando la votación cierra." }, { status: 409 })
    }
    const total = e.candidatos.reduce((s, c) => s + c.votos, 0) + e.votosEnBlanco
    const lineas = [
      "Informe final del proceso electoral",
      e.nombre,
      `Cierre: ${e.cerradaManualmente ? "manual" : "automático"}`,
      `Votantes habilitados: ${e.totalHabilitados} | Votaron: ${total}`,
      ...e.candidatos.map((c) => `${c.numero} ${c.nombre}: ${c.votos} votos`),
      `Voto en blanco: ${e.votosEnBlanco}`,
    ]
    return new HttpResponse(pdfMinimo(lineas), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="informe-eleccion-${e.conversacionId}.pdf"`,
      },
    })
  }),

  // "Editar Elección": como comms-service, solo antes del primer voto. El censo no cambia.
  http.patch(URL("conversaciones/:id/eleccion"), async ({ params, request }) => {
    await delay(250)
    const e = elecciones.find((x) => x.conversacionId === Number(params.id))
    if (!e) return HttpResponse.json({ message: "Este canal no tiene una elección." }, { status: 404 })
    if (usuarioDe(request)?.roles.includes("CEVAL-ESTUDIANTE")) {
      return HttpResponse.json({ message: "Solo quien creó la elección puede editarla." }, { status: 403 })
    }
    const votos = e.candidatos.reduce((s, c) => s + c.votos, 0) + e.votosEnBlanco
    if (votos > 0) return HttpResponse.json({ message: "La elección ya tiene votos: no se puede editar." }, { status: 409 })
    const body = (await request.json()) as CrearEleccionBody
    const nombre = body.NOMBRE?.trim()
    const candidatos = body.CANDIDATOS ?? []
    if (!nombre || !body.FK_JORNADA) {
      return HttpResponse.json({ message: "Completa el nombre y la jornada." }, { status: 400 })
    }
    if (candidatos.length < 2) return HttpResponse.json({ message: "Agrega al menos dos candidatos." }, { status: 400 })
    Object.assign(e, {
      nombre,
      descripcion: body.DESCRIPCION ?? "",
      fechaInicio: body.FECHA_INICIO ?? null,
      fechaCierre: body.FECHA_CIERRE ?? null,
      jornadaId: body.FK_JORNADA,
      verResultadosEnVivo: body.VER_RESULTADOS === "S",
      permiteComentarios: body.COMENTARIOS === "S",
      candidatos: candidatos.map((c, i) => ({
        id: i + 1,
        nombre: c.NOMBRE,
        numero: c.NUMERO,
        lema: c.LEMA,
        fotoUrl: c.FOTO_URL,
        votos: 0,
      })),
    })
    const conv = conversaciones.find((c) => c.id === e.conversacionId)
    if (conv) conv.nombre = nombre
    // Guardar la edición desde su borrador (?borrador) lo elimina, como comms-service.
    consumirBorradorActividad(request)
    return HttpResponse.json({ rows: [{ ...e, yaVoto: false }] })
  }),

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
    // comms-service avisa una vez a los participantes que ya hay resultados.
    notificarResultados(e.conversacionId, "ELECCION", e.nombre)
    return HttpResponse.json({ rows: [conv] })
  }),

  http.get(URL("conversaciones/:id/eleccion"), async ({ params, request }) => {
    await delay(200)
    const e = elecciones.find((x) => x.conversacionId === Number(params.id))
    if (!e) return HttpResponse.json({ message: "Este canal no tiene una elección." }, { status: 404 })
    // Solo la elección de ejemplo recibe votos simulados; una recién creada queda en cero (se
    // puede editar hasta el primer voto, como en comms-service).
    if (e.conversacionId === 5) simularVotos(e)
    // Cerró por fecha: el aviso de resultados sale una vez (comms-service lo revisa con su job).
    if (eleccionCerrada(e)) notificarResultados(e.conversacionId, "ELECCION", e.nombre)
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
      creadoPor: "Andrés Gómez",
      esCreador: true,
    }
    conversaciones.push(canal)
    consumirBorradorActividad(request)
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
      permiteComentarios: body.COMENTARIOS === "S",
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
