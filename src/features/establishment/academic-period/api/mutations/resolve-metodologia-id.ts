import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

// `fn_grupo_crear`/`fn_grupo_actualizar` piden `FK_MODELO_PEDAGOGICO` como PK
// de `TLISTA_VALOR` (categoría MODELO_PEDAGOGICO), pero el front solo tiene
// el VALOR (string) que ya lee/elige (ver use-metodologias.ts,
// GradeGroup.metodologia). Se re-resuelve justo antes de guardar.
export async function resolveMetodologiaId(
  valor: string | undefined
): Promise<number | null> {
  if (!valor) return null
  const rows = await fetchSelectCategory("MODELO_PEDAGOGICO")
  const match = rows.find((row) => row.valor === valor || row.nombre === valor)
  return match ? match.pk_lista_valor : null
}
