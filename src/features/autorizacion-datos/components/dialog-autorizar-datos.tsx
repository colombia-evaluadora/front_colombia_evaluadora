import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShieldCheckIcon, WarningIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"

import type { AutorizacionEstablecimiento } from "@/features/autorizacion-datos/api/types"
import { pendientesDe } from "@/features/autorizacion-datos/lib/autorizaciones"

interface DialogAutorizarDatosProps {
  /** null = cerrado. Se muestran solo los que todavía no autorizan. */
  establecimientos: AutorizacionEstablecimiento[] | null
  onOpenChange: (open: boolean) => void
  /** Hace la llamada; si tira, el error se muestra en el modal y este sigue abierto. */
  onAutorizar: (establecimientoIds: number[]) => Promise<void>
  /** Texto bajo el título (para quién es la autorización). */
  descripcion?: string
}

/**
 * U.3.EST.1c "Autorizar el tratamiento de datos": una casilla por establecimiento
 * pendiente (todas marcadas al abrir), "Ahora no" y "Autorizar". Sin X en la esquina:
 * el pie ya ofrece salir. Lo usan Consultar inscripción (público) y Mi cuenta.
 */
export function DialogAutorizarDatos({ establecimientos, onOpenChange, ...rest }: DialogAutorizarDatosProps) {
  return (
    <Dialog open={establecimientos != null} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        {establecimientos && (
          // Se monta con cada apertura: las casillas arrancan marcadas.
          <Contenido establecimientos={pendientesDe(establecimientos)} onOpenChange={onOpenChange} {...rest} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Contenido({
  establecimientos,
  onOpenChange,
  onAutorizar,
  descripcion,
}: Omit<DialogAutorizarDatosProps, "establecimientos"> & { establecimientos: AutorizacionEstablecimiento[] }) {
  const [elegidos, setElegidos] = useState<number[]>(() => establecimientos.map((e) => e.establecimientoId))
  const [intentado, setIntentado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const alternar = (id: number, marcado: boolean) =>
    setElegidos(marcado ? [...elegidos, id] : elegidos.filter((x) => x !== id))

  async function autorizar() {
    setIntentado(true)
    if (elegidos.length === 0) return
    setGuardando(true)
    setError(null)
    try {
      await onAutorizar(elegidos)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="text-primary size-5 shrink-0" aria-hidden />
          Autorizar el tratamiento de datos
        </DialogTitle>
        <DialogDescription>
          {descripcion ??
            "Marque los establecimientos que pueden consultar los datos del aspirante y del acudiente (Ley 1581 de 2012)."}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <WarningIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <fieldset className="flex flex-col gap-2" disabled={guardando}>
        <legend className="sr-only">Establecimientos</legend>
        {establecimientos.map((e) => (
          <label key={e.establecimientoId} className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={elegidos.includes(e.establecimientoId)}
              disabled={guardando}
              onCheckedChange={(c) => alternar(e.establecimientoId, Boolean(c))}
              aria-invalid={intentado && elegidos.length === 0}
            />
            {e.establecimiento}
          </label>
        ))}
        {intentado && elegidos.length === 0 && (
          <p className="text-red text-xs">Marque al menos un establecimiento.</p>
        )}
      </fieldset>

      <DialogFooter>
        <Button type="button" variant="outline" color="neutral" disabled={guardando} onClick={() => onOpenChange(false)}>
          Ahora no
        </Button>
        <Button type="button" disabled={guardando} onClick={() => void autorizar()}>
          {guardando ? <Spinner data-icon="inline-start" /> : <ShieldCheckIcon data-icon="inline-start" />}
          Autorizar
        </Button>
      </DialogFooter>
    </>
  )
}
