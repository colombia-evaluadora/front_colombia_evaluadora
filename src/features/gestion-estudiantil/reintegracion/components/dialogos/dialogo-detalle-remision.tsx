import { FichaDatos } from "@/components/ficha-datos"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { formatFecha, formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useRemisionExternaQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-remisiones-query"
import type { RemisionRow } from "@/features/gestion-estudiantil/reintegracion/api/types"

const VACIO = <p className="text-sm text-muted-foreground">Sin registros.</p>

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {children}
    </section>
  )
}

/**
 * Ver detalle de una remisión (G.9.REM.2): sus datos y, del detalle común (V669), las gestiones, los ajustes de
 * plazo, los recordatorios y los vencimientos con su historial.
 */
export function DialogoDetalleRemision({ remision: r, onClose }: { remision: RemisionRow; onClose: () => void }) {
  const q = useRemisionExternaQuery(r.id)
  const d = q.data

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Remisión — {r.entidad_nombre}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          <FichaDatos
            datos={[
              { etiqueta: "Fecha de remisión", valor: formatFecha(r.fecha_remision) },
              { etiqueta: "Fecha esperada de respuesta", valor: formatFecha(r.fecha_esperada) },
              {
                etiqueta: "Estado",
                valor: (
                  <span className="flex flex-wrap items-center gap-1">
                    <Badge variant="soft" color={r.estado === "RESPONDIDA" ? "success" : "info"}>
                      <span>{r.estado_etiqueta}</span>
                    </Badge>
                    {r.vencida && (
                      <Badge variant="soft" color="destructive">
                        <span>Respuesta pendiente — plazo vencido</span>
                      </Badge>
                    )}
                  </span>
                ),
              },
              { etiqueta: "Fecha de respuesta", valor: formatFecha(r.fecha_respuesta) },
              { etiqueta: "Registrada por", valor: r.registrada_por },
              { etiqueta: "Motivo", valor: <span className="whitespace-pre-line">{r.motivo}</span>, ancho: true },
              ...(r.respuesta
                ? [
                    {
                      etiqueta: "Respuesta recibida",
                      valor: <span className="whitespace-pre-line">{r.respuesta}</span>,
                      ancho: true,
                    },
                  ]
                : []),
            ]}
          />
          {q.isPending && <Skeleton className="h-32" />}
          {q.isError && <ErrorNoticeBanner error={q.error} />}
          {d && (
            <>
              <Bloque titulo="Gestiones">
                {d.gestiones.length === 0
                  ? VACIO
                  : d.gestiones.map((g) => (
                      <p key={g.id} className="text-sm">
                        {formatFecha(g.fecha)} · {g.registrada_por}: <span className="whitespace-pre-line">{g.descripcion}</span>
                      </p>
                    ))}
              </Bloque>
              <Bloque titulo="Ajustes de plazo">
                {d.ajustes.length === 0
                  ? VACIO
                  : d.ajustes.map((a, i) => (
                      <p key={`${a.fecha_cambio}-${i}`} className="text-sm">
                        {formatFecha(a.fecha_anterior)} → {formatFecha(a.fecha_nueva)} · {a.registrado_por} el{" "}
                        {formatFechaHora(a.fecha_cambio)}: {a.motivo}
                      </p>
                    ))}
              </Bloque>
              <Bloque titulo="Recordatorios">
                {d.recordatorios.length === 0
                  ? VACIO
                  : d.recordatorios.map((x) => (
                      <p key={x.id} className="text-sm">
                        {formatFecha(x.fecha)} · {x.estado}
                      </p>
                    ))}
              </Bloque>
              <Bloque titulo="Vencimientos">
                {d.vencimientos.length === 0
                  ? VACIO
                  : d.vencimientos.map((v) => (
                      <p key={v.fecha_esperada} className="text-sm">
                        {formatFecha(v.fecha_esperada)}
                        {v.vigente && " · vigente"}
                      </p>
                    ))}
              </Bloque>
            </>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
