import { http, HttpResponse, delay } from "msw"

import type { Acta, EleccionProceso, Funcion, Padron, Postulacion, Proceso, Reclamacion, Designacion } from "@/features/comunicaciones/procesos/api/procesos"

/**
 * Vitrina de Procesos (M.4) en memoria: quien entra tiene todas las funciones y solo se simulan las
 * transiciones de etapa. Las reglas reales (conflictos, plazos, voto secreto) viven en comms-service.
 */
const BASE = "*/api/eval-col/comunicaciones/procesos"
const FUNCIONES: Funcion[] = ["ADMINISTRADOR", "REVISOR", "ESCRUTINIO", "SELECTOR", "RECLAMACIONES", "FORMALIZACION"]
const YO = 1

let seq = 100
const procesos: Proceso[] = []
const postulaciones: Postulacion[] = []
const padrones = new Map<number, Padron>()
const actas = new Map<number, Acta[]>()
const reclamaciones = new Map<number, Reclamacion[]>()
const designaciones = new Map<number, Designacion[]>()

const filas = (rows: unknown[]) => HttpResponse.json({ rows })
const noEncontrado = () => HttpResponse.json({ message: "No existe." }, { status: 404 })
const cuerpo = async (request: Request) => (await request.json().catch(() => ({}))) as Record<string, never>

const procesoDe = (eleccion: number) => procesos.find((p) => p.elecciones.some((e) => e.id === eleccion))
const eleccionDe = (id: number) => procesoDe(id)?.elecciones.find((e) => e.id === id)

function aEleccion(b: Record<string, never>, id: number): EleccionProceso {
  return {
    id,
    nombre: b.NOMBRE,
    titulares: b.TITULARES,
    suplentes: b.SUPLENTES,
    ejercicioDesde: b.EJERCICIO_DESDE,
    ejercicioHasta: b.EJERCICIO_HASTA,
    metodo: b.METODO,
    poblacionPostula: b.POBLACION_POSTULA,
    poblacionVota: b.POBLACION_VOTA,
    cursos: b.CURSOS,
    requisitos: b.REQUISITOS,
    autopostulacion: b.AUTOPOSTULACION === "S",
    porTerceros: b.POR_TERCEROS === "S",
    umbralPct: b.UMBRAL_PCT,
    participacionMinimaPct: b.PARTICIPACION_MINIMA_PCT,
    mecanismoEmpate: b.MECANISMO_EMPATE,
    jornada: b.FK_JORNADA,
    postulacionDesde: b.POSTULACION_DESDE,
    postulacionHasta: b.POSTULACION_HASTA,
    votacionInicio: b.VOTACION_INICIO,
    votacionCierre: b.VOTACION_CIERRE,
    reclamacionDias: b.RECLAMACION_DIAS,
    reclamacionHasta: null,
    etapa: "PREPARACION",
    condicion: "NORMAL",
    listaPublicadaEn: null,
    canal: null,
    eleccionAnterior: null,
  }
}

function nuevaActa(eleccion: number, tipo: Acta["tipo"], contenido: Acta["contenido"]) {
  const lista = actas.get(eleccion) ?? []
  const acta: Acta = { id: ++seq, version: lista.length + 1, tipo, creadoEn: new Date().toISOString(), contenido }
  actas.set(eleccion, [acta, ...lista])
  return acta
}

/** Cambia la etapa y responde el proceso, como la mayoría de acciones reales. */
function avanzar(id: number, cambios: Partial<EleccionProceso>) {
  const e = eleccionDe(id)
  if (!e) return noEncontrado()
  Object.assign(e, cambios)
  return filas([procesoDe(id)])
}

const aplicarId = (params: Record<string, unknown>, clave = "e") => Number(params[clave])

export const comunicacionesProcesosHandlers = [
  http.get(BASE, async () => {
    await delay(100)
    return filas(procesos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      elecciones: p.elecciones.length,
      etapa: p.elecciones[0]?.etapa ?? "PREPARACION",
      estado: p.publicadoEn ? "ABIERTO" : "BORRADOR",
      publicado: Boolean(p.publicadoEn),
      gestiona: true,
    })))
  }),
  http.get(`${BASE}/mios`, () => filas(procesos.filter((p) => p.publicadoEn).flatMap((p) => p.elecciones.map((e) => {
    const mia = postulaciones.find((x) => x.eleccion === e.id && x.usuario === YO)
    return {
      eleccion: e.id,
      proceso: p.id,
      procesoNombre: p.nombre,
      nombre: e.nombre,
      etapa: e.etapa,
      condicion: e.condicion,
      postulacionHasta: e.postulacionHasta,
      postulacion: mia?.id ?? null,
      postulacionEstado: mia?.estado ?? null,
      subsanarHasta: mia?.subsanarHasta ?? null,
      propuestoPor: null,
      puedePostular: e.etapa === "POSTULACIONES" && !mia,
      puedeProponer: false,
      enPadron: Boolean(e.canal),
      canal: e.canal,
      votacionCierre: e.votacionCierre,
      puedeReclamar: e.etapa === "RECLAMACIONES",
    }
  })))),
  http.get(`${BASE}/cursos`, () => filas(["6 A", "6 B", "9 A"])),
  http.get(`${BASE}/personas`, () => filas([{ id: 1, nombre: "Usuario de prueba" }, { id: 2, nombre: "Sara Gil" }, { id: 3, nombre: "Ana Ruiz" }])),

  http.post(BASE, async ({ request }) => {
    const b = await cuerpo(request)
    const p: Proceso = {
      id: ++seq,
      nombre: b.NOMBRE,
      objeto: b.OBJETO,
      reglamento: b.REGLAMENTO,
      version: 1,
      publicadoEn: null,
      misFunciones: FUNCIONES,
      puedeAnular: true,
      funciones: [],
      elecciones: [],
    }
    procesos.unshift(p)
    return filas([p])
  }),
  http.post(`${BASE}/:id/publicar`, ({ params }) => {
    const p = procesos.find((x) => x.id === aplicarId(params, "id"))
    if (!p) return noEncontrado()
    if (!p.elecciones.length) return HttpResponse.json({ message: "Agrega al menos una eleccion o seleccion." }, { status: 400 })
    p.publicadoEn = new Date().toISOString()
    p.elecciones.forEach((e) => { e.etapa = "POSTULACIONES" })
    return filas([p])
  }),
  http.post(`${BASE}/:id/elecciones`, async ({ params, request }) => {
    const p = procesos.find((x) => x.id === aplicarId(params, "id"))
    if (!p) return noEncontrado()
    p.elecciones.push(aEleccion(await cuerpo(request), ++seq))
    return filas([p])
  }),
  http.patch(`${BASE}/:id/eliminar`, ({ params }) => {
    const i = procesos.findIndex((x) => x.id === aplicarId(params, "id"))
    if (i >= 0) procesos.splice(i, 1)
    return filas([])
  }),

  // Rutas estáticas antes que `/:id`: MSW usa el primer match.
  http.put(`${BASE}/elecciones/:e`, async ({ params, request }) => {
    const id = aplicarId(params)
    const e = eleccionDe(id)
    if (!e) return noEncontrado()
    const { etapa, condicion } = e
    Object.assign(e, aEleccion(await cuerpo(request), id), { etapa, condicion })
    return filas([procesoDe(id)])
  }),
  http.patch(`${BASE}/elecciones/:e/eliminar`, ({ params }) => {
    const id = aplicarId(params)
    const p = procesoDe(id)
    if (!p) return noEncontrado()
    p.elecciones = p.elecciones.filter((e) => e.id !== id)
    return filas([p])
  }),
  http.post(`${BASE}/elecciones/:e/suspender`, ({ params }) => avanzar(aplicarId(params), { condicion: "SUSPENDIDA" })),
  http.post(`${BASE}/elecciones/:e/reanudar`, ({ params }) => avanzar(aplicarId(params), { condicion: "NORMAL" })),
  http.post(`${BASE}/elecciones/:e/anular`, ({ params }) => avanzar(aplicarId(params), { condicion: "ANULADA" })),
  http.post(`${BASE}/elecciones/:e/lista-definitiva`, ({ params }) =>
    avanzar(aplicarId(params), { etapa: "DECISION", listaPublicadaEn: new Date().toISOString() })),
  http.post(`${BASE}/elecciones/:e/abrir-votacion`, ({ params }) => avanzar(aplicarId(params), { canal: ++seq })),
  http.post(`${BASE}/elecciones/:e/publicar-resultados`, ({ params }) => {
    const id = aplicarId(params)
    const dias = eleccionDe(id)?.reclamacionDias
    return avanzar(id, dias
      ? { etapa: "RECLAMACIONES", reclamacionHasta: new Date(Date.now() + dias * 86_400_000).toISOString() }
      : { etapa: "FORMALIZACION" })
  }),

  http.post(`${BASE}/elecciones/:e/postulaciones`, async ({ params, request }) => {
    const b = await cuerpo(request)
    const p: Postulacion = {
      id: ++seq,
      eleccion: aplicarId(params),
      usuario: YO,
      nombre: "Usuario de prueba",
      propuestoPor: null,
      estado: "BORRADOR",
      propuesta: b.PROPUESTA,
      foto: null,
      presentadaEn: null,
      subsanarHasta: null,
      motivo: null,
      documentos: [],
      requisitos: [],
    }
    postulaciones.push(p)
    return filas([p])
  }),
  http.get(`${BASE}/elecciones/:e/postulaciones`, ({ params }) => filas(postulaciones.filter((p) => p.eleccion === aplicarId(params) && p.estado !== "BORRADOR"))),
  http.get(`${BASE}/elecciones/:e/candidaturas`, ({ params }) => filas(eleccionDe(aplicarId(params))?.listaPublicadaEn
    ? postulaciones.filter((p) => p.eleccion === aplicarId(params) && p.estado === "HABILITADA").map(({ id, nombre, propuesta, foto }) => ({ id, nombre, propuesta, foto }))
    : [])),
  http.get(`${BASE}/postulaciones/:id`, ({ params }) => filas(postulaciones.filter((p) => p.id === aplicarId(params, "id")))),
  http.put(`${BASE}/postulaciones/:id`, async ({ params, request }) => {
    const p = postulaciones.find((x) => x.id === aplicarId(params, "id"))
    if (!p) return noEncontrado()
    p.propuesta = (await cuerpo(request)).PROPUESTA
    return filas([p])
  }),
  http.post(`${BASE}/postulaciones/:id/:accion`, async ({ params, request }) => {
    const p = postulaciones.find((x) => x.id === aplicarId(params, "id"))
    if (!p) return noEncontrado()
    const b = await cuerpo(request)
    const estados: Record<string, Postulacion["estado"]> = { aceptar: "BORRADOR", rechazar: "RETIRADA", presentar: "PRESENTADA", retirar: "RETIRADA" }
    if (params.accion === "revisar") {
      p.estado = ({ HABILITAR: "HABILITADA", SUBSANAR: "SUBSANACION", NO_HABILITAR: "NO_HABILITADA" } as const)[b.DECISION as string] ?? p.estado
      p.motivo = b.MOTIVO
      p.subsanarHasta = b.LIMITE
    } else if (estados[String(params.accion)]) {
      p.estado = estados[String(params.accion)]
      if (params.accion === "presentar") p.presentadaEn = new Date().toISOString()
    }
    return filas([p])
  }),
  http.post("*/api/files/eval-col/comunicaciones/procesos/postulaciones/:id/documentos", async ({ params, request }) => {
    const p = postulaciones.find((x) => x.id === aplicarId(params, "id"))
    if (!p) return noEncontrado()
    const form = await request.formData()
    const archivo = form.get("ADJUNTO") as File | null
    const id = ++seq
    p.documentos.push({ id, archivo: id, tipo: String(form.get("TIPO") ?? "SOPORTE"), nombre: archivo?.name ?? "documento", peso: archivo?.size ?? 0 })
    return filas([p])
  }),

  http.get(`${BASE}/elecciones/:e/padron`, ({ params }) => {
    const p = padrones.get(aplicarId(params))
    return filas(p ? [p] : [])
  }),
  http.post(`${BASE}/elecciones/:e/padron/generar`, ({ params }) => {
    const p: Padron = {
      id: ++seq,
      regla: "Poblaciones de la convocatoria",
      corte: new Date().toISOString(),
      aprobadoEn: null,
      personas: [
        { usuario: 1, nombre: "Usuario de prueba", vinculo: "FUNCIONARIOS", condicion: "HABILITADA", motivo: null },
        { usuario: 2, nombre: "Sara Gil", vinculo: "ESTUDIANTES", condicion: "HABILITADA", motivo: null },
        { usuario: 3, nombre: "Ana Ruiz", vinculo: "ESTUDIANTES", condicion: "HABILITADA", motivo: null },
      ],
    }
    padrones.set(aplicarId(params), p)
    return filas([p])
  }),
  http.post(`${BASE}/elecciones/:e/padron/excepcion`, async ({ params, request }) => {
    const p = padrones.get(aplicarId(params))
    if (!p) return noEncontrado()
    const b = await cuerpo(request)
    const x = p.personas.find((y) => y.usuario === Number(b.USUARIO))
    if (x) Object.assign(x, { condicion: b.ACCION === "EXCLUIR" ? "EXCLUIDA" : "HABILITADA", motivo: b.MOTIVO })
    return filas([p])
  }),
  http.post(`${BASE}/elecciones/:e/padron/aprobar`, ({ params }) => {
    const p = padrones.get(aplicarId(params))
    if (!p) return noEncontrado()
    p.aprobadoEn = new Date().toISOString()
    return filas([p])
  }),

  // Conteos en cero: el mock no tiene urna y no inventa votos.
  http.post(`${BASE}/elecciones/:e/cerrar-votacion`, ({ params }) => {
    const id = aplicarId(params)
    const candidatas = postulaciones.filter((p) => p.eleccion === id && p.estado === "HABILITADA")
    const acta = nuevaActa(id, "RESULTADOS", {
      habilitados: padrones.get(id)?.personas.length ?? 0,
      votos: 0,
      abstencion: padrones.get(id)?.personas.length ?? 0,
      blancos: 0,
      participacionPct: 0,
      candidaturas: candidatas.map((p) => ({ nombre: p.nombre, votos: 0 })),
      elegidos: [],
      incidencias: ["Quedaron cupos sin cubrir."],
    })
    avanzar(id, { etapa: "RESULTADOS" })
    return filas([acta])
  }),
  ...(["seleccion", "decision"] as const).map((ruta) => http.post(`${BASE}/elecciones/:e/${ruta}`, async ({ params, request }) => {
    const id = aplicarId(params)
    const b = await cuerpo(request)
    const elegidos = (b.PERSONAS as unknown as { POSTULACION: number; CONDICION: string }[]).map((x) => ({
      postulacion: x.POSTULACION,
      nombre: postulaciones.find((p) => p.id === x.POSTULACION)?.nombre ?? "",
      condicion: x.CONDICION,
    }))
    const acta = nuevaActa(id, "RESULTADOS", { elegidos, motivacion: b.MOTIVACION, incidencias: [] })
    if (ruta === "seleccion") avanzar(id, { etapa: "RESULTADOS" })
    return filas([acta])
  })),
  http.get(`${BASE}/elecciones/:e/actas`, ({ params }) => filas(actas.get(aplicarId(params)) ?? [])),
  http.get(`${BASE}/elecciones/:e/reclamaciones`, ({ params }) => filas(reclamaciones.get(aplicarId(params)) ?? [])),
  http.post(`${BASE}/elecciones/:e/reclamaciones`, async ({ params, request }) => {
    const r: Reclamacion = { id: ++seq, reclamante: "Usuario de prueba", motivo: (await cuerpo(request)).MOTIVO, estado: "EN_TRAMITE", respuesta: null, afectaResultado: false, creadoEn: new Date().toISOString() }
    const id = aplicarId(params)
    reclamaciones.set(id, [...(reclamaciones.get(id) ?? []), r])
    return filas([r])
  }),
  http.post(`${BASE}/reclamaciones/:id/resolver`, async ({ params, request }) => {
    const r = [...reclamaciones.values()].flat().find((x) => x.id === aplicarId(params, "id"))
    if (!r) return noEncontrado()
    const b = await cuerpo(request)
    Object.assign(r, { estado: b.DECISION, respuesta: b.RESPUESTA, afectaResultado: b.AFECTA_RESULTADO === "S" })
    return filas([r])
  }),
  http.post(`${BASE}/elecciones/:e/formalizar`, ({ params }) => {
    const id = aplicarId(params)
    const [ultima] = actas.get(id) ?? []
    if (!ultima?.contenido.elegidos?.length) return HttpResponse.json({ message: "No hay personas para designar." }, { status: 409 })
    const acta = nuevaActa(id, "DEFINITIVA", ultima.contenido)
    designaciones.set(id, ultima.contenido.elegidos.map((x) => ({ id: ++seq, usuario: 0, nombre: x.nombre, condicion: x.condicion, desde: null, hasta: null, novedades: [] })))
    avanzar(id, { etapa: "CERRADA" })
    return filas([acta])
  }),
  http.get(`${BASE}/elecciones/:e/designaciones`, ({ params }) => filas(designaciones.get(aplicarId(params)) ?? [])),
  http.post(`${BASE}/designaciones/:id/novedad`, async ({ params, request }) => {
    const b = await cuerpo(request)
    const d = [...designaciones.values()].flat().find((x) => x.id === aplicarId(params, "id"))
    d?.novedades.push({ tipo: b.TIPO, detalle: b.DETALLE, creadoEn: new Date().toISOString() })
    return filas(d ? [d] : [])
  }),

  http.get(`${BASE}/:id`, ({ params }) => {
    const p = procesos.find((x) => x.id === aplicarId(params, "id"))
    return p ? filas([p]) : noEncontrado()
  }),
  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const p = procesos.find((x) => x.id === aplicarId(params, "id"))
    if (!p) return noEncontrado()
    const b = await cuerpo(request)
    Object.assign(p, { nombre: b.NOMBRE, objeto: b.OBJETO, reglamento: b.REGLAMENTO })
    return filas([p])
  }),
]
