import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"

/** Matrículas Cursando del grupo, para «Agregar estudiante». */
export function useEstudiantesGrupoQuery(grupo: string) {
  return useQuery({
    queryKey: [...convivenciaKeys.all, "opciones-estudiantes", grupo],
    queryFn: () =>
      evalCol.getRows<{ fk_matricula: number; nombre: string }>(`/gestion-estudiantil/convivencia/opciones/estudiantes?GRUPO=${grupo}`),
    enabled: Boolean(grupo),
    staleTime: 60_000,
  })
}
