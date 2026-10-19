import { useMutation, useQueryClient } from "@tanstack/react-query"

import { postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"

export interface AddMatriculaDocumentoResult {
  pkTmatriculaArchivo: number
  pkTmatricula: number
  fkTarchivo: number
  tipo: string
  totalOtrosDocumentos: number
}

export function addMatriculaDocumento(
  matriculaId: string,
  archivo: File,
): Promise<AddMatriculaDocumentoResult> {
  return postMultipart(`/eval-col/cobertura-academica/matricula/${matriculaId}/documentos`, {}, {
    ARCHIVO: archivo,
  })
}

export interface AddMatriculaDocumentosInput {
  matriculaId: string
  archivos: File[]
}

export interface AddMatriculaDocumentosResult {
  /** Los que el backend rechazó: el llamador los deja para reintentar. */
  fallidos: File[]
}

// Un archivo por request; devuelve los fallidos e invalida una sola vez al final.
async function addMatriculaDocumentos({
  matriculaId,
  archivos,
}: AddMatriculaDocumentosInput): Promise<AddMatriculaDocumentosResult> {
  const fallidos: File[] = []
  for (const archivo of archivos) {
    try {
      await addMatriculaDocumento(matriculaId, archivo)
    } catch {
      fallidos.push(archivo)
    }
  }
  return { fallidos }
}

interface UseAddMatriculaDocumentosOptions {
  mutationConfig?: MutationConfig<typeof addMatriculaDocumentos>
}

export function useAddMatriculaDocumentos({ mutationConfig }: UseAddMatriculaDocumentosOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: addMatriculaDocumentos,
    onSuccess: (...args) => {
      invalidarMatriculas(queryClient)
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
