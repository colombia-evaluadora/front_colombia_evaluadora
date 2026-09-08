import { useMutation, useQueryClient } from "@tanstack/react-query"

import { patchMultipart } from "@/lib/files"
import {
  toUpdateMatriculaBody,
  type OtroDocumentoRelevanteOperation,
} from "@/features/coverage/api/mutations/to-update-matricula-body"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateMatriculaInput, MatriculaMutationResult } from "@/features/coverage/api/types/matricula"

export interface UpdateMatriculaFilesInput {
  id: string
  values: CreateMatriculaInput
  pkTpadre: number | null
  pkUsuarioAcudiente: number | null
  studentIdDocument?: File | null
  previousYearCertificate?: File | null
  medicalCertificate?: File | null
  studentPhoto?: File | null
  deleteMedicalCertificate?: boolean
  deleteStudentPhoto?: boolean
  otrosDocumentosARemover: number[]
}

/**
 * PATCH de matrícula acotado solo a archivos -- reusa `toUpdateMatriculaBody`
 * (mismo endpoint/transacción que el editar completo) pero con
 * ACTUALIZAR_* en `false`: no se re-guarda el resto de la ficha, solo los
 * documentos que el usuario tocó en el diálogo de Archivos.
 */
async function updateMatriculaFiles({
  id,
  values,
  pkTpadre,
  pkUsuarioAcudiente,
  studentIdDocument,
  previousYearCertificate,
  medicalCertificate,
  studentPhoto,
  deleteMedicalCertificate,
  deleteStudentPhoto,
  otrosDocumentosARemover,
}: UpdateMatriculaFilesInput): Promise<MatriculaMutationResult> {
  const otrosDocumentosRelevantes: OtroDocumentoRelevanteOperation[] = otrosDocumentosARemover.map(
    (pkTmatriculaArchivo) => ({ pkTmatriculaArchivo, fkTarchivo: null }),
  )

  const body = toUpdateMatriculaBody(values, {
    pkTpadre,
    pkUsuarioAcudiente,
    actualizarAcudiente: false,
    actualizarMatricula: false,
    actualizarEstudiante: false,
    actualizarSocioeconomico: false,
    tocarDocumentoIdentidad: Boolean(studentIdDocument),
    tocarCertificadoEstudios: Boolean(previousYearCertificate),
    tocarCertificadoMedico: Boolean(medicalCertificate) || Boolean(deleteMedicalCertificate),
    tocarFoto: Boolean(studentPhoto) || Boolean(deleteStudentPhoto),
    otrosDocumentosRelevantes,
  })

  await patchMultipart(`/eval-col/cobertura-academica/matricula/${id}`, body, {
    DOCUMENTO_DE_IDENTIDAD_DEL_ESTUDIANTE: studentIdDocument ?? null,
    CERTIFICADO_DE_ESTUDIOS_DEL_ANO_ANTERIOR: previousYearCertificate ?? null,
    CERTIFICADO_MEDICO_DEL_ESTUDIANTE: medicalCertificate ?? null,
    FOTO_DEL_ESTUDIANTE: studentPhoto ?? null,
  })

  return { status: "ok", message: "Archivos actualizados correctamente.", matricula: null }
}

interface UseUpdateMatriculaFilesOptions {
  mutationConfig?: MutationConfig<typeof updateMatriculaFiles>
}

export function useUpdateMatriculaFiles({ mutationConfig }: UseUpdateMatriculaFilesOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateMatriculaFiles,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
