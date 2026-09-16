import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"

export function deleteSubjectLabelOption(id: number): Promise<unknown> {
  const url = apiPath(
    `/academic-management/curricular-references/personalizar-asignatura/${id}`,
    `/referentes-curriculares/personalizar-asignatura/${id}/eliminar`,
  )
  return api.patch(url)
}
