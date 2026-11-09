import { delay, http, HttpResponse } from "msw"

import type {
  CitacionRow,
  CompromisoRow,
  ItemCompromiso,
  ItemCompromisoInput,
} from "@/features/gestion-estudiantil/citaciones/api/types"
import {
  citacionesDb,
  compromisosDb,
  construirCitacion,
  construirCompromiso,
  ESTADOS_CITACION_MOCK,
  ESTADOS_COMPROMISO_MOCK,
  ESTUDIANTES_MOCK,
  FUNCIONARIO_ACTUAL_MOCK,
  FUNCIONARIOS_MOCK,
  GRUPOS_MOCK,
  historialDb,
  itemsDb,
  MOTIVOS_CITACION_MOCK,
  MOTIVOS_SOLO_SISTEMA,
  RESPONSABLES_COMPROMISO_MOCK,
  SEDES_MOCK,
  JORNADAS_MOCK,
  TIPOS_COMPROMISO_MOCK,
} from "@/mocks/db/citaciones-compromisos"
import { nextId } from "@/mocks/db/next-id"

// Mismas formas y errores que el back (V609-V615): listados como `{ rows: [...] }` con `total_count`
// repetido; detalle y documento como `{ rows: [{ datos }] }`; escrituras como `{ rows: [{ id }] }`.
// Los RAISE de PL/pgSQL llegan como 400 (22023), 403 (42501) o 404 (P0002) con `message`.
// Las transiciones siguen §12.4 de la especificación.
const BASE = "*/api/eval-col/gestion-estudiantil"
const rows = (data: unknown[], init?: ResponseInit) => HttpResponse.json({ rows: data, outParams: {} }, init)
const datos = (d: unknown) => rows([{ datos: d }])
const escrito = (id: number) => rows([{ id }])
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

const noExisteCitacion = () => error(404, "No se encontró la citación solicitada")
const noExisteCompromiso = () => error(404, "No se encontró el compromiso solicitado")

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
const dia = (fecha: string) => fecha.slice(0, 10)

/** `yyyy-MM-ddTHH:mm` → `yyyy-MM-ddTHH:mm:00`, como el TIMESTAMP que devuelve el backend. */
const aTimestamp = (v: string) => (v.length === 16 ? `${v}:00` : v)
const ahoraColombia = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const ORIGEN_SISTEMA_REPROGRAMA = ["CASO_CONVIVENCIA", "SENAL_SALUD_MENTAL", "PROCESO_DISCIPLINARIO"]

function pagina<T extends { total_count: number }>(todas: T[], pageIndex: number, pageSize: number) {
  const size = pageSize > 0 ? pageSize : 20
  const total = todas.length
  return todas.slice(pageIndex * size, pageIndex * size + size).map((r) => ({ ...r, total_count: total }))
}

interface ListBody<F> {
  FILTERS?: F
  PAGEINDEX?: number | null
  PAGESIZE?: number | null
}

interface FiltrosCitaciones {
  SEARCH?: string | null
  ESTADO?: string | null
  FK_TLV_MOTIVO?: number | null
  FK_TFUNCIONARIO_ATIENDE?: number | null
  DESDE?: string | null
  HASTA?: string | null
  FK_TSEDE?: number | null
  FK_TLV_JORNADA?: number | null
}

interface FiltrosCompromisos {
  SEARCH?: string | null
  FK_TLV_TIPO?: number | null
  ESTADO?: string | null
  FK_TSEDE?: number | null
  FK_TLV_JORNADA?: number | null
}

function validarFechaLugar(fecha: unknown, lugar: unknown, lugarObligatorio: boolean) {
  if (typeof fecha !== "string" || !fecha || aTimestamp(fecha) <= ahoraColombia())
    return "La fecha y hora de la citación deben ser posteriores a la fecha y hora actuales"
  const l = typeof lugar === "string" ? lugar.trim() : ""
  if ((lugarObligatorio || l) && (l.length < 3 || l.length > 150)) return "El lugar debe tener entre 3 y 150 caracteres"
  return null
}

function validarTexto(texto: unknown) {
  const t = typeof texto === "string" ? texto.trim() : ""
  return t.length < 10 || t.length > 1000 ? "El texto para el acudiente debe tener entre 10 y 1000 caracteres" : null
}

const actualizar = (c: CitacionRow, cambios: Partial<CitacionRow>) => {
  const estado = cambios.estado_valor ? ESTADOS_CITACION_MOCK.find((e) => e.valor === cambios.estado_valor) : undefined
  Object.assign(c, cambios, estado && { estado_nombre: estado.nombre })
}

function validarItems(items: ItemCompromisoInput[] | undefined, fecha: string, revision: string): string | null {
  if (!Array.isArray(items) || items.length === 0) return "Agregue al menos un compromiso"
  for (const i of items) {
    if (!i.descripcion || !i.fk_tlv_responsable || !i.plazo) return "Cada compromiso debe traer descripción, responsable y plazo"
    const d = i.descripcion.trim()
    if (d.length < 10 || d.length > 1000) return "La descripción de cada compromiso debe tener entre 10 y 1000 caracteres"
    if (i.plazo < fecha || i.plazo > revision)
      return "El plazo de cada compromiso debe estar entre la fecha y la fecha de revisión"
  }
  return null
}

export const citacionesCompromisosHandlers = [
  // --- Opciones de la cascada Sede → Jornada (endpoint de Convivencia que reusan los filtros) ---
  http.get(`${BASE}/convivencia/opciones/grupos`, async () => {
    await delay(100)
    return rows(
      GRUPOS_MOCK.map((g) => ({
        ...g,
        sede_nombre: SEDES_MOCK.find((s) => s.pk === g.fk_tsede)!.nombre,
        jornada_nombre: JORNADAS_MOCK.find((j) => j.pk === g.fk_tlv_jornada)!.nombre,
      })),
    )
  }),

  // Candidatos a «Quién atiende» (selector de funcionarios de Convivencia; sin TIPO_INVOLUCRADO no recorta por rol).
  http.get(`${BASE}/convivencia/funcionarios`, async ({ request }) => {
    await delay(100)
    const texto = normalizar(new URL(request.url).searchParams.get("SEARCH") ?? "")
    return rows(
      FUNCIONARIOS_MOCK.filter((f) => normalizar(f.nombre).includes(texto)).map((f) => ({
        fk_tfuncionario: f.pk,
        nombre: f.nombre,
        fk_tlv_tipo_documento: null,
        tipo_documento_codigo: "CC",
        tipo_documento_nombre: "Cédula de ciudadanía",
        numero_documento: String(80000000 + f.pk),
        fk_tlv_cargo: null,
        cargo_codigo: null,
        cargo_nombre: f.pk === 88 ? "Coordinador" : "Docente",
      })),
    )
  }),

  // Búsqueda de estudiante del alta: el endpoint de opciones de Convivencia que reusan los combos (2 a 100 caracteres).
  http.get(`${BASE}/convivencia/procesos/opciones/estudiantes`, async ({ request }) => {
    await delay(100)
    const texto = normalizar(new URL(request.url).searchParams.get("SEARCH") ?? "")
    if (texto.length < 2) return error(400, "La búsqueda debe tener entre 2 y 100 caracteres")
    return rows(
      ESTUDIANTES_MOCK.filter((e) => normalizar(`${e.nombre} ${e.documento}`).includes(texto)).map((e) => ({
        fk_tmatricula: e.matricula,
        nombre: e.nombre,
        documento: e.documento,
        grado_grupo: e.grado_grupo,
        sede_nombre: SEDES_MOCK.find((s) => s.pk === e.sede)!.nombre,
        jornada_nombre: JORNADAS_MOCK.find((j) => j.pk === e.jornada)!.nombre,
      })),
    )
  }),

  // Acudiente de la matrícula para «Nueva citación» y «Nuevo compromiso».
  http.get(`${BASE}/citaciones/acudiente/:matricula`, async ({ params }) => {
    await delay(100)
    const m = Number(params.matricula)
    if (!Number.isInteger(m) || m <= 0) return error(400, "La matrícula no es válida")
    const e = ESTUDIANTES_MOCK.find((x) => x.matricula === m)
    if (!e) return error(404, "No se encontró la matrícula solicitada")
    return datos({ acudiente_nombre: e.acudiente })
  }),

  // --- Citaciones ---
  http.post(`${BASE}/citaciones/query`, async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as ListBody<FiltrosCitaciones>
    const f = body.FILTERS ?? {}
    const q = normalizar(f.SEARCH ?? "")
    const filtradas = citacionesDb
      .filter((c) => {
        if (q && !normalizar(`${c.estudiante_nombre} ${c.estudiante_documento} ${c.acudiente_nombre ?? ""}`).includes(q))
          return false
        if (f.ESTADO && c.estado_valor !== f.ESTADO) return false
        if (f.FK_TLV_MOTIVO && c.fk_tlv_motivo !== f.FK_TLV_MOTIVO) return false
        if (f.FK_TFUNCIONARIO_ATIENDE && c.fk_tfuncionario_atiende !== f.FK_TFUNCIONARIO_ATIENDE) return false
        if (f.FK_TSEDE && c.fk_tsede !== f.FK_TSEDE) return false
        if (f.FK_TLV_JORNADA && c.fk_tlv_jornada !== f.FK_TLV_JORNADA) return false
        // Como el SQL: DESDE inclusivo y HASTA hasta el final del día; sin fecha no entra en un rango.
        if ((f.DESDE || f.HASTA) && !c.fecha_programada) return false
        if (f.DESDE && dia(c.fecha_programada!) < f.DESDE) return false
        if (f.HASTA && dia(c.fecha_programada!) > f.HASTA) return false
        return true
      })
      // `fecha_programada DESC NULLS FIRST, id DESC`.
      .sort((a, b) => {
        if (!a.fecha_programada || !b.fecha_programada)
          return a.fecha_programada === b.fecha_programada ? b.id - a.id : a.fecha_programada ? 1 : -1
        return b.fecha_programada.localeCompare(a.fecha_programada) || b.id - a.id
      })
    return rows(pagina(filtradas, body.PAGEINDEX ?? 0, body.PAGESIZE ?? 20))
  }),

  http.get(`${BASE}/citaciones/:id`, async ({ params }) => {
    await delay(100)
    const c = citacionesDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCitacion()
    return datos({ ...c, total_count: 1, historial: historialDb[c.id] ?? [] })
  }),

  http.get(`${BASE}/citaciones/:id/documento`, async ({ params }) => {
    await delay(100)
    const c = citacionesDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCitacion()
    return datos({
      establecimiento: "IE Central",
      establecimiento_dane: "168001000123",
      establecimiento_nit: "890.200.123-4",
      municipio: "Bucaramanga",
      departamento: "Santander",
      escudo_archivo: null,
      estudiante: c.estudiante_nombre,
      estudiante_documento: c.estudiante_documento,
      grado_grupo: c.grado_grupo,
      acudiente: c.acudiente_nombre,
      texto_acudiente: c.texto_acudiente,
      fecha_programada: c.fecha_programada,
      lugar: c.lugar,
      atiende: c.atiende_nombre,
      cita: c.cita_nombre,
      cita_cargo: "Coordinador",
    })
  }),

  http.post(`${BASE}/citaciones`, async ({ request }) => {
    await delay(200)
    const b = (await request.json()) as Record<string, unknown>
    const est = ESTUDIANTES_MOCK.find((e) => e.matricula === Number(b.FK_MATRICULA))
    if (!est) return error(400, "La matrícula no está en estado Cursando")
    const motivo = MOTIVOS_CITACION_MOCK.find((m) => m.pk === Number(b.FK_MOTIVO))
    if (!motivo) return error(400, "El motivo de la citación es obligatorio")
    if (MOTIVOS_SOLO_SISTEMA.includes(motivo.valor)) return error(400, `El motivo ${motivo.nombre} solo lo genera el sistema`)
    if (b.ORIGEN_TIPO && !["ANOTACION", "CASO_CONVIVENCIA"].includes(String(b.ORIGEN_TIPO)))
      return error(400, "Una citación manual solo puede tener como origen una anotación o un caso de convivencia")
    if (!!b.ORIGEN_TIPO !== (b.ORIGEN_ID != null)) return error(400, "El registro de origen necesita tipo e id")
    const falla = validarTexto(b.TEXTO) ?? validarFechaLugar(b.FECHA, b.LUGAR, true)
    if (falla) return error(400, falla)

    const id = nextId(citacionesDb.map((c) => c.id), 101)
    const atiende = Number(b.FK_ATIENDE ?? FUNCIONARIO_ACTUAL_MOCK)
    citacionesDb.push(
      construirCitacion({
        id,
        estudiante: est.matricula,
        motivo: motivo.valor,
        estado_valor: "PROGRAMADA",
        fecha_programada: aTimestamp(String(b.FECHA)),
        atiende: [88, 89].includes(atiende) ? atiende : FUNCIONARIO_ACTUAL_MOCK,
        lugar: String(b.LUGAR).trim(),
        texto_acudiente: String(b.TEXTO).trim(),
        origen_tipo: (b.ORIGEN_TIPO as CitacionRow["origen_tipo"]) ?? null,
        origen_id: (b.ORIGEN_ID as number | null) ?? null,
      }),
    )
    return escrito(id)
  }),

  http.post(`${BASE}/citaciones/:id/programar`, async ({ params, request }) => {
    await delay(200)
    const c = citacionesDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCitacion()
    if (c.estado_valor !== "POR_PROGRAMAR") return error(400, "Solo se programa una citación Por programar")
    const b = (await request.json()) as Record<string, unknown>
    if (b.TEXTO != null && b.TEXTO !== "") {
      if (c.texto_fijo)
        return error(400, "El texto para el acudiente de esta citación lo pone el sistema y no se puede editar")
      const t = validarTexto(b.TEXTO)
      if (t) return error(400, t)
    }
    const falla = validarFechaLugar(b.FECHA, b.LUGAR, true)
    if (falla) return error(400, falla)
    actualizar(c, {
      estado_valor: "PROGRAMADA",
      fecha_programada: aTimestamp(String(b.FECHA)),
      lugar: String(b.LUGAR).trim(),
      ...(b.TEXTO ? { texto_acudiente: String(b.TEXTO).trim() } : {}),
    })
    return escrito(c.id)
  }),

  http.post(`${BASE}/citaciones/:id/reprogramar`, async ({ params, request }) => {
    await delay(200)
    const c = citacionesDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCitacion()
    const reprogramable =
      c.estado_valor === "PROGRAMADA" ||
      c.estado_valor === "CONFIRMADA" ||
      (c.estado_valor === "NO_ASISTIO" && ORIGEN_SISTEMA_REPROGRAMA.includes(c.origen_tipo ?? ""))
    if (!reprogramable) return error(400, "La citación no se puede reprogramar en su estado actual")
    const b = (await request.json()) as Record<string, unknown>
    const lugar = typeof b.LUGAR === "string" && b.LUGAR.trim() ? b.LUGAR : c.lugar
    const falla = validarFechaLugar(b.FECHA, lugar, false)
    if (falla) return error(400, falla)
    // La fecha y el lugar anteriores quedan en el historial (`TCITACION_HISTORIAL`).
    historialDb[c.id] = [
      ...(historialDb[c.id] ?? []),
      {
        evento: "REPROGRAMADA",
        fecha_programada: c.fecha_programada!,
        lugar: c.lugar,
        resumen: null,
        registrado_en: ahoraColombia(),
      },
    ]
    actualizar(c, {
      estado_valor: "PROGRAMADA",
      fecha_programada: aTimestamp(String(b.FECHA)),
      lugar: String(lugar).trim(),
      resumen: null,
    })
    return escrito(c.id)
  }),

  http.post(`${BASE}/citaciones/:id/cancelar`, async ({ params, request }) => {
    await delay(200)
    const c = citacionesDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCitacion()
    if (!["POR_PROGRAMAR", "PROGRAMADA", "CONFIRMADA"].includes(c.estado_valor))
      return error(400, "La citación no se puede cancelar después de registrar la asistencia ni si ya está cancelada")
    const b = (await request.json()) as { MOTIVO?: string }
    const motivo = (b.MOTIVO ?? "").trim()
    if (motivo.length < 1 || motivo.length > 1000)
      return error(400, "El motivo de la cancelación es obligatorio (hasta 1000 caracteres)")
    actualizar(c, { estado_valor: "CANCELADA", motivo_cancelacion: motivo })
    return escrito(c.id)
  }),

  http.post(`${BASE}/citaciones/:id/asistencia`, async ({ params, request }) => {
    await delay(200)
    const c = citacionesDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCitacion()
    const b = (await request.json()) as { ASISTENCIA?: string; RESUMEN?: string }
    if (b.ASISTENCIA !== "ASISTIO" && b.ASISTENCIA !== "NO_ASISTIO")
      return error(400, "Indique si el acudiente asistió o no asistió")
    if (!c.es_propia) return error(403, "Solo quien atiende la citación puede registrar la asistencia")
    if (c.estado_valor !== "PROGRAMADA" && c.estado_valor !== "CONFIRMADA")
      return error(400, "Solo se registra la asistencia de una citación Programada o Confirmada")
    if (c.fecha_programada! > ahoraColombia())
      return error(400, "La asistencia se registra después de la fecha y hora de la citación")
    const resumen = (b.RESUMEN ?? "").trim()
    if (resumen.length < 10 || resumen.length > 2000)
      return error(400, "El resumen de la reunión debe tener entre 10 y 2000 caracteres")
    if (b.ASISTENCIA === "NO_ASISTIO")
      historialDb[c.id] = [
        ...(historialDb[c.id] ?? []),
        {
          evento: "INASISTENCIA",
          fecha_programada: c.fecha_programada!,
          lugar: c.lugar,
          resumen,
          registrado_en: ahoraColombia(),
        },
      ]
    actualizar(c, { estado_valor: b.ASISTENCIA, resumen })
    return escrito(c.id)
  }),

  // --- Compromisos ---
  http.post(`${BASE}/compromisos/query`, async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as ListBody<FiltrosCompromisos>
    const f = body.FILTERS ?? {}
    const q = normalizar(f.SEARCH ?? "")
    const filtrados = compromisosDb
      .filter((c) => {
        if (q && !normalizar(`${c.estudiante_nombre} ${c.estudiante_documento}`).includes(q)) return false
        if (f.FK_TLV_TIPO && c.fk_tlv_tipo !== f.FK_TLV_TIPO) return false
        if (f.ESTADO && c.estado_valor !== f.ESTADO) return false
        if (f.FK_TSEDE && c.fk_tsede !== f.FK_TSEDE) return false
        if (f.FK_TLV_JORNADA && c.fk_tlv_jornada !== f.FK_TLV_JORNADA) return false
        return true
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
    return rows(pagina(filtrados, body.PAGEINDEX ?? 0, body.PAGESIZE ?? 20))
  }),

  // `soporte` va antes que `:id`: es el mismo prefijo.
  http.post("*/api/files/eval-col/gestion-estudiantil/compromisos/soporte", async () => {
    await delay(300)
    return rows([{ pk_tarchivo: nextId([9001, 9002, ...compromisosDb.map((c) => c.fk_tarchivo_soporte ?? 0)], 9003) }])
  }),

  http.get(`${BASE}/compromisos/:id`, async ({ params }) => {
    await delay(100)
    const c = compromisosDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCompromiso()
    return datos({ ...c, total_count: 1, items: itemsDb[c.id] ?? [] })
  }),

  http.get(`${BASE}/compromisos/:id/documento`, async ({ params }) => {
    await delay(100)
    const c = compromisosDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCompromiso()
    const est = ESTUDIANTES_MOCK.find((e) => e.matricula === c.fk_tmatricula)
    return datos({
      establecimiento: "IE Central",
      establecimiento_dane: "168001000123",
      establecimiento_nit: "890.200.123-4",
      municipio: "Bucaramanga",
      departamento: "Santander",
      escudo_archivo: null,
      estudiante: c.estudiante_nombre,
      estudiante_documento: c.estudiante_documento,
      acudiente: est?.acudiente ?? null,
      tipo: c.tipo_nombre,
      fecha: c.fecha,
      fecha_revision: c.fecha_revision,
      items: itemsDb[c.id] ?? [],
      crea: c.crea_nombre,
      creador_cargo: "Coordinador",
    })
  }),

  http.post(`${BASE}/compromisos`, async ({ request }) => {
    await delay(200)
    const b = (await request.json()) as Record<string, unknown> & { ITEMS?: ItemCompromisoInput[] }
    const est = ESTUDIANTES_MOCK.find((e) => e.matricula === Number(b.FK_MATRICULA))
    if (!est) return error(400, "La matrícula no está en estado Cursando")
    const tipo = TIPOS_COMPROMISO_MOCK.find((t) => t.pk === Number(b.FK_TIPO))
    if (!tipo) return error(400, "El tipo de compromiso es obligatorio")
    const hoy = ahoraColombia().slice(0, 10)
    const fecha = String(b.FECHA ?? "")
    const revision = String(b.FECHA_REVISION ?? "")
    if (!fecha || fecha > hoy) return error(400, "La fecha del compromiso es obligatoria y no puede ser posterior a hoy")
    if (!revision || revision <= fecha)
      return error(400, "La fecha de revisión es obligatoria y debe ser posterior a la fecha del compromiso")
    const falla = validarItems(b.ITEMS, fecha, revision)
    if (falla) return error(400, falla)
    if (b.ACEPTADO && !b.FK_ARCHIVO) return error(400, "Cargue el soporte firmado para registrar la aceptación presencial")
    if (b.ORIGEN_TIPO === "CITACION") {
      const cit = citacionesDb.find((c) => c.id === Number(b.ORIGEN_ID) && c.fk_tmatricula === est.matricula)
      if (!cit) return error(404, "La citación de origen no existe o no es del estudiante")
      if (cit.estado_valor !== "ASISTIO") return error(400, "Solo se crea un compromiso desde una citación con asistencia Asistió")
    }

    const id = nextId(compromisosDb.map((c) => c.id), 40)
    const vigente = Boolean(b.ACEPTADO && b.FK_ARCHIVO)
    compromisosDb.push(
      construirCompromiso({
        id,
        estudiante: est.matricula,
        tipo: tipo.valor,
        estado_valor: vigente ? "VIGENTE" : "PENDIENTE_ACEPTACION",
        fecha,
        fecha_revision: revision,
        creador: FUNCIONARIO_ACTUAL_MOCK,
        aceptado_presencialmente: vigente,
        fk_tarchivo_soporte: vigente ? Number(b.FK_ARCHIVO) : null,
        origen_tipo: (b.ORIGEN_TIPO as CompromisoRow["origen_tipo"]) ?? null,
        origen_id: (b.ORIGEN_ID as number | null) ?? null,
      }),
    )
    let itemId = nextId(Object.values(itemsDb).flat().map((i) => i.id), 400)
    itemsDb[id] = b.ITEMS!.map((i): ItemCompromiso => {
      const r = RESPONSABLES_COMPROMISO_MOCK.find((x) => x.pk === Number(i.fk_tlv_responsable))
      return {
        id: itemId++,
        descripcion: i.descripcion.trim(),
        fk_tlv_responsable: Number(i.fk_tlv_responsable),
        responsable: r?.nombre ?? "",
        plazo: i.plazo,
      }
    })
    return escrito(id)
  }),

  http.post(`${BASE}/compromisos/:id/aceptacion-presencial`, async ({ params, request }) => {
    await delay(200)
    const c = compromisosDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCompromiso()
    if (c.estado_valor !== "PENDIENTE_ACEPTACION")
      return error(400, "Solo se acepta presencialmente un compromiso Pendiente de aceptación")
    if (!c.es_propio) return error(403, "Solo quien creó el compromiso o el Supervisor de sede puede registrar la aceptación presencial")
    const b = (await request.json()) as { FK_ARCHIVO?: number }
    if (!b.FK_ARCHIVO) return error(400, "Cargue el soporte firmado para registrar la aceptación presencial")
    Object.assign(c, {
      estado_valor: "VIGENTE",
      estado_nombre: ESTADOS_COMPROMISO_MOCK.find((e) => e.valor === "VIGENTE")!.nombre,
      aceptado_presencialmente: true,
      fk_tarchivo_soporte: b.FK_ARCHIVO,
    })
    return escrito(c.id)
  }),

  http.post(`${BASE}/compromisos/:id/resultado`, async ({ params, request }) => {
    await delay(200)
    const c = compromisosDb.find((x) => x.id === Number(params.id))
    if (!c) return noExisteCompromiso()
    const b = (await request.json()) as { RESULTADO?: string; OBSERVACION?: string | null }
    if (b.RESULTADO !== "CUMPLIDO" && b.RESULTADO !== "INCUMPLIDO") return error(400, "El resultado debe ser Cumplido o Incumplido")
    if ((b.OBSERVACION ?? "").length > 1000) return error(400, "La observación del resultado admite hasta 1000 caracteres")
    if (!c.es_propio) return error(403, "Solo quien creó el compromiso puede registrar el resultado")
    if (c.estado_valor !== "VIGENTE") return error(400, "Solo se registra el resultado de un compromiso Vigente")
    Object.assign(c, {
      estado_valor: b.RESULTADO,
      estado_nombre: ESTADOS_COMPROMISO_MOCK.find((e) => e.valor === b.RESULTADO)!.nombre,
      observacion_resultado: b.OBSERVACION?.trim() || null,
    })
    return escrito(c.id)
  }),
]
