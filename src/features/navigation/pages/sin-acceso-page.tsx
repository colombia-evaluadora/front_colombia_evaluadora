import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { LockIcon } from "@/components/ui/icons"
import {
  getFirstNavUrl,
  useNavItemsQuery,
} from "@/features/navigation/api/query/use-nav-items-query"

/**
 * Destino del guard de `/app` (ver `appLayoutRoute` en `router.tsx`) cuando la
 * ruta pedida no es de ningún ítem del menú del usuario. Es una ruta propia y
 * no un error del router para que se pinte DENTRO del layout: el sidebar y el
 * encabezado siguen ahí y la persona sigue navegando desde su menú.
 *
 * "Ir al inicio" lleva al primer ítem del menú —la misma pantalla a la que
 * resuelve `/app`—. Si el menú vino vacío no hay inicio al que ir, así que el
 * botón no se muestra (no hay nada que el usuario pueda abrir).
 */
export function SinAccesoPage() {
  const { data: items } = useNavItemsQuery()
  const firstUrl = items ? getFirstNavUrl(items) : null

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-10 text-center text-card-foreground">
      <LockIcon aria-hidden className="size-10 text-muted-foreground" />
      <h1 className="font-heading text-2xl font-semibold">No tienes acceso a este módulo</h1>
      <p className="max-w-md text-muted-foreground">
        Tu rol no tiene permiso para ver esta sección. Si crees que es un error, contacta al
        administrador.
      </p>
      {firstUrl && (
        <Button size="sm" render={<Link to={firstUrl} />} nativeButton={false} className="mt-2">
          Ir al inicio
        </Button>
      )}
    </section>
  )
}
