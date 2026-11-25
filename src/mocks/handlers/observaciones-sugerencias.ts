import { delay, http, HttpResponse } from "msw"

import type {
  DestinatarioObservacion,
  ObservacionDetalle,
} from "@/features/gestion-estudiantil/observaciones/api/types"
import { nextId } from "@/mocks/db/next-id"
import { ESTUDIANTES_INFORME, GRUPOS_INFORME, JORNADA_INFORME, PERIODOS_INFORME, SEDE_INFORME } from "@/mocks/db/informes"

// Observaciones y sugerencias (Gestión estudiantil, Sección 8; V631-V637). Mismas formas que el back:
// listados `{ rows: [...] }` con `total_count` repetido; detalle y alta como `{ rows: [{ datos }] }`;
// modificar y anular como `{ rows: [{ id }] }`. Los RAISE llegan como 400 con `message`.
// Usa la sede, jornada, grupos, períodos y matrículas de la cascada de GE (mocks/db/informes) para que
// filtros y formulario cuadren entre sí.
const BASE = "/api/eval-col/gestion-estudiantil/observaciones-sugerencias"
const rows = (data: unknown[], init?: ResponseInit) => HttpResponse.json({ rows: data, outParams: {} }, init)
const datos = (d: unknown) => rows([{ datos: d }])
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })
const noExiste = () => error(404, "No se encontró la observación solicitada.")

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
const numero = (v: string | null) => (v ? Number(v) : null)

/** Lista «Destinatarios de la observación» (pk estables para el filtro). */
export const DESTINATARIOS_OBSERVACION_MOCK = [
  { pk_lista_valor: 7101, nombre: "Todo el grupo", valor: "TODO_EL_GRUPO", accion: null },
  { pk_lista_valor: 7102, nombre: "Estudiantes específicos", valor: "ESTUDIANTES_ESPECIFICOS", accion: null },
]
const pkDestinatario = (d: DestinatarioObservacion) =>
  DESTINATARIOS_OBSERVACION_MOCK.find((x) => x.valor === d)!.pk_lista_valor

const USUARIO_ACTUAL = { pk: 1, nombre: "Admin Demo" }
const calificable = (periodoId: number) => !PERIODOS_INFORME.find((p) => p.id === periodoId)?.termino
const periodoDe = (fecha: string) => PERIODOS_INFORME.find((p) => fecha >= p.fechaInicio && fecha <= p.fechaFin)
const grupo = (id: number) => GRUPOS_INFORME.find((g) => g.grupoId === id)
const estudiantesDe = (grupoId: number) => ESTUDIANTES_INFORME.filter((e) => e.grupoId === grupoId)
const nombrePersona = (n: string) => n.toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase())

type Registro = Omit<ObservacionDetalle, "puede_modificar" | "puede_anular" | "periodo_calificable">

function semilla(
  pk: number,
  grupoId: number,
  fecha: string,
  titulo: string | null,
  observacion: string,
  autor: { pk: number; nombre: string },
  matriculaId: number | null = null,
  anulada?: { motivo: string; en: string },
): Registro {
  const g = grupo(grupoId)!
  const e = matriculaId == null ? null : ESTUDIANTES_INFORME.find((x) => x.matriculaId === matriculaId)!
  const p = periodoDe(fecha)!
  const destinatario: DestinatarioObservacion = e ? "ESTUDIANTES_ESPECIFICOS" : "TODO_EL_GRUPO"
  return {
    pk,
    fecha,
    fk_tgrupo: g.grupoId,
    grado_grupo: g.grupoEtiqueta,
    fk_tlv_destinatario: pkDestinatario(destinatario),
    destinatario_valor: destinatario,
    destinatario_nombre: e ? "Estudiantes específicos" : "Todo el grupo",
    fk_tmatricula: e?.matriculaId ?? null,
    estudiante_nombre: e ? nombrePersona(e.nombre) : null,
    estudiante_documento: e?.documento ?? null,
    dirigida_a: e ? nombrePersona(e.nombre) : "Todo el grupo",
    titulo,
    observacion,
    fk_tperiodo_evaluacion: p.id,
    periodo_nombre: p.nombre,
    registrado_por_nombre: autor.nombre,
    fk_tusuario_registra: autor.pk,
    anulada: Boolean(anulada),
    estado: anulada ? "ANULADA" : null,
    estudiantes_cuenta: e ? 1 : estudiantesDe(g.grupoId).length,
    anulado_en: anulada?.en ?? null,
    motivo_anulacion: anulada?.motivo ?? null,
    anulado_por_nombre: anulada ? "Paula Díaz Rueda" : null,
    created_at: `${fecha}T15:20:00`,
  }
}

const OTRA_DOCENTE = { pk: 77, nombre: "Carolina Medina Ruiz" }

const observacionesDb: Registro[] = [
  semilla(4001, 502, "2026-09-18", "Actividades de refuerzo para vacaciones", "Repasar las tablas de multiplicar y leer un libro de la biblioteca del aula durante la semana de receso.", USUARIO_ACTUAL),
  semilla(4002, 502, "2026-09-12", "Lectura diaria", "Leer 20 minutos diarios en casa y registrar lo leído en la bitácora de lectura. Revisaremos el avance en la próxima reunión.", OTRA_DOCENTE, 9101),
  semilla(4003, 501, "2026-08-28", null, "El grupo mostró gran avance en el trabajo colaborativo durante el proyecto de aula.", USUARIO_ACTUAL),
  semilla(4004, 502, "2026-08-20", "Hábitos de estudio", "Organizar un horario fijo para las tareas y preparar la maleta la noche anterior.", USUARIO_ACTUAL, 9103, {
    motivo: "Se registró para el estudiante equivocado.",
    en: "2026-08-21T09:10:00",
  }),
  semilla(4005, 501, "2026-03-20", "Puntualidad", "Llegar a tiempo a la jornada; varios estudiantes ingresaron después del saludo de la mañana.", USUARIO_ACTUAL),
]

function conPermisos(r: Registro): ObservacionDetalle {
  const periodoCalificable = calificable(r.fk_tperiodo_evaluacion)
  return {
    ...r,
    periodo_calificable: periodoCalificable,
    puede_modificar: !r.anulada && periodoCalificable && r.fk_tusuario_registra === USUARIO_ACTUAL.pk,
    puede_anular: !r.anulada,
  }
}

/** Fila del listado: los campos de `ObservacionRow` (el detalle suma conteo, período y anulación). */
const CAMPOS_SOLO_DETALLE = new Set([
  "estudiantes_cuenta",
  "anulado_en",
  "motivo_anulacion",
  "anulado_por_nombre",
  "created_at",
  "periodo_calificable",
])
function fila(r: Registro, total: number) {
  const f = Object.fromEntries(Object.entries(conPermisos(r)).filter(([k]) => !CAMPOS_SOLO_DETALLE.has(k)))
  return { ...f, total_count: total }
}

interface CuerpoResumen {
  FK_TGRUPOS?: number[]
  DESTINATARIO?: DestinatarioObservacion
  FK_TMATRICULAS?: number[]
  FECHA?: string | null
}

function resumen(b: CuerpoResumen) {
  const especificos = b.DESTINATARIO === "ESTUDIANTES_ESPECIFICOS"
  return (b.FK_TGRUPOS ?? []).flatMap((id) => {
    const g = grupo(id)
    if (!g) return []
    const p = b.FECHA ? periodoDe(b.FECHA) : undefined
    const total = especificos
      ? estudiantesDe(id).filter((e) => (b.FK_TMATRICULAS ?? []).includes(e.matriculaId)).length
      : estudiantesDe(id).length
    return [
      {
        fk_tgrupo: id,
        grado_grupo: g.grupoEtiqueta,
        estudiantes: total,
        fk_tperiodo_evaluacion: p?.id ?? null,
        periodo_nombre: p?.nombre ?? null,
        periodo_calificable: p ? !p.termino : false,
      },
    ]
  })
}

function validarTexto(b: { TITULO?: string | null; OBSERVACION?: string }) {
  const texto = (b.OBSERVACION ?? "").trim()
  if (texto.length < 5) return "La observación debe tener mínimo 5 caracteres."
  if (texto.length > 1000) return "La observación no puede superar 1000 caracteres."
  if ((b.TITULO ?? "").length > 100) return "El título no puede superar 100 caracteres."
  return null
}

export const observacionesSugerenciasHandlers = [
  http.get(BASE, async ({ request }) => {
    await delay(150)
    const q = new URL(request.url).searchParams
    if (!q.get("FK_TESTABLECIMIENTO")) return error(400, "El establecimiento es obligatorio.")
    const sede = numero(q.get("FK_TSEDE"))
    const jornada = numero(q.get("FK_TLV_JORNADA"))
    const grupoId = numero(q.get("FK_TGRUPO"))
    const periodo = numero(q.get("FK_TPERIODO_EVALUACION"))
    const destinatario = numero(q.get("FK_TLV_DESTINATARIO"))
    const texto = normalizar(q.get("SEARCH") ?? "")
    const limite = Number(q.get("LIMITE") ?? 10) || 10
    const offset = Number(q.get("OFFSET") ?? 0)
    const filtradas = observacionesDb
      .filter(() => (sede ? sede === SEDE_INFORME.fk_tsede : true))
      .filter(() => (jornada ? jornada === JORNADA_INFORME.fk_tlv_jornada : true))
      .filter((r) => (grupoId ? r.fk_tgrupo === grupoId : true))
      .filter((r) => (periodo ? r.fk_tperiodo_evaluacion === periodo : true))
      .filter((r) => (destinatario ? r.fk_tlv_destinatario === destinatario : true))
      .filter((r) =>
        texto ? normalizar(`${r.estudiante_nombre ?? ""} ${r.estudiante_documento ?? ""} ${r.titulo ?? ""}`).includes(texto) : true,
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.pk - a.pk)
    return rows(filtradas.slice(offset, offset + limite).map((r) => fila(r, filtradas.length)))
  }),

  http.get(`${BASE}/opciones/grupos`, async () => {
    await delay(100)
    return rows(
      GRUPOS_INFORME.map((g) => ({
        fk_tgrupo: g.grupoId,
        grado_grupo: g.grupoEtiqueta,
        fk_tsede: SEDE_INFORME.fk_tsede,
        fk_tlv_jornada: JORNADA_INFORME.fk_tlv_jornada,
      })),
    )
  }),

  http.get(`${BASE}/opciones/estudiantes`, async ({ request }) => {
    await delay(120)
    const ids = (new URL(request.url).searchParams.get("FK_TGRUPOS") ?? "").split(",").map(Number).filter(Boolean)
    return rows(
      ESTUDIANTES_INFORME.filter((e) => ids.includes(e.grupoId)).map((e) => ({
        fk_tmatricula: e.matriculaId,
        estudiante_nombre: nombrePersona(e.nombre),
        estudiante_documento: e.documento,
        fk_tgrupo: e.grupoId,
        grado_grupo: grupo(e.grupoId)!.grupoEtiqueta,
      })),
    )
  }),

  http.post(`${BASE}/resumen`, async ({ request }) => {
    await delay(120)
    return rows(resumen((await request.json()) as CuerpoResumen))
  }),

  http.get(`${BASE}/:id`, async ({ params }) => {
    await delay(120)
    const r = observacionesDb.find((x) => x.pk === Number(params.id))
    return r ? datos(conPermisos(r)) : noExiste()
  }),

  http.post(BASE, async ({ request }) => {
    await delay(250)
    const b = (await request.json()) as CuerpoResumen & { TITULO?: string | null; OBSERVACION?: string; FECHA?: string }
    if (!b.FK_TGRUPOS?.length) return error(400, "Seleccione al menos un grupo.")
    const especificos = b.DESTINATARIO === "ESTUDIANTES_ESPECIFICOS"
    if (especificos && !b.FK_TMATRICULAS?.length) return error(400, "Seleccione al menos un estudiante.")
    if (!b.FECHA || !periodoDe(b.FECHA))
      return error(400, "La fecha seleccionada no pertenece a un Período de Evaluación disponible para el estudiante.")
    const invalido = validarTexto(b)
    if (invalido) return error(400, invalido)

    const titulo = b.TITULO?.trim() || null
    const texto = b.OBSERVACION!.trim()
    const nuevos: Registro[] = especificos
      ? ESTUDIANTES_INFORME.filter((e) => b.FK_TMATRICULAS!.includes(e.matriculaId) && b.FK_TGRUPOS!.includes(e.grupoId)).map(
          (e, i) => semilla(nextId(observacionesDb.map((x) => x.pk)) + i, e.grupoId, b.FECHA!, titulo, texto, USUARIO_ACTUAL, e.matriculaId),
        )
      : b.FK_TGRUPOS.map((g, i) => semilla(nextId(observacionesDb.map((x) => x.pk)) + i, g, b.FECHA!, titulo, texto, USUARIO_ACTUAL))
    observacionesDb.push(...nuevos)
    return datos({
      ids: nuevos.map((n) => n.pk),
      registros: nuevos.length,
      estudiantes: nuevos.reduce((s, n) => s + n.estudiantes_cuenta, 0),
    })
  }),

  http.put(`${BASE}/:id/anular`, async ({ params, request }) => {
    await delay(200)
    const r = observacionesDb.find((x) => x.pk === Number(params.id))
    if (!r) return noExiste()
    if (r.anulada) return error(400, "La observación ya está anulada.")
    const { MOTIVO } = (await request.json()) as { MOTIVO?: string }
    const motivo = (MOTIVO ?? "").trim()
    if (!motivo || motivo.length > 500) return error(400, "El motivo de la anulación debe tener entre 1 y 500 caracteres.")
    Object.assign(r, {
      anulada: true,
      estado: "ANULADA",
      motivo_anulacion: motivo,
      anulado_en: new Date().toISOString().slice(0, 19),
      anulado_por_nombre: USUARIO_ACTUAL.nombre,
    })
    return rows([{ id: r.pk }])
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    await delay(200)
    const r = observacionesDb.find((x) => x.pk === Number(params.id))
    if (!r) return noExiste()
    if (!conPermisos(r).puede_modificar)
      return error(400, "Solo su autor la modifica, y mientras su Período de Evaluación esté Calificable.")
    const b = (await request.json()) as { FECHA?: string; TITULO?: string | null; OBSERVACION?: string }
    const p = b.FECHA ? periodoDe(b.FECHA) : undefined
    if (!p) return error(400, "La fecha seleccionada no pertenece a un Período de Evaluación disponible para el estudiante.")
    const invalido = validarTexto(b)
    if (invalido) return error(400, invalido)
    Object.assign(r, {
      fecha: b.FECHA,
      titulo: b.TITULO?.trim() || null,
      observacion: b.OBSERVACION!.trim(),
      fk_tperiodo_evaluacion: p.id,
      periodo_nombre: p.nombre,
    })
    return rows([{ id: r.pk }])
  }),
]
