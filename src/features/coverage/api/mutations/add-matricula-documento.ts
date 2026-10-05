import { useMutation, useQueryClient } from "@tanstack/react-query"

import { postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"

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

/**
 * Sube varios "otros documentos" de a uno (el endpoint recibe un archivo por
 * request). No tira si alguno falla: devuelve los fallidos para que el
 * diálogo los conserve, y la invalidación corre una sola vez al final en vez
 * de una por archivo.
 */
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
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
