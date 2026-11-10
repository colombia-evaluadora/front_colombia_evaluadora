import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { FilaPrueba } from "@/features/gestion-estudiantil/convivencia/components/procesos/form/fila-prueba"
import type { ProcesoFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-proceso-form"
import { pruebaVacia, type PruebaFila } from "@/features/gestion-estudiantil/convivencia/utils/proceso-form"

/** «Pruebas (N)»: constructor repetible, opcional. */
export function ConstructorPruebas({ form }: { form: ProcesoFormState }) {
  const { v, set, errores, intento } = form
  const cambiar = (key: string, patch: Partial<PruebaFila>) =>
    set({ pruebas: v.pruebas.map((p) => (p.key === key ? { ...p, ...patch } : p)) })

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <SeccionPlegable
        titulo={`Pruebas (${v.pruebas.length})`}
        forzarAbierta={intento && Object.keys(errores.pruebas).length > 0}
        contentClassName="flex flex-col gap-3 p-4"
        accion={
          <Button type="button" size="sm" variant="outline" onClick={() => set({ pruebas: [...v.pruebas, pruebaVacia()] })}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar prueba
          </Button>
        }
      >
        {v.pruebas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay pruebas. Son opcionales.</p>
        ) : (
          v.pruebas.map((p, i) => (
            <FilaPrueba
              key={p.key}
              fila={p}
              numero={i + 1}
              error={errores.pruebas[p.key]}
              onChange={(patch) => cambiar(p.key, patch)}
              onQuitar={() => set({ pruebas: v.pruebas.filter((x) => x.key !== p.key) })}
            />
          ))
        )}
      </SeccionPlegable>
    </div>
  )
}
