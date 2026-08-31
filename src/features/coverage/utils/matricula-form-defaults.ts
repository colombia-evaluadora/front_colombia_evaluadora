import type {
  CreateMatriculaInput,
  MatriculaAcademicInfo,
  MatriculaContact,
  MatriculaResidence,
} from "@/features/coverage/api/types/matricula"
import type { MatriculaSupportFiles } from "@/features/coverage/components/forms/form-create-matricula"
import { MATRICULA_FIELD_CATALOG } from "@/features/coverage/utils/matricula-field-catalog"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/utils/matricula-field-settings"

export function createEmptyAcademic(): MatriculaAcademicInfo {
  return { campus: "", shift: "", grade: "", group: "", status: "", specialty: "" }
}

export function createEmptyResidence(): MatriculaResidence {
  return { department: "", municipality: "", address: "" }
}

export function createEmptyContact(): MatriculaContact {
  return { phone: "", email: "" }
}

export function createInitialMatriculaValues(): CreateMatriculaInput {
  return {
    academic: createEmptyAcademic(),
    student: {
      documentType: "",
      documentNumber: "",
      firstName: "",
      secondName: "",
      lastName: "",
      secondLastName: "",
      documentExpedition: { department: "", municipality: "" },
      birthDate: "",
      birthPlace: { department: "", municipality: "" },
      gender: "",
      ethnicity: "",
    },
    studentAddress: createEmptyResidence(),
    studentContact: createEmptyContact(),
    previousYear: {
      situation: "",
      condition: "",
      previousInstitution: "",
      welfareInstitution: "",
    },
    originSector: { fromPrivateSector: "", fromAnotherMunicipality: "", whichMunicipality: "" },
    conflictVictim: { population: "", lastExpellingMunicipality: "" },
    complementary: {
      socioeconomicStratum: "",
      sisben: "",
      eps: "",
      ars: "",
      specialConditions: "",
      talent: "",
    },
    benefits: {
      subsidized: "",
      fundingSource: "",
      headOfHouseholdStudent: "",
      headOfHouseholdChildren: "",
      publicForceVeteran: "",
      nationalHeroes: "",
    },
    guardian: {
      relationship: "",
      firstName: "",
      secondName: "",
      lastName: "",
      secondLastName: "",
      documentType: "",
      documentNumber: "",
      documentExpedition: { department: "", municipality: "" },
    },
    guardianAddress: createEmptyResidence(),
    guardianContact: createEmptyContact(),
    guardianEmployment: {
      profession: "",
      entityName: "",
      entityAddress: "",
      entityPhone: "",
      entityPosition: "",
    },
  }
}

export function createEmptySupportFiles(): MatriculaSupportFiles {
  return {
    studentIdDocument: [],
    previousYearCertificate: [],
    medicalCertificate: [],
    studentPhoto: [],
    otherDocuments: [],
  }
}

// Ids de campo (coinciden con los `id`/clave que usa cada sección en
// `form-create-matricula.tsx`, incluidas las dos claves de
// `MatriculaSupportFiles`) → etiqueta legible para el aviso. Los ids son lo
// que se le pasa a cada sección como `invalidFields` para pintar el input en
// rojo; las etiquetas son solo para el mensaje. Sale del catálogo — mismo
// texto que ya muestra cada campo — más los dos archivos de soporte, que no
// tienen entrada en el catálogo (no se parametrizan).
export const REQUIRED_MATRICULA_FIELD_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    MATRICULA_FIELD_CATALOG.flatMap((section) => section.fields).map((field) => [field.id, field.label]),
  ),
  studentIdDocument: "Documento de identidad del estudiante",
  previousYearCertificate: "Certificado de estudios del año anterior",
}

// Getter por campo NO bloqueado (los bloqueados ya se validan a mano abajo,
// siempre obligatorios) — necesario para poder validar "requerido" según lo
// que diga `fieldSettings` sin escribir un `if` por campo. Devuelve "" para
// los sub-campos de Depto/Municipio cuando no aplica (ver `department`/
// `municipality` abajo), igual que el resto: input vacío = falta.
const OPTIONAL_MATRICULA_FIELD_GETTERS: Record<string, (values: CreateMatriculaInput) => string> = {
  "matricula-specialty": (v) => v.academic.specialty,
  "student-second-name": (v) => v.student.secondName,
  "student-second-last-name": (v) => v.student.secondLastName,
  "student-document-expedition-department": (v) => v.student.documentExpedition.department,
  "student-document-expedition-municipality": (v) => v.student.documentExpedition.municipality,
  "student-birth-place-department": (v) => v.student.birthPlace.department,
  "student-birth-place-municipality": (v) => v.student.birthPlace.municipality,
  "student-ethnicity": (v) => v.student.ethnicity,
  "student-residence-address": (v) => v.studentAddress.address,
  "student-residence-department": (v) => v.studentAddress.department,
  "student-residence-municipality": (v) => v.studentAddress.municipality,
  "student-contact-phone": (v) => v.studentContact.phone,
  "student-contact-email": (v) => v.studentContact.email,
  "previous-year-situation": (v) => v.previousYear.situation,
  "previous-year-condition": (v) => v.previousYear.condition,
  "previous-institution": (v) => v.previousYear.previousInstitution,
  "welfare-institution": (v) => v.previousYear.welfareInstitution,
  "origin-private-sector": (v) => v.originSector.fromPrivateSector,
  "origin-another-municipality": (v) => v.originSector.fromAnotherMunicipality,
  "origin-which-municipality": (v) => v.originSector.whichMunicipality,
  "conflict-victim-population": (v) => v.conflictVictim.population,
  "conflict-last-expelling-municipality": (v) => v.conflictVictim.lastExpellingMunicipality,
  "complementary-stratum": (v) => v.complementary.socioeconomicStratum,
  "complementary-sisben": (v) => v.complementary.sisben,
  "complementary-eps": (v) => v.complementary.eps,
  "complementary-ars": (v) => v.complementary.ars,
  "complementary-special-conditions": (v) => v.complementary.specialConditions,
  "complementary-talent": (v) => v.complementary.talent,
  "benefits-subsidized": (v) => v.benefits.subsidized,
  "benefits-funding-source": (v) => v.benefits.fundingSource,
  "benefits-head-household-student": (v) => v.benefits.headOfHouseholdStudent,
  "benefits-head-household-children": (v) => v.benefits.headOfHouseholdChildren,
  "benefits-public-force-veteran": (v) => v.benefits.publicForceVeteran,
  "benefits-national-heroes": (v) => v.benefits.nationalHeroes,
  "guardian-first-name": (v) => v.guardian.firstName,
  "guardian-second-name": (v) => v.guardian.secondName,
  "guardian-last-name": (v) => v.guardian.lastName,
  "guardian-second-last-name": (v) => v.guardian.secondLastName,
  "guardian-document-number": (v) => v.guardian.documentNumber,
  "guardian-document-expedition-department": (v) => v.guardian.documentExpedition.department,
  "guardian-document-expedition-municipality": (v) => v.guardian.documentExpedition.municipality,
  "guardian-residence-address": (v) => v.guardianAddress.address,
  "guardian-residence-department": (v) => v.guardianAddress.department,
  "guardian-residence-municipality": (v) => v.guardianAddress.municipality,
  "guardian-contact-phone": (v) => v.guardianContact.phone,
  "guardian-contact-email": (v) => v.guardianContact.email,
  "guardian-employment-profession": (v) => v.guardianEmployment.profession,
  "guardian-employment-entity-name": (v) => v.guardianEmployment.entityName,
  "guardian-employment-entity-address": (v) => v.guardianEmployment.entityAddress,
  "guardian-employment-entity-phone": (v) => v.guardianEmployment.entityPhone,
  "guardian-employment-entity-position": (v) => v.guardianEmployment.entityPosition,
}

export interface MatriculaAccountsFound {
  student?: boolean
  guardian?: boolean
}

/**
 * Validación mínima: los campos marcados con * en cada sección. El resto de
 * la ficha es informativo y puede quedar vacío, igual que en el detalle de
 * pre-matrícula. Devuelve ids, no textos — cada sección los usa para pintar
 * el campo en rojo; el mensaje sale de `REQUIRED_MATRICULA_FIELD_LABELS`.
 *
 * `files` es opcional porque en edición no se vuelven a pedir los documentos
 * de soporte (esos se gestionan aparte, desde el botón "Archivos").
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateMatricula(
  values: CreateMatriculaInput,
  files?: MatriculaSupportFiles,
  fieldSettings?: MatriculaFieldSettingsMap,
  accountsFound?: MatriculaAccountsFound,
): string[] {
  const missing: string[] = []
  if (files) {
    if (files.studentIdDocument.length === 0) missing.push("studentIdDocument")
    if (files.previousYearCertificate.length === 0) missing.push("previousYearCertificate")
  }
  if (!values.academic.campus) missing.push("matricula-campus")
  if (!values.academic.shift) missing.push("matricula-shift")
  if (!values.academic.grade) missing.push("matricula-grade")
  if (!values.academic.group) missing.push("matricula-group")
  if (!values.student.documentType) missing.push("student-document-type")
  if (!values.student.documentNumber.trim()) missing.push("student-document-number")
  if (!values.student.firstName.trim()) missing.push("student-first-name")
  if (!values.student.lastName.trim()) missing.push("student-last-name")
  if (!values.student.birthDate) missing.push("student-birth-date")
  if (!values.student.gender) missing.push("student-gender")
  if (!values.guardian.relationship) missing.push("guardian-relationship")
  if (!values.guardian.documentType) missing.push("guardian-document-type")

  // Campos que "Configuración de parámetros requeridos" marcó obligatorios —
  // si además está oculto no se puede pedir (mismo criterio que el switch
  // "Requerido" del config, que se apaga solo cuando "Visible" se apaga).
  for (const [id, getValue] of Object.entries(OPTIONAL_MATRICULA_FIELD_GETTERS)) {
    if (!isFieldRequired(fieldSettings, id) || !isFieldVisible(fieldSettings, id)) continue
    if (!getValue(values).trim()) missing.push(id)
  }

  const studentEmail = values.studentContact.email.trim()
  if (accountsFound?.student === false && !studentEmail) {
    missing.push("student-contact-email")
  } else if (studentEmail && !EMAIL_REGEX.test(studentEmail)) {
    missing.push("student-contact-email")
  }
  const guardianEmail = values.guardianContact.email.trim()
  if (accountsFound?.guardian === false && !guardianEmail) {
    missing.push("guardian-contact-email")
  } else if (guardianEmail && !EMAIL_REGEX.test(guardianEmail)) {
    missing.push("guardian-contact-email")
  }
  return missing
}
