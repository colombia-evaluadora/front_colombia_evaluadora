import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import type { ComiteDetalle } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { AvisoCargosVacios } from "@/features/gestion-estudiantil/convivencia/components/comite/aviso-cargos-vacios"
import { FilaIntegranteForm } from "@/features/gestion-estudiantil/convivencia/components/comite/fila-integrante"
import type { ComiteIntegrantesState } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-integrantes"
import { rotuloPeriodo } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface Props {
  form: ComiteIntegrantesState
  comite: ComiteDetalle
  puedeEscribir: boolean
}

/** Copiar de otro período (solo al crear), aviso de cargos sin integrante y el constructor por cargo. */
export function FormularioIntegrantes({ form, comite, puedeEscribir }: Props) {
  return (
    <div className="flex flex-col gap-5 pb-6">
      {!form.existe && puedeEscribir && (
        <ComboOpciones
          id="int-copiar"
          label="Copiar integrantes de"
          size="default"
          todos="Ninguno"
          value={form.copiarDe}
          options={form.periodosCopiables.map((p) => ({ value: String(p.fk_periodo), label: rotuloPeriodo(p) }))}
          onChange={form.setCopiarDe}
        />
      )}

      <AvisoCargosVacios
        cargos={form.cargosSinIntegrante}
        accion={
          form.copiarDe
            ? "Se completarán con los funcionarios del período elegido que sigan con rol activo."
            : "Puede guardar así; se avisará al Administrador del establecimiento de los cargos que faltan."
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Integrantes ({form.filas.filter((f) => f.id != null || f.fk_tlv_cargo).length})</h2>
          {puedeEscribir && (
            <Button size="sm" variant="outline" type="button" disabled={!form.puedeAgregar} onClick={form.agregarFila}>
              <ControlPointIcon data-icon="inline-start" />
              Agregar integrante
            </Button>
          )}
        </div>
        {form.filas.length === 0 && <p className="text-sm text-muted-foreground">No hay integrantes registrados.</p>}
        {form.filas.map((f) => (
          <FilaIntegranteForm
            key={f.key}
            fila={f}
            periodo={comite.fk_periodo}
            error={form.errores[f.key]}
            hastaEditable={!form.existe}
            inicioPeriodo={form.inicio}
            finPeriodo={form.fin}
            opcionesCargo={form.opcionesCargo(f)}
            onCargo={(valor) => form.elegirCargo(f.key, valor)}
            bloqueada={form.esRectorBloqueado(f)}
            puedeEscribir={puedeEscribir}
            onChange={(patch) => form.cambiar(f.key, patch)}
            onQuitar={() => form.quitarFila(f)}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
    </div>
  )
}
