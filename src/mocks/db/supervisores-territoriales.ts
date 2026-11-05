import type {
  EstablecimientoOpcion,
  SupervisorTerritorial,
} from "@/features/administration/supervisores-territoriales/api/types/supervisor"
import { tiposDocumentoXlDb } from "@/mocks/db/superadministradores"

// Réplica en memoria de V328: Supervisores territoriales y sus establecimientos a
// cargo. Mismo catálogo de Tipo de documento XL que Superadministradores.

export { tiposDocumentoXlDb }

/** Establecimientos activos que se pueden poner a cargo. */
export const establecimientosSupervisorDb: EstablecimientoOpcion[] = [
  { pk: 1, nombre: "Institución Educativa Antonio Nariño", codigoDane: "105001000101" },
  { pk: 2, nombre: "Institución Educativa La Esperanza", codigoDane: "105001000102" },
  { pk: 3, nombre: "Colegio Distrital Simón Bolívar", codigoDane: "105001000103" },
  { pk: 4, nombre: "Institución Educativa Rural El Carmen", codigoDane: "105001000104" },
  { pk: 5, nombre: "Centro Educativo San José", codigoDane: "105001000105" },
]

/** Uno que se inactivó después de asignarse: sigue a cargo hasta que se quite. */
export const establecimientoInactivoDb = { pk: 6, nombre: "Escuela Rural La Vega" }

export type SupervisorMock = Omit<SupervisorTerritorial, "nombre" | "tipoDocumento" | "establecimientos"> & {
  pkTipo: number
  /** pk de los establecimientos a cargo activos (vacío con Todos encendido). */
  establecimientoIds: number[]
}

export const supervisoresDb: SupervisorMock[] = [
  {
    pkSupervisor: 501,
    pkUsuario: 9001,
    pkTipo: 51860,
    numeroDocumento: "1098765432",
    primerNombre: "Sandra",
    segundoNombre: "Milena",
    primerApellido: "Vargas",
    segundoApellido: "Ortiz",
    correo: "sandra.vargas@sem.gov.co",
    dependencia: "Secretaría de Educación — Núcleo 1",
    todosEstablecimientos: false,
    establecimientoIds: [1, 2, 6],
    activo: true,
    pendienteActivacion: false,
  },
  {
    pkSupervisor: 502,
    pkUsuario: 9002,
    pkTipo: 51860,
    numeroDocumento: "79123456",
    primerNombre: "Carlos",
    segundoNombre: null,
    primerApellido: "Ramírez",
    segundoApellido: null,
    correo: "carlos.ramirez@sem.gov.co",
    dependencia: "Secretaría de Educación — Calidad",
    todosEstablecimientos: true,
    establecimientoIds: [],
    activo: true,
    pendienteActivacion: true,
  },
  {
    pkSupervisor: 503,
    pkUsuario: 9003,
    pkTipo: 52116,
    numeroDocumento: "XY987654",
    primerNombre: "Lucía",
    segundoNombre: null,
    primerApellido: "Gómez",
    segundoApellido: "Rey",
    correo: "lucia.gomez@sem.gov.co",
    dependencia: null,
    todosEstablecimientos: false,
    establecimientoIds: [3],
    activo: false,
    pendienteActivacion: false,
  },
]

function establecimiento(pk: number) {
  const activo = establecimientosSupervisorDb.find((e) => e.pk === pk)
  if (activo) return { pk, nombre: activo.nombre, activo: true }
  if (pk === establecimientoInactivoDb.pk) return { ...establecimientoInactivoDb, activo: false }
  return null
}

export function toSupervisor(s: SupervisorMock): SupervisorTerritorial {
  const tipo = tiposDocumentoXlDb.find((t) => t.pk === s.pkTipo)
  const { pkTipo: _pkTipo, establecimientoIds, ...resto } = s
  return {
    ...resto,
    tipoDocumento: tipo ? { pk: tipo.pk, codigo: tipo.codigo, nombre: tipo.nombre, sigla: tipo.sigla } : null,
    nombre: [s.primerNombre, s.segundoNombre, s.primerApellido, s.segundoApellido].filter(Boolean).join(" "),
    establecimientos: s.todosEstablecimientos
      ? []
      : establecimientoIds
          .map(establecimiento)
          .filter((e) => e != null)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  }
}
