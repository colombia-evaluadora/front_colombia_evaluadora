import { useMutation, useQueryClient } from "@tanstack/react-query"

import { fetchSedeOptions } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { resolverSede } from "@/features/coverage/matricula/utils/sede-matricula"
import { fetchSedeJornadasActivas } from "@/features/establishment/employees/api/query/use-sede-jornadas"
import { fetchPeriodoResolverMatricula } from "@/features/coverage/matricula/api/query/use-periodo-resolver-matricula"
import { fetchGrados } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"
import { toCreateMatriculaBody } from "@/features/coverage/matricula/api/mutations/to-create-matricula-body"
import { addMatriculaDocumento } from "@/features/coverage/matricula/api/mutations/add-matricula-documento"
import { registerMatriculaPersona } from "@/features/coverage/matricula/api/mutations/register-matricula-persona"
import { registerUsuarioAdministrado } from "@/features/coverage/matricula/api/mutations/register-usuario-administrado"
import { findMatriculaUsuarioPorDocumento } from "@/features/coverage/matricula/api/query/use-matricula-usuario-por-documento"
import { isPreescolarPrimariaGrado } from "@/features/coverage/matricula/utils/matricula-grado-rules"
import type { MatriculaSupportFiles } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import type {
  CreateMatriculaInput,
  CreateMatriculaResult,
  Matricula,
} from "@/features/coverage/matricula/api/types/matricula"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"

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

  // Sin `PK_TGRADO` no se puede crear el usuario administrado, y caer al alta
  // normal termina en un error del backend por falta de correo.
  if (gradoId == null && isPreescolarPrimariaGrado(values.academic.grade)) {
    throw new Error("No hay un periodo académico activo con este grado para la sede y jornada elegidas.")
  }
  const esPreescolarPrimaria = gradoId != null && isPreescolarPrimariaGrado(values.academic.grade)

  // Preescolar/primaria no tiene correo: usuario administrado, el alta normal exige email.
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

export async function resolvePkUsuarioAcudiente(
  values: CreateMatriculaInput,
  pkUsuarioAcudiente: number | null,
): Promise<number> {
  if (pkUsuarioAcudiente != null) return pkUsuarioAcudiente
  const { guardian, guardianContact } = values

  // Reusar la cuenta si un intento previo la creó y la matrícula falló después.
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
  const { sede, ambigua } = resolverSede(sedes, {
    campusId: values.academic.campusId,
    campus: values.academic.campus,
  })
  if (ambigua) {
    throw new Error(
      `Hay una sede llamada "${values.academic.campus}" en más de uno de tus establecimientos: vuelve a elegir la sede.`,
    )
  }
  if (!sede) {
    throw new Error(`No se encontró la sede "${values.academic.campus}".`)
  }

  const jornadas = await fetchSedeJornadasActivas(sede.pk_sede)
  const jornada = jornadas.find((j) => j.nombre === values.academic.shift)
  if (!jornada) {
    throw new Error(`No se encontró la jornada "${values.academic.shift}" para esta sede.`)
  }

  // Antes de la cuenta del estudiante: el `PK_TGRADO` decide si es usuario administrado.
  const periodoId = await fetchPeriodoResolverMatricula(sede.pk_sede, jornada.id)
  const gradoValor = Number(values.academic.grade)
  const grados = periodoId != null ? await fetchGrados(periodoId) : []
  const gradoId = grados.find((g) => g.valor === gradoValor)?.id ?? null

  // Estudiante y acudiente en paralelo, salvo que compartan documento (se crearía dos veces).
  const mismoDocumento =
    values.guardian.documentType === values.student.documentType &&
    values.guardian.documentNumber === values.student.documentNumber
  const estudiante = () => resolvePkUsuarioEstudiante(values, providedPkUsuarioEstudiante, gradoId)
  const acudiente = () => resolvePkUsuarioAcudiente(values, providedPkUsuarioAcudiente)
  const [pkUsuarioEstudiante, pkUsuarioAcudiente] = mismoDocumento
    ? [await estudiante(), await acudiente()]
    : await Promise.all([estudiante(), acudiente()])

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
  const subidas = await Promise.allSettled(
    files.otherDocuments.map((file) => addMatriculaDocumento(matriculaId, file)),
  )
  const failedOtherDocuments = files.otherDocuments.filter((_, i) => subidas[i].status === "rejected")

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
      invalidarMatriculas(queryClient)
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
