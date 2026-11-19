import { useMutation, useQueryClient } from "@tanstack/react-query"

import { postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"

export interface CorregirIdentidadEstudianteInput {
  matriculaId: string
  documentTypeId: string
  documentNumber: string
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  /** yyyy-MM-dd */
  birthDate: string
  birthMunicipalityId: string
  documentMunicipalityId: string
  genderId: string
  ethnicityId: string
  reason: string
  support: File
}

const toIdOrNull = (value: string) => (value ? Number(value) : null)

/** Regla 43: multipart con el SOPORTE; el back deja la corrección con antes y después. */
export async function corregirIdentidadEstudiante(input: CorregirIdentidadEstudianteInput) {
  await postMultipart(
    `/eval-col/cobertura-academica/matricula/${input.matriculaId}/corregir-identidad`,
    {
      TIPO_DOCUMENTO: toIdOrNull(input.documentTypeId),
      IDENTIFICACION: input.documentNumber.trim(),
      PRIMER_NOMBRE: input.firstName.trim(),
      SEGUNDO_NOMBRE: input.secondName.trim() || null,
      PRIMER_APELLIDO: input.lastName.trim(),
      SEGUNDO_APELLIDO: input.secondLastName.trim() || null,
      FECHA_NACIMIENTO: input.birthDate,
      MUNICIPIO_NACIMIENTO: toIdOrNull(input.birthMunicipalityId),
      MUNICIPIO_DOCUMENTO: toIdOrNull(input.documentMunicipalityId),
      GENERO: toIdOrNull(input.genderId),
      RESGUARDO: toIdOrNull(input.ethnicityId),
      MOTIVO: input.reason.trim(),
    },
    { SOPORTE: input.support },
  )
}

export function useCorregirIdentidadEstudiante({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof corregirIdentidadEstudiante> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: corregirIdentidadEstudiante,
    ...rest,
    onSuccess: (...args) => {
      // El nombre y el documento salen en el listado y en el detalle.
      invalidarMatriculas(queryClient)
      onSuccess?.(...args)
    },
  })
}
