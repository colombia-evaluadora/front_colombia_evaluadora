import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { COD } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { DatosSiuce, InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"

export const SIUCE_VACIO: DatosSiuce = { tiposDano: [], agresion: "", evento: "", repetitiva: null, secuelas: null }

export type ErroresSiuce = Partial<Record<keyof DatosSiuce, string>>

/** Secuelas físicas solo con Daño físico y Agresión física (3.1), por código interno. */
export function useSecuelasHabilitadas(v: DatosSiuce) {
  const danos = useCatalogo("TIPO_DANO")
  const agresiones = useCatalogo("TIPO_AGRESION")
  return (
    v.tiposDano.some((d) => codigoDe(danos, d) === COD.danoFisico) &&
    codigoDe(agresiones, v.agresion) === COD.agresionFisica
  )
}

/** Obligatorios en Tipo II y III (3.1); Evento generador nunca lo es. */
export function validarSiuce(v: DatosSiuce, grave: boolean, secuelasHabilitadas: boolean): ErroresSiuce {
  const e: ErroresSiuce = {}
  if (!grave) return e
  if (!v.tiposDano.length) e.tiposDano = "Elija al menos un tipo de daño."
  if (!v.agresion) e.agresion = "El tipo de agresión es obligatorio."
  if (v.repetitiva == null) e.repetitiva = "Indique si la situación es repetitiva."
  if (secuelasHabilitadas && v.secuelas == null) e.secuelas = "Indique si hubo secuelas físicas."
  return e
}

/** Body SIUCE de `POST/PUT /casos` y `POST /casos/:ID/tipo`. */
export function siuceBody(v: DatosSiuce, secuelasHabilitadas: boolean) {
  return {
    TIPOS_DANO: v.tiposDano.length ? v.tiposDano.map(Number) : null,
    FK_TLV_TIPO_AGRESION: v.agresion ? Number(v.agresion) : null,
    SITUACION_REPETITIVA: v.repetitiva,
    SECUELAS_FISICAS: secuelasHabilitadas ? v.secuelas : null,
  }
}

export const involucradoVacio = (): InvolucradoFila => ({
  key: crypto.randomUUID(),
  tipo: "",
  nombre: "",
  tipoDoc: "",
  numDoc: "",
  rol: "",
  fk_funcionario: null,
})

export type ErroresInvolucrado = Partial<Record<"tipo" | "funcionario" | "nombre" | "numDoc" | "rol", string>>

/** ¿El tipo de involucrado es un funcionario del establecimiento (Docente, Directivo docente, Administrativo)? */
export const esTipoFuncionario = (tipoCodigo: string | undefined) =>
  (COD.funcionarioEE as readonly string[]).includes(tipoCodigo ?? "")

/** Clave de identidad de una persona para «una persona una vez por caso»: funcionario o documento. */
const identidad = (v: InvolucradoFila) =>
  v.fk_funcionario != null ? `f:${v.fk_funcionario}` : v.tipoDoc && v.numDoc.trim() ? `d:${v.tipoDoc}:${v.numDoc.trim()}` : null

/**
 * Errores de una fila de otro involucrado (3.1, mismas reglas que V209); `undefined` si está completa.
 * `tipoCodigo` y `rolCodigo` son los códigos del catálogo; `todas` permite detectar a la persona repetida.
 */
export function erroresInvolucrado(
  v: InvolucradoFila,
  tipoCodigo?: string,
  rolCodigo?: string,
  todas: InvolucradoFila[] = [],
): ErroresInvolucrado | undefined {
  const e: ErroresInvolucrado = {}
  const funcionario = esTipoFuncionario(tipoCodigo)
  if (!v.tipo) e.tipo = "Elija el tipo."
  if (funcionario && v.fk_funcionario == null)
    e.funcionario = "Para un docente, directivo docente o administrativo elija el funcionario."
  const n = v.nombre.trim().length
  if (!funcionario && (n < 3 || n > 150)) e.nombre = "Entre 3 y 150 caracteres."
  if (!funcionario && v.tipoDoc && !v.numDoc.trim()) e.numDoc = "Obligatorio con tipo de documento."
  if (!v.rol) e.rol = "Elija el rol."
  else if (!funcionario && rolCodigo === COD.afectado)
    e.rol = "Solo un funcionario del establecimiento puede ser afectado."
  const id = identidad(v)
  if (id && todas.some((o) => o.key !== v.key && identidad(o) === id)) {
    if (funcionario) e.funcionario = "Esta persona ya está en el caso."
    else e.numDoc = "Esta persona ya está en el caso."
  }
  return Object.keys(e).length ? e : undefined
}

/** Campo del formulario del caso al que apunta un mensaje 22023 de convivencia (V209). */
export type CampoCaso =
  | "tipo" | "manifestacion" | "lugar" | "fechaConocida" | "fechaHechos" | "fechaConocimiento" | "horaConocida" | "hora"
  | "descripcion" | "tiposDano" | "agresion" | "repetitiva" | "secuelas" | "estudiantes" | "involucrados" | "motivo"

const MENSAJES_CAMPO: [RegExp, CampoCaso][] = [
  [/elija el funcionario|funcionario elegido|se elige como funcionario|nombre del involucrado|número de documento|puede ser afectado|Esta persona ya está/i, "involucrados"],
  [/Este estudiante ya está|al menos un estudiante|al menos dos personas|mismo establecimiento|rol en la situación/i, "estudiantes"],
  [/Indique si se conoce la fecha|fecha de los hechos/i, "fechaHechos"],
  [/hora de los hechos|Indique si se conoce la hora/i, "hora"],
  [/fecha de conocimiento/i, "fechaConocimiento"],
  [/descripción de los hechos/i, "descripcion"],
  [/tipo de daño/i, "tiposDano"],
  [/tipo de agresión/i, "agresion"],
  [/repetitiva/i, "repetitiva"],
  [/secuelas/i, "secuelas"],
  [/motivo de la corrección/i, "motivo"],
  [/manifestación/i, "manifestacion"],
  [/lugar/i, "lugar"],
]

/** Mapea el mensaje del backend a su campo, para marcarlo además del banner. */
export function campoDeMensaje(mensaje: string): CampoCaso | undefined {
  return MENSAJES_CAMPO.find(([re]) => re.test(mensaje))?.[1]
}
