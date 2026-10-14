import { Link } from "@tanstack/react-router"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { useUser } from "@/lib/auth"
import { useConnectivity } from "@/lib/offline/use-connectivity"

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
  const { data: items, dataUpdatedAt } = useNavItemsQuery()
  const firstUrl = items ? getFirstNavUrl(items) : null
  // Sin red el guard decide con el menú persistido (hasta 30 días): si al
  // docente le asignaron el módulo después, todavía no lo ve.
  const { status } = useConnectivity()
  const { data: user } = useUser()
  const showStaleMenuHint = (status === "offline" || user?.offline === true) && dataUpdatedAt > 0

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-10 text-center text-card-foreground">
      <LockIcon aria-hidden className="size-10 text-muted-foreground" />
      <h1 className="font-heading text-2xl font-semibold">No tienes acceso a este módulo</h1>
      <p className="max-w-md text-muted-foreground">
        Tu rol no tiene permiso para ver esta sección. Si crees que es un error, contacta al
        administrador.
      </p>
      {showStaleMenuHint && (
        <p className="max-w-md text-sm text-muted-foreground">
          Tu menú se actualizó por última vez el{" "}
          {format(dataUpdatedAt, "d 'de' MMMM 'de' yyyy", { locale: es })}. Si te asignaron este
          módulo hace poco, conéctate para actualizarlo.
        </p>
      )}
      {firstUrl && (
        <Button size="sm" render={<Link to={firstUrl} />} nativeButton={false} className="mt-2">
          Ir al inicio
        </Button>
      )}
    </section>
  )
}
