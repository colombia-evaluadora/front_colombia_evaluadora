import { useState } from "react"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import {
  errorProgramacion,
  instanteABogota,
  localAPared,
  paredALocal,
  sugerenciaProgramacion,
} from "@/features/comunicaciones/chat/lib/programacion"

const MAX_TEXTO = 4000

/**
 * "Programar envío" (Borradores y enviados, diseño 3733:38331): fecha y hora en hora de Colombia.
 * Con `textoInicial` (editar un programado) también se corrige el texto. Quien lo abre lo monta
 * con `key` para que los valores iniciales se lean una vez.
 */
export function ProgramarMensajeDialog({
  open,
  onOpenChange,
  destino,
  textoInicial,
  programadoPara,
  guardando,
  error,
  onConfirmar,
  titulo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  destino: string
  // Solo al editar un programado: el texto se puede cambiar.
  textoInicial?: string
  // ISO de la hora ya programada (al editar).
  programadoPara?: string | null
  guardando: boolean
  error?: string | null
  onConfirmar: (v: { texto?: string; programadoPara: string }) => void
  // Título propio (el atajo "/programar" con el compositor vacío pide aquí el texto).
  titulo?: string
}) {
  const [cuando, setCuando] = useState(() =>
    programadoPara ? instanteABogota(programadoPara) : sugerenciaProgramacion(),
  )
  const [texto, setTexto] = useState(textoInicial ?? "")
  const [intentado, setIntentado] = useState(false)
  const editaTexto = textoInicial !== undefined
  const errorFecha = errorProgramacion(cuando)
  const errorTexto = editaTexto && !texto.trim() ? "Escribe el mensaje." : null
  const hoy = localAPared(instanteABogota(Date.now()))

  const confirmar = () => {
    setIntentado(true)
    if (errorFecha || errorTexto) return
    onConfirmar({ programadoPara: cuando, ...(editaTexto ? { texto: texto.trim() } : {}) })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !guardando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo ?? (editaTexto ? "Editar mensaje programado" : "Programar envío")}</DialogTitle>
          <DialogDescription>
            El mensaje se enviará a {destino} en la fecha y hora que elijas (hora de Colombia).
          </DialogDescription>
        </DialogHeader>

        <form
          id="programar-mensaje"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            confirmar()
          }}
          className="space-y-4"
        >
          {editaTexto && (
            <Field data-invalid={(intentado && !!errorTexto) || undefined}>
              <FieldLabel htmlFor="programado-texto">Mensaje</FieldLabel>
              <Textarea
                id="programado-texto"
                value={texto}
                maxLength={MAX_TEXTO}
                onChange={(e) => setTexto(e.target.value)}
                className="max-h-48 min-h-24"
              />
              {intentado && errorTexto && <FieldError>{errorTexto}</FieldError>}
            </Field>
          )}
          <Field data-invalid={(intentado && !!errorFecha) || undefined}>
            <FieldLabel htmlFor="programado-cuando">Fecha y hora de envío</FieldLabel>
            <DatePicker
              id="programado-cuando"
              mode="datetime"
              value={localAPared(cuando)}
              minDate={hoy}
              aria-invalid={(intentado && !!errorFecha) || undefined}
              onChange={(d) => setCuando(d ? paredALocal(d) : "")}
            />
            {intentado && errorFecha ? (
              <FieldError>{errorFecha}</FieldError>
            ) : (
              <p className="text-xs text-muted-foreground">Hora de Colombia.</p>
            )}
          </Field>
          {error && (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            color="neutral"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button type="submit" form="programar-mensaje" disabled={guardando} aria-busy={guardando}>
            {editaTexto ? "Guardar" : "Programar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
