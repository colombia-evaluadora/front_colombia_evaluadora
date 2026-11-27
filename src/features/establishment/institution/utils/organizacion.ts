import type { EstablishmentOrganization } from "@/features/establishment/institution/api/types/establishment"

export type RespuestaOrganizacion = Exclude<
  keyof EstablishmentOrganization,
  "coexistenceCommittee" | "counselor"
>

/** Las once preguntas que se marcan, en el orden del formato del SIMPADE (informe de diseño, 2.1). */
export const PREGUNTAS_ORGANIZACION: { key: RespuestaOrganizacion; label: string }[] = [
  { key: "directiveCouncil", label: "¿Existe consejo directivo?" },
  { key: "academicCouncil", label: "¿Existe consejo académico?" },
  { key: "studentCouncil", label: "¿Existe consejo estudiantil?" },
  { key: "parentsCouncil", label: "¿Existe consejo de padres?" },
  { key: "parentsAssociation", label: "¿Existe asociación de padres de familia?" },
  { key: "parentsSchool", label: "¿Existe escuela de padres y madres?" },
]

export const PREGUNTAS_ARTICULACION: { key: RespuestaOrganizacion; label: string }[] = [
  { key: "higherEducation", label: "Articulación con instituciones de educación superior" },
  { key: "sena", label: "Articulación con el SENA y la formación para el trabajo" },
  { key: "productiveSector", label: "Articulación con el sector productivo" },
  { key: "earlyEducation", label: "Articulación con la educación inicial" },
  { key: "healthPrograms", label: "Articulación con programas de salud" },
]

/** Las dos que calcula el sistema (sso `fn_est_organizacion`): se ven en solo lectura. */
export const PREGUNTAS_CALCULADAS: {
  key: "coexistenceCommittee" | "counselor"
  label: string
  ayuda: string
}[] = [
  {
    key: "coexistenceCommittee",
    label: "¿Existe comité de convivencia?",
    ayuda:
      "Lo calcula el sistema: Sí cuando el establecimiento tiene conformado su comité de convivencia en un período académico abierto.",
  },
  {
    key: "counselor",
    label: "¿Existe profesor orientador?",
    ayuda:
      "Lo calcula el sistema: Sí cuando algún funcionario tiene activo el rol de orientador en una sede del establecimiento.",
  },
]

/** Sí / No / Sin información (sin valor predeterminado: vacío es Sin información). */
export function respuestaTexto(value: boolean | null | undefined): string {
  if (value === true) return "Sí"
  if (value === false) return "No"
  return "Sin información"
}
