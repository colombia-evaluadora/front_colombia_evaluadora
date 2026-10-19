import { type MatriculaCatalogOption } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"

// Campos como Tipo de documento/Género/Parentesco viajan al alta real como
// FK a `TLISTA_VALOR` (`useMatriculaCatalogQuery`), no como texto libre —
// se guardan como el `id` (string) y se muestran por `nombre`.
export function catalogOptions(catalog: MatriculaCatalogOption[] | undefined) {
  return (catalog ?? []).map((option) => String(option.id))
}

export function catalogLabelFor(catalog: MatriculaCatalogOption[] | undefined) {
  const byId = new Map((catalog ?? []).map((option) => [String(option.id), option.nombre]))
  return (id: string) => byId.get(id) ?? id
}

/** Para secciones sin ningún campo bloqueado: si la config apagó "Visible"
 * en todos sus campos, la tarjeta entera no tiene nada que mostrar. */
export function anySettingVisible(fieldSettings: MatriculaFieldSettingsMap | undefined, ids: string[]) {
  return ids.some((id) => isFieldVisible(fieldSettings, id))
}
