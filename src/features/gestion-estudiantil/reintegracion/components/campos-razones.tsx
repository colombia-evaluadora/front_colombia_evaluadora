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
        <fieldset key={g.dimension_valor} className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{g.dimension_nombre}</legend>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        </fieldset>
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
