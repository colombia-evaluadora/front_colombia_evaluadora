import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileDownloadOutlinedIcon, InfoIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"

import { CamposRangoSiuce } from "@/features/gestion-estudiantil/convivencia/components/siuce/campos-rango-siuce"
import { SelectorColumnasSiuce } from "@/features/gestion-estudiantil/convivencia/components/siuce/selector-columnas-siuce"
import { VistaPreviaSiuce } from "@/features/gestion-estudiantil/convivencia/components/siuce/vista-previa-siuce"
import { useExportarSiuce } from "@/features/gestion-estudiantil/convivencia/hooks/use-exportar-siuce"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Exportar para el SIUCE (G.2.CAS.SIU.1): reporte de apoyo en Excel, una fila por afectado de cada caso Tipo II o III. */
export function DialogExportarSiuce({ open, onOpenChange }: Props) {
  const f = useExportarSiuce(() => onOpenChange(false))
  const vp = f.vistaPrevia
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !f.pending && f.cerrar()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Exportar para el SIUCE</DialogTitle>
          <DialogDescription>Elija el rango, las columnas y revise la previsualización antes de exportar.</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={f.notice} onClose={f.cerrarNotice} variant="error" />
        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              Reporte de apoyo en Excel para el módulo Convivencia Escolar del SIUCE: una fila por afectado de cada caso Tipo II o III, con sus
              presuntos agresores. No se carga solo en el SIUCE. La generación queda registrada en la bitácora, con los filtros y la versión de
              la estructura y de las listas.
            </AlertDescription>
          </Alert>
          <CamposRangoSiuce
            base={f.base}
            onBase={f.setBase}
            desde={f.desde}
            hasta={f.hasta}
            onDesde={f.setDesde}
            onHasta={f.setHasta}
            soloPendientes={f.soloPendientes}
            onSoloPendientes={f.setSoloPendientes}
            errorRango={f.ver.rango}
          />
          <SelectorColumnasSiuce
            grupos={f.grupos}
            seleccionadas={f.columnas}
            onAlternar={f.alternarColumna}
            onTodas={f.seleccionarTodas}
            onLimpiar={f.limpiarColumnas}
            busqueda={f.busqueda}
            onBusqueda={f.setBusqueda}
            error={f.ver.columnas}
          />
          <VistaPreviaSiuce rangoOk={f.rangoOk} isPending={vp.isPending} isError={vp.isError} data={vp.data} />
        </div>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="muted" />}>Cancelar</DialogClose>
          <Button size="sm" type="button" disabled={f.pending} onClick={f.exportar}>
            {f.pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FileDownloadOutlinedIcon data-icon="inline-start" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
