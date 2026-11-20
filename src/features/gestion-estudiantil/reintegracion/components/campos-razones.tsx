import { Checkbox } from "@/components/ui/checkbox"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import type { OpcionRazon } from "@/features/gestion-estudiantil/reintegracion/api/types"
import {
  agruparRazones,
  alternarRazon,
  hayOtraMarcada,
  opcionesCausa,
  OTRA_RAZON_MAX,
  type RazonesForm,
} from "@/features/gestion-estudiantil/reintegracion/utils/razones"
import { MarcoOpciones } from "@/components/marco-opciones"

interface Props {
  /** Prefijo de ids únicos (el formulario puede convivir con un diálogo). */
  id: string
  opciones: OpcionRazon[]
  value: RazonesForm
  onChange: (value: RazonesForm) => void
  errorOtraRazon?: string
  disabled?: boolean
}

/**
 * Razones del abandono: casillas agrupadas por dimensión (Anexo A), «Otra razón» con su texto y Causa
 * principal entre las marcadas. Lo comparten Abrir caso, Modificar y Cambiar estado a Diagnóstico.
 */
export function CamposRazones({ id, opciones, value, onChange, errorOtraRazon, disabled }: Props) {
  const grupos = agruparRazones(opciones)
  const causas = opcionesCausa(value, opciones)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {value.marcadas.length} {value.marcadas.length === 1 ? "marcada" : "marcadas"}
      </p>
      {grupos.map((g) => (
        <MarcoOpciones
          key={g.dimension_valor}
          id={`${id}-dimension-${g.dimension_valor}`}
          label={g.dimension_nombre}
          contentClassName="grid grid-cols-1 items-start gap-x-6 gap-y-2 py-3 sm:grid-cols-2 lg:grid-cols-3"
        >
            {g.razones.map((r) => (
              <label key={r.fk_tlv_razon} className="flex items-start gap-2 text-sm">
                <Checkbox
                  disabled={disabled}
                  checked={value.marcadas.includes(r.fk_tlv_razon)}
                  onCheckedChange={(c) => onChange(alternarRazon(value, opciones, r.fk_tlv_razon, Boolean(c)))}
                />
                {r.nombre}
              </label>
            ))}
        </MarcoOpciones>
      ))}
      {hayOtraMarcada(value, opciones) && (
        <TextoLargo
          id={`${id}-otra-razon`}
          label="Otra razón"
          required
          rows={2}
          max={OTRA_RAZON_MAX}
          disabled={disabled}
          value={value.otraRazon}
          error={errorOtraRazon}
          onChange={(otraRazon) => onChange({ ...value, otraRazon })}
        />
      )}
      {causas.length > 0 && (
        <ComboOpciones
          id={`${id}-causa`}
          label="Causa principal"
          size="default"
          todos="Sin causa principal"
          disabled={disabled}
          value={value.causa}
          options={causas}
          onChange={(causa) => onChange({ ...value, causa })}
        />
      )}
    </div>
  )
}
