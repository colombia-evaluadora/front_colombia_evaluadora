import { Link } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"
import { useEspaciosQuery } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"
import { BadgeEstadoEspacio, fechaDia } from "@/features/comunicaciones/espacios/components/ui-espacio"

/** Comunicaciones › Espacios académicos: los del usuario y, para la supervisión, los de su alcance. */
export function EspaciosPage() {
  const { data: espacios = [], isPending, isError, refetch } = useEspaciosQuery()

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Espacios académicos</h1>
      {isPending && <Skeleton className="h-32 w-full" />}
      {isError && (
        <p className="text-sm text-red">
          No se pudieron cargar los espacios.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            Reintentar
          </button>
        </p>
      )}
      {!isPending && !isError && espacios.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No tiene espacios académicos. El docente los activa al planear la actividad.
        </p>
      )}
      <ul className="space-y-2">
        {espacios.map((e) => (
          <li key={e.id}>
            <Link
              to={paths.app.comunicacionesEspacio.getHref(String(e.id))}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <span className="min-w-0">
                <span className="block font-medium">{e.actividad}</span>
                <span className="block text-sm text-muted-foreground">
                  {[e.asignatura, e.grupo, e.docente].filter(Boolean).join(" · ")} · {fechaDia(e.fechaInicio)} a{" "}
                  {fechaDia(e.fechaCierre)}
                </span>
              </span>
              <BadgeEstadoEspacio estado={e.estado} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
