import { formatDateValue } from "@/lib/date-value"

import type { ActualizarCasoInput, CrearCasoInput } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import type { CasoDatosInput, CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { DatosSiuce, EstudianteFila, InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { errorLargo, siuceBody, SIUCE_VACIO, validarSiuce } from "@/features/gestion-estudiantil/convivencia/api/validaciones"

export interface ValoresCaso {
  tipo: string
  manifestacion: string
  fechaConocida: boolean | null
  fechaHechos: string
  fechaConocimiento: string
  horaConocida: boolean | null
  hora: string
  lugar: string
  descripcion: string
  siuce: DatosSiuce
  soporte: File[]
  soporteExistente: number | null
  estudiantes: EstudianteFila[]
  involucrados: InvolucradoFila[]
  motivo: string
}

export type ErroresCaso = Partial<Record<keyof ValoresCaso | keyof DatosSiuce, string>>

/** Campos del bloque plegable «Datos para el SIUCE»: con error en uno, el bloque se abre. */
export const CAMPOS_SIUCE = ["tiposDano", "agresion", "repetitiva", "secuelas"] as const

const pad = (n: number) => String(n).padStart(2, "0")
export const hoy = () => formatDateValue(new Date())
export const horaActual = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Valores iniciales del formulario: vacíos al crear, los del caso al modificar. */
export function desdeCaso(c: CasoDetalle | undefined): ValoresCaso {
  return {
    tipo: c ? String(c.fk_tlv_tipo) : "",
    manifestacion: c?.fk_tlv_manifestacion ? String(c.fk_tlv_manifestacion) : "",
    fechaConocida: c ? Boolean(c.fecha_hechos_conocida) : null,
    fechaHechos: c?.fecha_hechos?.slice(0, 10) ?? "",
    fechaConocimiento: c ? c.fecha_conocimiento.slice(0, 10) : hoy(),
    horaConocida: c ? (c.fecha_hechos_conocida ? Boolean(c.hora_hechos_conocida) : null) : null,
    hora: c?.hora_hechos?.slice(0, 5) ?? "",
    lugar: c?.fk_tlv_lugar ? String(c.fk_tlv_lugar) : "",
    descripcion: c?.descripcion ?? "",
    siuce: c
      ? {
          tiposDano: (c.tipos_dano ?? []).map(String),
          agresion: c.fk_tlv_tipo_agresion ? String(c.fk_tlv_tipo_agresion) : "",
          evento: c.fk_tlv_evento_generador ? String(c.fk_tlv_evento_generador) : "",
          repetitiva: c.situacion_repetitiva ?? null,
          secuelas: c.secuelas_fisicas ?? null,
        }
      : SIUCE_VACIO,
    soporte: [],
    soporteExistente: c?.fk_tarchivo_soporte ?? null,
    estudiantes: (c?.estudiantes ?? []).map((e) => ({
      id: e.id,
      fk_matricula: e.fk_matricula,
      nombre: e.nombre,
      grado: e.grado_grupo ?? "",
      rol: String(e.fk_tlv_rol),
      rolOriginal: String(e.fk_tlv_rol),
    })),
    involucrados: (c?.otros_involucrados ?? []).map((i) => ({
      key: `inv-${i.id}`,
      id: i.id,
      tipo: String(i.fk_tlv_tipo_involucrado),
      nombre: i.nombre ?? "",
      tipoDoc: i.fk_tlv_tipo_documento ? String(i.fk_tlv_tipo_documento) : "",
      numDoc: i.numero_documento ?? "",
      rol: String(i.fk_tlv_rol),
      fk_funcionario: i.fk_funcionario,
    })),
    motivo: "",
  }
}

/** Huella de las fechas: si cambia al modificar, se exige el motivo de la corrección. */
export const fechasDe = (v: ValoresCaso) =>
  [v.fechaConocida, v.fechaConocida ? v.fechaHechos : "", v.fechaConocida ? v.horaConocida : null, v.horaConocida ? v.hora : "", v.fechaConocimiento].join("|")

export interface ContextoValidacion {
  grave: boolean
  tipoI: boolean
  secuelas: boolean
  fechasCambiaron: boolean
  involucradoConError: (i: InvolucradoFila) => boolean
}

/** Validaciones de cliente de 3.1; las que dependen de la base (alcance, matrícula Cursando) las da el backend. */
export function validarCaso(v: ValoresCaso, ctx: ContextoValidacion): ErroresCaso {
  const { grave, tipoI, secuelas, fechasCambiaron, involucradoConError } = ctx
  const e: ErroresCaso = {}
  if (!v.tipo) e.tipo = "El tipo de situación es obligatorio."
  if (!v.manifestacion) e.manifestacion = "La manifestación es obligatoria."
  if (v.fechaConocida == null) e.fechaConocida = "Indique si se conoce la fecha."
  if (!v.fechaConocimiento) e.fechaConocimiento = "La fecha de conocimiento es obligatoria."
  else if (v.fechaConocimiento > hoy()) e.fechaConocimiento = "No puede ser posterior a hoy."
  if (v.fechaConocida) {
    if (!v.fechaHechos) e.fechaHechos = "La fecha de los hechos es obligatoria."
    else if (v.fechaHechos > hoy()) e.fechaHechos = "No puede ser posterior a hoy."
    else if (v.fechaConocimiento && v.fechaHechos > v.fechaConocimiento)
      e.fechaHechos = "No puede ser posterior a la fecha de conocimiento."
    if (v.horaConocida == null) e.horaConocida = "Indique si se conoce la hora."
    if (v.horaConocida) {
      if (!v.hora) e.hora = "La hora es obligatoria."
      else if (v.fechaHechos === hoy() && v.hora > horaActual()) e.hora = "No puede ser posterior al momento actual."
    }
  }
  if (!v.lugar) e.lugar = "El lugar es obligatorio."
  const d = errorLargo(v.descripcion, 20, 3000, "La descripción")
  if (d) e.descripcion = d
  Object.assign(e, validarSiuce(v.siuce, grave, secuelas))
  if (!v.estudiantes.length) e.estudiantes = "Agregue al menos un estudiante."
  else if (v.estudiantes.some((x) => !x.rol)) e.estudiantes = "Elija el rol de cada estudiante."
  else if (tipoI && v.estudiantes.length + v.involucrados.length < 2)
    e.estudiantes = "Un caso Tipo I requiere al menos dos personas involucradas para la mediación."
  if (v.involucrados.some(involucradoConError)) e.involucrados = "Revise los otros involucrados marcados."
  if (fechasCambiaron) {
    const m = errorLargo(v.motivo, 10, 1000, "El motivo de la corrección")
    if (m) e.motivo = m
  }
  return e
}

/** Datos comunes del body de `POST/PUT /casos`. */
export function datosDeCaso(v: ValoresCaso, secuelas: boolean): CasoDatosInput {
  return {
    FK_TLV_MANIFESTACION: Number(v.manifestacion),
    FECHA_HECHOS_CONOCIDA: Boolean(v.fechaConocida),
    FECHA_HECHOS: v.fechaConocida ? v.fechaHechos : null,
    HORA_HECHOS_CONOCIDA: v.fechaConocida ? Boolean(v.horaConocida) : null,
    HORA_HECHOS: v.fechaConocida && v.horaConocida ? v.hora : null,
    FECHA_CONOCIMIENTO: v.fechaConocimiento,
    FK_TLV_LUGAR: Number(v.lugar),
    DESCRIPCION: v.descripcion.trim(),
    FK_TLV_EVENTO_GENERADOR: v.siuce.evento ? Number(v.siuce.evento) : null,
    ...siuceBody(v.siuce, secuelas),
    FK_ARCHIVO_SOPORTE: v.soporteExistente,
  }
}

export const toInvolucradoInput = (i: InvolucradoFila) => ({
  fk_tlv_tipo_involucrado: Number(i.tipo),
  fk_funcionario: i.fk_funcionario,
  nombre: i.nombre.trim(),
  fk_tlv_tipo_documento: i.tipoDoc ? Number(i.tipoDoc) : null,
  numero_documento: i.tipoDoc ? i.numDoc.trim() : null,
  fk_tlv_rol: Number(i.rol),
})

const toEstudianteInput = (e: EstudianteFila) => ({ fk_matricula: e.fk_matricula, fk_tlv_rol: Number(e.rol) })

export function crearCasoInput(v: ValoresCaso, secuelas: boolean): CrearCasoInput {
  return {
    datos: datosDeCaso(v, secuelas),
    tipoId: Number(v.tipo),
    soporte: v.soporte[0] ?? null,
    estudiantes: v.estudiantes.map(toEstudianteInput),
    involucrados: v.involucrados.map(toInvolucradoInput),
  }
}

/** Body de modificar: los datos y el diff de personas frente a lo guardado, que van por sus endpoints propios. */
export function actualizarCasoInput(
  caso: CasoDetalle,
  v: ValoresCaso,
  secuelas: boolean,
  fechasCambiaron: boolean,
): ActualizarCasoInput {
  const actuales = new Set(v.estudiantes.map((e) => e.id).filter(Boolean))
  const invActuales = new Set(v.involucrados.map((i) => i.id).filter(Boolean))
  return {
    casoId: caso.id,
    datos: datosDeCaso(v, secuelas),
    soporte: v.soporte[0] ?? null,
    motivoCorreccion: fechasCambiaron ? v.motivo.trim() : null,
    estudiantesNuevos: v.estudiantes.filter((e) => !e.id).map(toEstudianteInput),
    estudiantesQuitados: (caso.estudiantes ?? []).filter((e) => !actuales.has(e.id)).map((e) => e.id),
    rolesCambiados: v.estudiantes
      .filter((e) => e.id && e.rol !== e.rolOriginal)
      .map((e) => ({ id: e.id!, fk_tlv_rol: Number(e.rol) })),
    involucradosNuevos: v.involucrados.filter((i) => !i.id).map(toInvolucradoInput),
    involucradosQuitados: (caso.otros_involucrados ?? []).filter((i) => !invActuales.has(i.id)).map((i) => i.id),
  }
}
