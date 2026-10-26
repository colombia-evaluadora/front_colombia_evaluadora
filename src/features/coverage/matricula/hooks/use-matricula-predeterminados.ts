import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react"
import { useQueries } from "@tanstack/react-query"

import { selectCategoryQueryOptions, type SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { MATRICULA_CATALOG_CATEGORIA, type MatriculaCatalogKey } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"
import { isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"

type Seccion = "student" | "previousYear" | "conflictVictim" | "complementary" | "benefits" | "guardian"

interface CampoPredeterminado {
  fieldId: string
  catalogo: MatriculaCatalogKey
  seccion: Seccion
  campo: string
}

// Selects del alta que salen de Listas valor
const CAMPOS: CampoPredeterminado[] = [
  { fieldId: "student-document-type", catalogo: "tipoDocumento", seccion: "student", campo: "documentType" },
  { fieldId: "student-gender", catalogo: "genero", seccion: "student", campo: "gender" },
  { fieldId: "previous-year-situation", catalogo: "situacionAnioAnterior", seccion: "previousYear", campo: "situation" },
  { fieldId: "previous-year-condition", catalogo: "condicionAnioAnterior", seccion: "previousYear", campo: "condition" },
  { fieldId: "conflict-victim-population", catalogo: "poblacionVictima", seccion: "conflictVictim", campo: "population" },
  { fieldId: "complementary-stratum", catalogo: "estrato", seccion: "complementary", campo: "socioeconomicStratum" },
  { fieldId: "complementary-sisben", catalogo: "sisben", seccion: "complementary", campo: "sisben" },
  { fieldId: "complementary-talent", catalogo: "talento", seccion: "complementary", campo: "talent" },
  { fieldId: "benefits-funding-source", catalogo: "fuenteRecursos", seccion: "benefits", campo: "fundingSource" },
  { fieldId: "guardian-relationship", catalogo: "parentesco", seccion: "guardian", campo: "relationship" },
  { fieldId: "guardian-document-type", catalogo: "tipoDocumento", seccion: "guardian", campo: "documentType" },
  { fieldId: "guardian-gender", catalogo: "genero", seccion: "guardian", campo: "gender" },
]

const toPredeterminadoId = (rows: SelectCategoryRow[]) => {
  const row = rows.find((item) => item.predeterminado)
  return row ? String(row.pk_lista_valor) : null
}

const leer = (values: CreateMatriculaInput, c: CampoPredeterminado) =>
  (values[c.seccion] as unknown as Record<string, string>)[c.campo] ?? ""

const escribir = (values: CreateMatriculaInput, c: CampoPredeterminado, valor: string): CreateMatriculaInput => ({
  ...values,
  [c.seccion]: { ...values[c.seccion], [c.campo]: valor },
})

/**
 * Solo alta: precarga el predeterminado de Listas valor en campos vacíos y
 * visibles. Si la config del colegio oculta el campo, quita lo precargado.
 * Devuelve `conPredeterminados` para armar el form limpio al "Guardar y otra".
 */
export function useMatriculaPredeterminados(
  values: CreateMatriculaInput,
  setValues: Dispatch<SetStateAction<CreateMatriculaInput>>,
  fieldSettings: MatriculaFieldSettingsMap | undefined,
  // Base del isDirty: la precarga no cuenta como cambio del usuario
  initialValuesRef: RefObject<CreateMatriculaInput>,
) {
  const predeterminados = useQueries({
    queries: CAMPOS.map((c) => ({
      ...selectCategoryQueryOptions(MATRICULA_CATALOG_CATEGORIA[c.catalogo]),
      select: toPredeterminadoId,
    })),
  }).map((q) => q.data ?? null)
  const clave = predeterminados.join("|")
  // Campos que precargamos nosotros (no el usuario)
  const aplicados = useRef(new Set<string>())

  function aplicar(base: CreateMatriculaInput) {
    let next = base
    CAMPOS.forEach((c, i) => {
      const predeterminado = predeterminados[i]
      const actual = leer(next, c)
      if (!isFieldVisible(fieldSettings, c.fieldId)) {
        // Campo oculto: no dejar el predeterminado colado
        if (aplicados.current.has(c.fieldId) && actual === predeterminado) next = escribir(next, c, "")
        aplicados.current.delete(c.fieldId)
        return
      }
      if (predeterminado && !actual && !aplicados.current.has(c.fieldId)) {
        next = escribir(next, c, predeterminado)
        aplicados.current.add(c.fieldId)
      }
    })
    return next
  }

  useEffect(() => {
    const next = aplicar(values)
    if (next === values) return
    // Lo mismo en la base, para no marcar el form como sucio
    let base = initialValuesRef.current
    CAMPOS.forEach((c) => {
      if (leer(next, c) !== leer(values, c)) base = escribir(base, c, leer(next, c))
    })
    initialValuesRef.current = base
    setValues(next)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, fieldSettings])

  function conPredeterminados(blank: CreateMatriculaInput) {
    aplicados.current.clear()
    return aplicar(blank)
  }

  return { conPredeterminados }
}
