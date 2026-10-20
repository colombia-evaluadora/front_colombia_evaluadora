import { cn } from "@/lib/utils"
import { useOfflineStall } from "@/lib/offline/use-offline-stall"

/**
 * Sin conexión, un skeleton que lleva 1,5 s visible no va a resolverse: lo que
 * falta no está guardado en el equipo (`useOfflineStall`). Desaparece en vez
 * de latir para siempre; el aviso lo dan el componente que lo contiene
 * (`DataTable`, `LoadingLabel`) o el banner global ("Parte de esta pantalla no
 * está guardada en este equipo"). `persistOffline` lo conserva para cargas
 * locales que sí terminan sin red.
 */
function Skeleton({
  className,
  persistOffline = false,
  ...props
}: React.ComponentProps<"div"> & { persistOffline?: boolean }) {
  const stalled = useOfflineStall(!persistOffline)
  if (stalled) return null
  return <div data-slot="skeleton" className={cn("animate-pulse bg-muted", className)} {...props} />
}

export { Skeleton }
