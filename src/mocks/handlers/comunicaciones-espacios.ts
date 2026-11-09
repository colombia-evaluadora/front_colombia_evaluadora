import { delay, http, HttpResponse } from "msw"

import type {
  ConfiguracionEspacio,
  EspacioDetalle,
  HerramientaEspacio,
  Participacion,
} from "@/features/comunicaciones/espacios/api/types"
import type { Equipo, Tema } from "@/features/comunicaciones/espacios/api/query/use-foro-equipos-query"

/**
 * Vitrina de espacios académicos para el env `dev` (MSW): un espacio abierto visto por su docente.
 * Sin persistencia, como el resto de los mocks. No replica las reglas por rol: esas se prueban
 * contra el backend (EspaciosIntegrationTest).
 */
const URL = (path: string) => `/api/eval-col/comunicaciones/espacios${path}`
const ID = 1
const ACTIVIDAD = 1

let herramientas: HerramientaEspacio[] = ["CHAT", "FORO", "ENCUESTAS", "EQUIPOS"]
let siguienteId = 100
const participantes = [
  { usuarioId: 1, nombre: "Julia Ramírez", rol: "PROPIETARIO" as const },
  { usuarioId: 2, nombre: "Sara Gil", rol: "ESTUDIANTE" as const },
  { usuarioId: 3, nombre: "Tomás Díaz", rol: "ESTUDIANTE" as const },
]

function nueva(texto: string, autorId = 1): Participacion {
  const autor = participantes.find((p) => p.usuarioId === autorId)
  return {
    id: siguienteId++,
    autorId,
    autor: autor?.nombre ?? "",
    esPropia: autorId === 1,
    texto,
    fecha: new Date().toISOString(),
    editada: false,
    fijada: false,
    retirada: false,
    oculta: false,
    motivoOculta: null,
    editable: autorId === 1,
    adjuntos: [],
    menciones: [],
    meMenciona: false,
  }
}

const chat: Participacion[] = [nueva("Bienvenidos al espacio."), nueva("Gracias, profe.", 2)]
const temas: Tema[] = [
  {
    id: 1,
    titulo: "¿De dónde viene el agua que tomamos?",
    equipoId: null,
    apertura: nueva("Cuenten lo que encontraron."),
    respuestas: 1,
    solucionId: null,
    siguiendo: true,
  },
]
const respuestas = new Map<number, Participacion[]>([[1, [nueva("Del río, pasa por una planta.", 2)]]])
const equipos: Equipo[] = [{ id: 1, nombre: "Equipo A", miembros: [{ usuarioId: 2, nombre: "Sara Gil" }] }]
const chatEquipos = new Map<number, Participacion[]>()

const detalle = (): EspacioDetalle => ({
  espacio: {
    id: ID,
    actividadId: ACTIVIDAD,
    actividad: "Debate: el agua en la ciudad",
    asignatura: "Ciencias",
    grupo: "7°B",
    docente: "Julia Ramírez",
    fechaInicio: "2026-01-01",
    fechaCierre: "2099-12-31",
    estado: "ABIERTO",
    rol: "PROPIETARIO",
  },
  herramientas,
  conContenido: ["CHAT", "FORO", "EQUIPOS"],
  puedeEscribir: true,
  puedeAdministrar: true,
  silenciado: false,
  silenciados: [],
})

const configuracion = (): ConfiguracionEspacio => ({
  espacioId: ID,
  herramientas,
  tieneContenido: true,
  puedeEditar: true,
})

const filas = (rows: unknown[]) => HttpResponse.json({ rows })
const todas = () => [...chat, ...temas.map((t) => t.apertura), ...[...respuestas.values()].flat()]

function miembrosDe(ids: number[]) {
  return ids.map((usuarioId) => ({
    usuarioId,
    nombre: participantes.find((p) => p.usuarioId === usuarioId)?.nombre ?? "",
  }))
}

export const comunicacionesEspaciosHandlers = [
  http.get(URL(""), async () => {
    await delay(150)
    return filas([detalle().espacio])
  }),
  http.get(URL("/actividad/:actividad"), ({ params }) =>
    filas([
      Number(params.actividad) === ACTIVIDAD
        ? configuracion()
        : { espacioId: null, herramientas: [], tieneContenido: false, puedeEditar: true },
    ]),
  ),
  http.put(URL("/actividad/:actividad"), async ({ request }) => {
    const body = (await request.json()) as { HERRAMIENTAS: HerramientaEspacio[] }
    herramientas = body.HERRAMIENTAS
    return filas([configuracion()])
  }),
  http.patch(URL("/actividad/:actividad/quitar"), () =>
    HttpResponse.json({ message: "No se puede cambiar el espacio porque ya tiene participaciones." }, { status: 409 }),
  ),
  http.get(URL("/:id"), () => filas([detalle()])),
  http.get(URL("/:id/participantes"), () => filas(participantes)),
  http.get(URL("/:id/materiales"), () =>
    filas([{ id: 1, tipo: "Enlace", url: "https://example.org/agua", archivoId: null, archivoNombre: null, descripcion: "Lectura" }]),
  ),
  http.get(URL("/:id/buscar"), ({ request }) => {
    const texto = (new globalThis.URL(request.url).searchParams.get("texto") ?? "").toLowerCase()
    return filas(
      todas()
        .filter((p) => p.texto?.toLowerCase().includes(texto))
        .map((participacion) => ({ participacion, donde: "CHAT", temaId: null, equipoId: null })),
    )
  }),
  http.get(URL("/:id/chat/mensajes"), ({ request }) => {
    const equipo = Number(new globalThis.URL(request.url).searchParams.get("equipo"))
    return filas(equipo ? (chatEquipos.get(equipo) ?? []) : chat)
  }),
  http.post(URL("/:id/chat/mensajes"), async ({ request }) => {
    const body = (await request.json()) as { TEXTO: string; FK_EQUIPO?: number }
    const m = nueva(body.TEXTO)
    if (body.FK_EQUIPO) chatEquipos.set(body.FK_EQUIPO, [...(chatEquipos.get(body.FK_EQUIPO) ?? []), m])
    else chat.push(m)
    return filas([m])
  }),
  http.patch(URL("/:id/mensajes/:mensaje"), async ({ params, request }) => {
    const body = (await request.json()) as { TEXTO: string }
    const m = todas().find((p) => p.id === Number(params.mensaje))
    if (!m) return HttpResponse.json({ message: "La participación ya no existe." }, { status: 404 })
    m.texto = body.TEXTO
    m.editada = true
    return filas([m])
  }),
  http.patch(URL("/:id/mensajes/:mensaje/:accion"), async ({ params, request }) => {
    const m = todas().find((p) => p.id === Number(params.mensaje))
    if (!m) return HttpResponse.json({ message: "La participación ya no existe." }, { status: 404 })
    const body = params.accion === "retirar" ? {} : ((await request.json()) as { FIJADO?: boolean; MOTIVO?: string })
    if (params.accion === "retirar") m.retirada = true
    if (params.accion === "fijar") m.fijada = Boolean(body.FIJADO)
    if (params.accion === "ocultar") {
      m.oculta = true
      m.motivoOculta = body.MOTIVO ?? null
      m.texto = null
    }
    return filas([m])
  }),
  http.post(URL("/:id/silenciados"), () => new HttpResponse(null, { status: 204 })),
  http.patch(URL("/:id/silenciados/:usuario/reactivar"), () => new HttpResponse(null, { status: 204 })),
  http.get(URL("/:id/foro/temas"), ({ request }) => {
    const equipo = Number(new globalThis.URL(request.url).searchParams.get("equipo")) || null
    return filas(temas.filter((t) => t.equipoId === equipo))
  }),
  http.post(URL("/:id/foro/temas"), async ({ request }) => {
    const body = (await request.json()) as { TITULO: string; TEXTO: string; FK_EQUIPO?: number }
    const t: Tema = {
      id: siguienteId++,
      titulo: body.TITULO,
      equipoId: body.FK_EQUIPO ?? null,
      apertura: nueva(body.TEXTO),
      respuestas: 0,
      solucionId: null,
      siguiendo: true,
    }
    temas.unshift(t)
    return filas([t])
  }),
  http.get(URL("/:id/foro/temas/:tema"), ({ params }) => {
    const t = temas.find((x) => x.id === Number(params.tema))
    if (!t) return HttpResponse.json({ message: "El tema no existe." }, { status: 404 })
    return filas([{ tema: t, respuestas: respuestas.get(t.id) ?? [] }])
  }),
  http.post(URL("/:id/foro/temas/:tema/respuestas"), async ({ params, request }) => {
    const body = (await request.json()) as { TEXTO: string }
    const id = Number(params.tema)
    const m = nueva(body.TEXTO)
    respuestas.set(id, [...(respuestas.get(id) ?? []), m])
    const t = temas.find((x) => x.id === id)
    if (t) t.respuestas += 1
    return filas([m])
  }),
  http.patch(URL("/:id/foro/temas/:tema/seguir"), async ({ params, request }) => {
    const body = (await request.json()) as { SEGUIR: boolean }
    const t = temas.find((x) => x.id === Number(params.tema))
    if (t) t.siguiendo = body.SEGUIR
    return new HttpResponse(null, { status: 204 })
  }),
  http.patch(URL("/:id/foro/temas/:tema/solucion"), async ({ params, request }) => {
    const body = (await request.json()) as { FK_MENSAJE: number | null }
    const t = temas.find((x) => x.id === Number(params.tema))
    if (!t) return HttpResponse.json({ message: "El tema no existe." }, { status: 404 })
    t.solucionId = body.FK_MENSAJE
    return filas([t])
  }),
  http.get(URL("/:id/equipos"), () => filas(equipos)),
  http.post(URL("/:id/equipos"), async ({ request }) => {
    const body = (await request.json()) as { NOMBRE: string; MIEMBROS: number[] }
    equipos.forEach((q) => (q.miembros = q.miembros.filter((m) => !body.MIEMBROS.includes(m.usuarioId))))
    equipos.push({ id: siguienteId++, nombre: body.NOMBRE, miembros: miembrosDe(body.MIEMBROS) })
    return filas(equipos)
  }),
  // Mover (M.3.HER.3): sale de su equipo y entra al destino en un solo paso, como comms-service.
  // Registrado antes de `/:id/equipos/:equipo` aunque el método difiera, por si alguien suma un POST ahí.
  http.post(URL("/:id/equipos/mover"), async ({ request }) => {
    const body = (await request.json()) as { FK_ESTUDIANTE: number; FK_EQUIPO: number }
    const destino = equipos.find((x) => x.id === body.FK_EQUIPO)
    if (!destino) return HttpResponse.json({ message: "El equipo no existe." }, { status: 404 })
    if (!destino.miembros.some((m) => m.usuarioId === body.FK_ESTUDIANTE)) {
      equipos.forEach((q) => (q.miembros = q.miembros.filter((m) => m.usuarioId !== body.FK_ESTUDIANTE)))
      destino.miembros = [...destino.miembros, ...miembrosDe([body.FK_ESTUDIANTE])]
    }
    return filas(equipos)
  }),
  http.put(URL("/:id/equipos/:equipo"), async ({ params, request }) => {
    const body = (await request.json()) as { NOMBRE: string; MIEMBROS: number[] }
    const id = Number(params.equipo)
    equipos.forEach((q) => {
      if (q.id !== id) q.miembros = q.miembros.filter((m) => !body.MIEMBROS.includes(m.usuarioId))
    })
    const q = equipos.find((x) => x.id === id)
    if (q) {
      q.nombre = body.NOMBRE
      q.miembros = miembrosDe(body.MIEMBROS)
    }
    return filas(equipos)
  }),
]
