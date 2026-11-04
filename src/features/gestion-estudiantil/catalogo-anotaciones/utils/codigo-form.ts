import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"

export const LIM = { codigo: 10, descripcionMin: 5, descripcionMax: 500 } as const

export interface ValoresCodigo {
  codigo: string
  descripcion: string
  tipo: string
  situacion: string
  estado: "activo" | "inactivo"
}

export type ErroresCodigo = Partial<Record<keyof ValoresCodigo, string>>

export const valoresVacios = (): ValoresCodigo => ({
  codigo: "",
  descripcion: "",
  tipo: "",
  situacion: "",
  estado: "activo",
})

export const valoresDe = (c: CodigoRow): ValoresCodigo => ({
  codigo: c.codigo,
  descripcion: c.descripcion,
  tipo: String(c.fk_tlv_tipo),
  situacion: c.fk_tlv_situacion != null ? String(c.fk_tlv_situacion) : "",
  estado: c.habilitado ? "activo" : "inactivo",
})

/** Sección 2.1: `esNegativo` se decide por el código del catálogo; la situación solo aplica a Negativo. */
export function validarCodigo(v: ValoresCodigo): ErroresCodigo {
  const e: ErroresCodigo = {}
  const codigo = v.codigo.trim()
  const descripcion = v.descripcion.trim()
  if (!codigo) e.codigo = "El código es obligatorio."
  else if (codigo.length > LIM.codigo) e.codigo = `El código admite hasta ${LIM.codigo} caracteres.`
  if (descripcion.length < LIM.descripcionMin || descripcion.length > LIM.descripcionMax) {
    e.descripcion = `La descripción debe tener entre ${LIM.descripcionMin} y ${LIM.descripcionMax} caracteres.`
  }
  if (!v.tipo) e.tipo = "Elija el tipo de anotación."
  return e
}
