import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

/**
 * Catálogo global `TIPO_EVIDENCIA` de `TLISTA_VALOR`
 * (`GET /eval-col/select/TIPO_EVIDENCIA`) — resuelve `FK_TLV_TIPO_EVIDENCIA`
 * en `fn_actividad_crear`/`_actualizar` (confirmado real: V224 siembra los 5
 * valores — Archivo/Enlace/Imagen/Video/Observación —, V496.1 valida
 * `FK_TLV_TIPO_EVIDENCIA` contra esta misma categoría, "Tipo de evidencia
 * esperada"). Mismo patrón que `resolveTipoActividadId`: se resuelve por
 * `nombre` (no hay un diccionario de códigos estables que el resto del form
 * necesite, a diferencia de `INSTRUMENTO_EVALUACION`).
 *
 * **No confundir con `TIPO_EVIDENCIA_OTRO`**
 * (`use-tipo-evidencia-otro-catalog.ts`): esa categoría es la ficha "Tipo de
 * evidencia esperada" del instrumento "Otro (personalizado)" (4 valores:
 * Archivo/Enlace/Observación directa/Registro en campo, viaja en
 * `PUT .../instrumento`). Esta categoría (`TIPO_EVIDENCIA`) es el campo
 * "Tipo de evidencia" de la sección Seguimiento del form (`generaEvidencias`/
 * `tipoEvidencia`/`requiereValidacion`), vive directo en `TACTIVIDAD` y no
 * depende del instrumento de evaluación elegido.
 */
export async function resolveTipoEvidenciaId(tipo: string): Promise<number | undefined> {
  if (!tipo) return undefined
  const rows = await fetchSelectCategory("TIPO_EVIDENCIA")
  return rows.find((row) => row.nombre === tipo)?.pk_lista_valor
}
