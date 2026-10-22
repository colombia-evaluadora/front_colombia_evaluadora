import { useGradosCatalogQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"

export function useMatriculaGradeLabel(): (grade: number) => string {
  const { data: catalog } = useGradosCatalogQuery()
  const nameByValor = new Map((catalog ?? []).map((grado) => [Number(grado.valor), grado.nombre]))

  return (grade: number) => nameByValor.get(grade) ?? `Grado ${grade}`
}
