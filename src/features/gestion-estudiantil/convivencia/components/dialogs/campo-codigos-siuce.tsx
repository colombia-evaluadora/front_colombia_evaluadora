import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import type { Opcion } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import type { CodigoSiuce } from "@/features/gestion-estudiantil/convivencia/utils/registrar-accion"

interface Props {
  codigos: CodigoSiuce[]
  onChange: (codigos: CodigoSiuce[]) => void
  afectados: Opcion[]
  error?: string
}

/** «Códigos del reporte en el SIUCE»: un código por cada afectado reportado. */
export function CampoCodigosSiuce({ codigos, onChange, afectados, error }: Props) {
  return (
    <Field orientation="vertical" className="gap-3" data-invalid={Boolean(error) || undefined}>
      <FieldLabel>Códigos del reporte en el SIUCE*</FieldLabel>
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
            className="mt-4.5"
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
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <FieldDescription>Un código por cada afectado reportado: el SIUCE recibe un reporte por víctima.</FieldDescription>
      )}
    </Field>
  )
}
