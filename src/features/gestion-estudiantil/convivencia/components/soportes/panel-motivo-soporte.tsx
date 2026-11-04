import { Button } from "@/components/ui/button"
import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"

import { BotonArchivo } from "@/features/gestion-estudiantil/convivencia/components/soportes/boton-archivo"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import type { PanelSoporte } from "@/features/gestion-estudiantil/convivencia/hooks/use-soportes-accion"

interface Props {
  panel: PanelSoporte
  motivo: string
  onMotivo: (v: string) => void
  archivo: File | null
  onArchivo: (f: File) => void
  errorMotivo?: string
  errorArchivo?: string
  pending: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/** Panel en línea para retirar o sustituir un soporte: motivo de 10 a 500 caracteres (y el archivo nuevo al sustituir). */
export function PanelMotivoSoporte({
  panel,
  motivo,
  onMotivo,
  archivo,
  onArchivo,
  errorMotivo,
  errorArchivo,
  pending,
  onConfirmar,
  onCancelar,
}: Props) {
  const sustituir = panel.tipo === "sustituir"
  const vinculado = panel.soporte.vinculado
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3" role="group" aria-label="Motivo">
      <p className="text-sm font-medium">
        {sustituir ? "Sustituir" : vinculado ? "Quitar la referencia a" : "Retirar"} «{panel.soporte.nombre}»
      </p>
      {sustituir && (
        <div className="flex flex-wrap items-center gap-3">
          <BotonArchivo onFile={onArchivo} disabled={pending}>
            Elegir archivo
          </BotonArchivo>
          <span className="text-sm text-muted-foreground">{archivo?.name ?? "Ningún archivo elegido"}</span>
          {errorArchivo && <span className="text-xs text-red">{errorArchivo}</span>}
        </div>
      )}
      <TextoLargo id="soporte-motivo" label="Motivo" required max={500} rows={3} value={motivo} onChange={onMotivo} error={errorMotivo} />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" color="muted" disabled={pending} onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" size="sm" color={sustituir ? undefined : "destructive"} disabled={pending} onClick={onConfirmar}>
          {pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : !sustituir && <TrashIcon data-icon="inline-start" />}
          {sustituir ? "Sustituir soporte" : "Retirar soporte"}
        </Button>
      </div>
    </div>
  )
}
