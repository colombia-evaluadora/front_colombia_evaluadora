import { DatePicker } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { XIcon } from "@/components/ui/icons"
import { addDays, parseISO } from "date-fns"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { useCasosComiteQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-comite-query"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { ComboFuncionarioComite } from "@/features/gestion-estudiantil/convivencia/components/comite/combos-persona"
import { useBusquedaDiferida } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-busqueda"
import { soloSeguimiento, type CasoFila } from "@/features/gestion-estudiantil/convivencia/utils/comite"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { LIM } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface Props {
  fila: CasoFila
  /** Casos ya elegidos en otras filas: un caso se trata una sola vez por sesión. */
  elegidosEnOtras: number[]
  comite: number
  periodo: number
  fechaSesion: string
  error?: { caso?: string; decision?: string; fecha?: string }
  onChange: (patch: Partial<CasoFila>) => void
  onQuitar: () => void
}

/** Una fila de «Casos tratados»: Caso, Decisión, Responsable del seguimiento y su fecha. */
export function FilaCasoTratado({ fila, elegidosEnOtras, comite, periodo, fechaSesion, error, onChange, onQuitar }: Props) {
  const { setTexto, busqueda } = useBusquedaDiferida()
  const casos = useCasosComiteQuery(comite, busqueda)
  const filas = (casos.data ?? []).filter((c) => !elegidosEnOtras.includes(c.fk_caso))
  const opciones = filas.map((c) => ({
    value: String(c.fk_caso),
    label: `Caso ${c.numero} · ${c.tipo_nombre} · ${c.estado_nombre}${c.estudiantes ? ` · ${c.estudiantes}` : ""}`,
  }))
  const valor = fila.fk_caso != null ? String(fila.fk_caso) : ""
  if (valor && !opciones.some((o) => o.value === valor)) opciones.unshift({ value: valor, label: `Caso ${fila.numero}` })

  const elegirCaso = (v: string) => {
    const c = filas.find((x) => String(x.fk_caso) === v)
    // Otro caso puede ser de otro tipo: el responsable elegido para el anterior ya no vale.
    onChange({
      fk_caso: v ? Number(v) : null,
      tipo_codigo: c?.tipo_codigo ?? "",
      numero: c ? String(c.numero) : "",
      responsable: "",
      responsable_nombre: "",
    })
  }

  const siguienteDia = fechaSesion ? addDays(parseISO(fechaSesion), 1) : undefined
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <ComboOpciones
          id={`caso-${fila.key}`}
          label="Caso"
          required
          size="default"
          todos={false}
          placeholder="Buscar caso"
          value={valor}
          options={opciones}
          error={error?.caso}
          onInputChange={setTexto}
          onChange={elegirCaso}
        />
        <TextoLargo
          id={`caso-decision-${fila.key}`}
          label="Decisión"
          required
          rows={3}
          max={LIM.decision.max}
          value={fila.decision}
          error={error?.decision}
          onChange={(decision) => onChange({ decision })}
        />
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <ComboFuncionarioComite
            id={`caso-resp-${fila.key}`}
            label="Responsable del seguimiento"
            periodo={periodo}
            soloSeguimiento={soloSeguimiento(fila.tipo_codigo)}
            value={fila.responsable}
            nombre={fila.responsable_nombre}
            onChange={(pk, nombre) =>
              onChange({
                responsable: pk != null ? String(pk) : "",
                responsable_nombre: nombre,
                ...(pk == null && { fecha_seguimiento: "" }),
              })
            }
          />
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error?.fecha) || undefined}>
            <FieldLabel htmlFor={`caso-seg-${fila.key}`}>Fecha de seguimiento{fila.responsable && "*"}</FieldLabel>
            <DatePicker
              id={`caso-seg-${fila.key}`}
              disabled={!fila.responsable}
              minDate={siguienteDia}
              value={parseDateValue(fila.fecha_seguimiento)}
              onChange={(d) => onChange({ fecha_seguimiento: d ? formatDateValue(d) : "" })}
            />
            {error?.fecha && <FieldError>{error.fecha}</FieldError>}
          </Field>
        </div>
      </div>
      <Button type="button" variant="ghost" color="neutral" size="icon-sm" className="mt-2 shrink-0" aria-label="Quitar caso" onClick={onQuitar}>
        <XIcon />
      </Button>
    </div>
  )
}
