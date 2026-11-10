import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WarningIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"
import { useCerrarDemasSesiones, useCerrarSesion, useSesionesActivas } from "@/features/cuenta/api/cuenta"

function fecha(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "dd/MM HH:mm", { locale: es })
  } catch {
    return iso
  }
}

/** Mi cuenta › Sesiones activas (§13.5): la fila de esta sesión no tiene acciones. */
export function SesionesActivas() {
  const sesiones = useSesionesActivas()
  const cerrar = useCerrarSesion()
  const cerrarDemas = useCerrarDemasSesiones()
  const error = sesiones.error ?? cerrar.error ?? cerrarDemas.error
  const hayOtras = (sesiones.data ?? []).some((s) => !s.actual)

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Sesiones activas</h2>
          <p className="text-muted-foreground text-sm">
            Las sesiones se cierran tras 30 minutos sin actividad y duran como máximo 12 horas.
          </p>
        </div>
        <Button variant="outline" color="primary" disabled={!hayOtras || cerrarDemas.isPending}
          onClick={() => cerrarDemas.mutate()}>
          {cerrarDemas.isPending && <Spinner data-icon="inline-start" />}
          Cerrar las demás sesiones
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <WarningIcon aria-hidden="true" />
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}
      {sesiones.isPending ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-2 pr-4 font-medium">Sesión</th>
                <th className="py-2 pr-4 font-medium">Inicio</th>
                <th className="py-2 pr-4 font-medium">Último uso</th>
                <th className="py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {(sesiones.data ?? []).map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2">
                      {s.app === "COLOMBIA-EVALUADORA" || !s.app ? "Control Escolar" : s.app}
                      {s.actual && <Badge variant="soft" color="info">Esta sesión</Badge>}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{fecha(s.inicio)}</td>
                  <td className="py-2 pr-4">{s.actual ? "Ahora" : fecha(s.ultimoUso)}</td>
                  <td className="py-2 text-right">
                    {!s.actual && (
                      <Button variant="ghost" color="destructive" size="sm"
                        disabled={cerrar.isPending} onClick={() => cerrar.mutate(s.id)}>
                        Cerrar sesión
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
