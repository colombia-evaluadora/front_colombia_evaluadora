import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { SignOutIcon, SpinnerIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useLogout } from "@/lib/auth"

/**
 * Cerrar sesión fuera del menú de cuenta: en «Sin acceso» de quien no tiene roles y en la pantalla
 * de error, que se pinta sin el layout (QA: el usuario quedaba sin forma de salir). Sin opciones,
 * `useLogout` conserva los datos del equipo en la app instalada y no toca la outbox, así que no
 * hace falta repetir los diálogos de `NavUser`.
 *
 * Al terminar se recarga en el login: la pantalla de error queda atada al match que falló y una
 * navegación del router podía volver a pintarla.
 */
export function CerrarSesionButton({
  variant = "outline",
  color = "neutral",
}: {
  variant?: "fill" | "outline"
  color?: "primary" | "neutral"
}) {
  const logout = useLogout({
    mutationConfig: {
      onSuccess: () => window.location.assign(paths.auth.login.path),
      onError: (error) => toast.error(getErrorMessage(error)),
    },
  })

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      color={color}
      disabled={logout.isPending}
      aria-busy={logout.isPending}
      onClick={() => logout.mutate(undefined)}
    >
      {logout.isPending ? (
        <SpinnerIcon data-icon="inline-start" className="animate-spin" />
      ) : (
        <SignOutIcon data-icon="inline-start" />
      )}
      Cerrar sesión
    </Button>
  )
}
