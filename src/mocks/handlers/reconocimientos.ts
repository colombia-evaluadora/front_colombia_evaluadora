import { delay, http, HttpResponse } from "msw"

import type { ReconocimientoRow } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { nextId } from "@/mocks/db/next-id"
import {
  ACTIVIDADES_RECONOCIMIENTO_MOCK,
  construirReconocimiento,
  detallesReconocimientoDb,
  ESTUDIANTES_RECONOCIMIENTO_MOCK,
  FUNCIONARIO_ACTUAL_RECONOCIMIENTO_MOCK,
  OTORGANTES_MOCK,
  reconocimientosDb,
  sugerenciasDb,
  TIPOS_RECONOCIMIENTO_MOCK,
} from "@/mocks/db/reconocimientos"

// Mismas formas y errores que el back (V624-V630): listados como `{ rows: [...] }` con `total_count`
// repetido; detalle y mención como `{ rows: [{ datos }] }`; escrituras como `{ rows: [{ id }] }`.
// Los RAISE de PL/pgSQL llegan como 400 (22023), 403 (42501) o 404 (P0002) con `message`.
const BASE = "*/api/eval-col/gestion-estudiantil/reconocimientos"
const rows = (data: unknown[], init?: ResponseInit) => HttpResponse.json({ rows: data, outParams: {} }, init)
const datos = (d: unknown) => rows([{ datos: d }])
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })
const noExiste = () => error(404, "No se encontró el reconocimiento solicitado")

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
const numero = (v: string | null) => (v ? Number(v) : null)

function pagina<T extends { total_count: number }>(todas: T[], pageIndex: number, pageSize: number) {
  const size = pageSize > 0 ? pageSize : 20
  return todas.slice(pageIndex * size, pageIndex * size + size).map((r) => ({ ...r, total_count: todas.length }))
}

function validarEscritura(b: Record<string, unknown>) {
  const motivo = typeof b.MOTIVO === "string" ? b.MOTIVO.trim() : ""
  if (motivo.length < 5 || motivo.length > 200) return "El motivo debe tener entre 5 y 200 caracteres"
  if (typeof b.FECHA !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.FECHA)) return "La fecha es obligatoria (aaaa-mm-dd)"
  if (b.FECHA > new Date().toISOString().slice(0, 10)) return "La fecha no puede ser posterior a hoy"
  if (!b.FK_OTORGADO_POR) return "Indique quién otorga el reconocimiento"
  return null
}

const aplicar = (r: ReconocimientoRow, b: Record<string, unknown>) => {
  const t = TIPOS_RECONOCIMIENTO_MOCK.find((x) => x.pk === Number(b.FK_TIPO)) ?? TIPOS_RECONOCIMIENTO_MOCK[0]!
  const o = OTORGANTES_MOCK.find((x) => x.fk_tfuncionario === Number(b.FK_OTORGADO_POR)) ?? OTORGANTES_MOCK[0]!
  Object.assign(r, {
    fecha: b.FECHA,
    motivo: String(b.MOTIVO).trim(),
    fk_tlv_tipo: t.pk,
    tipo_valor: t.valor,
    tipo_nombre: t.nombre,
    fk_tfuncionario_otorga: o.fk_tfuncionario,
    otorgado_por: o.nombre,
  })
}

export const reconocimientosHandlers = [
  http.get(BASE, async ({ request }) => {
    await delay(150)
    const q = new URL(request.url).searchParams
    if (!q.get("ESTABLECIMIENTO")) return error(400, "El establecimiento es obligatorio")
    const texto = normalizar(q.get("SEARCH") ?? "")
    const tipo = numero(q.get("TIPO"))
    const periodo = numero(q.get("PERIODO"))
    const anulados = q.get("ANULADOS") === "true"
    const filtradas = reconocimientosDb
      .filter((r) => (anulados ? true : !r.anulado))
      .filter((r) => (tipo ? r.fk_tlv_tipo === tipo : true))
      .filter((r) => (periodo ? r.fk_tperiodo_evaluacion === periodo : true))
      .filter((r) => (texto ? normalizar(`${r.estudiante_nombre} ${r.estudiante_documento} ${r.motivo}`).includes(texto) : true))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
    return rows(pagina(filtradas, Number(q.get("PAGEINDEX") ?? 0), Number(q.get("PAGESIZE") ?? 20)))
  }),

  http.get(`${BASE}/sugerencias`, async () => {
    await delay(100)
    const otorgadas = new Set(reconocimientosDb.filter((r) => r.es_sugerencia_puesto && !r.anulado).map((r) => r.fk_tmatricula))
    return rows(sugerenciasDb.filter((s) => !otorgadas.has(s.fk_tmatricula)))
  }),

  http.post(`${BASE}/sugerencias/otorgar`, async ({ request }) => {
    await delay(200)
    const b = (await request.json()) as Record<string, unknown>
    const s = sugerenciasDb.find((x) => x.fk_tmatricula === Number(b.FK_MATRICULA))
    if (!s) return error(404, "La matrícula no tiene una sugerencia por Puesto vigente")
    const err = validarEscritura(b)
    if (err) return error(400, err)
    const id = nextId(reconocimientosDb.map((r) => r.id), 801)
    const nuevo = construirReconocimiento({
      id,
      fecha: String(b.FECHA),
      estudiante: s.fk_tmatricula,
      tipo: "MEJOR_DESEMPENO",
      motivo: String(b.MOTIVO).trim(),
      otorga: Number(b.FK_OTORGADO_POR),
      periodo: s.fk_tperiodo_evaluacion,
      es_sugerencia_puesto: true,
    })
    reconocimientosDb.push(nuevo)
    detallesReconocimientoDb[id] = { fk_tactividad: null, actividad_nombre: null, fk_tarchivo_soporte: null, soporte_nombre: null, registrado_por: "Juan Ramírez Soto", anulacion: null }
    return rows([{ id }])
  }),

  http.get(`${BASE}/opciones/estudiantes`, async ({ request }) => {
    await delay(100)
    const texto = normalizar(new URL(request.url).searchParams.get("SEARCH") ?? "")
    return rows(
      ESTUDIANTES_RECONOCIMIENTO_MOCK.filter((e) => normalizar(`${e.nombre} ${e.documento}`).includes(texto)).map((e) => ({
        fk_tmatricula: e.matricula,
        estudiante_nombre: e.nombre,
        estudiante_documento: e.documento,
        grado_grupo: e.grado_grupo,
        fk_tgrupo: e.grupo,
      })),
    )
  }),

  http.get(`${BASE}/opciones/otorgantes`, async ({ request }) => {
    await delay(100)
    const texto = normalizar(new URL(request.url).searchParams.get("SEARCH") ?? "")
    return rows(
      OTORGANTES_MOCK.filter((o) => normalizar(o.nombre).includes(texto)).map((o) => ({
        ...o,
        es_usuario_actual: o.fk_tfuncionario === FUNCIONARIO_ACTUAL_RECONOCIMIENTO_MOCK,
      })),
    )
  }),

  // Soporte (file-service): imagen o PDF hasta 10 MB.
  http.post("*/api/files/eval-col/gestion-estudiantil/reconocimientos/soporte", async () => {
    await delay(300)
    return rows([{ pk_tarchivo: nextId([9101, ...Object.values(detallesReconocimientoDb).map((d) => d.fk_tarchivo_soporte ?? 0)], 9102) }])
  }),

  // Selector «Actividad relacionada»: el listado de actividades de Gestión Estudiantil.
  http.get("*/api/eval-col/gestion-estudiantil/actividades", async ({ request }) => {
    await delay(100)
    const texto = normalizar(new URL(request.url).searchParams.get("SEARCH") ?? "")
    return rows(ACTIVIDADES_RECONOCIMIENTO_MOCK.filter((a) => normalizar(a.nombre).includes(texto)))
  }),

  http.post(BASE, async ({ request }) => {
    await delay(250)
    const b = (await request.json()) as Record<string, unknown>
    const matriculas = Array.isArray(b.MATRICULAS) ? (b.MATRICULAS as number[]) : []
    if (matriculas.length === 0) return error(400, "Elija al menos un estudiante")
    if (!TIPOS_RECONOCIMIENTO_MOCK.some((t) => t.pk === Number(b.FK_TIPO))) return error(400, "El tipo de reconocimiento es obligatorio")
    const err = validarEscritura(b)
    if (err) return error(400, err)
    const creados = matriculas.map((m) => {
      const id = nextId(reconocimientosDb.map((r) => r.id), 801)
      const est = ESTUDIANTES_RECONOCIMIENTO_MOCK.find((e) => e.matricula === m)
      const nuevo = construirReconocimiento({
        id,
        fecha: String(b.FECHA),
        estudiante: est?.matricula ?? ESTUDIANTES_RECONOCIMIENTO_MOCK[0]!.matricula,
        tipo: TIPOS_RECONOCIMIENTO_MOCK.find((t) => t.pk === Number(b.FK_TIPO))!.valor,
        motivo: String(b.MOTIVO).trim(),
        otorga: Number(b.FK_OTORGADO_POR),
        periodo: null,
      })
      reconocimientosDb.push(nuevo)
      detallesReconocimientoDb[id] = { fk_tactividad: null, actividad_nombre: null, fk_tarchivo_soporte: null, soporte_nombre: null, registrado_por: "Juan Ramírez Soto", anulacion: null }
      return { id }
    })
    return rows(creados)
  }),

  http.get(`${BASE}/:id`, async ({ params }) => {
    await delay(100)
    const r = reconocimientosDb.find((x) => x.id === Number(params.id))
    if (!r) return noExiste()
    const { total_count: _total, ...fila } = r
    return datos({ ...fila, ...detallesReconocimientoDb[r.id] })
  }),

  http.get(`${BASE}/:id/mencion-honor`, async ({ params }) => {
    await delay(100)
    const r = reconocimientosDb.find((x) => x.id === Number(params.id))
    if (!r) return noExiste()
    if (r.anulado) return error(400, "El reconocimiento está anulado")
    return datos({
      establecimiento: "IE Central",
      establecimiento_dane: "168001000123",
      establecimiento_nit: "890.200.123-4",
      municipio: "Bucaramanga",
      departamento: "Santander",
      escudo_archivo: null,
      estudiante: r.estudiante_nombre,
      estudiante_documento: r.estudiante_documento,
      grado_grupo: r.grado_grupo,
      tipo_nombre: r.tipo_nombre,
      motivo: r.motivo,
      fecha: r.fecha,
    })
  }),

  http.put(`${BASE}/:id/anular`, async ({ params, request }) => {
    await delay(200)
    const r = reconocimientosDb.find((x) => x.id === Number(params.id))
    if (!r) return noExiste()
    if (!r.puede_anular) return error(403, "No tiene el nivel de acceso necesario para anular este reconocimiento")
    const b = (await request.json()) as { MOTIVO?: string }
    const motivo = (b.MOTIVO ?? "").trim()
    if (motivo.length < 1 || motivo.length > 500) return error(400, "El motivo de la anulación debe tener entre 1 y 500 caracteres")
    Object.assign(r, { anulado: true, puede_modificar: false, puede_anular: false })
    const d = detallesReconocimientoDb[r.id]
    if (d) d.anulacion = { fecha: new Date().toISOString().slice(0, 10), motivo, por: "Carlos Medina Ríos" }
    return rows([{ id: r.id }])
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    await delay(200)
    const r = reconocimientosDb.find((x) => x.id === Number(params.id))
    if (!r) return noExiste()
    if (r.anulado) return error(400, "El reconocimiento está anulado")
    if (!r.puede_modificar) return error(403, "No tiene el nivel de acceso necesario para modificar este reconocimiento")
    const b = (await request.json()) as Record<string, unknown>
    const err = validarEscritura(b)
    if (err) return error(400, err)
    aplicar(r, b)
    return rows([{ id: r.id }])
  }),
]
