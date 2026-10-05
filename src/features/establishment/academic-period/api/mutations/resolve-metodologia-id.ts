import { resolveCatalogId } from "@/features/establishment/academic-period/api/query/resolve-catalog-id"

// `fn_grupo_crear`/`fn_grupo_actualizar` piden `FK_MODELO_PEDAGOGICO` como PK
// de `TLISTA_VALOR` (categoría MODELO_PEDAGOGICO), pero el front solo tiene
// el VALOR (string) que ya lee/elige (ver use-metodologias.ts,
// GradeGroup.metodologia). Se re-resuelve justo antes de guardar.
export async function resolveMetodologiaId(
  valor: string | undefined
): Promise<number | null> {
  return (await resolveCatalogId(undefined, "MODELO_PEDAGOGICO", valor, { match: "valorOrNombre" })) ?? null
}
