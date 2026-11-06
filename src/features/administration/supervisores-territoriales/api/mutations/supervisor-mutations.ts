import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { getErrorMessage } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { resendActivation } from "@/features/establishment/employees/api/mutations/use-resend-activation"
import { reactivarPorCambioDeCorreo } from "@/features/establishment/employees/api/mutations/use-reactivar-por-cambio-de-correo"

import { supervisorKeys } from "@/features/administration/supervisores-territoriales/api/query-keys"
import type {
  Resultado,
  SupervisorTerritorial,
} from "@/features/administration/supervisores-territoriales/api/types/supervisor"

interface SaveSupervisorVariables {
  /** Presente = modificar. */
  id?: number
  tipoDocumento: number
  numeroDocumento: string
  primerNombre: string
  segundoNombre: string | null
  primerApellido: string
  segundoApellido: string | null
  correo: string
  dependencia: string | null
  todosEstablecimientos: boolean
  establecimientos: number[]
  activo: boolean
}

export interface SaveSupervisorResult {
  supervisor: SupervisorTerritorial
  /** Correo al que salió el enlace de 48 h, o null si no hacía falta. */
  enlaceEnviadoA: string | null
  /** Ya tenía cuenta activa: solo se le sumó el rol (Regla 24). */
  cuentaExistente: boolean
  /** Guardó, pero el correo no salió: el motivo, para avisarlo. */
  enlaceFallido: string | null
}

interface CrearRespuesta {
  supervisor: SupervisorTerritorial
  invitar: boolean
  cuentaExistente: boolean
}

interface ActualizarRespuesta {
  supervisor: SupervisorTerritorial
  correoAnterior: string | null
}

// Igual que Superadministradores: el back guarda la persona y la cuenta y el
// correo lo manda después el auth-center. Si ese paso falla, no se revierte.
async function saveSupervisor({ id, ...datos }: SaveSupervisorVariables): Promise<SaveSupervisorResult> {
  const body = {
    TIPO_DOCUMENTO: datos.tipoDocumento,
    NUMERO_DOCUMENTO: datos.numeroDocumento,
    PRIMER_NOMBRE: datos.primerNombre,
    SEGUNDO_NOMBRE: datos.segundoNombre,
    PRIMER_APELLIDO: datos.primerApellido,
    SEGUNDO_APELLIDO: datos.segundoApellido,
    CORREO: datos.correo,
    DEPENDENCIA: datos.dependencia,
    TODOS_ESTABLECIMIENTOS: datos.todosEstablecimientos,
    ESTABLECIMIENTOS: datos.todosEstablecimientos ? [] : datos.establecimientos,
    ACTIVO: datos.activo,
  }

  if (id == null) {
    const { resultado } = await evalCol.postRow<Resultado<CrearRespuesta>>("/supervisores-territoriales", body)
    const correo = resultado.supervisor.correo
    let enlaceFallido: string | null = null
    if (resultado.invitar && !env.ENABLE_API_MOCKING) {
      try {
        await resendActivation(correo)
      } catch (error) {
        enlaceFallido = getErrorMessage(error)
      }
    }
    return {
      supervisor: resultado.supervisor,
      enlaceEnviadoA: resultado.invitar && !enlaceFallido ? correo : null,
      cuentaExistente: resultado.cuentaExistente,
      enlaceFallido,
    }
  }

  const { resultado } = await evalCol.putRow<Resultado<ActualizarRespuesta>>(
    `/supervisores-territoriales/${id}`,
    body,
  )
  const nuevo = resultado.supervisor.correo
  let enlaceFallido: string | null = null
  if (resultado.correoAnterior && !env.ENABLE_API_MOCKING) {
    try {
      // Regla 30: la cuenta vuelve a pendiente y el enlace sale al correo nuevo.
      await reactivarPorCambioDeCorreo({ correoAnterior: resultado.correoAnterior, correoNuevo: nuevo })
    } catch (error) {
      enlaceFallido = getErrorMessage(error)
    }
  }
  return {
    supervisor: resultado.supervisor,
    enlaceEnviadoA: resultado.correoAnterior && !enlaceFallido ? nuevo : null,
    cuentaExistente: false,
    enlaceFallido,
  }
}

export function useSaveSupervisor({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveSupervisor> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveSupervisor,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: supervisorKeys.all })
      onSuccess?.(...args)
    },
  })
}

// Inactivo pierde el acceso y se cierran sus sesiones.
async function setEstadoSupervisor({ id, activo }: { id: number; activo: boolean }) {
  const row = await evalCol.putRow<Resultado<SupervisorTerritorial>>(`/supervisores-territoriales/${id}/estado`, {
    ACTIVO: activo,
  })
  return row.resultado
}

export function useEstadoSupervisor({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof setEstadoSupervisor> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setEstadoSupervisor,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: supervisorKeys.all })
      onSuccess?.(...args)
    },
  })
}
