import { DatePicker } from "@/components/date-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { parseDateValue } from "@/lib/date-value"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import type { useEstrategiaForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-estrategia-form"
import {
  DESCRIPCION_MAX,
  FUENTE_MAX,
  NOMBRE_MAX,
  REQUISITOS_MAX,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

type Form = ReturnType<typeof useEstrategiaForm>

/** Campos de la estrategia (G.8.EST.4 más los Requisitos de ingreso de la especificación). */
export function CamposEstrategia({ f, bloqueado }: { f: Form; bloqueado: boolean }) {
  const { valores: v, set } = f
  const desde = f.limites?.desde ? parseDateValue(f.limites.desde.slice(0, 10)) : undefined
  const hasta = f.limites?.hasta ? parseDateValue(f.limites.hasta.slice(0, 10)) : undefined

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="md:col-span-2 xl:col-span-2">
        <CampoTexto
          id="estrategia-nombre"
          label="Nombre"
          required
          max={NOMBRE_MAX}
          value={v.nombre}
          error={f.error("nombre")}
          onChange={set.nombre}
        />
      </div>
      <ComboOpciones
        id="estrategia-tipo"
        label="Tipo de estrategia"
        required
        size="default"
        todos={false}
        placeholder="Seleccione"
        disabled={bloqueado}
        value={v.tipo}
        options={f.tipoOpciones}
        error={f.error("tipo")}
        onChange={set.tipo}
      />
      <div className="md:col-span-2 xl:col-span-1">
        <ComboOpciones
          id="estrategia-periodo"
          label="Período Académico"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          // Inmutable al modificar: la estrategia sigue en el Período Académico en que nació.
          disabled={f.editando}
          value={v.periodo}
          options={f.periodoOpciones}
          error={f.error("periodo")}
          onChange={set.periodo}
        />
      </div>
      <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(f.error("inicio")) || undefined}>
        <FieldLabel htmlFor="estrategia-inicio">Fecha de inicio*</FieldLabel>
        <DatePicker
          id="estrategia-inicio"
          value={v.inicio}
          minDate={desde}
          maxDate={hasta}
          disabled={bloqueado}
          aria-invalid={Boolean(f.error("inicio")) || undefined}
          onChange={set.inicio}
        />
        {f.error("inicio") && <FieldError>{f.error("inicio")}</FieldError>}
      </Field>
      <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(f.error("fin")) || undefined}>
        <FieldLabel htmlFor="estrategia-fin">Fecha de fin</FieldLabel>
        <DatePicker
          id="estrategia-fin"
          value={v.fin}
          minDate={v.inicio ?? desde}
          maxDate={hasta}
          disabled={bloqueado}
          aria-invalid={Boolean(f.error("fin")) || undefined}
          onChange={set.fin}
        />
        {f.error("fin") && <FieldError>{f.error("fin")}</FieldError>}
      </Field>
      <ComboOpciones
        id="estrategia-responsable"
        label="Responsable"
        required
        size="default"
        todos={false}
        placeholder="Buscar funcionario"
        disabled={bloqueado}
        value={v.responsable}
        options={f.responsableOpciones}
        error={f.error("responsable")}
        onInputChange={f.onBuscarResponsable}
        onChange={set.responsable}
      />
      <CampoTexto
        id="estrategia-fuente"
        label="Fuente de financiación"
        max={FUENTE_MAX}
        value={v.fuente}
        error={f.error("fuente")}
        onChange={set.fuente}
      />
      <CampoTexto
        id="estrategia-meta"
        label="Meta de beneficiarios"
        inputMode="numeric"
        value={v.meta}
        error={f.error("meta")}
        onChange={(texto) => set.meta(texto.replace(/\D/g, "").slice(0, 6))}
      />
      <div className="md:col-span-2 xl:col-span-3">
        <TextoLargo
          id="estrategia-descripcion"
          label="Descripción"
          required
          max={DESCRIPCION_MAX}
          value={v.descripcion}
          error={f.error("descripcion")}
          onChange={set.descripcion}
        />
      </div>
      <div className="md:col-span-2 xl:col-span-3">
        <TextoLargo
          id="estrategia-requisitos"
          label="Requisitos de ingreso"
          max={REQUISITOS_MAX}
          rows={2}
          placeholder="Condiciones para ser beneficiario (p. ej. edad o grado). Si el estudiante no cumple la Situación de edad esperada, el sistema advierte, sin bloquear."
          value={v.requisitos}
          error={f.error("requisitos")}
          onChange={set.requisitos}
        />
      </div>
      <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-3">Los campos marcados con * son obligatorios</p>
    </div>
  )
}
