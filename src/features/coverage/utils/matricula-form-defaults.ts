import type {
  CreateMatriculaInput,
  MatriculaAcademicInfo,
  MatriculaContact,
  MatriculaResidence,
} from "@/features/coverage/api/types/matricula"
import type { MatriculaSupportFiles } from "@/features/coverage/components/forms/form-create-matricula"

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
// rojo; las etiquetas son solo para el mensaje.
export const REQUIRED_MATRICULA_FIELD_LABELS: Record<string, string> = {
  "matricula-campus": "Sede",
  "matricula-shift": "Jornada",
  "matricula-grade": "Grado",
  "matricula-group": "Grupo",
  "student-document-type": "Tipo de documento del estudiante",
  "student-document-number": "Documento estudiante",
  "student-first-name": "Nombre del estudiante",
  "student-last-name": "Primer apellido del estudiante",
  "student-gender": "Género del estudiante",
  "guardian-relationship": "Parentesco",
  "guardian-document-type": "Tipo de documento del acudiente",
  studentIdDocument: "Documento de identidad del estudiante",
  previousYearCertificate: "Certificado de estudios del año anterior",
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

export function validateMatricula(values: CreateMatriculaInput, files?: MatriculaSupportFiles): string[] {
  const missing: string[] = []
  if (!values.academic.campus) missing.push("matricula-campus")
  if (!values.academic.shift) missing.push("matricula-shift")
  if (!values.academic.grade) missing.push("matricula-grade")
  if (!values.academic.group) missing.push("matricula-group")
  if (!values.student.documentType) missing.push("student-document-type")
  if (!values.student.documentNumber.trim()) missing.push("student-document-number")
  if (!values.student.firstName.trim()) missing.push("student-first-name")
  if (!values.student.lastName.trim()) missing.push("student-last-name")
  if (!values.student.gender) missing.push("student-gender")
  if (!values.guardian.relationship) missing.push("guardian-relationship")
  if (!values.guardian.documentType) missing.push("guardian-document-type")
  if (values.studentContact.email.trim() && !EMAIL_REGEX.test(values.studentContact.email.trim())) {
    missing.push("student-contact-email")
  }
  if (values.guardianContact.email.trim() && !EMAIL_REGEX.test(values.guardianContact.email.trim())) {
    missing.push("guardian-contact-email")
  }
  if (files) {
    if (files.studentIdDocument.length === 0) missing.push("studentIdDocument")
    if (files.previousYearCertificate.length === 0) missing.push("previousYearCertificate")
  }
  return missing
}
