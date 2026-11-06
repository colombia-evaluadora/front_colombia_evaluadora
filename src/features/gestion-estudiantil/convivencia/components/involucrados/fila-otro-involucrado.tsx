import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { codigoDe, type OpcionCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { COD } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { erroresInvolucrado, esTipoFuncionario } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import {
  useFuncionarioInvolucrado,
  type ContextoFuncionarios,
} from "@/features/gestion-estudiantil/convivencia/hooks/use-funcionario-involucrado"

interface Props {
  fila: InvolucradoFila
  todas: InvolucradoFila[]
  mostrarErrores: boolean
  roles: OpcionCatalogo[]
  tipos: OpcionCatalogo[]
  tiposDoc: OpcionCatalogo[]
  contexto: ContextoFuncionarios
  onChange: (patch: Partial<InvolucradoFila>) => void
  onQuitar: () => void
}

/** Una fila de «Otros involucrados»: tipo, funcionario o nombre y documento, y rol. */
export function FilaOtroInvolucrado({ fila: v, todas, mostrarErrores, roles, tipos, tiposDoc, contexto, onChange, onQuitar }: Props) {
  const tipoCodigo = codigoDe(tipos, v.tipo)
  const err = mostrarErrores ? erroresInvolucrado(v, tipoCodigo, codigoDe(roles, v.rol), todas) : undefined
  // Afectado solo para funcionarios del establecimiento (3.1); a los demás tipos no se les ofrece.
  const esFuncionario = esTipoFuncionario(tipoCodigo)
  const rolesFila = esFuncionario ? roles : roles.filter((r) => r.codigo !== COD.afectado)
  const soloLectura = v.id != null
  const funcionario = useFuncionarioInvolucrado({ fila: v, todas, contexto, activo: esFuncionario, onChange })
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
      <div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-3 sm:grid-cols-5">
        {esFuncionario && (
          // 3.1: el funcionario se elige de los registrados en el establecimiento y de su ficha salen
          // nombre y documento (solo lectura).
          <ComboOpciones
            id={`inv-funcionario-${v.key}`}
            label="Funcionario"
            required
            size="default"
            todos={false}
            className="gap-2 sm:col-span-5"
            disabled={soloLectura || funcionario.deshabilitado}
            placeholder={funcionario.placeholder}
            value={v.fk_funcionario != null ? String(v.fk_funcionario) : ""}
            options={funcionario.opciones}
            error={err?.funcionario}
            onInputChange={funcionario.buscar}
            onChange={funcionario.elegir}
          />
        )}
        <ComboOpciones
          id={`inv-tipo-${v.key}`}
          label="Tipo de involucrado"
          required
          size="default"
          todos={false}
          disabled={soloLectura}
          value={v.tipo}
          options={tipos}
          error={err?.tipo}
          onChange={(tipo) =>
            onChange({
              tipo,
              rol: "",
              fk_funcionario: null,
              // Lo que vino de la ficha del funcionario anterior no es de la persona nueva.
              ...(v.fk_funcionario != null && { nombre: "", tipoDoc: "", numDoc: "" }),
            })
          }
        />
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err?.nombre) || undefined}>
          <FieldLabel htmlFor={`inv-nombre-${v.key}`}>Nombre*</FieldLabel>
          <Input
            id={`inv-nombre-${v.key}`}
            maxLength={150}
            disabled={soloLectura}
            readOnly={esFuncionario}
            value={v.nombre}
            aria-invalid={Boolean(err?.nombre) || undefined}
            onChange={(e) => onChange({ nombre: e.target.value })}
          />
          {err?.nombre && <FieldError>{err.nombre}</FieldError>}
        </Field>
        <ComboOpciones
          id={`inv-tdoc-${v.key}`}
          label="Tipo de documento"
          size="default"
          todos="Ninguno"
          disabled={soloLectura || esFuncionario}
          value={v.tipoDoc}
          options={tiposDoc}
          onChange={(tipoDoc) => onChange({ tipoDoc })}
        />
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err?.numDoc) || undefined}>
          <FieldLabel htmlFor={`inv-ndoc-${v.key}`}>Número de documento{v.tipoDoc && "*"}</FieldLabel>
          <Input
            id={`inv-ndoc-${v.key}`}
            maxLength={20}
            disabled={soloLectura || !v.tipoDoc}
            readOnly={esFuncionario}
            value={v.numDoc}
            aria-invalid={Boolean(err?.numDoc) || undefined}
            onChange={(e) => onChange({ numDoc: e.target.value })}
          />
          {err?.numDoc && <FieldError>{err.numDoc}</FieldError>}
        </Field>
        <ComboOpciones
          id={`inv-rol-${v.key}`}
          label="Rol en la situación"
          required
          size="default"
          todos={false}
          disabled={soloLectura}
          value={v.rol}
          options={rolesFila}
          error={err?.rol}
          onChange={(rol) => onChange({ rol })}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        color="neutral"
        size="icon-sm"
        className="mt-5"
        aria-label="Quitar involucrado"
        onClick={onQuitar}
      >
        <XIcon />
      </Button>
    </div>
  )
}
