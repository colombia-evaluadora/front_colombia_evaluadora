import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"

type SN = "S" | "N" | null

/** `socioeconomico` del detalle y del body (sso TINSCRIPCION_SOCIOECONOMICO, columnas en minúscula). */
export interface InscripcionSocioeconomico {
  fk_tlv_situacion_academica: number | null
  fk_tlv_condicion_promocion: number | null
  institucion_origen: string | null
  fk_tlv_tipo_institucion_origen: number | null
  proviene_sector_privado: SN
  proviene_otro_municipio: SN
  proviene_otro_municipio_cual: string | null
  fk_tlv_victima_conflicto: number | null
  fk_tmunicipio_victima: number | null
  seguridad_social_eps: string | null
  seguridad_social_ars: string | null
  /** Situación en el SRPA (Regla 77): solo se envía; el detalle nunca la devuelve. */
  fk_tlv_srpa?: number
  estudiante_subsidiado: SN
  fk_tlv_fuente_recurso: number | null
  beneficiario_cabeza_familia: SN
  ben_hijo_cabeza_familia: SN
  beneficiario_veterano: SN
  beneficiario_heroe: SN
}

type Secciones = Pick<
  CreateMatriculaInput,
  "previousYear" | "originSector" | "conflictVictim" | "complementary" | "benefits"
>

const id = (v: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : null)
const texto = (v: string | undefined) => v?.trim() || null
const sn = (v: string): SN => (v === "Sí" ? "S" : v === "No" ? "N" : null)
const idTexto = (v: number | null) => (v == null ? "" : String(v))
const snTexto = (v: SN) => (v === "S" ? "Sí" : v === "N" ? "No" : "")

/** Secciones del formulario (las mismas de la matrícula) → lo que guarda la inscripción. */
export function aSocioeconomico(d: Secciones): InscripcionSocioeconomico {
  return {
    fk_tlv_situacion_academica: id(d.previousYear.situation),
    fk_tlv_condicion_promocion: id(d.previousYear.condition),
    institucion_origen: texto(d.previousYear.previousInstitution),
    // Lista INSTITUCION_BIENESTAR; mientras el formulario lo capture como texto llega null (como en matrícula).
    fk_tlv_tipo_institucion_origen: id(d.previousYear.welfareInstitution),
    proviene_sector_privado: sn(d.originSector.fromPrivateSector),
    proviene_otro_municipio: sn(d.originSector.fromAnotherMunicipality),
    proviene_otro_municipio_cual: texto(d.originSector.whichMunicipality),
    fk_tlv_victima_conflicto: id(d.conflictVictim.population),
    fk_tmunicipio_victima: id(d.conflictVictim.lastExpellingMunicipality),
    seguridad_social_eps: texto(d.complementary.eps),
    seguridad_social_ars: texto(d.complementary.ars),
    // Sin valor no se manda la clave: el back conserva lo guardado (el detalle no lo trae al editar).
    ...(d.complementary.srpa && !Number.isNaN(Number(d.complementary.srpa))
      ? { fk_tlv_srpa: Number(d.complementary.srpa) }
      : {}),
    estudiante_subsidiado: sn(d.benefits.subsidized),
    fk_tlv_fuente_recurso: id(d.benefits.fundingSource),
    beneficiario_cabeza_familia: sn(d.benefits.headOfHouseholdStudent),
    ben_hijo_cabeza_familia: sn(d.benefits.headOfHouseholdChildren),
    beneficiario_veterano: sn(d.benefits.publicForceVeteran),
    beneficiario_heroe: sn(d.benefits.nationalHeroes),
  }
}

/** Lo guardado en la inscripción sobre las secciones vacías del formulario (Editar y Asignar grupo). */
export function conSocioeconomico<T extends Secciones>(base: T, s: InscripcionSocioeconomico | null): T {
  if (!s) return base
  return {
    ...base,
    previousYear: {
      ...base.previousYear,
      situation: idTexto(s.fk_tlv_situacion_academica),
      condition: idTexto(s.fk_tlv_condicion_promocion),
      previousInstitution: s.institucion_origen ?? "",
      welfareInstitution: idTexto(s.fk_tlv_tipo_institucion_origen),
    },
    originSector: {
      fromPrivateSector: snTexto(s.proviene_sector_privado),
      fromAnotherMunicipality: snTexto(s.proviene_otro_municipio),
      whichMunicipality: s.proviene_otro_municipio_cual ?? "",
    },
    conflictVictim: {
      population: idTexto(s.fk_tlv_victima_conflicto),
      lastExpellingMunicipality: idTexto(s.fk_tmunicipio_victima),
    },
    complementary: {
      ...base.complementary,
      eps: s.seguridad_social_eps ?? "",
      ars: s.seguridad_social_ars ?? "",
    },
    benefits: {
      subsidized: snTexto(s.estudiante_subsidiado),
      fundingSource: idTexto(s.fk_tlv_fuente_recurso),
      headOfHouseholdStudent: snTexto(s.beneficiario_cabeza_familia),
      headOfHouseholdChildren: snTexto(s.ben_hijo_cabeza_familia),
      publicForceVeteran: snTexto(s.beneficiario_veterano),
      nationalHeroes: snTexto(s.beneficiario_heroe),
    },
  }
}
