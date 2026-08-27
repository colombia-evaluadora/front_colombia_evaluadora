import { api } from "@/lib/api-client"
import type { MatriculaDocumentCheckResult } from "@/features/coverage/api/types/matricula"

/**
 * Consulta puntual (no un `useQuery`): se dispara desde un `useEffect` con
 * debounce apenas el usuario termina de escribir el documento del
 * estudiante, no en cada tecla — ver `add-matricula-page.tsx`.
 */
export function checkMatriculaByDocument(documentNumber: string): Promise<MatriculaDocumentCheckResult> {
  return api.get("/coverage/matricula/check", { params: { documentNumber } })
}
