import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { getErrorMessage } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { resendActivation } from "@/features/establishment/employees/api/mutations/use-resend-activation"
import { reactivarPorCambioDeCorreo } from "@/features/establishment/employees/api/mutations/use-reactivar-por-cambio-de-correo"

import { superadministradorKeys } from "@/features/administration/superadministradores/api/query-keys"
import type {
  Resultado,
  Superadministrador,
} from "@/features/administration/superadministradores/api/types/superadministrador"

interface SaveSuperadministradorVariables {
  /** Presente = modificar. */
  id?: number
  tipoDocumento: number
  numeroDocumento: string
  primerNombre: string
  segundoNombre: string | null
  primerApellido: string
  segundoApellido: string | null
  correo: string
}

export interface SaveSuperadministradorResult {
  superadministrador: Superadministrador
  /**
   * Correo al que salió el enlace para establecer la contraseña, o null si no
   * hacía falta (persona con cuenta activa, o modificación sin cambio de correo).
   */
  enlaceEnviadoA: string | null
  /** Ya tenía cuenta activa en la plataforma: solo se le sumó el rol. */
  cuentaExistente: boolean
  /** Guardó, pero el correo no salió: el motivo, para avisarlo. */
  enlaceFallido: string | null
}

interface CrearRespuesta {
  superadministrador: Superadministrador
  invitar: boolean
  cuentaExistente: boolean
}

interface ActualizarRespuesta {
  superadministrador: Superadministrador
  correoAnterior: string | null
}

// El back guarda la persona y la cuenta (pendiente de activación); el correo lo
// manda después el auth-center con el mismo mecanismo que el alta de
// Funcionarios. Si ese paso falla el guardado no se revierte: se avisa.
async function saveSuperadministrador({
  id,
  ...datos
}: SaveSuperadministradorVariables): Promise<SaveSuperadministradorResult> {
  const body = {
    TIPO_DOCUMENTO: datos.tipoDocumento,
    NUMERO_DOCUMENTO: datos.numeroDocumento,
    PRIMER_NOMBRE: datos.primerNombre,
    SEGUNDO_NOMBRE: datos.segundoNombre,
    PRIMER_APELLIDO: datos.primerApellido,
    SEGUNDO_APELLIDO: datos.segundoApellido,
    CORREO: datos.correo,
  }

  if (id == null) {
    const { resultado } = await evalCol.postRow<Resultado<CrearRespuesta>>(
      "/superadministradores",
      body,
    )
    const correo = resultado.superadministrador.correo
    let enlaceFallido: string | null = null
    // Sin handler MSW para el auth-center: con mocks se da por enviado.
    if (resultado.invitar && !env.ENABLE_API_MOCKING) {
      try {
        await resendActivation(correo)
      } catch (error) {
        enlaceFallido = getErrorMessage(error)
      }
    }
    return {
      superadministrador: resultado.superadministrador,
      enlaceEnviadoA: resultado.invitar && !enlaceFallido ? correo : null,
      cuentaExistente: resultado.cuentaExistente,
      enlaceFallido,
    }
  }

  const { resultado } = await evalCol.putRow<Resultado<ActualizarRespuesta>>(
    `/superadministradores/${id}`,
    body,
  )
  const nuevo = resultado.superadministrador.correo
  let enlaceFallido: string | null = null
  if (resultado.correoAnterior) {
    try {
      // La cuenta vuelve a pendiente y el enlace sale al correo nuevo.
      await reactivarPorCambioDeCorreo({
        correoAnterior: resultado.correoAnterior,
        correoNuevo: nuevo,
      })
    } catch (error) {
      enlaceFallido = getErrorMessage(error)
    }
  }
  return {
    superadministrador: resultado.superadministrador,
    enlaceEnviadoA: resultado.correoAnterior && !enlaceFallido ? nuevo : null,
    cuentaExistente: false,
    enlaceFallido,
  }
}

export function useSaveSuperadministrador({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveSuperadministrador> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveSuperadministrador,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: superadministradorKeys.lista })
      onSuccess?.(...args)
    },
  })
}
