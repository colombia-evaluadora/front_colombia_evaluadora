import { postMultipart } from "@/lib/files"

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
