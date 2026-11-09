import type { ReactNode } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PrinterIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { fetchArchivoViewUrl } from "@/lib/files"

import { formatFechaHora } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"

const ID_DOCUMENTO = "documento-imprimible"

/**
 * El navegador imprime la página completa: al imprimir se oculta todo salvo la hoja del documento, que pasa a
 * ocupar el papel. Así «Imprimir» (o «Guardar como PDF») sale solo con el documento y sin tocar el layout.
 */
const ESTILO_IMPRESION = `
@media print {
  body * { visibility: hidden !important; }
  #${ID_DOCUMENTO}, #${ID_DOCUMENTO} * { visibility: visible !important; }
  #${ID_DOCUMENTO} { position: absolute; left: 0; top: 0; width: 100%; border: 0; box-shadow: none; }
}`

interface Props {
  titulo: string
  isPending: boolean
  error: unknown
  onClose: () => void
  children: ReactNode
}

/**
 * Documento imprimible en modal (G.3.CIT.DOC.1 y G.3.CMP.DOC.1). El backend entrega solo DATOS (sin plantilla de
 * reporte): la hoja se arma aquí y se imprime con `window.print()`, que también permite guardarla como PDF.
 */
export function DialogoDocumento({ titulo, isPending, error, onClose, children }: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <style>{ESTILO_IMPRESION}</style>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Vista previa del documento. Use Imprimir para obtener la copia o guardarla como PDF.</DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner error={error} />
        <div className="max-h-[60vh] overflow-y-auto">
          {isPending ? <Skeleton className="h-80" /> : error ? null : children}
        </div>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cerrar</DialogClose>
          <Button size="sm" type="button" disabled={isPending || Boolean(error)} onClick={() => window.print()}>
            <PrinterIcon data-icon="inline-start" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Hoja del documento: encabezado con el establecimiento, título, cuerpo y fecha de generación. */
export interface EncabezadoEstablecimiento {
  establecimiento: string
  establecimiento_dane: string
  establecimiento_nit: string
  municipio: string
  departamento: string
  escudo_archivo: number | null
}

/** Escudo del establecimiento vía token de vista de file-service; sin escudo no se muestra nada. */
function Escudo({ archivo }: { archivo: number | null }) {
  const { data } = useQuery({
    queryKey: ["citaciones-compromisos", "escudo", archivo],
    queryFn: () => fetchArchivoViewUrl(archivo as number),
    enabled: archivo != null,
    staleTime: 5 * 60_000,
  })
  return data?.url ? <img src={data.url} alt="Escudo del establecimiento" className="size-16 object-contain" /> : null
}

export function HojaDocumento({
  encabezado: e,
  titulo,
  subtitulo,
  children,
}: {
  encabezado: EncabezadoEstablecimiento
  titulo: string
  subtitulo: string
  children: ReactNode
}) {
  return (
    <article id={ID_DOCUMENTO} className="flex flex-col gap-4 rounded-md border border-border bg-background p-6 text-sm">
      <header className="flex items-start justify-between gap-4 border-t-4 border-primary pt-4">
        <div className="flex items-center gap-4">
          <Escudo archivo={e.escudo_archivo} />
          <div>
            <p className="text-lg font-semibold text-primary">Institución Educativa {e.establecimiento}</p>
            <p className="text-xs text-muted-foreground">
              DANE {e.establecimiento_dane} · NIT {e.establecimiento_nit}
            </p>
            <p className="text-xs text-muted-foreground">
              {e.municipio}, {e.departamento}
            </p>
          </div>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          Generado el
          <br />
          <span className="font-medium text-foreground">{formatFechaHora(new Date().toISOString())}</span>
        </p>
      </header>
      <div className="text-center">
        <h3 className="text-base font-semibold tracking-wide text-primary uppercase">{titulo}</h3>
        <p className="text-xs text-muted-foreground">{subtitulo}</p>
      </div>
      {children}
    </article>
  )
}

/** Cuadrícula de datos: etiqueta en negrita y valor, de a dos pares por fila. */
export function DatosDocumento({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] border border-border sm:grid-cols-[auto_1fr_auto_1fr]">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="contents">
          <dt className="border-b border-border bg-muted px-3 py-1.5 font-semibold">{etiqueta}</dt>
          <dd className="border-b border-border px-3 py-1.5">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

export function SeccionDocumento({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">{titulo}</h4>
      {children}
    </section>
  )
}

/** Línea de firma con nombre y rol debajo. */
export function Firma({ nombre, rol }: { nombre: string; rol: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-foreground pt-1">
      <span className="font-medium">{nombre}</span>
      <span className="text-xs text-muted-foreground">{rol}</span>
    </div>
  )
}
