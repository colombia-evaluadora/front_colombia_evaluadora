import type { MatriculaFieldConfigMap } from "@/features/coverage/api/types/matricula"
import {
  MATRICULA_FIELD_CATALOG,
  createDefaultMatriculaFieldConfig,
} from "@/features/coverage/utils/matricula-field-catalog"

export const matriculaFieldConfigDb: MatriculaFieldConfigMap = createDefaultMatriculaFieldConfig()

const LOCKED_FIELD_IDS = new Set(
  MATRICULA_FIELD_CATALOG.flatMap((section) => section.fields)
    .filter((field) => field.locked)
    .map((field) => field.id),
)

// El front ya deshabilita los switches de los campos `locked`, pero el mock
// igual los fuerza acá — un PUT armado a mano no debería poder des-requerir
// Sede, Documento del estudiante, etc.
export function updateMatriculaFieldConfig(fields: MatriculaFieldConfigMap) {
  for (const [id, setting] of Object.entries(fields)) {
    matriculaFieldConfigDb[id] = LOCKED_FIELD_IDS.has(id)
      ? { required: true, visible: true }
      : setting
  }
}
