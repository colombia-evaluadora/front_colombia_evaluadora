import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LinkIcon, PaperclipIcon, SpinnerIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { NoticeBanner } from "@/components/notice/notice-banner"

import { BotonArchivo } from "@/features/gestion-estudiantil/convivencia/components/soportes/boton-archivo"
import { FilaSoporte } from "@/features/gestion-estudiantil/convivencia/components/soportes/fila-soporte"
import { PanelMotivoSoporte } from "@/features/gestion-estudiantil/convivencia/components/soportes/panel-motivo-soporte"
import { VersionesAnteriores } from "@/features/gestion-estudiantil/convivencia/components/soportes/versiones-anteriores"
import { useSoportesAccion } from "@/features/gestion-estudiantil/convivencia/hooks/use-soportes-accion"
import { MAX_SOPORTES } from "@/features/gestion-estudiantil/convivencia/utils/soportes"

interface Props {
  accion: { id: number; nombre: string; fecha: string }
  caso: { numero: string | number; cerrado: boolean; tieneSoporte: boolean }
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Soportes de una acción (G.2.CAS.ACC.11): hasta 5 vigentes; con el caso cerrado, solo lectura. */
export function DialogSoportesAccion({ accion, caso, open, onOpenChange }: Props) {
  const f = useSoportesAccion({ accionId: accion.id, cerrado: caso.cerrado, open })
  const ocupado = f.agregando || f.pendingPanel
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !ocupado && (f.cerrar(), onOpenChange(false))}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Soportes de la acción — {accion.nombre} · {accion.fecha} (Caso {caso.numero})
          </DialogTitle>
          <DialogDescription render={<div />}>
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="soft" color={f.vigentes.length >= MAX_SOPORTES ? "warning" : "info"}>
                <span>
                  {f.vigentes.length} de {MAX_SOPORTES} soportes
                </span>
              </Badge>
              {caso.cerrado && <span>El caso está cerrado: los soportes solo se pueden consultar.</span>}
            </span>
          </DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={f.notice} onClose={f.cerrarNotice} variant="error" />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!f.puedeAgregar || !caso.tieneSoporte || ocupado} onClick={f.vincularCaso}>
            {f.agregando ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <LinkIcon data-icon="inline-start" />}
            Vincular soporte del caso
          </Button>
          <BotonArchivo onFile={f.cargarArchivo} disabled={!f.puedeAgregar || ocupado}>
            <PaperclipIcon data-icon="inline-start" />
            Cargar archivo
          </BotonArchivo>
        </div>
        <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-1">
          {f.consulta.isPending ? (
            <Skeleton className="h-20" />
          ) : f.vigentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">La acción aún no tiene soportes.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {f.vigentes.map((s) => (
                <FilaSoporte
                  key={s.id}
                  soporte={s}
                  soloLectura={caso.cerrado || ocupado}
                  onVer={() => f.ver(s)}
                  onSustituir={() => f.abrirPanel({ tipo: "sustituir", soporte: s })}
                  onRetirar={() => f.abrirPanel({ tipo: "retirar", soporte: s })}
                />
              ))}
            </ul>
          )}
          {f.panel && !caso.cerrado && (
            <PanelMotivoSoporte
              panel={f.panel}
              motivo={f.motivo}
              onMotivo={f.setMotivo}
              archivo={f.archivo}
              onArchivo={f.elegirSustituto}
              errorMotivo={f.errorMotivo}
              errorArchivo={f.errorSustituto}
              pending={f.pendingPanel}
              onConfirmar={f.confirmarPanel}
              onCancelar={f.cerrarPanel}
            />
          )}
          <VersionesAnteriores soportes={f.anteriores} />
        </div>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cerrar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
