import { useMutation, useQueryClient } from "@tanstack/react-query"

import { patchMultipart } from "@/lib/files"
import { toUpdateMatriculaBody } from "@/features/coverage/matricula/api/mutations/to-update-matricula-body"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"
import { resolvePkUsuarioAcudiente } from "@/features/coverage/matricula/api/mutations/create-matricula"
import { updatePersona } from "@/features/coverage/matricula/api/mutations/update-persona"

export interface UpdateMatriculaMutationInput {
  id: string
  values: CreateMatriculaInput
  pkTpadre: number | null
  pkUsuarioEstudiante: number | null
  pkUsuarioAcudiente: number | null
  /** Cambió el documento del acudiente: se busca o crea otra cuenta. */
  guardianReplaced: boolean
}

async function updateEstudiante(pk: number, { student, studentContact }: CreateMatriculaInput) {
  await updatePersona(pk, {
    documentTypeId: student.documentType,
    documentNumber: student.documentNumber,
    firstName: student.firstName,
    secondName: student.secondName,
    lastName: student.lastName,
    secondLastName: student.secondLastName,
    birthDate: student.birthDate,
    genderId: student.gender,
    phone: studentContact.phone,
    email: studentContact.email,
  })
}

async function updateAcudiente(pk: number, { guardian, guardianContact }: CreateMatriculaInput) {
  await updatePersona(pk, {
    documentTypeId: guardian.documentType,
    documentNumber: guardian.documentNumber,
    firstName: guardian.firstName,
    secondName: guardian.secondName,
    lastName: guardian.lastName,
    secondLastName: guardian.secondLastName,
    genderId: guardian.gender,
    phone: guardianContact.phone,
    email: guardianContact.email,
  })
}

// Acudiente reemplazado: nueva cuenta, sin tocar la anterior. Si no, se actualiza el mismo.
async function resolverAcudiente(
  values: CreateMatriculaInput,
  pkUsuarioAcudiente: number | null,
  guardianReplaced: boolean,
): Promise<{ pkUsuarioAcudiente: number | null; actualizarAcudiente: boolean }> {
  if (guardianReplaced) {
    return { pkUsuarioAcudiente: await resolvePkUsuarioAcudiente(values, null), actualizarAcudiente: false }
  }
  if (pkUsuarioAcudiente == null) return { pkUsuarioAcudiente, actualizarAcudiente: false }
  await updateAcudiente(pkUsuarioAcudiente, values)
  return { pkUsuarioAcudiente, actualizarAcudiente: true }
}

async function updateMatricula({
  id,
  values,
  pkTpadre,
  pkUsuarioEstudiante,
  pkUsuarioAcudiente: pkAcudienteActual,
  guardianReplaced,
}: UpdateMatriculaMutationInput): Promise<void> {
  const [, { pkUsuarioAcudiente, actualizarAcudiente }] = await Promise.all([
    pkUsuarioEstudiante != null ? updateEstudiante(pkUsuarioEstudiante, values) : undefined,
    resolverAcudiente(values, pkAcudienteActual, guardianReplaced),
  ])
  await patchMultipart(
    `/eval-col/cobertura-academica/matricula/${id}`,
    toUpdateMatriculaBody(values, { pkTpadre, pkUsuarioAcudiente, actualizarAcudiente }),
    {},
  )
}

interface UseUpdateMatriculaOptions {
  mutationConfig?: MutationConfig<typeof updateMatricula>
}

export function useUpdateMatricula({ mutationConfig }: UseUpdateMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateMatricula,
    onSuccess: (...args) => {
      invalidarMatriculas(queryClient)
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
