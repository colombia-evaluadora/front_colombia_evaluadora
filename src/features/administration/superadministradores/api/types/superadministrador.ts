/** Envoltura de las funciones del módulo: `SELECT fn(...) AS resultado`. */
export interface Resultado<T> {
  resultado: T
}

/** Tipo de documento XL (Anexo A): subconjunto de TIPO_DOCUMENTO, documentos de adultos. */
export interface TipoDocumentoXl {
  pk: number
  codigo: string
  nombre: string
  /** Sigla visible ("CC", "SC-2"). */
  sigla: string
  /** Solo dígitos (CC); los extranjeros admiten letras y dígitos. */
  numerico: boolean
}

/**
 * Superadministrador = cuenta del SSO con el rol CEVAL-SUPER_ADMINISTRADOR
 * (V322). Su identidad es la del TUSUARIO de esa cuenta.
 */
export interface Superadministrador {
  /** id_user de la cuenta del SSO. */
  pkSuperadministrador: number
  pkUsuario: number | null
  tipoDocumento: Omit<TipoDocumentoXl, "numerico"> | null
  numeroDocumento: string | null
  primerNombre: string | null
  segundoNombre: string | null
  primerApellido: string | null
  segundoApellido: string | null
  nombre: string
  correo: string
  /** Estado: inactivo pierde el acceso y se cierran sus sesiones. */
  activo: boolean
  /** Creado, pero todavía no estableció su contraseña con el enlace. */
  pendienteActivacion: boolean
  /** La fila de quien consulta: «(usted)», sin Inactivar. */
  esUsted: boolean
}

export const NO_PUEDE_INACTIVARSE_MENSAJE = "No puede inactivarse a sí mismo."

/** "CC 1098765432". */
export const documentoTexto = (s: Superadministrador) =>
  [s.tipoDocumento?.sigla, s.numeroDocumento].filter(Boolean).join(" ") || "—"
