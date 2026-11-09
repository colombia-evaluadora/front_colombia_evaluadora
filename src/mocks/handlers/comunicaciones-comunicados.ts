import { http, HttpResponse, delay } from "msw"
import { consumirBorradorActividad } from "@/mocks/handlers/comunicaciones-borradores-actividad"

import type {
  Audiencia,
  Comunicado,
  Conversacion,
  DestinosComunicado,
  EstadoComunicado,
} from "@/features/comunicaciones/chat/api/types"
import { formatoDeArchivo, validarAdjunto } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { conversaciones, personas, USUARIO_ACTUAL } from "@/mocks/db/comunicaciones"
import {
  alcanceComunicadoMock,
  opcionesComunicadoMock,
  personaChat,
  personasAlcanceMock,
  puedeCrearComunicadosMock,
} from "@/mocks/db/comunicaciones-seleccion"
import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"
import { comunicados } from "@/mocks/db/comunicaciones-comunicados"
import { registrarArchivoMaterial } from "@/mocks/db/planeador"

const URL = (path: string) => `/api/eval-col/comunicaciones/${path}`

type OpcionIn = { VALOR?: string; ETIQUETA?: string }

interface CrearComunicadoBody {
  TITULO?: string
  DESCRIPCION?: string
  AUDIENCIA?: Audiencia[]
  DESTINOS?: Partial<Record<"GRADOS" | "GRUPOS" | "ROLES" | "USUARIOS" | "GRUPOS_CHAT" | "SEDES" | "JORNADAS", OpcionIn[]>> & {
    PARA?: DestinosComunicado["para"]
    ESTABLECIMIENTO?: OpcionIn | null
  }
  PUBLICAR_EN?: string
  CONTENIDO_HTML?: string
  IMPORTANTE?: "S" | "N"
  PERMITIR_RESPUESTAS?: "S" | "N"
  VISIBLE_HASTA?: string | null
  MODALIDAD?: string | null
  CICLO?: number | null
}

const MAX_ADJUNTOS = 5
const MAX_BYTES_ADJUNTO = 10 * 1024 * 1024

// Igual que comms-service: guarda la selección con su etiqueta para "Dirigido a".
function destinosDe(body: CrearComunicadoBody): DestinosComunicado {
  const l = (x?: OpcionIn[]) =>
    (x ?? []).filter((o) => o.VALOR).map((o) => ({ valor: String(o.VALOR), etiqueta: o.ETIQUETA ?? String(o.VALOR) }))
  const d = body.DESTINOS ?? {}
  return {
    grados: l(d.GRADOS),
    grupos: l(d.GRUPOS),
    roles: l(d.ROLES),
    usuarios: l(d.USUARIOS),
    gruposChat: l(d.GRUPOS_CHAT),
    para: d.PARA === "ACUDIENTES" || d.PARA === "AMBOS" ? d.PARA : "ESTUDIANTES",
    establecimiento: l(d.ESTABLECIMIENTO ? [d.ESTABLECIMIENTO] : [])[0] ?? null,
    sedes: l(d.SEDES),
    jornadas: l(d.JORNADAS),
  }
}

const vacios = (d: DestinosComunicado) =>
  d.grados.length + d.grupos.length + d.roles.length + d.usuarios.length + d.gruposChat.length === 0

const claveDestinos = (d: DestinosComunicado | null | undefined) =>
  JSON.stringify(
    d ? [d.grados, d.grupos, d.roles, d.usuarios, d.gruposChat].map((l) => l.map((o) => o.valor).sort()) : [],
  )

function incompleto(body: CrearComunicadoBody) {
  return (
    !body.TITULO?.trim() ||
    (!body.AUDIENCIA?.length && vacios(destinosDe(body))) ||
    !body.PUBLICAR_EN ||
    !body.CONTENIDO_HTML?.trim()
  )
}

const INCOMPLETO = { message: "Completa el título, los destinatarios, la fecha y el contenido." }

// Registro de recepción simulado: en el mock solo hay quien publica, así que la lista sale del
// directorio de personas (unas leídas, otras no).
const recepcionMock = (c: Comunicado) =>
  personas.slice(0, Math.max(1, Math.min(personas.length, c.totalDestinatarios ?? 4))).map((p, i) => ({
    usuarioId: p.id,
    nombre: p.nombre,
    estado: i < (c.leidos ?? 0) ? ("LEIDO" as const) : ("NO_LEIDO" as const),
    entregadoEn: new Date(c.publicarEn) <= new Date() ? c.publicarEn : null,
    vistoEn: i < (c.leidos ?? 0) ? new Date(Date.now() - (i + 1) * 3_600_000).toISOString() : null,
  }))

function buscarComunicado(id: string | readonly string[] | undefined) {
  return comunicados.find((x) => x.conversacionId === Number(id))
}

const SIN_PERMISO = () => HttpResponse.json({ message: "Tu perfil no puede crear comunicados." }, { status: 403 })
const FUERA = () =>
  HttpResponse.json(
    {
      message:
        "Hay destinatarios fuera de tu alcance: solo puedes enviar a tu establecimiento y a lo que está por debajo de tu cargo.",
    },
    { status: 403 },
  )

// Persona del chat de cada cuenta del mock (la docente es Darlene, 2).
const yoDe = (email: string) => (email === "docente@example.com" ? 2 : email === "user@example.com" ? 3 : USUARIO_ACTUAL.id)

/** Grupos, personas o audiencias de funcionarios fuera del alcance de quien publica (403). */
function fueraDeAlcance(roles: readonly string[], email: string, body: CrearComunicadoBody): boolean {
  const a = alcanceComunicadoMock(roles)
  if (a.todos) return false
  const d = body.DESTINOS ?? {}
  const grupos = (d.GRUPOS ?? []).map((o) => Number(o.VALOR))
  const usuarios = (d.USUARIOS ?? []).map((o) => Number(o.VALOR))
  const permitidas = a.funcionarios.length ? null : ["ESTUDIANTES", "PADRES"]
  const alcance = personasAlcanceMock(a, yoDe(email))
  return (
    grupos.some((g) => !a.grupos.includes(g)) ||
    usuarios.some((i) => !alcance.includes(i)) ||
    (!!permitidas && (body.AUDIENCIA ?? []).some((x) => !permitidas.includes(x)))
  )
}

// Igual que fn_comunicado_estado: lo final se guarda; lo demás sale de las fechas.
function estadoDe(c: Comunicado): EstadoComunicado {
  if (c.estado === "ANULADO" || c.estado === "CANCELADO") return c.estado
  if (new Date(c.publicarEn) > new Date()) return "PROGRAMADO"
  const hoy = new Date().toISOString().slice(0, 10)
  return c.visibleHasta && c.visibleHasta < hoy ? "VENCIDO" : "PUBLICADO"
}

const conEstado = (c: Comunicado): Comunicado => ({ ...c, estado: estadoDe(c) })

const filaTerritorial = (c: Comunicado) => ({
  id: c.conversacionId,
  titulo: c.titulo,
  publicarEn: c.publicarEn,
  establecimientoId: 1,
  establecimiento: "IE Central",
  publicadoPor: c.publicadoPor,
  audiencia: c.audiencia,
  destinos: c.destinos ?? null,
  destinatarios: c.totalDestinatarios ?? 0,
  estado: estadoDe(c),
  importante: !!c.importante,
})

const sinComunicado = () => HttpResponse.json({ message: "Esta conversación no tiene un comunicado." }, { status: 404 })

export const comunicacionesComunicadosHandlers = [
  // "Editar Comunicado": texto, importante y respuestas siempre; destinatarios y fecha mientras siga programado.
  http.patch(URL("conversaciones/:id/comunicado"), async ({ params, request }) => {
    await delay(250)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    if (["ANULADO", "CANCELADO"].includes(estadoDe(c))) {
      return HttpResponse.json(
        { message: "El comunicado ya no se puede modificar porque fue anulado o cancelado." },
        { status: 409 },
      )
    }
    const body = (await request.json()) as CrearComunicadoBody
    if (incompleto(body)) return HttpResponse.json(INCOMPLETO, { status: 400 })
    const destinos = destinosDe(body)
    const publicado = new Date(c.publicarEn) <= new Date()
    const cambiaAudiencia =
      [...(body.AUDIENCIA ?? [])].sort().join() !== [...c.audiencia].sort().join() ||
      claveDestinos(destinos) !== claveDestinos(c.destinos)
    const cambiaFecha = new Date(body.PUBLICAR_EN as string).getTime() !== new Date(c.publicarEn).getTime()
    if (publicado && (cambiaAudiencia || cambiaFecha)) {
      return HttpResponse.json(
        {
          message:
            "El comunicado ya se publicó: solo puedes cambiar el título, la descripción, el contenido, la marca de importante y las respuestas.",
        },
        { status: 409 },
      )
    }
    const titulo = (body.TITULO as string).trim()
    Object.assign(c, {
      titulo,
      descripcion: body.DESCRIPCION ?? "",
      audiencia: body.AUDIENCIA ?? [],
      destinos,
      publicarEn: body.PUBLICAR_EN,
      contenidoHtml: body.CONTENIDO_HTML,
      importante: body.IMPORTANTE === "S",
      permiteRespuestas: body.PERMITIR_RESPUESTAS === "S",
      visibleHasta: body.VISIBLE_HASTA ?? null,
      modalidad: body.MODALIDAD ?? null,
      ciclo: body.CICLO ?? null,
    })
    const conv = conversaciones.find((x) => x.id === c.conversacionId)
    if (conv) Object.assign(conv, { nombre: titulo, importante: c.importante, comunicadoEstado: estadoDe(c) })
    // Guardar la edición desde su borrador (?borrador) lo elimina, como comms-service.
    consumirBorradorActividad(request)
    return HttpResponse.json({ rows: [conEstado(c)] })
  }),

  http.patch(URL("conversaciones/:id/comunicado/anular"), async ({ params, request }) => {
    await delay(200)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    const { MOTIVO } = (await request.json()) as { MOTIVO?: string }
    if (!MOTIVO?.trim()) {
      return HttpResponse.json({ message: "Escribe el motivo de la anulación (máximo 500 caracteres)." }, { status: 400 })
    }
    if (!["PUBLICADO", "VENCIDO"].includes(estadoDe(c))) {
      return HttpResponse.json({ message: "Solo se puede anular un comunicado publicado o vencido." }, { status: 409 })
    }
    Object.assign(c, { estado: "ANULADO", motivoAnulacion: MOTIVO.trim(), adjuntos: [] })
    const conv = conversaciones.find((x) => x.id === c.conversacionId)
    if (conv) conv.comunicadoEstado = "ANULADO"
    return HttpResponse.json({ rows: [c] })
  }),

  http.patch(URL("conversaciones/:id/comunicado/cancelar"), async ({ params }) => {
    await delay(200)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    if (estadoDe(c) !== "PROGRAMADO") {
      return HttpResponse.json({ message: "Solo se puede cancelar un comunicado programado." }, { status: 409 })
    }
    c.estado = "CANCELADO"
    const conv = conversaciones.find((x) => x.id === c.conversacionId)
    if (conv) conv.comunicadoEstado = "CANCELADO"
    return HttpResponse.json({ rows: [c] })
  }),

  http.get(URL("conversaciones/:id/comunicado/recepcion"), async ({ params }) => {
    await delay(200)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    if (!c.esCreador) {
      return HttpResponse.json({ message: "Solo quien publicó el comunicado ve su recepción." }, { status: 403 })
    }
    return HttpResponse.json({ rows: recepcionMock(c) })
  }),

  http.get(URL("conversaciones/:id/comunicado"), async ({ params }) => {
    await delay(200)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    return HttpResponse.json({ rows: [conEstado(c)] })
  }),

  // Adjunto: el front lo manda como multipart por file-service (campo ADJUNTO). El binario queda
  // como object URL (mismo registro que los materiales del planeador) para ver y descargar.
  http.post(`*/api/files/eval-col/comunicaciones/conversaciones/:id/comunicado/adjuntos`, async ({ params, request }) => {
    await delay(400)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    const archivo = (await request.formData()).get("ADJUNTO")
    if (!(archivo instanceof File)) return HttpResponse.json({ message: "Falta el archivo adjunto." }, { status: 400 })
    const error = validarAdjunto(archivo)
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    if (archivo.size > MAX_BYTES_ADJUNTO) {
      return HttpResponse.json({ message: "El archivo supera el máximo de 10 MB." }, { status: 400 })
    }
    c.adjuntos = c.adjuntos ?? []
    if (c.adjuntos.length >= MAX_ADJUNTOS) {
      return HttpResponse.json({ message: `Un comunicado admite hasta ${MAX_ADJUNTOS} archivos.` }, { status: 400 })
    }
    const archivoId = registrarArchivoMaterial(archivo)
    c.adjuntos.push({ id: archivoId, archivoId, nombre: archivo.name, formato: formatoDeArchivo(archivo), peso: archivo.size })
    return HttpResponse.json({ rows: [c] })
  }),

  http.patch(URL("conversaciones/:id/comunicado/adjuntos/:adjunto/eliminar"), async ({ params }) => {
    await delay(200)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    c.adjuntos = (c.adjuntos ?? []).filter((a) => a.id !== Number(params.adjunto))
    return HttpResponse.json({ rows: [c] })
  }),

  http.post(URL("conversaciones/:id/comunicado/avisar"), async ({ params }) => {
    await delay(150)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    return HttpResponse.json({ rows: [c] })
  }),

  // Selector de destinatarios: solo lo que está en el alcance de quien publica.
  // Cascada del formulario del informe (Guía M.1.AGR.1). La jornada Tarde (3) no tiene períodos
  // Abiertos, para poder ver el bloqueo de M.1.AGR.5.
  http.get(URL("comunicados/destinos/cascada"), async ({ request }) => {
    await delay(120)
    const q = new globalThis.URL(request.url).searchParams
    const op = (valor: string, etiqueta: string, detalle: string | null = null) => ({ valor, etiqueta, detalle, total: 0 })
    const sede = q.get("sede")
    const jornada = q.get("jornada")
    const abierto = !!sede && !!jornada && jornada !== "3"
    const periodo =
      abierto && q.get("anio") === "2027" && q.get("modalidad") && q.get("ciclo")
        ? {
            id: 300,
            anio: 2027,
            modalidad: q.get("modalidad"),
            nombreModalidad: q.get("modalidad") === "ANUAL" ? "Anual" : "Semestral",
            ciclo: Number(q.get("ciclo")),
            fechaInicio: "2027-01-25",
            nombre: null,
          }
        : null
    return HttpResponse.json({
      rows: [
        {
          establecimientos: [op("1", "IE Central")],
          sedes: q.get("establecimiento") ? [op("1", "Principal"), op("2", "Norte")] : [],
          jornadas: sede ? [op("1", "Mañana"), op("3", "Tarde")] : [],
          anios: abierto ? [op("2027", "2027")] : [],
          modalidades: abierto && q.get("anio") ? [op("ANUAL", "Anual"), op("SEMESTRAL", "Semestral")] : [],
          ciclos: abierto && q.get("modalidad") ? (q.get("modalidad") === "ANUAL" ? [op("1", "1")] : [op("1", "1"), op("2", "2")]) : [],
          periodo,
          grados: periodo ? [op("6", "Sexto"), op("7", "Séptimo")] : [],
          grupos: periodo && q.get("grado") ? [op("61", "A"), op("62", "B")] : [],
          estudiantes: periodo && q.get("grupo") ? [op("901", "Moreno Silva Andrés"), op("902", "Rincón Gil Laura")] : [],
          // Sin jornada = Todas las jornadas (conjunto solo de funcionarios).
          roles: sede ? [op("Responsable de enseñanza", "Responsable de enseñanza"), op("Supervisor de sede", "Supervisor de sede")] : [],
          funcionarios: sede
            ? [op("11", "López Marta", "Supervisor de sede"), op("12", "Rojas Andrés", "Responsable de enseñanza")]
            : [],
        },
      ],
    })
  }),

  http.get(URL("comunicados/destinos/opciones"), async ({ request }) => {
    await delay(150)
    const u = usuarioDe(request)
    if (!u || !puedeCrearComunicadosMock(u.roles)) return SIN_PERMISO()
    const q = new globalThis.URL(request.url).searchParams
    const a = alcanceComunicadoMock(u.roles)
    if (q.get("establecimiento") && !a.todos && q.get("establecimiento") !== "1") return FUERA()
    return HttpResponse.json({
      rows: [
        {
          ...opcionesComunicadoMock(a, { establecimiento: q.get("establecimiento") ?? undefined, jornada: q.get("jornada") ?? undefined }),
          modalidades: [{ valor: "ANUAL", etiqueta: "Anual", total: 0 }],
          ciclos: q.get("modalidad") ? [{ valor: "1", etiqueta: "1", total: 0 }] : [],
        },
      ],
    })
  }),

  // Previsualización de destinatarios: conteo fijo, coherente con los 409 destinatarios del mock.
  http.post(URL("comunicados/destinos/previsualizar"), async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as CrearComunicadoBody
    const u = usuarioDe(request)
    if (u && !puedeCrearComunicadosMock(u.roles)) return SIN_PERMISO()
    if (u && fueraDeAlcance(u.roles, u.email, body)) return FUERA()
    if (Array.isArray((body as { CONJUNTOS?: unknown[] }).CONJUNTOS)) {
      return HttpResponse.json({
        rows: [
          {
            unicos: 214,
            estudiantes: 102,
            acudientes: 112,
            funcionarios: 0,
            otros: 0,
            sinCuenta: 7,
            conAviso: 205,
            soloCorreo: 2,
            sinCanal: [{ nombre: "Rincón Rosa", tipo: "Acudiente", motivo: "Sin cuenta ni correo", grupo: "Sexto A" }],
            avisos: [],
            estudiantesReferencia: 102,
          },
        ],
      })
    }
    if ((body.AUDIENCIA ?? []).length === 0 && vacios(destinosDe(body))) {
      return HttpResponse.json({ message: "Elige al menos un destinatario." }, { status: 400 })
    }
    return HttpResponse.json({
      rows: [{ unicos: 409, estudiantes: 250, acudientes: 130, funcionarios: 29, otros: 0, sinCuenta: 3 }],
    })
  }),

  // Consulta territorial (M.1.TER.1): solo lectura; un establecimiento fijo basta para el mock.
  http.get(URL("comunicados/territorial/establecimientos"), async () => {
    await delay(100)
    return HttpResponse.json({ rows: [{ valor: "1", etiqueta: "IE Central", detalle: null, total: 0 }] })
  }),

  // Como comms-service: Programado, Publicado, Vencido y Anulado (no Cancelado), filtros y página
  // 0-based con `totalCount` al lado de `rows`.
  http.get(URL("comunicados/territorial"), async ({ request }) => {
    await delay(150)
    const sp = new globalThis.URL(request.url).searchParams
    const estado = sp.get("estado")
    const desde = sp.get("desde")
    const q = (sp.get("q") ?? "").toLowerCase()
    const pagina = Number(sp.get("pagina") ?? 0)
    const tamano = Number(sp.get("tamano") ?? 20)
    const filas = comunicados
      .map(filaTerritorial)
      .filter((c) => c.estado !== "CANCELADO")
      .filter((c) => !estado || c.estado === estado)
      .filter((c) => !desde || c.publicarEn.slice(0, 10) >= desde)
      .filter((c) => !q || c.titulo.toLowerCase().includes(q))
      .sort((a, b) => b.publicarEn.localeCompare(a.publicarEn))
    return HttpResponse.json({
      rows: filas.slice(pagina * tamano, (pagina + 1) * tamano),
      totalCount: filas.length,
      pagina,
      tamano,
    })
  }),

  http.get(URL("comunicados/territorial/:id"), async ({ params }) => {
    await delay(100)
    const c = comunicados.find((x) => x.conversacionId === Number(params.id))
    if (!c) return sinComunicado()
    return HttpResponse.json({
      rows: [{ comunicado: filaTerritorial(c), contenidoHtml: c.contenidoHtml, visibleHasta: c.visibleHasta ?? null, adjuntos: [] }],
    })
  }),

  http.get(URL("comunicados/destinos/personas"), async ({ request }) => {
    await delay(150)
    const u = usuarioDe(request)
    if (!u || !puedeCrearComunicadosMock(u.roles)) return SIN_PERMISO()
    const q = (new globalThis.URL(request.url).searchParams.get("q") ?? "").toLowerCase()
    const a = alcanceComunicadoMock(u.roles)
    const ids = a.todos ? [...personas.map((p) => p.id)] : personasAlcanceMock(a, yoDe(u.email))
    const filas = ids
      .map((i) => personaChat(i))
      .filter((p): p is NonNullable<typeof p> => !!p && (!q || p.nombre.toLowerCase().includes(q)))
    return HttpResponse.json({ rows: filas })
  }),

  http.post(URL("comunicados"), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as CrearComunicadoBody
    // Permiso dinámico (menú COMUNICADOS del rol) y alcance jerárquico, como comms-service.
    const u = usuarioDe(request)
    if (u && !puedeCrearComunicadosMock(u.roles)) return SIN_PERMISO()
    if (u && fueraDeAlcance(u.roles, u.email, body)) return FUERA()
    // Formulario del informe: llega MENSAJE y CONJUNTOS en lugar de audiencia y HTML.
    const documento = body as { CONJUNTOS?: unknown[]; MENSAJE?: string; PUBLICACION?: string }
    if (Array.isArray(documento.CONJUNTOS)) {
      body.CONTENIDO_HTML = `<p>${(documento.MENSAJE ?? "").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`
      body.AUDIENCIA = ["ESTUDIANTES", "PADRES"]
      if (documento.PUBLICACION !== "PROGRAMADA") body.PUBLICAR_EN = new Date().toISOString()
    }
    if (incompleto(body)) return HttpResponse.json(INCOMPLETO, { status: 400 })
    const titulo = (body.TITULO as string).trim()
    if (conversaciones.some((c) => c.nombre.toLowerCase() === titulo.toLowerCase())) {
      return HttpResponse.json({ message: `Ya existe una conversación llamada ${titulo}.` }, { status: 409 })
    }
    const importante = body.IMPORTANTE === "S"
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
      importante,
    }
    conversaciones.push(canal)
    consumirBorradorActividad(request)
    comunicados.push({
      conversacionId: canal.id,
      titulo,
      descripcion: body.DESCRIPCION ?? "",
      audiencia: body.AUDIENCIA ?? [],
      destinos: destinosDe(body),
      publicarEn: body.PUBLICAR_EN as string,
      contenidoHtml: body.CONTENIDO_HTML as string,
      publicadoPor: "Andrés Gómez",
      esCreador: true,
      leidos: 0,
      totalDestinatarios: 409,
      importante,
      permiteRespuestas: body.PERMITIR_RESPUESTAS === "S",
      adjuntos: [],
      mensajeId: null,
      visibleHasta: body.VISIBLE_HASTA ?? null,
      modalidad: body.MODALIDAD ?? null,
      ciclo: body.CICLO ?? null,
    })
    canal.comunicadoEstado = new Date(body.PUBLICAR_EN as string) > new Date() ? "PROGRAMADO" : "PUBLICADO"
    return HttpResponse.json({ rows: [canal] })
  }),
]
