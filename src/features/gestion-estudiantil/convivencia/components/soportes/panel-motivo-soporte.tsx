import { ArrowsLeftRightIcon, TrashIcon } from "@/components/ui/icons"
import { Badge } from "@/components/ui/badge"
import { FieldLabel } from "@/components/ui/field"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { BotonArchivo } from "@/features/gestion-estudiantil/convivencia/components/soportes/boton-archivo"
import type { PanelSoporte } from "@/features/gestion-estudiantil/convivencia/hooks/use-soportes-accion"
import { formatPeso } from "@/features/gestion-estudiantil/convivencia/utils/soportes"

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

/** Modal para retirar o sustituir un soporte (G.2.CAS.ACC.13): soporte actual, archivo nuevo y motivo de 10 a 500 caracteres. */
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
  const s = panel.soporte
  return (
    <DialogoOperacionShell
      titulo={`${sustituir ? "Sustituir soporte" : s.vinculado ? "Quitar la referencia al soporte" : "Retirar soporte"} — ${s.nombre}`}
      onClose={onCancelar}
      error={null}
      pending={pending}
      confirmar={{
        label: sustituir ? "Sustituir soporte" : "Retirar soporte",
        icon: sustituir ? <ArrowsLeftRightIcon data-icon="inline-start" /> : <TrashIcon data-icon="inline-start" />,
        color: sustituir ? undefined : "destructive",
        onClick: onConfirmar,
      }}
    >
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Soporte actual:</FieldLabel>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{s.nombre}</span>
          <span className="text-muted-foreground">{formatPeso(s.peso)}</span>
          <Badge variant="soft" color={s.vinculado ? "info" : "success"}>
            {s.vinculado ? "Vinculado del caso" : "Cargado"}
          </Badge>
        </div>
      </div>
      {sustituir && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Archivo sustituto*</FieldLabel>
          <div className="flex flex-wrap items-center gap-3">
            <BotonArchivo onFile={onArchivo} disabled={pending}>
              {archivo ? "Cargar otro" : "Elegir archivo"}
            </BotonArchivo>
            <span className="text-sm">{archivo ? `${archivo.name} · ${formatPeso(archivo.size)}` : "Ningún archivo elegido"}</span>
          </div>
          {errorArchivo ? (
            <span className="text-xs text-red">{errorArchivo}</span>
          ) : (
            <span className="text-xs text-muted-foreground">PDF, JPG o PNG, máximo 10 MB</span>
          )}
        </div>
      )}
      <TextoLargo
        id="soporte-motivo"
        label={sustituir ? "Motivo de la sustitución" : "Motivo del retiro"}
        required
        max={500}
        rows={3}
        value={motivo}
        onChange={onMotivo}
        error={errorMotivo}
        descripcion="De 10 a 500 caracteres."
      />
      <p className="text-xs text-muted-foreground">
        {sustituir
          ? "La versión anterior queda en «Versiones anteriores» para consulta autorizada de auditoría; no se borra el archivo."
          : s.vinculado
            ? "Al quitar la referencia no se borra el archivo del caso."
            : "El soporte retirado queda en «Versiones anteriores» para consulta autorizada de auditoría; no se borra el archivo."}
      </p>
    </DialogoOperacionShell>
  )
}
