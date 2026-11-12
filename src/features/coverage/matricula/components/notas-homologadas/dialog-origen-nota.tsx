import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SpinnerIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"

import { useOrigenNotaQuery } from "@/features/coverage/matricula/api/query/use-notas-homologadas"
import type { NotaHomologada } from "@/features/coverage/matricula/api/types/notas-homologadas"
import { formatFecha, formatNota } from "@/features/coverage/matricula/components/notas-homologadas/nota-format"

interface Props {
  matriculaId: string
  nota: NotaHomologada | null
  onOpenChange: (open: boolean) => void
}

/**
 * Ver origen de la nota (C.1.DET): de qué grupo y responsable salió la definitiva
 * homologada y las actividades que la formaron. Solo lectura.
 */
export function DialogOrigenNota({ matriculaId, nota, onOpenChange }: Props) {
  const { data, isPending, isError, error } = useOrigenNotaQuery(matriculaId, nota?.id ?? null)

  return (
    <Dialog open={nota != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Origen de la nota — {nota?.asignatura} · {nota?.periodo}
          </DialogTitle>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" />
            Cargando…
          </div>
        )}
        {isError && <p className="p-8 text-center text-sm text-red">{getErrorMessage(error)}</p>}

        {data && (
          <>
            <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] overflow-hidden rounded-md border border-border text-sm">
              {[
                ["Grupo de origen", data.grupoOrigen],
                ["Responsable de enseñanza", data.responsableEnsenanza],
                ["Snapshot", data.snapshot],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="border-b border-border bg-muted/40 px-4 py-2.5 text-muted-foreground">{label}</dt>
                  <dd className="border-b border-border px-4 py-2.5">{value}</dd>
                </div>
              ))}
              <dt className="bg-muted/40 px-4 py-2.5 text-muted-foreground">Nota homologada</dt>
              <dd className="px-4 py-2.5 font-semibold">
                {formatNota(data.nota)} · {data.valoracion}
                {data.porcentajeCursado != null && ` · parcial, ${data.porcentajeCursado} % cursado`}
              </dd>
            </dl>

            {data.actividades.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                El grupo de origen no registró actividades para este período.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="px-2 py-2.5 font-medium">Actividad</th>
                    <th className="w-28 px-2 py-2.5 font-medium">Fecha</th>
                    <th className="w-20 px-2 py-2.5 text-right font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {data.actividades.map((a) => (
                    <tr key={`${a.nombre}-${a.fecha}`} className="border-b border-border">
                      <td className="px-2 py-3">{a.nombre}</td>
                      <td className="px-2 py-3 tabular-nums">{formatFecha(a.fecha)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{formatNota(a.nota)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
