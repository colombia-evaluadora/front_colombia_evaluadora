import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

/**
 * El establecimiento desde el que se ven los funcionarios: su estado, sus anexos y si
 * lleva información complementaria dependen de él (Reglas 81, 90 y 101). Con uno solo
 * se usa ese; con varios se elige en el listado y viaja en la URL (`?establecimiento=`).
 */
export function useEstablecimientoFuncionarios(elegido: number | undefined) {
  const { data: establecimientos = [], isPending } = useEstablishmentsOptionsQuery()
  const actual = establecimientos.find((e) => e.id === elegido) ?? establecimientos[0] ?? null
  return {
    establecimientos,
    id: actual?.id ?? null,
    nombre: actual?.name ?? "",
    varios: establecimientos.length > 1,
    cargando: isPending,
  }
}
