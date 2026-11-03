import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { COD } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { DatosSiuce, InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"

/** Mensaje de largo fuera de rango, o `undefined` si cumple. */
export function errorLargo(valor: string, min: number, max: number, campo: string): string | undefined {
  const n = valor.trim().length
  if (!n) return `${campo} es obligatorio.`
  if (n < min || n > max) return `${campo} debe tener entre ${min} y ${max} caracteres.`
  return undefined
}

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

/** Errores de una fila de otro involucrado (3.1); `undefined` si está completa. */
export function erroresInvolucrado(v: InvolucradoFila) {
  const e: Partial<Record<"tipo" | "nombre" | "numDoc" | "rol", string>> = {}
  if (!v.tipo) e.tipo = "Elija el tipo."
  const n = v.nombre.trim().length
  if (n < 3 || n > 150) e.nombre = "Entre 3 y 150 caracteres."
  if (v.tipoDoc && !v.numDoc.trim()) e.numDoc = "Obligatorio con tipo de documento."
  if (!v.rol) e.rol = "Elija el rol."
  return Object.keys(e).length ? e : undefined
}
