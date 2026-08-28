import { MATRICULA_FIELD_CATALOG } from "@/features/coverage/utils/matricula-field-catalog"
import type { MatriculaFieldConfig } from "@/features/coverage/api/types/matricula"

export interface MatriculaFieldSetting {
  requerido: boolean
  visible: boolean
}

export type MatriculaFieldSettingsMap = Record<string, MatriculaFieldSetting>

/**
 * Traduce la config real (`fkCampo`/`nombre`, agrupada por sección) a los
 * ids internos que ya usa cada campo del formulario (`MATRICULA_FIELD_
 * CATALOG`, los mismos `id` que `form-create-matricula.tsx`).
 *
 * El match es por POSICIÓN (índice de sección + índice de campo dentro de
 * la sección), no por `nombre`: probado contra el backend real, manda las
 * etiquetas sin tildes/eñes y con redacción propia ("Direccion", "Cual" en
 * vez de "¿Cuál?", "Proviene de sector privado" en vez de "...del sector
 * privado") — matchear por texto dejaba casi todos los campos sin
 * encontrar su config y por eso quedaban siempre visibles pase lo que
 * pasara en la pantalla de configuración (ver conversación 2026-08-27).
 * La colección Postman sí garantiza el orden ("ya viene agrupado por
 * sección y en el orden de la UI"), así que la posición es lo único
 * confiable — confirmado 1 a 1 contra una respuesta real (mismas 13
 * secciones, mismo conteo de campos en cada una, mismo orden).
 */
export function buildMatriculaFieldSettings(config: MatriculaFieldConfig): MatriculaFieldSettingsMap {
  const settings: MatriculaFieldSettingsMap = {}

  MATRICULA_FIELD_CATALOG.forEach((section, sectionIndex) => {
    const seccion = config.secciones[sectionIndex]
    if (!seccion && import.meta.env.DEV) {
      console.warn(`Configuración de matrícula: falta la sección "${section.title}" en el backend.`)
    }

    section.fields.forEach((field, fieldIndex) => {
      if (field.locked) {
        settings[field.id] = { requerido: true, visible: true }
        return
      }

      const campo = seccion?.campos[fieldIndex]
      if (!campo && import.meta.env.DEV) {
        console.warn(
          `Configuración de matrícula: falta el campo "${field.label}" (sección "${section.title}", posición ${fieldIndex}) en el backend.`,
        )
      }
      settings[field.id] = campo
        ? { requerido: campo.requerido, visible: campo.visible }
        : { requerido: false, visible: true }
    })
  })

  return settings
}

/** Sin config cargada (o campo sin entrada, ej. archivos de soporte) el
 * campo se ve — igual que el valor por defecto del backend. */
export function isFieldVisible(settings: MatriculaFieldSettingsMap | undefined, id: string): boolean {
  return settings?.[id]?.visible ?? true
}

export function isFieldRequired(settings: MatriculaFieldSettingsMap | undefined, id: string): boolean {
  return settings?.[id]?.requerido ?? false
}
