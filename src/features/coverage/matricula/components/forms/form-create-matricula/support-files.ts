import type { MatriculaFile } from "@/features/coverage/matricula/api/types/matricula"

export interface MatriculaSupportFiles {
  studentIdDocument: File[]
  previousYearCertificate: File[]
  medicalCertificate: File[]
  studentPhoto: File[]
  otherDocuments: File[]
}

export interface SupportFileFieldConfig {
  key: keyof MatriculaSupportFiles
  /** Id del catálogo (`MATRICULA_FIELD_CATALOG`, sección "Archivo de
   * soporte") — de acá salen `requerido`/`visible` vía `fieldSettings`. */
  fieldId: string
  label: string
  multiple?: boolean
}

export const SUPPORT_FILE_FIELDS: SupportFileFieldConfig[] = [
  { key: "studentIdDocument", fieldId: "file-student-id-document", label: "Documento de identidad del estudiante" },
  {
    key: "previousYearCertificate",
    fieldId: "file-previous-year-certificate",
    label: "Certificado de estudios del año anterior",
  },
  { key: "medicalCertificate", fieldId: "file-medical-certificate", label: "Certificado médico del estudiante" },
  { key: "studentPhoto", fieldId: "file-student-photo", label: "Foto del estudiante" },
  { key: "otherDocuments", fieldId: "file-other-documents", label: "Otros documentos relevantes", multiple: true },
]

export const MATRICULA_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

export function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round(bytes / 1024 ** index)}${units[index]}`
}

// El GET de detalle manda `typeLabel` (nombre de TLISTA_VALOR TIPO_ARCHIVO),
// no la misma clave que usa `MatriculaSupportFiles` -- matchea por palabra
// clave en vez de comparar texto exacto (mismo motivo que el positional
// match de "Configuración de parámetros requeridos": el backend no
// garantiza la redacción exacta). Lo que no matchea ningún patrón cae en
// "Otros documentos relevantes", que ya admite varios archivos.
function matchSupportFileKey(typeLabel: string): keyof MatriculaSupportFiles {
  const normalized = typeLabel
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
  if (normalized.includes("identidad")) return "studentIdDocument"
  if (normalized.includes("medic")) return "medicalCertificate"
  if (normalized.includes("foto")) return "studentPhoto"
  if (normalized.includes("anterior") || normalized.includes("estudios")) return "previousYearCertificate"
  return "otherDocuments"
}

export function groupExistingFilesByKey(
  files: MatriculaFile[],
): Record<keyof MatriculaSupportFiles, MatriculaFile[]> {
  const grouped: Record<keyof MatriculaSupportFiles, MatriculaFile[]> = {
    studentIdDocument: [],
    previousYearCertificate: [],
    medicalCertificate: [],
    studentPhoto: [],
    otherDocuments: [],
  }
  for (const file of files) {
    grouped[matchSupportFileKey(file.typeLabel)].push(file)
  }
  return grouped
}
