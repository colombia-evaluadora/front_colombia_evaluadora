import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, InfoIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import type { AfectadoSiuce } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import type { CodigoSiuce } from "@/features/gestion-estudiantil/convivencia/utils/registrar-accion"
import { textoReportado } from "@/features/gestion-estudiantil/convivencia/utils/siuce"

interface Props {
  codigos: CodigoSiuce[]
  onChange: (codigos: CodigoSiuce[]) => void
  /** Afectados que aún no tienen código: lo único que ofrece el constructor. */
  afectados: Opcion[]
  /** Todos los afectados del caso, con su código si ya se reportaron. */
  afectadosCaso: AfectadoSiuce[]
  reportados: AfectadoSiuce[]
  /** Con los códigos que se están agregando, nadie queda pendiente. */
  todosReportados: boolean
  error?: string
}

/** «Códigos del reporte en el SIUCE»: un código por cada afectado reportado. */
export function CampoCodigosSiuce({ codigos, onChange, afectados, afectadosCaso, reportados, todosReportados, error }: Props) {
  return (
    <Field orientation="vertical" className="gap-3" data-invalid={Boolean(error) || undefined}>
      <FieldLabel>Códigos del reporte en el SIUCE*</FieldLabel>
      {afectadosCaso.length > 0 && (
        <p className="text-sm text-muted-foreground">Afectados: {afectadosCaso.map((a) => a.nombre).join(", ")}</p>
      )}
      {codigos.map((c, i) => (
        <div key={i} className="flex items-start gap-2">
          <ComboOpciones
            id={`accion-afectado-${i}`}
            label="Afectado"
            className="min-w-0 flex-1 gap-2"
            size="default"
            todos={false}
            value={c.afectado}
            options={afectados}
            onChange={(afectado) => onChange(codigos.map((x, j) => (j === i ? { ...x, afectado } : x)))}
          />
          <Field orientation="vertical" variant="outlined" className="w-48 flex-none gap-2">
            <FieldLabel htmlFor={`accion-codigo-${i}`}>Código</FieldLabel>
            <Input
              id={`accion-codigo-${i}`}
              maxLength={50}
              value={c.codigo}
              onChange={(e) => onChange(codigos.map((x, j) => (j === i ? { ...x, codigo: e.target.value } : x)))}
            />
          </Field>
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            className="mt-5"
            aria-label="Quitar código"
            onClick={() => onChange(codigos.filter((_, j) => j !== i))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-fit"
        disabled={codigos.length >= afectados.length}
        onClick={() => onChange([...codigos, { afectado: "", codigo: "" }])}
      >
        <ControlPointIcon data-icon="inline-start" />
        Agregar afectado
      </Button>
      {reportados.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          {reportados.map((a) => (
            <li key={`${a.fk_matricula ?? "f"}-${a.fk_funcionario ?? "m"}`}>{textoReportado(a)}</li>
          ))}
        </ul>
      )}
      {todosReportados && (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            Con este código todos los afectados quedan reportados y el caso sale de los pendientes de reporte al SIUCE.
          </AlertDescription>
        </Alert>
      )}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <FieldDescription>Un código por cada afectado reportado: el SIUCE recibe un reporte por víctima.</FieldDescription>
      )}
    </Field>
  )
}
