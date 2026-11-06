import type { Resultado, TipoDocumentoXl } from "@/features/administration/superadministradores/api/types/superadministrador"

export type { Resultado, TipoDocumentoXl }

/** Administrador territorial (Sección 7.3): cuenta del SSO con el rol CEVAL-ADM_TER (V333).
 * Sin establecimientos a cargo: su alcance son todos los de la instalación. */
export interface AdministradorTerritorial {
  /** id_user de la cuenta del SSO. */
  pkAdministrador: number
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
  /** Inactivo pierde el acceso y se cierran sus sesiones. */
  activo: boolean
  /** Creado, pero todavía no estableció su contraseña con el enlace. */
  pendienteActivacion: boolean
}

export interface CatalogosAdministrador {
  tiposDocumento: TipoDocumentoXl[]
}

/** "CC 1098765432". */
export const documentoTexto = (s: AdministradorTerritorial) =>
  [s.tipoDocumento?.sigla, s.numeroDocumento].filter(Boolean).join(" ") || "—"
