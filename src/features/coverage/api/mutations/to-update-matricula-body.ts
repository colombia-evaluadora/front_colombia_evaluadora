import type { CreateMatriculaInput } from "@/features/coverage/api/types/matricula"

function toIntOrNull(value: string | undefined | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function toTextOrNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toBoolSN(value: string | undefined | null): "S" | "N" | null {
  if (value === "Sí") return "S"
  if (value === "No") return "N"
  return null
}

export interface UpdateMatriculaBodyContext {
  pkTpadre: number | null
  pkUsuarioAcudiente: number | null
  actualizarAcudiente: boolean
}

export function toUpdateMatriculaBody(
  values: CreateMatriculaInput,
  context: UpdateMatriculaBodyContext,
) {
  const { academic, student, studentAddress, previousYear, originSector, conflictVictim } = values
  const { complementary, benefits, guardian, guardianAddress, guardianEmployment } = values

  return {
    ACTUALIZAR_MATRICULA: true,
    ACTUALIZAR_ESTUDIANTE: true,
    ACTUALIZAR_ACUDIENTE: context.actualizarAcudiente,
    ACTUALIZAR_SOCIOECONOMICO: true,
    PK_TPADRE: context.pkTpadre,
    PK_USUARIO_ACUDIENTE: context.pkUsuarioAcudiente,
    TOCAR_DOCUMENTO_DE_IDENTIDAD: false,
    TOCAR_CERTIFICADO_DE_ESTUDIOS: false,
    TOCAR_CERTIFICADO_MEDICO: false,
    TOCAR_FOTO: false,

    CARACTER_ESPECIALIDAD_ENFASIS: toIntOrNull(academic.specialty),

    ETNIA_RESGUARDO: toIntOrNull(student.ethnicity),
    CONDICIONES_ESPECIALES_DEL_ESTUDIANTE: toIntOrNull(complementary.specialConditions),
    TALENTO_DEL_ESTUDIANTE: toIntOrNull(complementary.talent),
    LUGAR_EXPEDICION_DOCUMENTO_ESTUDIANTE_MUNICIPIO: toIntOrNull(student.documentExpedition.municipality),
    LUGAR_DE_NACIMIENTO_MUNICIPIO: toIntOrNull(student.birthPlace.municipality),
    LUGAR_DE_RESIDENCIA_MUNICIPIO_ESTUDIANTE: toIntOrNull(studentAddress.municipality),
    DIRECCION_DEL_ESTUDIANTE: toTextOrNull(studentAddress.address),
    ESTRATO_SOCIO_ECONOMICO_DEL_ESTUDIANTE: toIntOrNull(complementary.socioeconomicStratum),
    SISBEN: toIntOrNull(complementary.sisben),
    SITUACION_DEL_ANO_ANTERIOR: toIntOrNull(previousYear.situation),
    CONDICION_DEL_ESTUDIANTE_FIN_DEL_ANO_ANTERIOR: toIntOrNull(previousYear.condition),
    NOMBRE_DE_LA_INSTITUCION_ANTERIOR: toTextOrNull(previousYear.previousInstitution),
    // BIGINT (catálogo), no texto libre -- confirmado por la colección.
    INSTITUCION_BIENESTAR_DE_ORIGEN: toIntOrNull(previousYear.welfareInstitution),
    PROVIENE_DE_SECTOR_PRIVADO: toBoolSN(originSector.fromPrivateSector),
    PROVIENE_DE_OTRO_MUNICIPIO: toBoolSN(originSector.fromAnotherMunicipality),
    CUAL: toTextOrNull(originSector.whichMunicipality),
    POBLACION_VICTIMA_CONFLICTO: toIntOrNull(conflictVictim.population),
    ULTIMO_MUNICIPIO_EXPULSOR: toIntOrNull(conflictVictim.lastExpellingMunicipality),
    EPS: toTextOrNull(complementary.eps),
    ARS: toTextOrNull(complementary.ars),
    SUBSIDIADO: toBoolSN(benefits.subsidized),
    FUENTE_DE_RECURSOS: toIntOrNull(benefits.fundingSource),
    ALUMNOS_MADRE_CABEZA_DE_FAMILIA: toBoolSN(benefits.headOfHouseholdStudent),
    HIJOS_DE_MADRE_CABEZA_DE_FAMILIA: toBoolSN(benefits.headOfHouseholdChildren),
    VETERANOS_DE_LA_FUERZA_PUBLICA: toBoolSN(benefits.publicForceVeteran),
    HEROES_DE_LA_NACION: toBoolSN(benefits.nationalHeroes),

    PARENTESCO: toIntOrNull(guardian.relationship),
    LUGAR_EXPEDICION_DOCUMENTO_ACUDIENTE_MUNICIPIO: toIntOrNull(guardian.documentExpedition.municipality),
    LUGAR_DE_RESIDENCIA_MUNICIPIO_ACUDIENTE: toIntOrNull(guardianAddress.municipality),
    DIRECCION_DE_ACUDIENTE: toTextOrNull(guardianAddress.address),
    PROFESION_ACUDIENTE: toTextOrNull(guardianEmployment.profession),
    NOMBRE_DE_LA_ENTIDAD_ACUDIENTE: toTextOrNull(guardianEmployment.entityName),
    DIRECCION_DE_LA_ENTIDAD_ACUDIENTE: toTextOrNull(guardianEmployment.entityAddress),
    TELEFONO_DE_LA_ENTIDAD_ACUDIENTE: toTextOrNull(guardianEmployment.entityPhone),
    CARGO_ENTIDAD_ACUDIENTE: toTextOrNull(guardianEmployment.entityPosition),
  }
}
