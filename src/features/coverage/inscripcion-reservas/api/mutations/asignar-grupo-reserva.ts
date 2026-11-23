import { useMutation, useQueryClient } from "@tanstack/react-query"

import { getErrorMessage } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"
import { updateMatricula } from "@/features/coverage/matricula/api/mutations/update-matricula"
import {
  hasAsignaturasParaGuardar,
  saveMatriculaAsignaturas,
} from "@/features/coverage/matricula/api/mutations/save-matricula-asignaturas"
import {
  cargarSoporte,
  fetchSoportes,
  NOMBRE_SOPORTE,
  revisarSoporte,
  type TipoSoporte,
} from "@/features/coverage/matricula/api/soportes"
import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"
import type { RevisionPendiente } from "@/features/coverage/matricula/components/forms/form-create-matricula/soportes-section"
import {
  RESERVAS_BASE,
  reservasCupoKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"

/**
 * Cambio de soporte hecho en la ficha antes de que exista la matrícula. No toca la matrícula anterior:
 * se aplica a la nueva al crearla, sobre los soportes que el back copió de la anterior.
 * - Archivo nuevo (`archivo`, sin `archivoBase`): adjunta un fijo o agrega a Otros documentos.
 * - Reemplazo (`archivo` y `archivoBase`): reemplaza el soporte copiado (queda Sin revisar).
 * - Revisión (`revision` y `archivoBase`): revisa el soporte copiado.
 */
export interface SoportePendiente {
  key: string
  tipo: TipoSoporte
  archivo: File | null
  /** `fk_tarchivo` del soporte de la matrícula anterior al que se refiere el cambio. */
  archivoBase: number | null
  revision: RevisionPendiente | null
}

export interface AsignarGrupoReservaInput {
  reservaId: string
  grupoId: number
  especialidadId: number | null
  values: CreateMatriculaInput
  /** Hubo cambios en las secciones 2 a 13: se guardan con el PATCH de la matrícula nueva. */
  editado: boolean
  contexto: {
    pkTpadre: number | null
    pkUsuarioEstudiante: number | null
    pkUsuarioAcudiente: number | null
    guardianReplaced: boolean
    /** Regla 81: sin autorización los datos del estudiante llegan enmascarados y no se reenvían. */
    sinAutorizacion: boolean
  }
  soportes: SoportePendiente[]
}

export interface AsignarGrupoReservaResult {
  matriculaId: string
  /** Pasos posteriores al alta que fallaron (la matrícula ya quedó creada). */
  pendientes: string[]
}

/**
 * Asignar grupo (3.6) desde la ficha, en el orden del alta de matrícula:
 * 1. `POST /reservas-cupo/asignar-grupo` crea la matrícula Cursando con lo de la matrícula de origen
 *    (acudiente, socioeconómico, datos complementarios, soportes y la especialidad elegida).
 * 2. Si se editó algo, el PATCH de matrícula sobre la nueva (MATRICULA/EDITAR).
 * 3. Los cambios de soportes de la ficha: revisiones y reemplazos de los copiados (se buscan por archivo)
 *    y los archivos nuevos.
 * 4. Las asignaturas, si se cambió alguna.
 * No es atómico (decisión del 2026-11-19): si falla 2, 3 o 4 la matrícula ya existe y el llamador
 * lleva a Editar matrícula con lo que quedó pendiente.
 */
export async function asignarGrupoReserva(input: AsignarGrupoReservaInput): Promise<AsignarGrupoReservaResult> {
  const { reservaId, grupoId, especialidadId, values, contexto } = input
  const row = await evalCol.postRow<{ datos: { matriculas: { reserva: number; matricula: number }[] } }>(
    `${RESERVAS_BASE}/asignar-grupo`,
    { RESERVAS: [Number(reservaId)], FK_TGRUPO: grupoId, FK_ENFASIS: especialidadId ?? undefined },
  )
  const matricula = row.datos?.matriculas?.[0]?.matricula
  if (matricula == null) throw new Error("El back no devolvió la matrícula creada.")
  const matriculaId = String(matricula)
  const pendientes: string[] = []

  if (input.editado) {
    try {
      await updateMatricula({
        id: matriculaId,
        values,
        pkTpadre: contexto.pkTpadre,
        // Enmascarados: el teléfono y el correo del estudiante no se reenvían.
        pkUsuarioEstudiante: contexto.sinAutorizacion ? null : contexto.pkUsuarioEstudiante,
        pkUsuarioAcudiente: contexto.pkUsuarioAcudiente,
        guardianReplaced: contexto.guardianReplaced,
      })
    } catch (error) {
      pendientes.push(`los datos editados (${getErrorMessage(error)})`)
    }
  }

  // Los copiados tienen otro enlace en la matrícula nueva: se buscan por el archivo, que es el mismo.
  const enlaceNuevo = new Map<number, number>()
  if (input.soportes.some((s) => s.archivoBase != null)) {
    try {
      for (const s of await fetchSoportes(matriculaId)) {
        if (s.archivoId != null && s.id != null) enlaceNuevo.set(s.archivoId, s.id)
      }
    } catch (error) {
      pendientes.push(`los cambios en los soportes copiados (${getErrorMessage(error)})`)
    }
  }
  for (const s of input.soportes) {
    const nombre = s.archivo?.name ?? NOMBRE_SOPORTE[s.tipo]
    const id = s.archivoBase != null ? (enlaceNuevo.get(s.archivoBase) ?? null) : null
    if (s.archivoBase != null && id == null) {
      if (enlaceNuevo.size > 0) pendientes.push(`el cambio en ${nombre} (el soporte no se copió)`)
      continue
    }
    try {
      if (s.archivo) await cargarSoporte(matriculaId, { tipo: s.tipo, id, archivo: s.archivo })
      else if (s.revision && id != null) await revisarSoporte(matriculaId, { id, ...s.revision })
    } catch (error) {
      pendientes.push(`${s.archivo ? "el soporte" : "la revisión de"} ${nombre} (${getErrorMessage(error)})`)
    }
  }

  const asignaturas = { academic: values.academic, cambios: values.asignaturas ?? {} }
  if (hasAsignaturasParaGuardar(asignaturas)) {
    try {
      await saveMatriculaAsignaturas({ matriculaId, ...asignaturas })
    } catch (error) {
      pendientes.push(`las asignaturas (${getErrorMessage(error)})`)
    }
  }

  return { matriculaId, pendientes }
}

export function useAsignarGrupoReserva() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: asignarGrupoReserva,
    // Aunque fallen pasos posteriores, la reserva ya quedó Matriculada y hay una matrícula nueva.
    onSettled: (data) => {
      if (!data) return
      queryClient.invalidateQueries({ queryKey: reservasCupoKeys.all })
      invalidarMatriculas(queryClient)
    },
  })
}
