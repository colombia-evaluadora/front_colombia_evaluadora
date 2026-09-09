import { useMutation, useQueryClient } from "@tanstack/react-query"

import { fetchSedeOptions } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { fetchSedeJornadasActivas } from "@/features/establishment/employees/api/query/use-sede-jornadas"
import { fetchPeriodoResolverMatricula } from "@/features/coverage/api/query/use-periodo-resolver-matricula"
import { fetchGrados } from "@/features/coverage/api/query/use-matricula-dependent-catalogs-query"
import { postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"
import { toCreateMatriculaBody } from "@/features/coverage/api/mutations/to-create-matricula-body"
import { addMatriculaDocumento } from "@/features/coverage/api/mutations/add-matricula-documento"
import { registerMatriculaPersona } from "@/features/coverage/api/mutations/register-matricula-persona"
import { registerUsuarioAdministrado } from "@/features/coverage/api/mutations/register-usuario-administrado"
import { findMatriculaUsuarioPorDocumento } from "@/features/coverage/api/query/use-matricula-usuario-por-documento"
import { isPreescolarPrimariaGrado } from "@/features/coverage/utils/matricula-grado-rules"
import type { MatriculaSupportFiles } from "@/features/coverage/components/forms/form-create-matricula"
import type {
  CreateMatriculaInput,
  CreateMatriculaResult,
  Matricula,
} from "@/features/coverage/api/types/matricula"

export interface CreateMatriculaMutationInput {
  values: CreateMatriculaInput
  files: MatriculaSupportFiles
  pkUsuarioEstudiante: number | null
  pkUsuarioAcudiente: number | null
}

interface RawCreateMatriculaResponse {
  pk_testudiante: number
  pk_tpadre: number
  pk_tnucleo_familiar: number
  pk_tmatricula: number
  pk_tmatricula_socioeconomico: number
  archivos_creados: { pkTmatriculaArchivo: number; fkTlvTipoArchivo: number }[]
}

async function resolvePkUsuarioEstudiante(
  values: CreateMatriculaInput,
  pkUsuarioEstudiante: number | null,
  gradoId: number | null,
): Promise<number> {
  if (pkUsuarioEstudiante != null) return pkUsuarioEstudiante
  const { student, studentContact } = values
  const found = await findMatriculaUsuarioPorDocumento(Number(student.documentType), student.documentNumber)
  if (found) return found.pkTusuario

  const esPreescolarPrimaria = gradoId != null && isPreescolarPrimariaGrado(values.academic.grade)

  // Preescolar/primaria no tiene correo -- se crea sin cuenta de acceso
  // (`fn_usuario_administrado_crear`) en vez del alta normal, que exige
  // email.
  if (esPreescolarPrimaria) {
    const result = await registerUsuarioAdministrado({
      documentTypeId: Number(student.documentType),
      documentNumber: student.documentNumber,
      gradoId: gradoId as number,
      firstName: student.firstName,
      secondName: student.secondName,
      lastName: student.lastName,
      secondLastName: student.secondLastName,
      genderId: Number(student.gender),
      birthDate: student.birthDate,
    })
    return result.pkTusuario
  }

  const result = await registerMatriculaPersona({
    documentTypeId: Number(student.documentType),
    documentNumber: student.documentNumber,
    firstName: student.firstName,
    secondName: student.secondName,
    lastName: student.lastName,
    secondLastName: student.secondLastName,
    birthDate: student.birthDate,
    genderId: Number(student.gender),
    phone: studentContact.phone,
    email: studentContact.email,
  })
  return result.pkTusuario
}

async function resolvePkUsuarioAcudiente(
  values: CreateMatriculaInput,
  pkUsuarioAcudiente: number | null,
): Promise<number> {
  if (pkUsuarioAcudiente != null) return pkUsuarioAcudiente
  const { guardian, guardianContact } = values

  // Mismo caso que el estudiante: si un intento previo ya creó la cuenta
  // del acudiente y la matrícula falló después, reusarla en vez de
  // reintentar el alta.
  const found = await findMatriculaUsuarioPorDocumento(Number(guardian.documentType), guardian.documentNumber)
  if (found) return found.pkTusuario

  const result = await registerMatriculaPersona({
    documentTypeId: Number(guardian.documentType),
    documentNumber: guardian.documentNumber,
    firstName: guardian.firstName,
    secondName: guardian.secondName,
    lastName: guardian.lastName,
    secondLastName: guardian.secondLastName,
    genderId: guardian.gender ? Number(guardian.gender) : undefined,
    phone: guardianContact.phone,
    email: guardianContact.email,
  })
  return result.pkTusuario
}

async function createMatricula({
  values,
  files,
  pkUsuarioEstudiante: providedPkUsuarioEstudiante,
  pkUsuarioAcudiente: providedPkUsuarioAcudiente,
}: CreateMatriculaMutationInput): Promise<CreateMatriculaResult> {
  const sedes = await fetchSedeOptions()
  const sede = sedes.find((s) => s.nombre === values.academic.campus)
  if (!sede) {
    throw new Error(`No se encontró la sede "${values.academic.campus}".`)
  }

  const jornadas = await fetchSedeJornadasActivas(sede.pk_sede)
  const jornada = jornadas.find((j) => j.nombre === values.academic.shift)
  if (!jornada) {
    throw new Error(`No se encontró la jornada "${values.academic.shift}" para esta sede.`)
  }

  // Se resuelve acá (antes de la cuenta del estudiante) porque
  // `resolvePkUsuarioEstudiante` necesita el `PK_TGRADO` real para decidir
  // si corresponde usuario administrado (preescolar/primaria).
  const periodoId = await fetchPeriodoResolverMatricula(sede.pk_sede, jornada.id)
  const gradoValor = Number(values.academic.grade)
  const grados = periodoId != null ? await fetchGrados(periodoId) : []
  const gradoId = grados.find((g) => g.valor === gradoValor)?.id ?? null

  const pkUsuarioEstudiante = await resolvePkUsuarioEstudiante(
    values,
    providedPkUsuarioEstudiante,
    gradoId,
  )
  const pkUsuarioAcudiente = await resolvePkUsuarioAcudiente(values, providedPkUsuarioAcudiente)

  const body = toCreateMatriculaBody(values, {
    sedeId: sede.pk_sede,
    jornadaId: jornada.id,
    pkUsuarioEstudiante,
    pkUsuarioAcudiente,
  })

  const raw = await postMultipart<RawCreateMatriculaResponse>(
    "/eval-col/cobertura-academica/matricula",
    body,
    {
      DOCUMENTO_DE_IDENTIDAD_DEL_ESTUDIANTE: files.studentIdDocument[0] ?? null,
      CERTIFICADO_DE_ESTUDIOS_DEL_ANO_ANTERIOR: files.previousYearCertificate[0] ?? null,
      CERTIFICADO_MEDICO_DEL_ESTUDIANTE: files.medicalCertificate[0] ?? null,
      FOTO_DEL_ESTUDIANTE: files.studentPhoto[0] ?? null,
    },
  )

  const matriculaId = String(raw.pk_tmatricula)
  const failedOtherDocuments: File[] = []
  for (const file of files.otherDocuments) {
    try {
      await addMatriculaDocumento(matriculaId, file)
    } catch {
      failedOtherDocuments.push(file)
    }
  }

  const matricula: Matricula = {
    id: matriculaId,
    documentNumber: values.student.documentNumber,
    firstName: values.student.firstName,
    lastName: values.student.lastName,
    institution: "",
    campus: values.academic.campus,
    shift: values.academic.shift,
    educationLevel: "PREESCOLAR",
    grade: Number(values.academic.grade) || 0,
    group: values.academic.group,
    enrollmentDate: new Date().toISOString(),
    guardian: `${values.guardian.firstName} ${values.guardian.lastName}`.trim(),
    status: "Cursando",
    hasGrades: false,
  }

  return { matricula, homologation: null, failedOtherDocuments }
}

interface UseCreateMatriculaOptions {
  mutationConfig?: MutationConfig<typeof createMatricula>
}

export function useCreateMatricula({ mutationConfig }: UseCreateMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: createMatricula,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
