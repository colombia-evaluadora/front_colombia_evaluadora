import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { getErrorMessage } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { resendActivation } from "@/features/establishment/employees/api/mutations/use-resend-activation"
import { reactivarPorCambioDeCorreo } from "@/features/establishment/employees/api/mutations/use-reactivar-por-cambio-de-correo"

import { administradorKeys } from "@/features/administration/administradores-territoriales/api/query-keys"
import type {
  Resultado,
  AdministradorTerritorial,
} from "@/features/administration/administradores-territoriales/api/types/administrador"

interface SaveAdministradorVariables {
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
  activo: boolean
}

export interface SaveAdministradorResult {
  administrador: AdministradorTerritorial
  /** Correo al que salió el enlace de 48 h, o null si no hacía falta. */
  enlaceEnviadoA: string | null
  /** Ya tenía cuenta activa: solo se le sumó el rol (Regla 24). */
  cuentaExistente: boolean
  /** Guardó, pero el correo no salió: el motivo, para avisarlo. */
  enlaceFallido: string | null
}

interface CrearRespuesta {
  administrador: AdministradorTerritorial
  invitar: boolean
  cuentaExistente: boolean
}

interface ActualizarRespuesta {
  administrador: AdministradorTerritorial
  correoAnterior: string | null
}

// Igual que Superadministradores: el back guarda la persona y la cuenta y el
// correo lo manda después el auth-center. Si ese paso falla, no se revierte.
async function saveAdministrador({ id, ...datos }: SaveAdministradorVariables): Promise<SaveAdministradorResult> {
  const body = {
    TIPO_DOCUMENTO: datos.tipoDocumento,
    NUMERO_DOCUMENTO: datos.numeroDocumento,
    PRIMER_NOMBRE: datos.primerNombre,
    SEGUNDO_NOMBRE: datos.segundoNombre,
    PRIMER_APELLIDO: datos.primerApellido,
    SEGUNDO_APELLIDO: datos.segundoApellido,
    CORREO: datos.correo,
    DEPENDENCIA: datos.dependencia,
    ACTIVO: datos.activo,
  }

  if (id == null) {
    const { resultado } = await evalCol.postRow<Resultado<CrearRespuesta>>("/administradores-territoriales", body)
    const correo = resultado.administrador.correo
    let enlaceFallido: string | null = null
    if (resultado.invitar && !env.ENABLE_API_MOCKING) {
      try {
        await resendActivation(correo)
      } catch (error) {
        enlaceFallido = getErrorMessage(error)
      }
    }
    return {
      administrador: resultado.administrador,
      enlaceEnviadoA: resultado.invitar && !enlaceFallido ? correo : null,
      cuentaExistente: resultado.cuentaExistente,
      enlaceFallido,
    }
  }

  const { resultado } = await evalCol.putRow<Resultado<ActualizarRespuesta>>(
    `/administradores-territoriales/${id}`,
    body,
  )
  const nuevo = resultado.administrador.correo
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
    administrador: resultado.administrador,
    enlaceEnviadoA: resultado.correoAnterior && !enlaceFallido ? nuevo : null,
    cuentaExistente: false,
    enlaceFallido,
  }
}

export function useSaveAdministrador({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveAdministrador> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveAdministrador,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: administradorKeys.all })
      onSuccess?.(...args)
    },
  })
}

// Inactivo pierde el acceso y se cierran sus sesiones.
async function setEstadoAdministrador({ id, activo }: { id: number; activo: boolean }) {
  const row = await evalCol.putRow<Resultado<AdministradorTerritorial>>(`/administradores-territoriales/${id}/estado`, {
    ACTIVO: activo,
  })
  return row.resultado
}

export function useEstadoAdministrador({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof setEstadoAdministrador> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setEstadoAdministrador,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: administradorKeys.all })
      onSuccess?.(...args)
    },
  })
}
