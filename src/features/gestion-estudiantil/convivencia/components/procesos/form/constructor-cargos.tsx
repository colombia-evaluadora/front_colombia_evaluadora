import { useCallback, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { useClasificacionesFaltaQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-apertura-query"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { FilaCargo } from "@/features/gestion-estudiantil/convivencia/components/procesos/form/fila-cargo"
import type { ProcesoFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-proceso-form"
import { cargoVacio, type CargoFila } from "@/features/gestion-estudiantil/convivencia/utils/proceso-form"

/** «Cargos (N)*»: constructor repetible con al menos un cargo; el primero nace con el código de la anotación. */
export function ConstructorCargos({ form }: { form: ProcesoFormState }) {
  const { v, set, errores, intento, codigos } = form
  const matricula = v.matricula ? Number(v.matricula) : null
  const clasificaciones = useClasificacionesFaltaQuery(matricula)
  const opcCodigos = useMemo(
    () => (codigos.data ?? []).map((c) => ({ value: String(c.id), label: `${c.codigo} · ${c.descripcion}` })),
    [codigos.data],
  )
  const opcClasif = useMemo(
    () => (clasificaciones.data ?? []).map((c) => ({ value: String(c.id), label: c.nombre })),
    [clasificaciones.data],
  )
  const cambiar = useCallback(
    (key: string, patch: Partial<CargoFila>) => set({ cargos: v.cargos.map((c) => (c.key === key ? { ...c, ...patch } : c)) }),
    [set, v.cargos],
  )

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <SeccionPlegable
        titulo={`Cargos (${v.cargos.length})*`}
        forzarAbierta={intento && Object.keys(errores.cargos).length > 0}
        contentClassName="flex flex-col gap-3 p-4"
        accion={
          <Button type="button" size="sm" variant="outline" onClick={() => set({ cargos: [...v.cargos, cargoVacio()] })}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar cargo
          </Button>
        }
      >
        {v.cargos.map((c, i) => (
          <FilaCargo
            key={c.key}
            fila={c}
            numero={i + 1}
            codigos={opcCodigos}
            clasificaciones={opcClasif}
            errores={errores.cargos[c.key]}
            puedeQuitar={v.cargos.length > 1}
            onChange={(patch) => cambiar(c.key, patch)}
            onQuitar={() => set({ cargos: v.cargos.filter((x) => x.key !== c.key) })}
          />
        ))}
      </SeccionPlegable>
    </div>
  )
}
