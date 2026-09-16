import * as React from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { CheckIcon, InfoIcon } from "@/components/ui/icons"

import type { FilaInforme } from "@/features/academic-management/reports/api/types"

const MAX_CARACTERES = 5000

function iniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

interface ObservacionSheetProps {
  fila: FilaInforme | null
  guardando?: boolean
  onOpenChange: (open: boolean) => void
  onGuardar: (fila: FilaInforme, texto: string) => void
}

export function ObservacionSheet({ fila, guardando, onOpenChange, onGuardar }: ObservacionSheetProps) {
  const [texto, setTexto] = React.useState("")

  React.useEffect(() => {
    if (fila) setTexto(fila.observacion ?? "")
  }, [fila])

  return (
    <Sheet open={fila != null} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">Observación individual</SheetTitle>
          {fila && (
            <>
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarFallback>{iniciales(fila.nombreCompleto)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{fila.nombreCompleto}</p>
                  {fila.documento && (
                    <p className="text-xs text-muted-foreground">{fila.documento}</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{fila.periodoNombre}</p>
            </>
          )}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="observacion-individual" className="text-xs font-semibold uppercase">
              Observación
            </label>
            <Textarea
              id="observacion-individual"
              value={texto}
              maxLength={MAX_CARACTERES}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe la observación de este estudiante para este período…"
              className="min-h-40 resize-y rounded-md border border-input px-3 py-2"
            />
            <span className="self-end text-xs text-muted-foreground">
              {texto.length}/{MAX_CARACTERES}
            </span>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            Guardar con el texto vacío elimina la observación de este período.
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button
            type="button"
            color="primary"
            disabled={guardando}
            onClick={() => fila && onGuardar(fila, texto)}
          >
            <CheckIcon data-icon="inline-start" />
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
