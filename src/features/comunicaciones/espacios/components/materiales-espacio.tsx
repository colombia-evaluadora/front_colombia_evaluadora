import { Button } from "@/components/ui/button"
import { FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { descargarAdjunto } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { useMaterialesQuery } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"

/** Recursos del Bloque 3 por referencia: se administran en el Planeador, no aquí (Sección 5.3). */
export function MaterialesEspacio({ espacioId }: { espacioId: number }) {
  const { notify } = useNotify()
  const { data: materiales = [], isPending, isError } = useMaterialesQuery(espacioId)

  if (isPending) return <Skeleton className="h-24 w-full" />
  if (isError) return <p className="text-sm text-red">No se pudieron cargar los materiales.</p>
  if (materiales.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">La actividad no tiene materiales.</p>
  }
  return (
    <ul className="space-y-2">
      {materiales.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
          <div className="min-w-0">
            <p className="font-medium">{m.descripcion || m.archivoNombre || m.url}</p>
            {m.tipo && <p className="text-xs text-muted-foreground">{m.tipo}</p>}
          </div>
          {m.url ? (
            <a className="text-primary underline" href={m.url} target="_blank" rel="noreferrer noopener">
              Abrir enlace
            </a>
          ) : (
            m.archivoId && (
              <Button
                variant="outline"
                color="neutral"
                size="sm"
                onClick={() =>
                  descargarAdjunto(m.archivoId as number, m.archivoNombre ?? "material").catch((error) =>
                    notify(getErrorMessage(error), { variant: "error" }),
                  )
                }
              >
                <FileDownloadOutlinedIcon data-icon="inline-start" aria-hidden />
                Descargar
              </Button>
            )
          )}
        </li>
      ))}
    </ul>
  )
}
