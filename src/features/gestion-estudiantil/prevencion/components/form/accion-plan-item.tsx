import { DatePicker } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { XIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { DESCRIPCION_MAX, type ErroresAccion, type ValoresAccion } from "@/features/gestion-estudiantil/prevencion/utils/formularios"

interface Props {
  numero: number
  accion: ValoresAccion
  /** Los errores solo se pintan tras el primer intento de guardar. */
  errores: ErroresAccion | undefined
  tipos: Opcion[]
  responsables: Opcion[]
  onBuscarResponsable: (texto: string) => void
  estrategias: Opcion[]
  /** La lista no respondió: el campo se muestra deshabilitado con una ayuda. */
  estrategiasNoDisponibles?: boolean
  /** Rango en el que cae el plazo: inicio y fin del plan. */
  desde: Date | undefined
  hasta: Date | undefined
  puedeQuitar: boolean
  onChange: (clave: string, patch: Partial<ValoresAccion>) => void
  onQuitar: (clave: string) => void
}

/** Una acción del plan (G.8.TAB.6): tipo, descripción, responsable, plazo y estrategia opcional. */
export function AccionPlanItem({
  numero,
  accion: a,
  errores,
  tipos,
  responsables,
  onBuscarResponsable,
  estrategias,
  estrategiasNoDisponibles,
  desde,
  hasta,
  puedeQuitar,
  onChange,
  onQuitar,
}: Props) {
  const id = `plan-accion-${a.clave}`
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
      <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <ComboOpciones
            id={`${id}-tipo`}
            label="Tipo de acción"
            required
            size="default"
            todos={false}
            placeholder="Seleccione"
            value={a.tipo}
            options={tipos}
            error={errores?.tipo}
            onChange={(tipo) => onChange(a.clave, { tipo })}
          />
        </div>
        <div className="sm:col-span-6">
          <TextoLargo
            id={`${id}-descripcion`}
            label="Descripción"
            required
            max={DESCRIPCION_MAX}
            placeholder="Qué se hará en esta acción"
            value={a.descripcion}
            error={errores?.descripcion}
            onChange={(descripcion) => onChange(a.clave, { descripcion })}
          />
        </div>
        <div className="sm:col-span-3">
          <ComboOpciones
            id={`${id}-responsable`}
            label="Responsable"
            required
            size="default"
            todos={false}
            placeholder="Buscar funcionario"
            value={a.responsable}
            options={responsables}
            error={errores?.responsable}
            onInputChange={onBuscarResponsable}
            onChange={(responsable) => onChange(a.clave, { responsable })}
          />
        </div>
        <div className="sm:col-span-3">
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores?.plazo) || undefined}>
            <FieldLabel htmlFor={`${id}-plazo`}>Plazo*</FieldLabel>
            <DatePicker
              id={`${id}-plazo`}
              value={a.plazo}
              minDate={desde}
              maxDate={hasta}
              aria-invalid={Boolean(errores?.plazo) || undefined}
              onChange={(plazo) => onChange(a.clave, { plazo })}
            />
            {errores?.plazo && <FieldError>{errores.plazo}</FieldError>}
          </Field>
        </div>
        <div className="sm:col-span-6">
          <ComboOpciones
            id={`${id}-estrategia`}
            label="Estrategia"
            size="default"
            todos="Opcional"
            value={a.estrategia}
            options={estrategias}
            disabled={estrategiasNoDisponibles || a.estrategiaFija}
            onChange={(estrategia) => onChange(a.clave, { estrategia })}
          />
          {estrategiasNoDisponibles && (
            <FieldDescription className="mt-1">Las estrategias no están disponibles por ahora.</FieldDescription>
          )}
          {a.estrategiaFija && (
            <FieldDescription className="mt-1">La estrategia de una acción guardada no se puede cambiar.</FieldDescription>
          )}
          {a.estrategia && !a.estrategiaFija && (
            <FieldDescription className="mt-1">El estudiante queda como beneficiario de la estrategia.</FieldDescription>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        color="neutral"
        size="icon-sm"
        disabled={!puedeQuitar}
        aria-label={`Quitar la acción ${numero}`}
        onClick={() => onQuitar(a.clave)}
      >
        <XIcon />
      </Button>
    </div>
  )
}
