import { api } from "@/lib/api-client"

export function deleteSubject(subjectId: number): Promise<void> {
  return api.put(`/eval-col/areas/asignaturas/eliminar/${subjectId}`)
}
