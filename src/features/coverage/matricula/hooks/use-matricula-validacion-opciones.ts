import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import {
  esTipoDocExtranjero,
  type MatriculaValidacionOpciones,
} from "@/features/coverage/matricula/utils/matricula-formatos"

/**
 * Lo que `validateMatricula` necesita de los catálogos: qué tipos de documento
 * son de extranjero (documento alfanumérico) y qué población no es víctima
 * (el municipio expulsor no aplica). Los catálogos ya están en caché por el
 * formulario.
 */
export function useMatriculaValidacionOpciones(): MatriculaValidacionOpciones {
  const { data: tipos } = useMatriculaCatalogQuery("tipoDocumento")
  const { data: poblacion } = useMatriculaCatalogQuery("poblacionVictima")
  const { data: paises } = useMatriculaCatalogQuery("pais")
  const { data: srpa } = useMatriculaCatalogQuery("srpa")
  return {
    tiposDocExtranjero: new Set((tipos ?? []).filter((t) => esTipoDocExtranjero(t.nombre)).map((t) => String(t.id))),
    poblacionNoVictima: new Set(
      (poblacion ?? []).filter((p) => /no aplica|ninguna|no es v/i.test(p.nombre)).map((p) => String(p.id)),
    ),
    paisColombia: (() => {
      const id = paises?.find((p) => /^colombia$/i.test(p.nombre.trim()))?.id
      return id != null ? String(id) : undefined
    })(),
    srpaNoAplica: new Set((srpa ?? []).filter((s) => /no aplica/i.test(s.nombre)).map((s) => String(s.id))),
  }
}
