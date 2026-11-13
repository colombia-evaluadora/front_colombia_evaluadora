import { parseDateValue } from "@/lib/date-value"

import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import type {
  CaracterizacionDetalle,
  DatosCaracterizacion,
  IntegranteDetalle,
  ItemLista,
  OpcionListaCaracterizacion,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"

// Formulario de la caracterización familiar y de vivienda (§9.8). Las reglas repiten las de V681 para marcar el
// campo antes de enviar; el 22023 del servidor sigue siendo la última palabra (p. ej. «menor sin padre ni madre»).

export const PERSONAS_MIN = 1
export const PERSONAS_MAX = 30
export const MAX = {
  nombre: 150,
  apoyo: 1000,
  motivoNoVive: 300,
  descripcionOtra: 300,
  temas: 300,
  desea: 150,
  complementarios: 300,
  transporte: 100,
  otraInfo: 2000,
  dificultadesCuales: 300,
  causasRepitencia: 300,
  periodoAsistencia: 60,
  institucionAsistencia: 150,
  fuente: 150,
  observaciones: 2000,
} as const

/** Código estable de las opciones con efecto condicional (nunca se decide por etiqueta ni por id). */
export const CODIGO = {
  si: "SI",
  serviciosIdentificados: "SERVICIOS_IDENTIFICADOS",
  recibeProgramas: "RECIBE_PROGRAMAS",
  internet: "INTERNET",
  factoresIdentificados: "FACTORES_IDENTIFICADOS",
  sinFactores: "SIN_FACTORES_IDENTIFICADOS",
  sinRevisar: "SIN_REVISAR",
  otro: "OTRO",
} as const

export type ListasCaracterizacion = Record<string, OpcionCatalogo[]>

/** Agrupa las filas de `/opciones/caracterizacion` por lista, en el orden del catálogo. */
export function agruparListas(filas: OpcionListaCaracterizacion[]): ListasCaracterizacion {
  const listas: ListasCaracterizacion = {}
  for (const f of [...filas].sort((a, b) => a.orden - b.orden)) {
    ;(listas[f.lista] ??= []).push({ value: String(f.id), label: f.nombre, codigo: f.valor })
  }
  return listas
}

export const codigoDeOpcion = (opciones: OpcionCatalogo[] | undefined, value: string) =>
  value ? opciones?.find((o) => o.value === value)?.codigo : undefined

/** La «Otra» de tipo y de tenencia de vivienda se reconoce por su texto (como en el backend). */
export const esOtraVivienda = (opciones: OpcionCatalogo[] | undefined, value: string) =>
  Boolean(value) && Boolean(opciones?.find((o) => o.value === value)?.label.trim().toLowerCase().startsWith("otr"))

export const esProgenitor = (opciones: OpcionCatalogo[] | undefined, value: string) =>
  ["madre", "padre"].includes(opciones?.find((o) => o.value === value)?.label.trim().toLowerCase() ?? "")

export interface IntegranteForm {
  /** Clave estable de la fila (no viaja). */
  clave: string
  parentesco: string
  nombre: string
  edad: string
  escolaridad: string
  empleo: string
  vive: boolean | null
  cuidador: boolean | null
  esAcudiente: boolean
  apoyo: string
  hijos: string
}

export interface FormCaracterizacion {
  personas: string
  estadoCivil: string
  motivoNoVive: string
  viveSolo: boolean | null
  integrantes: IntegranteForm[]
  tipoVivienda: string
  tenencia: string
  descripcionOtra: string
  frecuenciaDomicilio: string
  infoServicios: string
  servicios: string[]
  internetHogar: string
  internetEstudiar: string
  equipo: string
  ingresos: string
  aportantesConv: string
  aportantesExt: string
  infoProgramas: string
  programas: string[]
  trabajo: string
  tempranaEdad: string
  desea: string
  lugarHermanos: string
  proteccion: string
  complementarios: string
  transporte: string
  desplazamiento: string
  otraInfo: string
  tipologia: string
  temas: string
  desempeno: string
  lugarEstudio: string
  horasEstudio: string
  estrategias: string[]
  cursoPreescolar: string
  aniosPreescolar: string
  retiros: string
  interrupciones: string
  meses: string
  trayectoriaFuente: string
  trayectoriaFecha: Date | undefined
  asistenciaPct: string
  asistenciaPeriodo: string
  asistenciaInstitucion: string
  asistenciaFuente: string
  dificultades: string
  dificultadesCuales: string
  dificultadesFuente: string
  dificultadesFecha: Date | undefined
  causasRepitencia: string
  asistenciaAcudiente: string
}

const lista = (x: ItemLista | null | undefined) => (x ? String(x.id) : "")
const texto = (x: string | number | null | undefined) => (x == null ? "" : String(x))
const fecha = (x: string | null | undefined) => (x ? parseDateValue(x.slice(0, 10)) : undefined)

let contador = 0
export const nuevaClave = () => `integrante-${++contador}`

export const integranteVacio = (): IntegranteForm => ({
  clave: nuevaClave(),
  parentesco: "",
  nombre: "",
  edad: "",
  escolaridad: "",
  empleo: "",
  vive: null,
  cuidador: null,
  esAcudiente: false,
  apoyo: "",
  hijos: "",
})

const integranteDesde = (i: IntegranteDetalle): IntegranteForm => ({
  clave: nuevaClave(),
  parentesco: lista(i.parentesco),
  nombre: texto(i.nombre),
  edad: texto(i.edad),
  escolaridad: lista(i.escolaridad),
  empleo: lista(i.empleo),
  vive: i.vive_con_estudiante,
  cuidador: i.es_cuidador_principal,
  esAcudiente: i.es_acudiente,
  apoyo: texto(i.apoyo),
  hijos: texto(i.numero_hijos),
})

/** El acudiente derivado de Cobertura es solo lectura: no entra al formulario ni se envía. */
export const integrantesReales = (d: CaracterizacionDetalle) => d.hogar.integrantes.filter((i) => !i.derivado)

export function formDesdeDetalle(d: CaracterizacionDetalle): FormCaracterizacion {
  const { hogar: h, vivienda: v, socioeconomica: s, situacion: u, trayectoria: t, establecimiento: e } = d
  const dec = t.declarada
  return {
    personas: texto(h.personas_hogar),
    estadoCivil: lista(h.estado_civil_padres),
    motivoNoVive: texto(h.motivo_no_vive_padres),
    viveSolo: h.vive_solo,
    integrantes: integrantesReales(d).map(integranteDesde),
    tipoVivienda: lista(v.tipo_vivienda),
    tenencia: lista(v.tenencia_vivienda),
    descripcionOtra: texto(v.descripcion_otra_vivienda),
    frecuenciaDomicilio: lista(v.frecuencia_domicilio),
    infoServicios: lista(v.info_servicios),
    servicios: v.servicios.map((x) => String(x.id)),
    internetHogar: lista(v.internet_hogar),
    internetEstudiar: lista(v.internet_estudiar),
    equipo: lista(s.equipo_estudiar),
    ingresos: lista(h.ingresos),
    aportantesConv: texto(h.aportantes_convivientes),
    aportantesExt: texto(h.aportantes_externos),
    infoProgramas: lista(s.info_programas),
    programas: s.programas.map((x) => String(x.id)),
    trabajo: lista(u.trabajo_estudiante),
    tempranaEdad: lista(u.padre_temprana_edad),
    desea: texto(u.que_desea_estudiar),
    lugarHermanos: texto(u.lugar_hermanos),
    proteccion: lista(u.proteccion_estado),
    complementarios: texto(u.programas_complementarios),
    transporte: texto(u.medio_transporte),
    desplazamiento: texto(u.tiempo_desplazamiento),
    otraInfo: texto(u.otra_informacion),
    tipologia: lista(h.tipologia_familiar),
    temas: texto(h.temas_escuela_padres),
    desempeno: lista(u.desempeno_percibido),
    lugarEstudio: lista(u.lugar_estudio),
    horasEstudio: lista(u.horas_estudio),
    estrategias: d.estrategias_requeridas.map((x) => String(x.id)),
    cursoPreescolar: lista(dec.curso_preescolar),
    aniosPreescolar: texto(dec.anios_preescolar),
    retiros: texto(dec.retiros_previos),
    interrupciones: texto(dec.interrupciones_previas),
    meses: texto(dec.meses_fuera_sistema),
    trayectoriaFuente: texto(dec.fuente),
    trayectoriaFecha: fecha(dec.fecha_referencia),
    asistenciaPct: texto(dec.asistencia_anterior_pct),
    asistenciaPeriodo: texto(dec.asistencia_anterior_periodo),
    asistenciaInstitucion: texto(dec.asistencia_anterior_institucion),
    asistenciaFuente: texto(dec.asistencia_anterior_fuente),
    dificultades: lista(dec.dificultades),
    dificultadesCuales: texto(dec.dificultades_cuales),
    dificultadesFuente: texto(dec.dificultades_fuente),
    dificultadesFecha: fecha(dec.dificultades_fecha),
    causasRepitencia: texto(dec.causas_repitencia),
    asistenciaAcudiente: lista(e.asistencia_acudiente),
  }
}

export interface ContextoCaracterizacion {
  listas: ListasCaracterizacion
  /** Repitencia registrada en Cobertura: obliga a explicar las causas. */
  repitente: boolean
  /** Matriculado en la plataforma el año anterior: su asistencia ya consta, no se declara. */
  anioAnteriorEnPlataforma: boolean
}

export type ErroresCaracterizacion = Record<string, string>

/** Campo numérico opcional u obligatorio con rango entero; vacío es «Sin información». */
function entero(valor: string, min: number, max: number, campo: string, obligatorio = false): string | undefined {
  if (!valor.trim()) return obligatorio ? `${campo} es obligatorio.` : undefined
  const n = Number(valor)
  if (!Number.isInteger(n) || n < min || n > max) return `${campo} debe ir de ${min} a ${max}.`
  return undefined
}

const obligatorio = (valor: string, mensaje: string) => (valor ? undefined : mensaje)

/** Claves de error → mensaje. Las claves son el `id` del campo (`hogar-personas`, `integrante-2-vive`…). */
export function validarCaracterizacion(v: FormCaracterizacion, c: ContextoCaracterizacion): ErroresCaracterizacion {
  const e: ErroresCaracterizacion = {}
  const L = c.listas
  const poner = (clave: string, mensaje: string | undefined) => {
    if (mensaje) e[clave] = mensaje
  }

  // Núcleo familiar
  poner("hogar-personas", entero(v.personas, PERSONAS_MIN, PERSONAS_MAX, "Personas en el hogar", true))
  const personas = Number(v.personas)
  const convivientes = v.integrantes.filter((i) => i.vive === true).length
  let cuidadores = 0
  v.integrantes.forEach((i, n) => {
    const p = `integrante-${n}`
    poner(`${p}-parentesco`, obligatorio(i.parentesco, "Seleccione el parentesco."))
    poner(`${p}-edad`, entero(i.edad, 0, 120, "La edad"))
    if (i.vive === null) e[`${p}-vive`] = "Indique si vive con el estudiante."
    if (i.cuidador) cuidadores += 1
    if (i.hijos.trim()) {
      poner(`${p}-hijos`, entero(i.hijos, 0, 20, "El número de hijos"))
      if (!esProgenitor(L.PARENTESCO, i.parentesco) && !i.esAcudiente)
        e[`${p}-hijos`] = "El número de hijos solo se indica para el padre, la madre y el acudiente."
    }
  })
  if (cuidadores > 1)
    v.integrantes.forEach((i, n) => {
      if (i.cuidador) e[`integrante-${n}-cuidador`] = "Solo un integrante puede ser el cuidador principal."
    })
  if (v.viveSolo === null) e["situacion-vive-solo"] = "Indique si el estudiante vive solo."
  else if (v.viveSolo && (personas !== 1 || convivientes > 0))
    e["situacion-vive-solo"] = "Vive solo exige una persona en el hogar y ningún integrante conviviente."

  // Vivienda
  poner("vivienda-tipo", obligatorio(v.tipoVivienda, "Seleccione el tipo de vivienda."))
  poner("vivienda-tenencia", obligatorio(v.tenencia, "Seleccione la tenencia de la vivienda."))
  if (esOtraVivienda(L.TIPO_VIVIENDA, v.tipoVivienda) || esOtraVivienda(L.TENENCIA_VIVIENDA, v.tenencia))
    poner(
      "vivienda-descripcion-otra",
      v.descripcionOtra.trim() ? undefined : "Describa la otra vivienda o tenencia.",
    )
  poner("vivienda-info-servicios", obligatorio(v.infoServicios, "Indique si la vivienda tiene servicios básicos."))
  const hayServicios = codigoDeOpcion(L.INFO_SERVICIOS_VIVIENDA, v.infoServicios) === CODIGO.serviciosIdentificados
  const internetSi = codigoDeOpcion(L.RESPUESTA_DISPONIBILIDAD, v.internetHogar) === CODIGO.si
  if (v.infoServicios && hayServicios && v.servicios.filter((s) => !esInternet(L, s)).length === 0 && !internetSi)
    e["vivienda-servicios"] = "Marque al menos un servicio básico."
  if (v.infoServicios && !hayServicios) {
    if (v.servicios.some((s) => !esInternet(L, s)))
      e["vivienda-servicios"] = "No dispone de ninguno y Sin información no admiten servicios marcados."
    else if (internetSi)
      e["vivienda-info-servicios"] =
        "Internet en el hogar es Sí pero no hay servicios identificados: revise las respuestas antes de confirmar."
  }

  // Internet y equipo
  poner("internet-hogar", obligatorio(v.internetHogar, "Indique la disponibilidad de internet en el hogar."))
  poner(
    "internet-estudiar",
    obligatorio(v.internetEstudiar, "Indique si el estudiante tiene internet utilizable para estudiar."),
  )
  poner("internet-equipo", obligatorio(v.equipo, "Indique la disponibilidad de computador o tableta."))

  // Socioeconómica
  poner("socio-aportantes-conv", entero(v.aportantesConv, 0, 30, "Los aportantes convivientes"))
  if (!e["socio-aportantes-conv"] && v.aportantesConv.trim() && Number(v.aportantesConv) > personas)
    e["socio-aportantes-conv"] = "Los aportantes convivientes no pueden ser más que las personas en el hogar."
  if (v.aportantesExt.trim() && !/^\d+$/.test(v.aportantesExt)) e["socio-aportantes-ext"] = "Los aportantes externos no pueden ser negativos."
  poner("socio-info-programas", obligatorio(v.infoProgramas, "Indique si el hogar recibe programas sociales."))
  const recibe = codigoDeOpcion(L.INFO_PROGRAMAS_SOCIALES, v.infoProgramas) === CODIGO.recibeProgramas
  if (v.infoProgramas && recibe && v.programas.length === 0) e["socio-programas"] = "Elija al menos un programa social."
  if (v.infoProgramas && !recibe && v.programas.length > 0)
    e["socio-programas"] = "Ninguno y Sin información no admiten programas elegidos."

  // Situación del estudiante
  poner("situacion-trabajo", obligatorio(v.trabajo, "Indique si el estudiante trabaja."))
  poner("situacion-temprana-edad", obligatorio(v.tempranaEdad, "Indique si es madre o padre a temprana edad."))
  poner("situacion-lugar-hermanos", entero(v.lugarHermanos, 1, 20, "El lugar entre los hermanos"))
  poner("situacion-desplazamiento", entero(v.desplazamiento, 0, 300, "El tiempo de desplazamiento"))

  // Trayectoria
  poner("trayectoria-curso-preescolar", obligatorio(v.cursoPreescolar, "Indique si cursó preescolar."))
  if (v.aniosPreescolar.trim()) {
    if (codigoDeOpcion(L.RESPUESTA_ACOMPANAMIENTO, v.cursoPreescolar) !== CODIGO.si)
      e["trayectoria-anios-preescolar"] = "Los años de preescolar solo se indican si cursó preescolar."
    else poner("trayectoria-anios-preescolar", entero(v.aniosPreescolar, 1, 3, "Los años de preescolar"))
  }
  poner("trayectoria-retiros", entero(v.retiros, 0, 20, "Los retiros sin terminar el año"))
  poner("trayectoria-interrupciones", entero(v.interrupciones, 0, 20, "Las interrupciones temporales de asistencia"))
  poner("trayectoria-meses", entero(v.meses, 0, 240, "Los meses fuera del sistema educativo"))
  if (!c.anioAnteriorEnPlataforma && v.asistenciaPct.trim()) {
    const pct = Number(v.asistenciaPct.replace(",", "."))
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) e["trayectoria-asistencia-pct"] = "La asistencia debe ir de 0 a 100."
    if (!v.asistenciaPeriodo.trim()) e["trayectoria-asistencia-periodo"] = "Indique el año o período de la asistencia."
    if (!v.asistenciaInstitucion.trim()) e["trayectoria-asistencia-institucion"] = "Indique la institución."
    if (!v.asistenciaFuente.trim()) e["trayectoria-asistencia-fuente"] = "Indique la fuente."
  }
  poner("trayectoria-dificultades", obligatorio(v.dificultades, "Indique si tiene dificultades de aprendizaje diagnosticadas."))
  if (codigoDeOpcion(L.RESPUESTA_ACOMPANAMIENTO, v.dificultades) === CODIGO.si && !v.dificultadesCuales.trim())
    e["trayectoria-dificultades-cuales"] = "Indique cuáles dificultades."
  if (c.repitente && !v.causasRepitencia.trim())
    e["trayectoria-causas-repitencia"] = "Indique las causas de la repitencia (puede escribir Sin información)."
  return e
}

const esInternet = (L: ListasCaracterizacion, id: string) =>
  L.SERVICIO_BASICO_VIVIENDA?.find((o) => o.value === id)?.codigo === CODIGO.internet

/** Sección a la que pertenece una clave de error, para abrirla si está plegada. */
export const seccionDeError = (clave: string): string => clave.split("-")[0]

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")))
const id = (s: string) => (s ? Number(s) : null)
const txt = (s: string) => (s.trim() === "" ? null : s.trim())

/** `BODY.DATOS` del PUT: todo lo que captura el formulario; el acudiente derivado no viaja y los factores van aparte. */
export function armarDatos(v: FormCaracterizacion, c: ContextoCaracterizacion): DatosCaracterizacion {
  const L = c.listas
  const hayServicios = codigoDeOpcion(L.INFO_SERVICIOS_VIVIENDA, v.infoServicios) === CODIGO.serviciosIdentificados
  const recibe = codigoDeOpcion(L.INFO_PROGRAMAS_SOCIALES, v.infoProgramas) === CODIGO.recibeProgramas
  const otra =
    esOtraVivienda(L.TIPO_VIVIENDA, v.tipoVivienda) || esOtraVivienda(L.TENENCIA_VIVIENDA, v.tenencia)
  const cursoSi = codigoDeOpcion(L.RESPUESTA_ACOMPANAMIENTO, v.cursoPreescolar) === CODIGO.si
  const declaraAsistencia = !c.anioAnteriorEnPlataforma && v.asistenciaPct.trim() !== ""
  return {
    personas_hogar: num(v.personas),
    fk_estado_civil_padres: id(v.estadoCivil),
    motivo_no_vive_padres: txt(v.motivoNoVive),
    vive_solo: v.viveSolo,
    fk_tipo_vivienda: id(v.tipoVivienda),
    fk_tenencia_vivienda: id(v.tenencia),
    descripcion_otra_vivienda: otra ? txt(v.descripcionOtra) : null,
    fk_info_servicios: id(v.infoServicios),
    // Internet sale de la disponibilidad en el hogar: el backend lo agrega y no se envía como casilla.
    servicios: hayServicios ? v.servicios.filter((s) => !esInternet(L, s)).map(Number) : [],
    fk_internet_hogar: id(v.internetHogar),
    fk_internet_estudiar: id(v.internetEstudiar),
    fk_frecuencia_domicilio: id(v.frecuenciaDomicilio),
    fk_equipo_estudiar: id(v.equipo),
    fk_ingresos: id(v.ingresos),
    aportantes_convivientes: num(v.aportantesConv),
    aportantes_externos: num(v.aportantesExt),
    fk_info_programas: id(v.infoProgramas),
    programas: recibe ? v.programas.map(Number) : [],
    fk_trabajo_estudiante: id(v.trabajo),
    fk_padre_temprana_edad: id(v.tempranaEdad),
    que_desea_estudiar: txt(v.desea),
    lugar_hermanos: num(v.lugarHermanos),
    fk_proteccion_estado: id(v.proteccion),
    programas_complementarios: txt(v.complementarios),
    medio_transporte: txt(v.transporte),
    tiempo_desplazamiento: num(v.desplazamiento),
    otra_informacion: txt(v.otraInfo),
    fk_tipologia_familiar: id(v.tipologia),
    temas_escuela_padres: txt(v.temas),
    fk_desempeno_percibido: id(v.desempeno),
    fk_lugar_estudio: id(v.lugarEstudio),
    fk_horas_estudio: id(v.horasEstudio),
    estrategias: v.estrategias.map(Number),
    fk_asistencia_acudiente: id(v.asistenciaAcudiente),
    fk_curso_preescolar: id(v.cursoPreescolar),
    anios_preescolar: cursoSi ? num(v.aniosPreescolar) : null,
    retiros_previos: num(v.retiros),
    interrupciones_previas: num(v.interrupciones),
    meses_fuera_sistema: num(v.meses),
    trayectoria_fuente: txt(v.trayectoriaFuente),
    trayectoria_fecha_referencia: v.trayectoriaFecha ? fechaParaBackend(v.trayectoriaFecha) : null,
    asistencia_anterior_pct: declaraAsistencia ? num(v.asistenciaPct) : null,
    asistencia_anterior_periodo: declaraAsistencia ? txt(v.asistenciaPeriodo) : null,
    asistencia_anterior_institucion: declaraAsistencia ? txt(v.asistenciaInstitucion) : null,
    asistencia_anterior_fuente: declaraAsistencia ? txt(v.asistenciaFuente) : null,
    fk_dificultades: id(v.dificultades),
    dificultades_cuales: txt(v.dificultadesCuales),
    dificultades_fuente: txt(v.dificultadesFuente),
    dificultades_fecha: v.dificultadesFecha ? fechaParaBackend(v.dificultadesFecha) : null,
    causas_repitencia: txt(v.causasRepitencia),
    integrantes: v.integrantes.map((i) => ({
      fk_parentesco: id(i.parentesco),
      nombre: txt(i.nombre),
      edad: num(i.edad),
      fk_escolaridad: id(i.escolaridad),
      fk_empleo: id(i.empleo),
      vive_con_estudiante: i.vive,
      es_cuidador_principal: i.cuidador,
      es_acudiente: i.esAcudiente,
      apoyo: txt(i.apoyo),
      numero_hijos: num(i.hijos),
    })),
  }
}

// --- Revisión de factores de vulnerabilidad (acción aparte del formulario) ---

export interface FactorForm {
  /** Id de la opción de FACTOR_VULNERABILIDAD. */
  factor: string
  marcado: boolean
  fuente: string
  fecha: Date | undefined
  /** Estado en el servidor: decide si desmarcarlo pide motivo (solo los vigentes). */
  estado: "VIGENTE" | "PENDIENTE" | "NUEVO"
  motivo: string
}

export interface FormRevision {
  revision: string
  factores: FactorForm[]
  observaciones: string
}

/** Un factor por opción de la lista; los vigentes llegan marcados y los copiados (pendientes) sin marcar, para ratificarlos. */
export function revisionDesdeDetalle(d: CaracterizacionDetalle, opciones: OpcionCatalogo[]): FormRevision {
  const e = d.establecimiento
  const abiertos = e.factores.filter((f) => f.estado !== "DESACTIVADO")
  const revision = e.revision_factores
  return {
    // «Sin revisar» es solo el estado inicial: el selector no lo ofrece, queda vacío hasta elegir.
    revision: revision && revision.valor !== CODIGO.sinRevisar ? String(revision.id) : "",
    factores: opciones.map((o) => {
      const f = abiertos.find((x) => String(x.factor.id) === o.value)
      return {
        factor: o.value,
        marcado: f?.estado === "VIGENTE",
        fuente: f?.fuente ?? "",
        fecha: fecha(f?.fecha_conocimiento),
        estado: f ? (f.estado === "VIGENTE" ? "VIGENTE" : "PENDIENTE") : "NUEVO",
        motivo: "",
      }
    }),
    observaciones: e.observaciones ?? "",
  }
}

export function validarRevision(
  r: FormRevision,
  opcionesRevision: OpcionCatalogo[],
  opcionesFactor: OpcionCatalogo[],
  hoy = new Date(),
): ErroresCaracterizacion {
  const e: ErroresCaracterizacion = {}
  if (!r.revision) e["revision-resultado"] = "Seleccione el resultado de la revisión."
  const codigo = codigoDeOpcion(opcionesRevision, r.revision)
  const marcados = r.factores.filter((f) => f.marcado)
  if (codigo === CODIGO.factoresIdentificados && marcados.length === 0)
    e["revision-resultado"] = "Factores identificados exige al menos un factor."
  if (codigo === CODIGO.sinFactores && marcados.length > 0)
    e["revision-resultado"] = "Sin factores identificados no admite factores activos."
  const sinHoy = fechaParaBackend(hoy)
  r.factores.forEach((f) => {
    if (f.marcado) {
      if (!f.fuente.trim()) e[`revision-fuente-${f.factor}`] = "Indique la fuente."
      if (!f.fecha) e[`revision-fecha-${f.factor}`] = "Indique la fecha en que se conoció."
      else if (fechaParaBackend(f.fecha) > sinHoy) e[`revision-fecha-${f.factor}`] = "La fecha no puede ser posterior a hoy."
    } else if (f.estado === "VIGENTE" && !f.motivo.trim())
      e[`revision-motivo-${f.factor}`] = "Indique por qué deja de aplicar."
  })
  const hayOtro = marcados.some((f) => codigoDeOpcion(opcionesFactor, f.factor) === CODIGO.otro)
  if (hayOtro && !r.observaciones.trim()) e["revision-observaciones"] = "El factor Otro exige Observaciones."
  return e
}
