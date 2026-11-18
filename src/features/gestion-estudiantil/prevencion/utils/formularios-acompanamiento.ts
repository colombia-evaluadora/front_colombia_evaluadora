import { format } from "date-fns"

import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import type {
  AccionAcompInput,
  AcompAccion,
  AcompanamientoDetalle,
  AcompanamientoRow,
  ResumenAcomp,
  AcompConsumoInput,
  AcompDetalleConsumo,
  AcompDetalleEmbarazo,
  AcompEmbarazoInput,
  TipoAcompanamiento,
} from "@/features/gestion-estudiantil/prevencion/api/types"

// Formularios de acompañamiento por embarazo (§9.9) y por consumo (§9.10). Repiten las reglas de la
// especificación para marcar el campo antes de enviar; el 400 del servidor sigue siendo la última palabra.

export const DESCRIPCION_ACOMP_MIN = 10
export const TEXTO_ACOMP_MAX = 3000
export const FUENTE_MAX = 200
export const OTRA_SUSTANCIA_MAX = 150
export const OTRO_LUGAR_MAX = 200
export const SENALES_MAX = 2000

/** Códigos TLV que activan el texto libre (SUSTANCIA_CONSUMO / LUGAR_CONSUMO). */
export const SUSTANCIA_OTRA = "OTRA"
export const LUGAR_OTRO = "OTRO"

const iso = (fecha: Date) => format(fecha, "yyyy-MM-dd")
const deIso = (v: string | null | undefined) => (v ? new Date(`${v.slice(0, 10)}T00:00:00`) : undefined)
const texto = (v: string) => v.trim() || null
const entero = (v: string) => (v.trim() === "" ? null : Number(v))
const str = (v: number | null | undefined) => (v == null ? "" : String(v))

export interface ValoresAcomp {
  estudiante: string
  fechaConocimiento: Date | undefined
  responsable: string
  descripcion: string
  acuerdos: string
  // Embarazo
  atencion: string
  situacion: string
  semanasGestacion: string
  fechaParto: Date | undefined
  fuenteGestacion: string
  fechaInfoGestacion: Date | undefined
  progenitorConocido: string
  acompProgenitor: string
  apoyoAcudiente: string
  // Consumo
  origen: string
  fuenteInfo: string
  fechaInfo: Date | undefined
  sustancia: string
  otraSustancia: string
  lugar: string
  otroLugar: string
  semanasConsumo: string
  senalesRiesgo: string
  semanasSenales: string
}

export type ErroresAcomp = Partial<Record<keyof ValoresAcomp, string>>

export const valoresAcompVacios = (): ValoresAcomp => ({
  estudiante: "",
  fechaConocimiento: new Date(),
  responsable: "",
  descripcion: "",
  acuerdos: "",
  atencion: "",
  situacion: "",
  semanasGestacion: "",
  fechaParto: undefined,
  fuenteGestacion: "",
  fechaInfoGestacion: undefined,
  progenitorConocido: "",
  acompProgenitor: "",
  apoyoAcudiente: "",
  origen: "",
  fuenteInfo: "",
  fechaInfo: undefined,
  sustancia: "",
  otraSustancia: "",
  lugar: "",
  otroLugar: "",
  semanasConsumo: "",
  senalesRiesgo: "",
  semanasSenales: "",
})

/** Valores del formulario a partir del detalle (Modificar). */
export function valoresDesdeDetalle(d: AcompanamientoDetalle): ValoresAcomp {
  const v = valoresAcompVacios()
  v.estudiante = str(Number(d.contexto.fk_tmatricula))
  v.fechaConocimiento = deIso(d.fecha_conocimiento)
  v.responsable = str(d.fk_tfuncionario_responsable)
  v.descripcion = d.descripcion ?? ""
  v.acuerdos = d.acuerdos ?? ""
  if (d.tipo === "EMBARAZO" && d.detalle) {
    const e = d.detalle as AcompDetalleEmbarazo
    v.atencion = str(e.fk_torientacion_atencion)
    v.situacion = str(e.fk_tlv_situacion)
    v.semanasGestacion = str(e.semanas_gestacion)
    v.fechaParto = deIso(e.fecha_estimada_parto)
    v.fuenteGestacion = e.fuente_gestacion ?? ""
    v.fechaInfoGestacion = deIso(e.fecha_info_gestacion)
    v.progenitorConocido = str(e.fk_tlv_progenitor_conocido)
    v.acompProgenitor = str(e.fk_tlv_acomp_progenitor)
    v.apoyoAcudiente = str(e.fk_tlv_apoyo_acudiente)
  } else if (d.detalle) {
    const c = d.detalle as AcompDetalleConsumo
    v.origen = str(c.fk_tlv_origen)
    v.fuenteInfo = c.fuente_info ?? ""
    v.fechaInfo = deIso(c.fecha_info)
    v.sustancia = str(c.fk_tlv_sustancia)
    v.otraSustancia = c.otra_sustancia ?? ""
    v.lugar = str(c.fk_tlv_lugar)
    v.otroLugar = c.otro_lugar ?? ""
    v.semanasConsumo = str(c.semanas_consumo)
    v.senalesRiesgo = c.senales_riesgo ?? ""
    v.semanasSenales = str(c.semanas_senales)
  }
  return v
}

function errorFecha(fecha: Date | undefined, nombre: string, obligatoria: boolean, hoy: string): string | undefined {
  if (!fecha) return obligatoria ? `${nombre} es obligatoria.` : undefined
  if (iso(fecha) > hoy) return `${nombre} no puede ser posterior a hoy.`
  return undefined
}

function errorEntero(valor: string, nombre: string): string | undefined {
  if (valor.trim() === "") return undefined
  return /^\d+$/.test(valor.trim()) ? undefined : `${nombre} debe ser un número entero no negativo.`
}

export interface CodigosAcomp {
  sustancia?: string
  lugar?: string
}

/** Validación del formulario según el tipo; `codigos` trae el VALOR TLV de la sustancia y el lugar elegidos. */
export function validarAcomp(
  tipo: TipoAcompanamiento,
  v: ValoresAcomp,
  codigos: CodigosAcomp,
  ahora = new Date(),
): ErroresAcomp {
  const hoy = iso(ahora)
  const e: ErroresAcomp = {}
  const set = (k: keyof ValoresAcomp, m: string | undefined) => {
    if (m) e[k] = m
  }
  if (!v.estudiante) e.estudiante = "El estudiante de referencia es obligatorio."
  set("fechaConocimiento", errorFecha(v.fechaConocimiento, "La fecha de conocimiento", true, hoy))
  if (!v.responsable) e.responsable = "El responsable es obligatorio."
  set(
    "descripcion",
    errorLargo(
      v.descripcion,
      DESCRIPCION_ACOMP_MIN,
      TEXTO_ACOMP_MAX,
      tipo === "EMBARAZO" ? "La descripción y necesidades de continuidad" : "La descripción de lo observado o informado",
    ),
  )
  if (v.acuerdos.trim().length > TEXTO_ACOMP_MAX) e.acuerdos = `Los acuerdos admiten hasta ${TEXTO_ACOMP_MAX} caracteres.`

  if (tipo === "EMBARAZO") {
    if (!v.situacion) e.situacion = "La situación de acompañamiento es obligatoria."
    set("semanasGestacion", errorEntero(v.semanasGestacion, "Las semanas de gestación"))
    // Fuente y fecha de la información son obligatorias si se registran semanas o fecha estimada de parto.
    const conGestacion = v.semanasGestacion.trim() !== "" || v.fechaParto != null
    if (conGestacion && !v.fuenteGestacion.trim())
      e.fuenteGestacion = "La fuente es obligatoria si se registran semanas o fecha estimada."
    set("fechaInfoGestacion", errorFecha(v.fechaInfoGestacion, "La fecha de la información", conGestacion, hoy))
    if (!v.progenitorConocido) e.progenitorConocido = "Indique si el progenitor es conocido."
    if (!v.acompProgenitor) e.acompProgenitor = "Indique el acompañamiento del progenitor."
    if (!v.apoyoAcudiente) e.apoyoAcudiente = "Indique el apoyo del acudiente."
  } else {
    if (!v.origen) e.origen = "El origen de la información es obligatorio."
    if (!v.fuenteInfo.trim()) e.fuenteInfo = "La fuente de la información es obligatoria."
    set("fechaInfo", errorFecha(v.fechaInfo, "La fecha de la información", true, hoy))
    if (!v.sustancia) e.sustancia = "La sustancia presunta es obligatoria."
    if (codigos.sustancia === SUSTANCIA_OTRA && !v.otraSustancia.trim())
      e.otraSustancia = "Indique la otra sustancia informada."
    if (!v.lugar) e.lugar = "El lugar informado es obligatorio."
    if (codigos.lugar === LUGAR_OTRO && !v.otroLugar.trim()) e.otroLugar = "Indique el otro lugar."
    set("semanasConsumo", errorEntero(v.semanasConsumo, "El tiempo de consumo"))
    set("semanasSenales", errorEntero(v.semanasSenales, "El tiempo de señales de riesgo"))
    if (v.senalesRiesgo.trim().length > SENALES_MAX)
      e.senalesRiesgo = `Las señales de riesgo admiten hasta ${SENALES_MAX} caracteres.`
  }
  return e
}

const fecha = (d: Date | undefined) => (d ? iso(d) : null)

const comun = (v: ValoresAcomp) => ({
  FECHA_CONOCIMIENTO: iso(v.fechaConocimiento as Date),
  FK_RESPONSABLE: Number(v.responsable),
  DESCRIPCION: texto(v.descripcion),
  ACUERDOS: texto(v.acuerdos),
})

export function embarazoParaBackend(v: ValoresAcomp): AcompEmbarazoInput {
  return {
    ...comun(v),
    FK_ATENCION: v.atencion ? Number(v.atencion) : null,
    FK_SITUACION: Number(v.situacion),
    SEMANAS_GESTACION: entero(v.semanasGestacion),
    FECHA_ESTIMADA_PARTO: fecha(v.fechaParto),
    FUENTE_GESTACION: texto(v.fuenteGestacion),
    FECHA_INFO_GESTACION: fecha(v.fechaInfoGestacion),
    FK_PROGENITOR_CONOCIDO: Number(v.progenitorConocido),
    FK_ACOMP_PROGENITOR: Number(v.acompProgenitor),
    FK_APOYO_ACUDIENTE: Number(v.apoyoAcudiente),
  }
}

/** Otra sustancia y Otro lugar solo viajan con su código: así no queda un texto huérfano al cambiar la opción. */
export function consumoParaBackend(v: ValoresAcomp, codigos: CodigosAcomp): AcompConsumoInput {
  return {
    ...comun(v),
    FK_ORIGEN: Number(v.origen),
    FUENTE_INFO: texto(v.fuenteInfo),
    FECHA_INFO: fecha(v.fechaInfo),
    FK_SUSTANCIA: Number(v.sustancia),
    OTRA_SUSTANCIA: codigos.sustancia === SUSTANCIA_OTRA ? texto(v.otraSustancia) : null,
    FK_LUGAR: Number(v.lugar),
    OTRO_LUGAR: codigos.lugar === LUGAR_OTRO ? texto(v.otroLugar) : null,
    SEMANAS_CONSUMO: entero(v.semanasConsumo),
    SENALES_RIESGO: texto(v.senalesRiesgo),
    SEMANAS_SENALES: entero(v.semanasSenales),
  }
}

export const resumenDesdeFila = (f: AcompanamientoRow): ResumenAcomp => ({
  id: f.id,
  tipo: f.tipo,
  fk_tmatricula: f.fk_tmatricula,
  estudiante_nombre: f.estudiante_nombre,
  estado: f.estado,
  estado_nombre: f.estado_nombre,
  fecha_conocimiento: f.fecha_conocimiento,
  detalle_nombre: f.tipo === "EMBARAZO" ? f.situacion_nombre : f.sustancia_nombre,
})

export const resumenDesdeDetalle = (d: AcompanamientoDetalle): ResumenAcomp => ({
  id: d.id,
  tipo: d.tipo,
  fk_tmatricula: Number(d.contexto.fk_tmatricula),
  estudiante_nombre: d.contexto.estudiante_nombre ?? "",
  estado: d.estado,
  estado_nombre: d.estado_nombre,
  fecha_conocimiento: d.fecha_conocimiento,
  detalle_nombre:
    d.tipo === "EMBARAZO"
      ? ((d.detalle as AcompDetalleEmbarazo | null)?.situacion_nombre ?? null)
      : ((d.detalle as AcompDetalleConsumo | null)?.sustancia_nombre ?? null),
})

// --- Acción o remisión, resultado, cierre y anulación (fase de diálogos) ---

export const ACCION_TEXTO_MIN = 10
export const ACCION_TEXTO_MAX = 2000
export const MOTIVO_REMISION_MAX = 1000
export const RESPUESTA_MAX = 1000
export const RESUMEN_CIERRE_MAX = 2000
export const MOTIVO_ANULACION_MAX = 1000
export const SOPORTES_MAX = 5
/** Código TLV del tipo de acción que activa la remisión externa (V687 fn_prevencion_acomp_es_remision). */
export const ACCION_REMISION = "REMISION_EXTERNA"

export interface ValoresAccionAcomp {
  tipo: string
  fecha: Date | undefined
  responsable: string
  descripcion: string
  plazo: Date | undefined
  resultado: string
  entidad: string
  motivo: string
  fechaRemision: Date | undefined
  respuesta: string
}
export type ErroresAccionAcomp = Partial<Record<keyof ValoresAccionAcomp, string>>

export function validarAccionAcomp(
  tipoAcomp: TipoAcompanamiento,
  v: ValoresAccionAcomp,
  esRemision: boolean,
  ahora = new Date(),
): ErroresAccionAcomp {
  const hoy = iso(ahora)
  const e: ErroresAccionAcomp = {}
  if (!v.tipo) e.tipo = "El tipo de acción es obligatorio."
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  if (!v.responsable) e.responsable = "El responsable es obligatorio."
  const d = errorLargo(v.descripcion, ACCION_TEXTO_MIN, ACCION_TEXTO_MAX, "La descripción")
  if (d) e.descripcion = d
  if (v.plazo && v.fecha && iso(v.plazo) < iso(v.fecha)) e.plazo = "El plazo no puede ser anterior a la fecha."
  if (v.resultado.trim()) {
    const r = errorLargo(v.resultado, ACCION_TEXTO_MIN, ACCION_TEXTO_MAX, "El resultado")
    if (r) e.resultado = r
  }
  if (esRemision) {
    if (!v.entidad) e.entidad = "La entidad de remisión es obligatoria."
    const m = errorLargo(v.motivo, 10, MOTIVO_REMISION_MAX, "El motivo de la remisión")
    if (m) e.motivo = m
    // La fecha de la remisión es obligatoria solo en consumo (V688 fn_prevencion_acomp_validar_remision).
    const f = errorFecha(v.fechaRemision, "La fecha de la remisión", tipoAcomp === "CONSUMO", hoy)
    if (f) e.fechaRemision = f
    if (v.respuesta.trim().length > RESPUESTA_MAX) e.respuesta = `La respuesta admite hasta ${RESPUESTA_MAX} caracteres.`
  }
  return e
}

export function valoresAccionDesde(a: AcompAccion | null, responsable = ""): ValoresAccionAcomp {
  const rx = a?.remision as Record<string, unknown> | null | undefined
  const t = (k: string) => (rx && typeof rx[k] === "string" ? (rx[k] as string) : "")
  return {
    tipo: a ? String(a.fk_tlv_tipo) : "",
    fecha: a ? deIso(a.fecha) : new Date(),
    responsable: a ? String(a.fk_tfuncionario_responsable) : responsable,
    descripcion: a?.descripcion ?? "",
    plazo: deIso(a?.plazo),
    resultado: "",
    entidad: rx && rx.fk_tlv_entidad != null ? String(rx.fk_tlv_entidad) : "",
    motivo: t("motivo"),
    fechaRemision: deIso(t("fecha_remision")),
    respuesta: t("respuesta"),
  }
}

export function accionParaBackend(
  acompId: number,
  accionId: number | null,
  v: ValoresAccionAcomp,
  esRemision: boolean,
  soportes: number[],
): AccionAcompInput {
  return {
    id: acompId,
    ACCION: accionId,
    FK_TIPO: Number(v.tipo),
    FECHA: iso(v.fecha as Date),
    FK_RESPONSABLE: Number(v.responsable),
    DESCRIPCION: texto(v.descripcion),
    PLAZO: fecha(v.plazo),
    RESULTADO: texto(v.resultado),
    FK_ENTIDAD: esRemision && v.entidad ? Number(v.entidad) : null,
    MOTIVO_REMISION: esRemision ? texto(v.motivo) : null,
    FECHA_REMISION: esRemision ? fecha(v.fechaRemision) : null,
    RESPUESTA_REMISION: esRemision ? texto(v.respuesta) : null,
    SOPORTES: soportes.length ? soportes : null,
  }
}
