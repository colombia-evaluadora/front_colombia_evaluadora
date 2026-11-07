import type { Resultado, TipoDocumentoXl } from "@/features/administration/superadministradores/api/types/superadministrador"

export type { Resultado, TipoDocumentoXl }

export interface EstablecimientoACargo {
  pk: number
  nombre: string
  /** Un establecimiento inactivo sigue en la lista hasta que se quite. */
  activo: boolean
}

/** Supervisor territorial (Sección 7.2): cuenta del SSO con el rol CEVAL-SUP_TER (V328). */
export interface SupervisorTerritorial {
  /** id_user de la cuenta del SSO. */
  pkSupervisor: number
  pkUsuario: number | null
  tipoDocumento: Omit<TipoDocumentoXl, "numerico"> | null
  numeroDocumento: string | null
  primerNombre: string | null
  segundoNombre: string | null
  primerApellido: string | null
  segundoApellido: string | null
  nombre: string
  correo: string
  /** Informativa: no concede permisos. */
  dependencia: string | null
  /** Encendido incluye también los establecimientos que se creen después. */
  todosEstablecimientos: boolean
  establecimientos: EstablecimientoACargo[]
  /** Inactivo pierde el acceso y se cierran sus sesiones. */
  activo: boolean
  /** Creado, pero todavía no estableció su contraseña con el enlace. */
  pendienteActivacion: boolean
}

export interface EstablecimientoOpcion {
  pk: number
  nombre: string
  codigoDane: string | null
}

export interface CatalogosSupervisor {
  tiposDocumento: TipoDocumentoXl[]
  establecimientos: EstablecimientoOpcion[]
}

/** "CC 1098765432". */
export const documentoTexto = (s: SupervisorTerritorial) =>
  [s.tipoDocumento?.sigla, s.numeroDocumento].filter(Boolean).join(" ") || "—"

/** Columna Establecimientos a cargo: cantidad, o "Todos". */
export const establecimientosTexto = (s: SupervisorTerritorial) =>
  s.todosEstablecimientos ? "Todos" : String(s.establecimientos.length)
