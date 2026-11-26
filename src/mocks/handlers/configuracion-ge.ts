import { delay, http, HttpResponse } from "msw"

import { GRADE_NAMES } from "@/mocks/db/academic-period/grades"
import {
  accesoConfiguracionDb,
  CAUSA_INASISTENCIA_MOCK,
  CAUSAS_FIJAS,
  causasReservadasDb,
  clasificacionesDb,
  codigosAnotacionDb,
  EFECTOS_SANCION_MOCK,
  ESTABLECIMIENTO_CONFIGURACION,
  filaCodigo,
  filaSancion,
  INSTANCIA_DISCIPLINARIA_MOCK,
  nivelesConvivenciaDb,
  parametrosRiesgoDb,
  plazoRemisionesDb,
  plazosDisciplinarioDb,
  sancionesDb,
  servicioSocialDb,
  TIPO_COMPORTAMIENTO_MOCK,
  TIPO_SITUACION_MOCK,
  AVISO_SM_MOCK,
} from "@/mocks/db/configuracion-ge"
import { nextId } from "@/mocks/db/next-id"

// Configuración de Gestión estudiantil (/app/gestion-estudiantil/configuracion). Mismas formas que el back:
// lecturas `{ rows: [...] }` (listados con `total_count` repetido), causas reservadas y servicio social como
// `{ rows: [{ datos }] }`, escrituras `{ rows: [{ id }] }`. Los RAISE llegan como 400/409 con `message`, que el
// front lleva al campo cuando corresponde (`errorBackendACampo`) o al banner del modal.
const BASE = "*/api/eval-col/gestion-estudiantil"
const rows = (data: unknown[], init?: ResponseInit) => HttpResponse.json({ rows: data, outParams: {} }, init)
const datos = (d: unknown) => rows([{ datos: d }])
const escrito = (id: number) => rows([{ id }])
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

type Cuerpo = Record<string, unknown>
const cuerpo = async (request: Request) => ((await request.json().catch(() => ({}))) ?? {}) as Cuerpo

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const textoONull = (v: unknown) => texto(v) || null
const entero = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max

function pagina<T>(todas: T[], pageIndex: unknown, pageSize: unknown) {
  const size = Number(pageSize) > 0 ? Number(pageSize) : 10
  const desde = (Number(pageIndex) || 0) * size
  return todas.slice(desde, desde + size).map((r) => ({ ...r, total_count: todas.length }))
}

const filtros = (b: Cuerpo) => (b.FILTERS ?? {}) as Cuerpo

// --- Catálogo de anotaciones (api de catalogo-anotaciones) ---

const codigoUrl = `${BASE}/catalogo-anotaciones`

function validarCodigo(b: Cuerpo, id: number | null): { error: Response } | { codigo: string; descripcion: string; tipo: number; situacion: number | null } {
  const codigo = texto(b.CODIGO).toUpperCase()
  const descripcion = texto(b.DESCRIPCION)
  if (!codigo) return { error: error(400, "El código es obligatorio.") }
  if (codigo.length > 10) return { error: error(400, "El código admite hasta 10 caracteres.") }
  if (descripcion.length < 5 || descripcion.length > 500)
    return { error: error(400, "La descripción debe tener entre 5 y 500 caracteres.") }
  const tipo = TIPO_COMPORTAMIENTO_MOCK.find((t) => t.pk_lista_valor === Number(b.FK_TLV_TIPO))
  if (!tipo) return { error: error(400, "Elija el tipo de anotación.") }
  const situacionPk = b.FK_TLV_SITUACION == null || b.FK_TLV_SITUACION === "" ? null : Number(b.FK_TLV_SITUACION)
  if (situacionPk != null && !TIPO_SITUACION_MOCK.some((s) => s.pk_lista_valor === situacionPk))
    return { error: error(400, "El tipo de situación no es válido.") }
  if (codigosAnotacionDb.some((c) => c.id !== id && c.codigo.toUpperCase() === codigo))
    return { error: error(409, `El código ${codigo} ya existe en el catálogo.`) }
  // La situación solo aplica a Negativo (se decide por nombre, como fn_observador_tipo_es_negativo).
  const situacion = normalizar(tipo.nombre) === "negativo" ? situacionPk : null
  return { codigo, descripcion, tipo: tipo.pk_lista_valor, situacion }
}

const valorDe = <T extends { pk_lista_valor: number; valor: string }>(lista: T[], pk: number | null) =>
  pk == null ? null : (lista.find((x) => x.pk_lista_valor === pk)?.valor ?? null)

const catalogoHandlers = [
  http.post(`${codigoUrl}/query`, async ({ request }) => {
    await delay(250)
    const b = await cuerpo(request)
    const f = filtros(b)
    const search = f.SEARCH ? normalizar(String(f.SEARCH)) : ""
    const lista = codigosAnotacionDb
      .filter((c) => !search || normalizar(`${c.codigo} ${c.descripcion}`).includes(search))
      .filter((c) => f.FK_TLV_TIPO == null || c.fk_tlv_tipo === Number(f.FK_TLV_TIPO))
      .filter((c) => f.FK_TLV_SITUACION == null || c.fk_tlv_situacion === Number(f.FK_TLV_SITUACION))
      .filter((c) => f.HABILITADO == null || c.habilitado === f.HABILITADO)
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
    return rows(pagina(lista, b.PAGEINDEX, b.PAGESIZE))
  }),
  http.post(codigoUrl, async ({ request }) => {
    await delay(300)
    const b = await cuerpo(request)
    const v = validarCodigo(b, null)
    if ("error" in v) return v.error
    const id = nextId(codigosAnotacionDb.map((c) => c.id))
    codigosAnotacionDb.push(
      filaCodigo(
        id,
        v.codigo,
        v.descripcion,
        valorDe(TIPO_COMPORTAMIENTO_MOCK, v.tipo)!,
        valorDe(TIPO_SITUACION_MOCK, v.situacion),
        b.HABILITADO !== false,
      ),
    )
    return escrito(id)
  }),
  http.put(`${codigoUrl}/:id`, async ({ params, request }) => {
    await delay(300)
    const actual = codigosAnotacionDb.find((c) => c.id === Number(params.id))
    if (!actual) return error(404, "No se encontró el código solicitado.")
    const v = validarCodigo(await cuerpo(request), actual.id)
    if ("error" in v) return v.error
    if (actual.en_uso && (v.tipo !== actual.fk_tlv_tipo || v.situacion !== actual.fk_tlv_situacion))
      return error(400, `El código ${actual.codigo} ya tiene anotaciones: no se puede cambiar el tipo ni la situación.`)
    Object.assign(
      actual,
      filaCodigo(
        actual.id,
        v.codigo,
        v.descripcion,
        valorDe(TIPO_COMPORTAMIENTO_MOCK, v.tipo)!,
        valorDe(TIPO_SITUACION_MOCK, v.situacion),
        actual.habilitado,
        actual.en_uso,
      ),
    )
    return escrito(actual.id)
  }),
  http.patch(`${codigoUrl}/:id/estado`, async ({ params, request }) => {
    await delay(250)
    const actual = codigosAnotacionDb.find((c) => c.id === Number(params.id))
    if (!actual) return error(404, "No se encontró el código solicitado.")
    actual.habilitado = (await cuerpo(request)).HABILITADO === true
    return escrito(actual.id)
  }),
  http.patch(`${codigoUrl}/:id/eliminar`, async ({ params }) => {
    await delay(250)
    const i = codigosAnotacionDb.findIndex((c) => c.id === Number(params.id))
    if (i < 0) return error(404, "No se encontró el código solicitado.")
    const c = codigosAnotacionDb[i]
    if (c.en_uso) return error(400, `No se puede eliminar el código ${c.codigo} porque ya tiene anotaciones. Puede inactivarlo.`)
    codigosAnotacionDb.splice(i, 1)
    return escrito(c.id)
  }),
]

// --- Proceso disciplinario: plazos, clasificaciones y sanciones ---

const PROCESO = `${BASE}/proceso-disciplinario`

function errorNombre(nombre: string, max: number) {
  if (nombre.length < 3 || nombre.length > max) return `El nombre debe tener entre 3 y ${max} caracteres.`
  return null
}

function errorDescripcion(descripcion: string | null) {
  return descripcion && descripcion.length > 500 ? "La descripción debe tener entre 0 y 500 caracteres." : null
}

function validarClasificacion(b: Cuerpo, id: number | null) {
  const nombre = texto(b.NOMBRE)
  const descripcion = textoONull(b.DESCRIPCION)
  const e = errorNombre(nombre, 60) ?? errorDescripcion(descripcion)
  if (e) return { error: error(400, e) }
  if (clasificacionesDb.some((c) => c.id !== id && normalizar(c.nombre) === normalizar(nombre)))
    return { error: error(409, `Ya existe una clasificación con el nombre «${nombre}».`) }
  return { nombre, descripcion }
}

function validarSancion(b: Cuerpo, id: number | null) {
  const nombre = texto(b.NOMBRE)
  const descripcion = textoONull(b.DESCRIPCION)
  const e = errorNombre(nombre, 100) ?? errorDescripcion(descripcion)
  if (e) return { error: error(400, e) }
  const instancia = INSTANCIA_DISCIPLINARIA_MOCK.find((i) => i.pk_lista_valor === Number(b.FK_INSTANCIA))
  if (!instancia) return { error: error(400, "La instancia que decide no es válida.") }
  const efecto = EFECTOS_SANCION_MOCK.find((x) => x.fk_tlv === Number(b.FK_EFECTO))
  if (!efecto) return { error: error(400, "El efecto de la sanción no es válido.") }
  const tieneDuracion = b.TIENE_DURACION === true
  if (efecto.exige_duracion && !tieneDuracion)
    return { error: error(400, "Matrícula en observación y Suspensión de asistencia exigen Tiene duración.") }
  if (sancionesDb.some((s) => s.id !== id && normalizar(s.nombre) === normalizar(nombre)))
    return { error: error(409, `Ya existe una sanción con el nombre «${nombre}».`) }
  return { nombre, descripcion, instancia: instancia.valor, efecto: efecto.codigo, tieneDuracion }
}

type Catalogo = "clasificaciones" | "sanciones"
const catalogoProceso = (c: unknown) =>
  c === "clasificaciones" ? clasificacionesDb : c === "sanciones" ? sancionesDb : null
const articulo = (c: Catalogo) => (c === "clasificaciones" ? "la clasificación" : "la sanción")

const procesoHandlers = [
  http.get(`${PROCESO}/plazos`, async () => {
    await delay(200)
    return rows([plazosDisciplinarioDb])
  }),
  http.put(`${PROCESO}/plazos`, async ({ request }) => {
    await delay(300)
    const b = await cuerpo(request)
    if (!entero(b.DIAS_DESCARGOS, 1, 15))
      return error(400, "Días hábiles para presentar descargos debe ser un número entero entre 1 y 15.")
    if (!entero(b.DIAS_RECURSOS, 1, 15))
      return error(400, "Días hábiles para interponer recursos debe ser un número entero entre 1 y 15.")
    Object.assign(plazosDisciplinarioDb, {
      dias_descargos: b.DIAS_DESCARGOS,
      dias_recursos: b.DIAS_RECURSOS,
      configurado: true,
    })
    return escrito(ESTABLECIMIENTO_CONFIGURACION)
  }),

  http.post(`${PROCESO}/clasificaciones/query`, async ({ request }) => {
    await delay(250)
    const b = await cuerpo(request)
    const f = filtros(b)
    const search = f.SEARCH ? normalizar(String(f.SEARCH)) : ""
    const lista = clasificacionesDb
      .filter((c) => !search || normalizar(c.nombre).includes(search))
      .filter((c) => f.HABILITADO == null || c.habilitado === f.HABILITADO)
    return rows(pagina(lista, b.PAGEINDEX, b.PAGESIZE))
  }),
  http.post(`${PROCESO}/clasificaciones`, async ({ request }) => {
    await delay(300)
    const b = await cuerpo(request)
    const v = validarClasificacion(b, null)
    if ("error" in v) return v.error
    const id = nextId(clasificacionesDb.map((c) => c.id))
    clasificacionesDb.push({
      id,
      fk_establecimiento: ESTABLECIMIENTO_CONFIGURACION,
      nombre: v.nombre,
      descripcion: v.descripcion,
      habilitado: b.HABILITADO !== false,
      en_uso: false,
    })
    return escrito(id)
  }),
  http.put(`${PROCESO}/clasificaciones/:id`, async ({ params, request }) => {
    await delay(300)
    const actual = clasificacionesDb.find((c) => c.id === Number(params.id))
    if (!actual) return error(404, "No se encontró la clasificación solicitada.")
    const v = validarClasificacion(await cuerpo(request), actual.id)
    if ("error" in v) return v.error
    Object.assign(actual, { nombre: v.nombre, descripcion: v.descripcion })
    return escrito(actual.id)
  }),

  http.get(`${PROCESO}/sanciones/efectos`, async () => {
    await delay(200)
    return rows(EFECTOS_SANCION_MOCK)
  }),
  http.post(`${PROCESO}/sanciones/query`, async ({ request }) => {
    await delay(250)
    const b = await cuerpo(request)
    const f = filtros(b)
    const search = f.SEARCH ? normalizar(String(f.SEARCH)) : ""
    const lista = sancionesDb
      .filter((s) => !search || normalizar(`${s.nombre} ${s.descripcion ?? ""}`).includes(search))
      .filter((s) => f.FK_INSTANCIA == null || s.fk_tlv_instancia === Number(f.FK_INSTANCIA))
      .filter((s) => f.HABILITADO == null || s.habilitado === f.HABILITADO)
    return rows(pagina(lista, b.PAGEINDEX, b.PAGESIZE))
  }),
  http.post(`${PROCESO}/sanciones`, async ({ request }) => {
    await delay(300)
    const b = await cuerpo(request)
    const v = validarSancion(b, null)
    if ("error" in v) return v.error
    const id = nextId(sancionesDb.map((s) => s.id))
    sancionesDb.push(
      filaSancion(id, v.nombre, v.instancia, v.tieneDuracion, v.efecto, b.HABILITADO !== false, false, v.descripcion),
    )
    return escrito(id)
  }),
  http.put(`${PROCESO}/sanciones/:id`, async ({ params, request }) => {
    await delay(300)
    const actual = sancionesDb.find((s) => s.id === Number(params.id))
    if (!actual) return error(404, "No se encontró la sanción solicitada.")
    const v = validarSancion(await cuerpo(request), actual.id)
    if ("error" in v) return v.error
    Object.assign(
      actual,
      filaSancion(actual.id, v.nombre, v.instancia, v.tieneDuracion, v.efecto, actual.habilitado, actual.en_uso, v.descripcion),
    )
    return escrito(actual.id)
  }),

  // Comunes a los dos catálogos.
  http.patch(`${PROCESO}/:catalogo/:id/estado`, async ({ params, request }) => {
    await delay(250)
    const lista = catalogoProceso(params.catalogo)
    const actual = lista?.find((x) => x.id === Number(params.id))
    if (!actual) return error(404, "No se encontró el registro solicitado.")
    actual.habilitado = (await cuerpo(request)).HABILITADO === true
    return escrito(actual.id)
  }),
  http.patch(`${PROCESO}/:catalogo/:id/eliminar`, async ({ params }) => {
    await delay(250)
    const catalogo = params.catalogo as Catalogo
    const lista: { id: number; nombre: string; en_uso: boolean }[] | null = catalogoProceso(catalogo)
    const i = lista?.findIndex((x) => x.id === Number(params.id)) ?? -1
    if (!lista || i < 0) return error(404, "No se encontró el registro solicitado.")
    const actual = lista[i]
    if (actual.en_uso)
      return error(
        400,
        `No se puede eliminar ${articulo(catalogo)} ${actual.nombre} porque ya se usó en procesos disciplinarios. Puede inactivarla.`,
      )
    lista.splice(i, 1)
    return escrito(actual.id)
  }),
]

// --- Parámetros de riesgo (api de prevencion) y causas reservadas ---

/** Rangos de §9.5 (los mismos de CAMPOS_ENTEROS en prevencion/utils/parametros.ts). */
const RANGOS_PARAMETROS: [clave: string, etiqueta: string, min: number, max: number][] = [
  ["INASIST_CONSEC_ALERTA", "Inasistencias consecutivas para alerta", 2, 30],
  ["AREAS_REPROBADAS_ALERTA", "Asignaturas reprobadas para alerta", 1, 20],
  ["INASIST_CONSEC_INTERVENCION", "Inasistencias consecutivas de intervención", 3, 60],
  ["INASIST_CONSEC_REINTEGRACION", "Inasistencias consecutivas de reintegración", 3, 60],
  ["INASIST_ALTERNADAS_REINTEGRACION", "Inasistencias alternadas de reintegración", 2, 100],
  ["PLAZO_CONTACTO_DIAS", "Plazo de contacto (días hábiles)", 1, 10],
  ["PLAZO_INTERVENCION_DIAS", "Plazo de intervención (días hábiles)", 1, 15],
  ["PLAZO_INCUMPLIMIENTO_SEMANAS", "Plazo de incumplimiento del plan (semanas)", 1, 12],
  ["ANOTACIONES_NEGATIVAS_ALERTA", "Anotaciones negativas para alerta", 1, 20],
  ["COMPROMISOS_INCUMPLIDOS_ALERTA", "Compromisos incumplidos para alerta", 1, 10],
]
const CONDICIONES_VALIDAS = ["VICTIMA_CONFLICTO", "CONDICIONES_ESPECIALES", "MADRE_CABEZA_FAMILIA"]

function errorParametros(b: Cuerpo): string | null {
  for (const [clave, etiqueta, min, max] of RANGOS_PARAMETROS)
    if (!entero(b[clave], min, max)) return `${etiqueta} debe ser un número entero entre ${min} y ${max}.`
  const n = (clave: string) => b[clave] as number
  if (n("INASIST_CONSEC_INTERVENCION") <= n("INASIST_CONSEC_ALERTA"))
    return "Las inasistencias consecutivas de intervención deben ser mayores que las inasistencias consecutivas para alerta."
  if (n("INASIST_CONSEC_REINTEGRACION") <= n("INASIST_CONSEC_INTERVENCION"))
    return "Las inasistencias consecutivas de reintegración deben ser mayores que las de intervención."
  if (n("INASIST_ALTERNADAS_REINTEGRACION") < n("INASIST_CONSEC_REINTEGRACION"))
    return "Las inasistencias alternadas de reintegración no pueden ser menores que las consecutivas de reintegración."
  const caida = b.CAIDA_RA_ALERTA
  if (caida != null && (typeof caida !== "number" || caida < 0.1 || Math.round(caida * 10) !== caida * 10))
    return "La caída del RA para alerta debe ser un número desde 0,1, con un decimal."
  const condiciones = Array.isArray(b.CONDICIONES_ALERTA) ? b.CONDICIONES_ALERTA : []
  const invalida = condiciones.find((c) => !CONDICIONES_VALIDAS.includes(String(c)))
  if (invalida != null) return `La condición de la matrícula ${String(invalida)} no es válida.`
  if (!AVISO_SM_MOCK.some((a) => a.valor === b.AVISO_SM_SEGUIMIENTO)) return "El aviso en salud mental es obligatorio."
  return null
}

const causasReservadas = () => ({
  fijas: CAUSAS_FIJAS,
  causas: CAUSA_INASISTENCIA_MOCK.map((c) => {
    const fija = CAUSAS_FIJAS.includes(c.valor)
    return {
      id: c.pk_lista_valor,
      valor: c.valor,
      nombre: c.nombre,
      fija,
      reservada: fija || causasReservadasDb.agregadas.includes(c.valor),
    }
  }),
})

const riesgoHandlers = [
  http.get(`${BASE}/prevencion/parametros/causas-reservadas`, async () => {
    await delay(200)
    return datos(causasReservadas())
  }),
  http.put(`${BASE}/prevencion/parametros/causas-reservadas`, async ({ request }) => {
    await delay(300)
    const b = await cuerpo(request)
    const causas = Array.isArray(b.CAUSAS) ? b.CAUSAS.map(String) : []
    const desconocida = causas.find((c) => !CAUSA_INASISTENCIA_MOCK.some((x) => x.valor === c))
    if (desconocida) return error(400, `La causa ${desconocida} no existe en la lista de causas de inasistencia.`)
    causasReservadasDb.agregadas = [...new Set(causas.filter((c) => !CAUSAS_FIJAS.includes(c)))]
    return escrito(ESTABLECIMIENTO_CONFIGURACION)
  }),
  http.get(`${BASE}/prevencion/parametros`, async () => {
    await delay(200)
    return rows([parametrosRiesgoDb])
  }),
  http.put(`${BASE}/prevencion/parametros`, async ({ request }) => {
    await delay(300)
    const b = await cuerpo(request)
    const e = errorParametros(b)
    if (e) return error(400, e)
    const aviso = AVISO_SM_MOCK.find((a) => a.valor === b.AVISO_SM_SEGUIMIENTO)!
    Object.assign(parametrosRiesgoDb, {
      inasist_consec_alerta: b.INASIST_CONSEC_ALERTA,
      caida_ra_alerta: b.CAIDA_RA_ALERTA ?? null,
      areas_reprobadas_alerta: b.AREAS_REPROBADAS_ALERTA,
      inasist_consec_intervencion: b.INASIST_CONSEC_INTERVENCION,
      inasist_consec_reintegracion: b.INASIST_CONSEC_REINTEGRACION,
      inasist_alternadas_reintegracion: b.INASIST_ALTERNADAS_REINTEGRACION,
      plazo_incumplimiento_semanas: b.PLAZO_INCUMPLIMIENTO_SEMANAS,
      plazo_contacto_dias: b.PLAZO_CONTACTO_DIAS,
      plazo_intervencion_dias: b.PLAZO_INTERVENCION_DIAS,
      anotaciones_negativas_alerta: b.ANOTACIONES_NEGATIVAS_ALERTA,
      compromisos_incumplidos_alerta: b.COMPROMISOS_INCUMPLIDOS_ALERTA,
      condiciones_alerta: [...((b.CONDICIONES_ALERTA as string[]) ?? [])],
      aviso_sm_seguimiento: aviso.valor,
      aviso_sm_seguimiento_nombre: aviso.nombre,
      es_predeterminado: false,
    })
    return escrito(ESTABLECIMIENTO_CONFIGURACION)
  }),
]

// --- Servicio social, plazo de remisiones, niveles de convivencia y acceso ---

/** Solo la media (Décimo y Undécimo; pk de GRADOS = VALOR + 1), como fn_servicio_social_parametros_guardar. */
const GRADOS_MEDIA = [11, 12]
const grado = (pk: number) => ({ pk, valor: String(pk - 1), nombre: GRADE_NAMES[pk - 1] ?? String(pk) })

const otrosHandlers = [
  http.get(`${BASE}/servicio-social/parametros`, async () => {
    await delay(200)
    return datos({
      fk_testablecimiento: ESTABLECIMIENTO_CONFIGURACION,
      horas_requeridas: servicioSocialDb.horas,
      anticipacion_meses: servicioSocialDb.anticipacion,
      grados: servicioSocialDb.grados.map(grado),
      es_predeterminado: servicioSocialDb.es_predeterminado,
    })
  }),
  http.put(`${BASE}/servicio-social/parametros`, async ({ request }) => {
    await delay(300)
    const b = await cuerpo(request)
    if (!entero(b.HORAS_REQUERIDAS, 1, 500)) return error(400, "Las horas requeridas deben ser un número entero entre 1 y 500.")
    if (!entero(b.ANTICIPACION_MESES, 1, 6)) return error(400, "La anticipación debe ser un número entero entre 1 y 6 meses.")
    const grados = Array.isArray(b.GRADOS) ? b.GRADOS.map(Number) : []
    if (grados.length === 0) return error(400, "Elija al menos un grado.")
    const fuera = grados.find((g) => !GRADOS_MEDIA.includes(g))
    if (fuera != null)
      return error(400, `El grado ${grado(fuera).nombre} no es de la educación media ni un ciclo equivalente (Ciclo 5 o 6).`)
    Object.assign(servicioSocialDb, {
      horas: b.HORAS_REQUERIDAS,
      anticipacion: b.ANTICIPACION_MESES,
      grados: [...new Set(grados)],
      es_predeterminado: false,
    })
    return escrito(ESTABLECIMIENTO_CONFIGURACION)
  }),

  http.get(`${BASE}/configuracion-remisiones/plazo`, async () => {
    await delay(200)
    return rows([plazoRemisionesDb])
  }),
  http.put(`${BASE}/configuracion-remisiones/plazo`, async ({ request }) => {
    await delay(300)
    const b = await cuerpo(request)
    if (!entero(b.PLAZO, 1, 30)) return error(400, "El plazo de seguimiento debe ser un número entero entre 1 y 30 días hábiles.")
    Object.assign(plazoRemisionesDb, { plazo_seguimiento_dias: b.PLAZO, es_predeterminado: false })
    return escrito(ESTABLECIMIENTO_CONFIGURACION)
  }),

  http.get(`${BASE}/configuracion/acceso`, async () => {
    await delay(150)
    return rows([accesoConfiguracionDb])
  }),
  http.get(`${BASE}/configuracion/niveles-convivencia`, async () => {
    await delay(200)
    return rows([nivelesConvivenciaDb])
  }),
  http.put(`${BASE}/configuracion/niveles-convivencia`, async ({ request }) => {
    await delay(300)
    const b = await cuerpo(request)
    const medio = b.UMBRAL_MEDIO == null ? null : Number(b.UMBRAL_MEDIO)
    const alto = b.UMBRAL_ALTO == null ? null : Number(b.UMBRAL_ALTO)
    const unDecimal = (n: number) => Math.round(n * 10) === n * 10
    if ((medio == null) !== (alto == null))
      return error(400, "Los dos umbrales del nivel de convivencia van juntos o ninguno.")
    if (medio != null && alto != null) {
      if (!unDecimal(medio) || !unDecimal(alto)) return error(400, "Los umbrales de convivencia admiten un decimal.")
      if (medio < 0.1 || medio > 99.9) return error(400, "El Umbral del nivel Medio de convivencia debe estar entre 0.1 y 99.9.")
      if (alto < 0.2 || alto > 100) return error(400, "El Umbral del nivel Alto de convivencia debe estar entre 0.2 y 100.")
      if (alto <= medio)
        return error(400, "El Umbral del nivel Alto de convivencia debe ser mayor que el Umbral del nivel Medio.")
    }
    Object.assign(nivelesConvivenciaDb, { umbral_medio: medio, umbral_alto: alto, configurado: medio != null })
    return escrito(ESTABLECIMIENTO_CONFIGURACION)
  }),
]

// Rutas estáticas antes que las de `:id`/`:catalogo` (MSW usa el primer match).
export const configuracionGeHandlers = [...catalogoHandlers, ...procesoHandlers, ...riesgoHandlers, ...otrosHandlers]
