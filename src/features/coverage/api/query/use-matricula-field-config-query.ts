import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MatriculaFieldConfig } from "@/features/coverage/api/types/matricula"

// Fila cruda de `GET /eval-col/matricula/configuracion`
// (`fn_matricula_config_obtener`) — el query-service la envuelve en
// `{rows:[...]}` (ya desenvuelto por `evalCol`), pero cada fila trae ADEMÁS
// un `{config: {...}}` propio (ver colección Postman "SSO — configuración
// de matrícula"), así que hay que desenvolver dos niveles.
interface MatriculaConfigCampoRow {
  fk_campo: number
  nombre: string
  editable: boolean
  requerido: boolean
  visible: boolean
}

interface MatriculaConfigSeccionRow {
  seccion: string
  campos: MatriculaConfigCampoRow[]
}

export interface MatriculaFieldConfigRow {
  fk_establecimiento: number
  establecimiento: string
  pk_matricula_config: number
  secciones: MatriculaConfigSeccionRow[]
}

export function toMatriculaFieldConfig(row: MatriculaFieldConfigRow): MatriculaFieldConfig {
  return {
    fkEstablecimiento: row.fk_establecimiento,
    establecimiento: row.establecimiento,
    pkMatriculaConfig: row.pk_matricula_config,
    secciones: row.secciones.map((seccion) => ({
      seccion: seccion.seccion,
      campos: seccion.campos.map((campo) => ({
        fkCampo: campo.fk_campo,
        nombre: campo.nombre,
        editable: campo.editable,
        requerido: campo.requerido,
        visible: campo.visible,
      })),
    })),
  }
}

/**
 * Sin establecimiento, el backend responde la del único que el usuario
 * administra (y 22023 si administra varios); con él, la de ese colegio.
 */
async function fetchMatriculaFieldConfig(establecimientoId: number | null): Promise<MatriculaFieldConfig> {
  const query = establecimientoId != null ? `?FK_ESTABLECIMIENTO=${establecimientoId}` : ""
  const [row] = await evalCol.getRows<{ config: MatriculaFieldConfigRow }>(
    `/matricula/configuracion${query}`,
  )
  if (!row) throw new Error("La configuración de matrícula no trajo datos.")
  return toMatriculaFieldConfig(row.config)
}

export const matriculaFieldConfigQueryKey = (establecimientoId: number | null = null) => [
  "matricula",
  "field-config",
  establecimientoId,
]

interface UseMatriculaFieldConfigOptions {
  /** El colegio cuya configuración se pide; `null` = el único que administra. */
  establecimientoId?: number | null
  /** Falso mientras no se sepa de qué colegio pedirla (rector de varios). */
  enabled?: boolean
}

export function useMatriculaFieldConfigQuery({
  establecimientoId = null,
  enabled = true,
}: UseMatriculaFieldConfigOptions = {}) {
  return useQuery({
    queryKey: matriculaFieldConfigQueryKey(establecimientoId),
    queryFn: () => fetchMatriculaFieldConfig(establecimientoId),
    enabled,
  })
}
