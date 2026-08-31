import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { unwrapRow } from "@/lib/response-envelope"
import { fetchGrados } from "@/features/coverage/api/query/use-matricula-dependent-catalogs-query"
import type {
  Matricula,
  MatriculaDetailResult,
  MatriculaDetails,
  MatriculaStatus,
} from "@/features/coverage/api/types/matricula"
import type { EducationLevel } from "@/features/coverage/api/types/reservation"

interface RawMatriculaVinculo {
  acudiente: "S" | "N" | null
  fkTlvParentesco: number | null
}

interface RawMatriculaAcudiente {
  vinculo: RawMatriculaVinculo
  telefono: string | null
  ocupacion: string | null
  profesion: string | null
  entidad: string | null
  fk_tlv_genero: number | null
  primer_nombre: string
  identificacion: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  telefono_entidad: string | null
  direccion_entidad: string | null
  correo_electronico: string | null
  direccion_residencia: string | null
  fk_tlv_tipo_documento: number | null
  fk_tmunicipio_documento: number | null
  fk_tmunicipio_residencia: number | null
  cargo_entidad: string | null
}

interface RawMatriculaEstudiante {
  telefono: string | null
  fecha_ingreso: string | null
  fk_tlv_genero: number | null
  fk_tlv_sisben: number | null
  fk_tresguardo: number | null
  primer_nombre: string
  fk_tlv_estrato: number | null
  fk_tlv_talento: number | null
  identificacion: string
  segundo_nombre: string | null
  primer_apellido: string
  fecha_nacimiento: string | null
  fk_tdiscapacidad: number | null
  segundo_apellido: string | null
  correo_electronico: string | null
  direccion_residencia: string | null
  fk_tlv_tipo_documento: number | null
  fk_tmunicipio_documento: number | null
  fk_tmunicipio_nacimiento: number | null
  fk_tmunicipio_residencia: number | null
}

interface RawMatriculaCore {
  fk_tsede: number
  fk_tgrado: number
  fk_tgrupo: number
  fk_tpadre: number | null
  fk_enfasis: number | null
  sede_nombre: string
  grado_nombre: string
  grupo_nombre: string
  pk_tmatricula: number
  fk_testudiante: number
  fk_tlv_jornada: number
  jornada_nombre: string
  fk_tperiodo_academico: number
  created_at: string
  estado_matricula_nombre: string
}

interface RawMatriculaSocioeconomico {
  beneficiario_heroe: "S" | "N" | null
  institucion_origen: string | null
  seguridad_social_ars: string | null
  seguridad_social_eps: string | null
  beneficiario_veterano: "S" | "N" | null
  estudiante_subsidiado: "S" | "N" | null
  fk_tlv_fuente_recurso: number | null
  fk_tmunicipio_victima: number | null
  ben_hijo_cabeza_familia: "S" | "N" | null
  proviene_otro_municipio: "S" | "N" | null
  proviene_sector_privado: "S" | "N" | null
  fk_tlv_victima_conflicto: number | null
  fk_tlv_condicion_promocion: number | null
  beneficiario_cabeza_familia: "S" | "N" | null
  proviene_otro_municipio_cual: string | null
  fk_tlv_tipo_institucion_origen: number | null
  tipo_institucion_origen_nombre: string | null
}

interface RawMatriculaDetail {
  matricula: RawMatriculaCore
  acudientes: RawMatriculaAcudiente[]
  estudiante: RawMatriculaEstudiante
  socioeconomico: RawMatriculaSocioeconomico
}

function toBoolSNLabel(value: "S" | "N" | null | undefined): "Sí" | "No" | "" {
  if (value === "S") return "Sí"
  if (value === "N") return "No"
  return ""
}

function toIdString(value: number | null | undefined): string {
  return value != null ? String(value) : ""
}

// El backend no manda un id para el estado -- arma el slug directo del
// nombre (minúsculas, sin tildes, espacios a "_"), mismo criterio que
// `fn_matricula_listar` (ver comentario en `types/matricula.ts`), pero el
// GET de detalle sí manda el nombre crudo ("Cursando"), así que hay que
// rearmar el slug acá.
function slugifyEstado(nombre: string): MatriculaStatus {
  const slug = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
  return slug as MatriculaStatus
}

async function fetchMatriculaDetail(id: string): Promise<MatriculaDetailResult> {
  const raw = await api.get<{ rows: { matricula: RawMatriculaDetail }[] } | { matricula: RawMatriculaDetail }>(
    `/eval-col/cobertura-academica/matricula/${id}`,
  )
  const { matricula: m, acudientes, estudiante: est, socioeconomico: socio } = unwrapRow(raw).matricula

  // `fk_tgrado` es el PK real (fn_grados_query), no el "valor" (-2..100) que
  // usa el resto del módulo como value del select -- hay que resolverlo
  // contra el listado de grados del período antes de armar `academic.grade`.
  const grados = await fetchGrados(m.fk_tperiodo_academico)
  const gradoValor = grados.find((g) => g.id === m.fk_tgrado)?.valor

  const guardianRaw = acudientes.find((a) => a.vinculo.acudiente === "S") ?? acudientes[0]

  const status = slugifyEstado(m.estado_matricula_nombre)

  const matricula: Matricula = {
    id: String(m.pk_tmatricula),
    documentNumber: est.identificacion,
    firstName: est.primer_nombre,
    lastName: est.primer_apellido,
    // El backend no manda el nombre del establecimiento en este endpoint.
    institution: "",
    campus: m.sede_nombre,
    shift: m.jornada_nombre,
    // Tampoco manda el nivel educativo -- mismo placeholder que usa el
    // create local (ver `create-matricula.ts`).
    educationLevel: "PREESCOLAR" as EducationLevel,
    grade: gradoValor ?? 0,
    group: m.grupo_nombre,
    enrollmentDate: m.created_at,
    guardian: guardianRaw
      ? `${guardianRaw.primer_nombre} ${guardianRaw.primer_apellido}`.trim()
      : "",
    status,
    hasGrades: false,
  }

  const details: MatriculaDetails = {
    status,
    academic: {
      campus: m.sede_nombre,
      shift: m.jornada_nombre,
      grade: toIdString(gradoValor ?? m.fk_tgrado),
      group: toIdString(m.fk_tgrupo),
      status,
      specialty: toIdString(m.fk_enfasis),
    },
    student: {
      documentType: toIdString(est.fk_tlv_tipo_documento),
      documentNumber: est.identificacion,
      firstName: est.primer_nombre,
      secondName: est.segundo_nombre ?? "",
      lastName: est.primer_apellido,
      secondLastName: est.segundo_apellido ?? "",
      documentExpedition: { department: "", municipality: toIdString(est.fk_tmunicipio_documento) },
      birthDate: est.fecha_nacimiento ?? "",
      birthPlace: { department: "", municipality: toIdString(est.fk_tmunicipio_nacimiento) },
      gender: toIdString(est.fk_tlv_genero),
      ethnicity: toIdString(est.fk_tresguardo),
    },
    studentAddress: {
      department: "",
      municipality: toIdString(est.fk_tmunicipio_residencia),
      address: est.direccion_residencia ?? "",
    },
    studentContact: {
      phone: est.telefono ?? "",
      email: est.correo_electronico ?? "",
    },
    previousYear: {
      // El GET de detalle no trae "situación del año anterior" -- no hay
      // campo equivalente en la respuesta real, queda vacío.
      situation: "",
      condition: toIdString(socio.fk_tlv_condicion_promocion),
      previousInstitution: socio.institucion_origen ?? "",
      welfareInstitution: socio.tipo_institucion_origen_nombre ?? "",
    },
    originSector: {
      fromPrivateSector: toBoolSNLabel(socio.proviene_sector_privado),
      fromAnotherMunicipality: toBoolSNLabel(socio.proviene_otro_municipio),
      whichMunicipality: socio.proviene_otro_municipio_cual ?? "",
    },
    conflictVictim: {
      population: toIdString(socio.fk_tlv_victima_conflicto),
      lastExpellingMunicipality: toIdString(socio.fk_tmunicipio_victima),
    },
    complementary: {
      socioeconomicStratum: toIdString(est.fk_tlv_estrato),
      sisben: toIdString(est.fk_tlv_sisben),
      eps: socio.seguridad_social_eps ?? "",
      ars: socio.seguridad_social_ars ?? "",
      specialConditions: toIdString(est.fk_tdiscapacidad),
      talent: toIdString(est.fk_tlv_talento),
    },
    benefits: {
      subsidized: toBoolSNLabel(socio.estudiante_subsidiado),
      fundingSource: toIdString(socio.fk_tlv_fuente_recurso),
      headOfHouseholdStudent: toBoolSNLabel(socio.beneficiario_cabeza_familia),
      headOfHouseholdChildren: toBoolSNLabel(socio.ben_hijo_cabeza_familia),
      publicForceVeteran: toBoolSNLabel(socio.beneficiario_veterano),
      nationalHeroes: toBoolSNLabel(socio.beneficiario_heroe),
    },
    guardian: {
      relationship: toIdString(guardianRaw?.vinculo.fkTlvParentesco),
      firstName: guardianRaw?.primer_nombre ?? "",
      secondName: guardianRaw?.segundo_nombre ?? "",
      lastName: guardianRaw?.primer_apellido ?? "",
      secondLastName: guardianRaw?.segundo_apellido ?? "",
      documentType: toIdString(guardianRaw?.fk_tlv_tipo_documento),
      documentNumber: guardianRaw?.identificacion ?? "",
      documentExpedition: {
        department: "",
        municipality: toIdString(guardianRaw?.fk_tmunicipio_documento),
      },
    },
    guardianAddress: {
      department: "",
      municipality: toIdString(guardianRaw?.fk_tmunicipio_residencia),
      address: guardianRaw?.direccion_residencia ?? "",
    },
    guardianContact: {
      phone: guardianRaw?.telefono ?? "",
      email: guardianRaw?.correo_electronico ?? "",
    },
    guardianEmployment: {
      profession: guardianRaw?.profesion ?? "",
      entityName: guardianRaw?.entidad ?? "",
      entityAddress: guardianRaw?.direccion_entidad ?? "",
      entityPhone: guardianRaw?.telefono_entidad ?? "",
      entityPosition: guardianRaw?.cargo_entidad ?? "",
    },
  }

  return { status: "ok", message: "", matricula, details }
}

export function useMatriculaDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["matricula", "detail", id],
    queryFn: () => fetchMatriculaDetail(id as string),
    enabled: Boolean(id),
  })
}
