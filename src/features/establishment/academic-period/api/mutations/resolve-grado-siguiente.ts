import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

// `fn_grado_crear`/`fn_grado_actualizar` piden `FK_GRADO_SIGUIENTE` como PK de
// `TLISTA_VALOR` (categoría GRADOS), pero el front solo tiene el VALOR
// (string) que ya leyó/eligió (ver use-grados-catalog.ts). Se re-resuelve
// justo antes de guardar, mismo patrón que resolve-especialidad-id.ts.
export async function resolveGradoSiguienteId(
  valor: string | undefined
): Promise<number | null> {
  if (!valor) return null
  const rows = await fetchSelectCategory("GRADOS")
  const match = rows.find((row) => row.valor === valor || row.nombre === valor)
  return match ? match.pk_lista_valor : null
}
