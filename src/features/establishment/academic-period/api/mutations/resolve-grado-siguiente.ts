import { resolveCatalogId } from "@/features/establishment/academic-period/api/query/resolve-catalog-id"

// `fn_grado_crear`/`fn_grado_actualizar` piden `FK_GRADO_SIGUIENTE` como PK de
// `TLISTA_VALOR` (categoría GRADOS), pero el front solo tiene el VALOR
// (string) que ya leyó/eligió (ver use-grados-catalog.ts). Se re-resuelve
// justo antes de guardar, mismo patrón que resolve-especialidad-id.ts.
export async function resolveGradoSiguienteId(
  valor: string | undefined
): Promise<number | null> {
  return (await resolveCatalogId(undefined, "GRADOS", valor, { match: "valorOrNombre" })) ?? null
}
