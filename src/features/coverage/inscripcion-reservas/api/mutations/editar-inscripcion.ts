import { useMutation, useQueryClient } from "@tanstack/react-query"

import { postMultipart } from "@/lib/files"

import { resolvePkUsuarioAcudiente } from "@/features/coverage/matricula/api/mutations/create-matricula"
import { registerMatriculaPersona } from "@/features/coverage/matricula/api/mutations/register-matricula-persona"
import { registerUsuarioAdministrado } from "@/features/coverage/matricula/api/mutations/register-usuario-administrado"
import { findMatriculaUsuarioPorDocumento } from "@/features/coverage/matricula/api/query/use-matricula-usuario-por-documento"
import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"
import { isPreescolarPrimariaGrado } from "@/features/coverage/matricula/utils/matricula-grado-rules"

import {
  INSCRIPCIONES_BASE,
  fetchOpcionesCupo,
  inscripcionesKeys,
  type PeriodoOpcionCupo,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type {
  EditarInscripcionInput,
  OpcionCupoInput,
} from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"

// El back (sso V425) recibe usuarios e ids: aquí se resuelven desde lo que llena el formulario.

/** Una opción (establecimiento, sede y jornada por nombre) del grado → `{periodo, grado}`, con la cascada del back. */
export async function resolverOpcion(o: OpcionCupoInput, grado: string, n = 1) {
  return resolverEn(await fetchOpcionesCupo(), o, grado, n)
}

async function resolverOpciones(input: EditarInscripcionInput) {
  const periodos = await fetchOpcionesCupo()
  return input.opciones.map((o, i) => resolverEn(periodos, o, input.grado, i + 1))
}

function resolverEn(
  periodos: PeriodoOpcionCupo[],
  o: OpcionCupoInput,
  nombreGrado: string,
  n: number,
) {
  const periodo = periodos.find(
    (p) => p.establecimiento === o.establecimiento && p.sede === o.sede && p.jornada === o.jornada,
  )
  if (!periodo) {
    throw new Error(
      `Opción ${n}: ${o.establecimiento} · ${o.sede} · ${o.jornada} ya no recibe inscripciones.`,
    )
  }
  const grado = periodo.grados.find((g) => g.nombre === nombreGrado)
  if (!grado)
    throw new Error(`Opción ${n}: ${o.sede} · ${o.jornada} no ofrece el grado ${nombreGrado}.`)
  return { periodo: periodo.periodoId, grado: grado.id }
}

/** Usuario del aspirante: el existente por documento o uno nuevo (administrado si no tiene correo). */
async function resolverUsuarioAspirante(input: EditarInscripcionInput, gradoId: number) {
  const { student, studentContact } = input.datos
  const found = await findMatriculaUsuarioPorDocumento(
    Number(student.documentType),
    student.documentNumber,
  )
  if (found) return found.pkTusuario
  const base = {
    documentTypeId: Number(student.documentType),
    documentNumber: student.documentNumber,
    firstName: student.firstName,
    secondName: student.secondName,
    lastName: student.lastName,
    secondLastName: student.secondLastName,
    genderId: Number(student.gender),
    birthDate: student.birthDate,
  }
  if (isPreescolarPrimariaGrado(input.grado) || !studentContact.email) {
    return (await registerUsuarioAdministrado({ ...base, gradoId })).pkTusuario
  }
  return (
    await registerMatriculaPersona({
      ...base,
      phone: studentContact.phone,
      email: studentContact.email,
    })
  ).pkTusuario
}

// `resolvePkUsuarioAcudiente` solo lee las secciones de la persona, no `academic`.
const usuarioAcudiente = (input: EditarInscripcionInput) =>
  resolvePkUsuarioAcudiente(input.datos as CreateMatriculaInput, null)

const camposComunes = (
  input: EditarInscripcionInput,
  opciones: { periodo: number; grado: number }[],
) => ({
  FK_TLV_PARENTESCO: input.datos.guardian.relationship
    ? Number(input.datos.guardian.relationship)
    : null,
  DOCUMENTO_HERMANO: input.documentoHermano,
  PAIS_ORIGEN: input.paisOrigen || null,
  LENGUA_MATERNA: input.lenguaMaterna || null,
  CONDICION_MIGRATORIA: input.condicionMigratoria || null,
  // JSONB viaja como texto JSON.
  OPCIONES: JSON.stringify(opciones),
})

// Multipart por la foto: file-service la guarda y pasa su `pk_tarchivo` en `FK_ARCHIVO_FOTO`.
async function editarInscripcion(input: EditarInscripcionInput) {
  const [opciones, acudiente] = await Promise.all([
    resolverOpciones(input),
    usuarioAcudiente(input),
  ])
  await postMultipart(
    `/eval-col${INSCRIPCIONES_BASE}/${input.id}/editar`,
    { FK_TUSUARIO_ACUDIENTE: acudiente, ...camposComunes(input, opciones) },
    { FK_ARCHIVO_FOTO: input.foto },
  )
}

export function useEditarInscripcion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: editarInscripcion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inscripcionesKeys.all }),
  })
}

// Nueva inscripción: el back asigna número y estado Inscrita.
async function crearInscripcion(input: EditarInscripcionInput) {
  const opciones = await resolverOpciones(input)
  const estudiante = await resolverUsuarioAspirante(input, opciones[0].grado)
  const acudiente = await usuarioAcudiente(input)
  const r = await postMultipart<{ rows: { datos: { id: number; numeroInscripcion: string } }[] }>(
    `/eval-col${INSCRIPCIONES_BASE}`,
    {
      FK_TUSUARIO_ESTUDIANTE: estudiante,
      FK_TUSUARIO_ACUDIENTE: acudiente,
      AUTORIZA_DATOS: input.autorizaDatos,
      ...camposComunes(input, opciones),
    },
    { FK_ARCHIVO_FOTO: input.foto },
  )
  return { numeroInscripcion: r.rows[0]?.datos.numeroInscripcion ?? "" }
}

export function useCrearInscripcion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: crearInscripcion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inscripcionesKeys.all }),
  })
}
