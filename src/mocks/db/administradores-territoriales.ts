import type { AdministradorTerritorial } from "@/features/administration/administradores-territoriales/api/types/administrador"
import { tiposDocumentoXlDb } from "@/mocks/db/superadministradores"

// Réplica en memoria de V333: Administradores territoriales, sin establecimientos
// a cargo (su alcance es toda la instalación). Mismo Tipo de documento XL que
// Superadministradores.

export { tiposDocumentoXlDb }

export type AdministradorMock = Omit<AdministradorTerritorial, "nombre" | "tipoDocumento"> & { pkTipo: number }

export const administradoresDb: AdministradorMock[] = [
  {
    pkAdministrador: 601,
    pkUsuario: 9101,
    pkTipo: 51860,
    numeroDocumento: "52345678",
    primerNombre: "Andrea",
    segundoNombre: null,
    primerApellido: "Castro",
    segundoApellido: "Niño",
    correo: "andrea.castro@sem.gov.co",
    dependencia: "Secretaría de Educación — Cobertura",
    activo: true,
    pendienteActivacion: false,
  },
  {
    pkAdministrador: 602,
    pkUsuario: 9102,
    pkTipo: 51860,
    numeroDocumento: "80456789",
    primerNombre: "Julián",
    segundoNombre: "Andrés",
    primerApellido: "Mora",
    segundoApellido: null,
    correo: "julian.mora@sem.gov.co",
    dependencia: null,
    activo: true,
    pendienteActivacion: true,
  },
  {
    pkAdministrador: 603,
    pkUsuario: 9103,
    pkTipo: 52116,
    numeroDocumento: "PA445566",
    primerNombre: "Elena",
    segundoNombre: null,
    primerApellido: "Suárez",
    segundoApellido: null,
    correo: "elena.suarez@sem.gov.co",
    dependencia: "Secretaría de Educación — Calidad",
    activo: false,
    pendienteActivacion: false,
  },
]

export function toAdministrador(a: AdministradorMock): AdministradorTerritorial {
  const tipo = tiposDocumentoXlDb.find((t) => t.pk === a.pkTipo)
  const { pkTipo: _pkTipo, ...resto } = a
  return {
    ...resto,
    tipoDocumento: tipo ? { pk: tipo.pk, codigo: tipo.codigo, nombre: tipo.nombre, sigla: tipo.sigla } : null,
    nombre: [a.primerNombre, a.segundoNombre, a.primerApellido, a.segundoApellido].filter(Boolean).join(" "),
  }
}
