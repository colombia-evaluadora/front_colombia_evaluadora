import { pideModalidad } from "@/features/publico/inscribir/datos-demo"

export interface OpcionCupo {
  establecimiento: string
  sede: string
  jornada: string
  modalidad: string
}

export interface Hermano {
  tiene: boolean | null
  documento: string
}

export const opcionVacia = (): OpcionCupo => ({ establecimiento: "", sede: "", jornada: "", modalidad: "" })

// Documento del hermano (Regla 27): dígitos o alfanumérico extranjero, sin puntos ni espacios.
export const DOCUMENTO_HERMANO = /^[A-Za-z0-9]{5,20}$/

export const opcionCompleta = (o: OpcionCupo) =>
  Boolean(o.establecimiento && o.sede && o.jornada && (!pideModalidad(o.establecimiento, o.sede, o.jornada) || o.modalidad))

export const hermanoValido = (h: Hermano) => h.tiene === false || (h.tiene === true && DOCUMENTO_HERMANO.test(h.documento))

/** "diana.arias@gmail.com" → "di****@gm***.com" (Regla 31: no exponer datos). */
export function enmascararCorreo(correo: string) {
  const [usuario = "", dominio = ""] = correo.split("@")
  const punto = dominio.lastIndexOf(".")
  const nombre = punto > 0 ? dominio.slice(0, punto) : dominio
  const tld = punto > 0 ? dominio.slice(punto) : ""
  return `${usuario.slice(0, 2)}****@${nombre.slice(0, 2)}***${tld}`
}

