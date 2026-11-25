import { useState } from "react"

import { LinkIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { formatPeso, MAX_SOPORTES } from "@/features/gestion-estudiantil/convivencia/utils/soportes"

/** Soporte general del caso (`soporte` del detalle). */
export interface SoporteGeneral {
  nombre: string
  tipo: string | null
  peso: number | null
}

interface Props {
  accion: { nombre: string; fecha: string }
  numero: string | number
  soporte: SoporteGeneral | null
  /** Soportes vigentes de la acción antes de vincular. */
  total: number
  pending: boolean
  onConfirmar: () => void
  onClose: () => void
}

const SOPORTE_DEL_CASO = "caso"

/** «informe.pdf · PDF · 96 KB»: nombre, tipo y peso del soporte general; sin datos, el rótulo genérico. */
const etiquetaSoporte = (s: SoporteGeneral | null) =>
  s ? [s.nombre, s.tipo, formatPeso(s.peso)].filter(Boolean).join(" · ") : "Soporte general del caso"

/** Vincular el soporte general del caso (G.2.CAS.ACC.12): por referencia, sin cargar otra copia. */
export function DialogVincularSoporte({ accion, numero, soporte, total, pending, onConfirmar, onClose }: Props) {
  const [valor, setValor] = useState(SOPORTE_DEL_CASO)
  return (
    <DialogoOperacionShell
      titulo={`Vincular soporte del caso — ${accion.nombre} · ${accion.fecha}`}
      resumen={`${total} de ${MAX_SOPORTES} soportes · Caso ${numero}`}
      onClose={onClose}
      error={null}
      pending={pending}
      confirmar={{ label: "Vincular soporte", icon: <LinkIcon data-icon="inline-start" />, disabled: !valor, onClick: onConfirmar }}
    >
      <ComboOpciones
        id="vincular-soporte"
        label="Soporte del caso"
        required
        value={valor}
        options={[{ value: SOPORTE_DEL_CASO, label: etiquetaSoporte(soporte) }]}
        onChange={setValor}
        description="Soporte existente del caso. Se vincula por referencia: no se carga otra copia."
      />
      <p className="text-xs text-muted-foreground">
        El soporte vinculado cuenta en el límite de cinco de la acción. Al quitar la referencia no se borra el archivo del caso.
      </p>
    </DialogoOperacionShell>
  )
}
