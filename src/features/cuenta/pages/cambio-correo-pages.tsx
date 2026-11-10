import { Link } from "@tanstack/react-router"

import { PublicBand, PublicResult } from "@/components/public/public-page"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, EnvelopeIcon, ShieldLockIcon, WarningIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useConfirmarCorreo, useNoFuiYo } from "@/features/cuenta/api/cambio-correo"
import { confirmarCorreoRoute, noFuiYoRoute } from "@/router"

/**
 * Los dos enlaces de los correos de cambio de correo (U.6.COR). Piden un clic
 * en vez de confirmar al abrir: los antivirus de correo abren los enlaces
 * solos y consumirían el token de un solo uso.
 */

function IrAlLogin() {
  return (
    <Button color="primary" nativeButton={false} render={<Link to={paths.auth.login.getHref()} />}>
      Iniciar sesión
    </Button>
  )
}

function EnlaceNoValido({ children }: { children: React.ReactNode }) {
  return (
    <PublicResult icon={WarningIcon} tone="error" title="Este enlace ya no es válido" actions={<IrAlLogin />}>
      {children}
    </PublicResult>
  )
}

/** U.6.COR.1 / U.6.COR.1a Confirmar el correo nuevo. */
export function ConfirmarCorreoPage() {
  const { token } = confirmarCorreoRoute.useSearch()
  const confirmar = useConfirmarCorreo()

  return (
    <PublicBand
      icon={EnvelopeIcon}
      title="Confirmar correo nuevo"
      subtitle="Enlace de un solo uso. Vale 24 horas. Avisamos al correo anterior."
      breadcrumb={["Cuenta", "Confirmar correo"]}
      width="md"
    >
      {!token || confirmar.isError ? (
        <EnlaceNoValido>
          {confirmar.isError && getErrorMessage(confirmar.error) !== "Este enlace ya no es válido."
            ? getErrorMessage(confirmar.error)
            : "Sigue vigente su correo anterior. Pida el cambio de nuevo desde Mi cuenta."}
        </EnlaceNoValido>
      ) : confirmar.isSuccess ? (
        <PublicResult icon={CheckCircleIcon} tone="success" title="Correo confirmado" actions={<IrAlLogin />}>
          El correo de su cuenta ahora es {confirmar.data.maskedEmail}. Avisamos al correo anterior.
        </PublicResult>
      ) : (
        <PublicResult
          icon={EnvelopeIcon}
          title="¿Confirma el cambio de correo?"
          actions={
            <Button color="primary" disabled={confirmar.isPending} onClick={() => confirmar.mutate(token)}>
              {confirmar.isPending && <Spinner data-icon="inline-start" />}
              Confirmar correo
            </Button>
          }
        >
          Al confirmar, su cuenta usará este correo para ingresar y para los avisos.
        </PublicResult>
      )}
    </PublicBand>
  )
}

/** U.6.COR.2 / U.6.COR.2a No fui yo — devolver el correo anterior. */
export function NoFuiYoPage() {
  const { token } = noFuiYoRoute.useSearch()
  const revertir = useNoFuiYo()

  return (
    <PublicBand
      icon={ShieldLockIcon}
      title="No fui yo"
      subtitle="Devuelva el correo anterior a su cuenta. Enlace de un solo uso, vale 7 días. Cierra todas sus sesiones."
      breadcrumb={["Cuenta", "No fui yo"]}
      width="md"
    >
      {!token || revertir.isError ? (
        <EnlaceNoValido>El enlace No fui yo vale 7 días. Avise a su establecimiento.</EnlaceNoValido>
      ) : revertir.isSuccess ? (
        <PublicResult icon={CheckCircleIcon} tone="success" title="Se devolvió su correo anterior" actions={<IrAlLogin />}>
          Se cerraron todas las sesiones de su cuenta. El cambio quedó registrado. Le recomendamos cambiar
          su contraseña con ¿Olvidó su contraseña?
        </PublicResult>
      ) : (
        <PublicResult
          icon={ShieldLockIcon}
          title="¿Devolver su correo anterior?"
          actions={
            <Button color="destructive" disabled={revertir.isPending} onClick={() => revertir.mutate(token)}>
              {revertir.isPending && <Spinner data-icon="inline-start" />}
              No fui yo: devolver mi correo
            </Button>
          }
        >
          Si usted no cambió el correo de su cuenta, devolvemos el anterior y cerramos todas las sesiones abiertas.
        </PublicResult>
      )}
    </PublicBand>
  )
}
