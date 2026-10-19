import type {
  Superadministrador,
  TipoDocumentoXl,
} from "@/features/administration/superadministradores/api/types/superadministrador"

// Réplica en memoria de V322–V323: Tipo de documento XL y tres
// Superadministradores (el admin del mock es «usted»). `esUsted` lo calcula el
// handler con el usuario del token.

export const tiposDocumentoXlDb: TipoDocumentoXl[] = [
  { pk: 51860, codigo: "CC", nombre: "Cédula de Ciudadanía", sigla: "CC", numerico: true },
  { pk: 51892, codigo: "CE", nombre: "Cédula de Extranjería", sigla: "CE", numerico: false },
  { pk: 52116, codigo: "PA", nombre: "Pasaporte", sigla: "PA", numerico: false },
  {
    pk: 51867,
    codigo: "PPT",
    nombre: "Permiso por Protección temporal",
    sigla: "PPT",
    numerico: false,
  },
  {
    pk: 52117,
    codigo: "SC2",
    nombre: "Salvoconducto de permanencia",
    sigla: "SC-2",
    numerico: false,
  },
  { pk: 52118, codigo: "CD", nombre: "Carné diplomático", sigla: "CD", numerico: false },
]

type SuperadministradorMock = Omit<Superadministrador, "esUsted" | "nombre" | "tipoDocumento"> & {
  pkTipo: number
}

export const superadministradoresDb: SuperadministradorMock[] = [
  {
    pkSuperadministrador: 1,
    pkUsuario: 1,
    pkTipo: 51860,
    numeroDocumento: "1010101010",
    primerNombre: "Admin",
    segundoNombre: null,
    primerApellido: "Sistema",
    segundoApellido: null,
    correo: "admin@example.com",
    activo: true,
    pendienteActivacion: false,
  },
  {
    pkSuperadministrador: 280,
    pkUsuario: 174413,
    pkTipo: 51860,
    numeroDocumento: "80123456",
    primerNombre: "Jorge",
    segundoNombre: null,
    primerApellido: "Maldonado",
    segundoApellido: null,
    correo: "jorge.maldonado@example.com",
    activo: true,
    pendienteActivacion: false,
  },
  {
    pkSuperadministrador: 17,
    pkUsuario: 196956,
    pkTipo: 52116,
    numeroDocumento: "AB123456",
    primerNombre: "Laura",
    segundoNombre: "Patricia",
    primerApellido: "Martínez",
    segundoApellido: null,
    correo: "laura.martinez@example.com",
    activo: false,
    pendienteActivacion: false,
  },
]

export function toSuperadministrador(
  s: SuperadministradorMock,
  emailSolicitante: string | undefined,
): Superadministrador {
  const tipo = tiposDocumentoXlDb.find((t) => t.pk === s.pkTipo)
  return {
    ...s,
    tipoDocumento: tipo
      ? { pk: tipo.pk, codigo: tipo.codigo, nombre: tipo.nombre, sigla: tipo.sigla }
      : null,
    nombre: [s.primerNombre, s.segundoNombre, s.primerApellido, s.segundoApellido]
      .filter(Boolean)
      .join(" "),
    esUsted: s.correo === emailSolicitante,
  }
}
