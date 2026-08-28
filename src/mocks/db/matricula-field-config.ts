import { MATRICULA_FIELD_CATALOG } from "@/features/coverage/utils/matricula-field-catalog"
import type { MatriculaFieldConfig } from "@/features/coverage/api/types/matricula"

// `fkCampo` es ficticio (1..N en el orden del catálogo) — el backend real
// asigna los suyos, esto solo necesita ser estable dentro de una sesión de
// mock. Mismo EE/valores de ejemplo que usa la colección Postman de
// referencia ("PIGSE QA TEST EE").
let fkCampoSeq = 1

export const matriculaFieldConfigDb: MatriculaFieldConfig = {
  fkEstablecimiento: 871,
  establecimiento: "PIGSE QA TEST EE",
  pkMatriculaConfig: 81,
  secciones: MATRICULA_FIELD_CATALOG.map((section) => ({
    seccion: section.title,
    campos: section.fields.map((field) => ({
      fkCampo: fkCampoSeq++,
      nombre: field.label,
      editable: !field.locked,
      requerido: Boolean(field.locked),
      visible: true,
    })),
  })),
}

export function findMatriculaConfigCampo(fkCampo: number) {
  for (const seccion of matriculaFieldConfigDb.secciones) {
    const campo = seccion.campos.find((c) => c.fkCampo === fkCampo)
    if (campo) return campo
  }
  return null
}
