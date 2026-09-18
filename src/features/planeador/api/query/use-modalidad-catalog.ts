import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

/**
 * Catálogo `TLISTA_VALOR` que resolvería `FK_TLV_MODALIDAD` en
 * `fn_actividad_crear`/`_actualizar` (V224) — mismo patrón que
 * `resolveTipoActividadId`/`resolveInstrumentoEvaluacionId`.
 *
 * A diferencia de esos dos, "Modalidad" (`ProgramacionSection`, `<Select
 * value="Presencial"|"Virtual"|"Mixta">`) NO sale de un catálogo real: sus
 * tres opciones están hardcodeadas en el form, y `"MODALIDAD"` acá abajo es
 * un NOMBRE DE CATEGORÍA SIN CONFIRMAR contra `GET /eval-col/select/`. Si
 * el nombre real es otro, esto resuelve `undefined` en silencio y
 * `FK_TLV_MODALIDAD` queda sin mandarse — mismo comportamiento que antes de
 * este archivo, no empeora nada, pero tampoco arregla el campo hasta
 * confirmar la categoría real (o, si "Modalidad" no es un catálogo sino un
 * valor de texto plano en `TACTIVIDAD`, cambiar esto por mandar el string
 * directo en vez de resolver un pk).
 */
export async function resolveModalidadId(modalidad: string): Promise<number | undefined> {
  if (!modalidad) return undefined
  const rows = await fetchSelectCategory("MODALIDAD")
  return rows.find((row) => row.nombre === modalidad)?.pk_lista_valor
}
