import { DatePicker } from "@/components/date-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, WarningIcon } from "@/components/ui/icons"
import { parseDateValue } from "@/lib/date-value"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { ResumenEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ListaMatriculados } from "@/features/gestion-estudiantil/prevencion/components/estrategias/dialogos/lista-matriculados"
import { SearchMatriculados } from "@/features/gestion-estudiantil/prevencion/components/estrategias/dialogos/search-matriculados"
import { useAgregarBeneficiariosForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-agregar-beneficiarios-form"

interface Props {
  estrategia: ResumenEstrategia
  onClose: () => void
}

/**
 * Agregar beneficiarios (G.8.EST.8): una sola fecha de ingreso para el lote, matriculados Cursando del Período
 * Académico con filtro de grado y búsqueda, y «Seleccionar todos» sobre todas las páginas.
 */
export function DialogAgregarBeneficiarios({ estrategia, onClose }: Props) {
  const f = useAgregarBeneficiariosForm(estrategia, onClose)
  const ayudaFechas = estrategia.fecha_fin
    ? `Entre ${formatFecha(estrategia.fecha_inicio)} y ${formatFecha(estrategia.fecha_fin)}.`
    : `Desde ${formatFecha(estrategia.fecha_inicio)}.`

  return (
    <DialogoOperacionShell
      titulo={`Agregar beneficiarios — ${estrategia.nombre}`}
      className="sm:max-w-2xl"
      onClose={onClose}
      error={f.errorBackend}
      pending={f.pending}
      confirmar={{ label: "Agregar", icon: <ControlPointIcon data-icon="inline-start" />, onClick: f.agregar }}
    >
      <div className="flex flex-col gap-4">
        <Field
          orientation="vertical"
          variant="outlined"
          className="gap-2 sm:max-w-xs"
          data-invalid={Boolean(f.errorFecha) || undefined}
        >
          <FieldLabel htmlFor="beneficiarios-ingreso">Fecha de ingreso*</FieldLabel>
          <DatePicker
            id="beneficiarios-ingreso"
            value={f.fecha}
            minDate={parseDateValue(estrategia.fecha_inicio.slice(0, 10))}
            maxDate={estrategia.fecha_fin ? parseDateValue(estrategia.fecha_fin.slice(0, 10)) : undefined}
            aria-invalid={Boolean(f.errorFecha) || undefined}
            onChange={f.setFecha}
          />
          {f.errorFecha ? <FieldError>{f.errorFecha}</FieldError> : <p className="text-xs text-muted-foreground">{ayudaFechas}</p>}
        </Field>

        <SearchMatriculados search={f.search} grado={f.grado} grados={f.gradoOpciones} onChange={f.cambiarFiltro} />

        <div className="flex flex-col gap-2" data-invalid={Boolean(f.errorSeleccion) || undefined}>
          <ListaMatriculados f={f} />
          {f.errorSeleccion && <p className="text-sm text-destructive">{f.errorSeleccion}</p>}
        </div>

        {f.fueraDeEdad > 0 && (
          <Alert>
            <WarningIcon aria-hidden="true" />
            <AlertDescription>
              {f.fueraDeEdad === 1
                ? "1 estudiante elegido no cumple, o no tiene calculada, la Situación de edad esperada de los requisitos de ingreso."
                : `${f.fueraDeEdad} estudiantes elegidos no cumplen, o no tienen calculada, la Situación de edad esperada de los requisitos de ingreso.`}{" "}
              Puede agregarlos: es solo una advertencia.
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {f.filas.length} de {f.totalCount} matriculados · {f.seleccionados}{" "}
          {f.seleccionados === 1 ? "seleccionado" : "seleccionados"}
        </p>
      </div>
    </DialogoOperacionShell>
  )
}
