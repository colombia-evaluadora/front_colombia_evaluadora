import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { FilaPrueba } from "@/features/gestion-estudiantil/convivencia/components/procesos/form/fila-prueba"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import type { Errores } from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"
import { pruebaVacia, type PruebaFila } from "@/features/gestion-estudiantil/convivencia/utils/proceso-form"

interface Props {
  pruebas: PruebaFila[]
  onChange: (pruebas: PruebaFila[]) => void
  errores: Errores
  intento: boolean
}

/** «Pruebas aportadas (N)»: las que el estudiante presentó en los descargos; opcional. */
export function ConstructorPruebasDescargos({ pruebas, onChange, errores, intento }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <SeccionPlegable
        titulo={`Pruebas aportadas (${pruebas.length})`}
        forzarAbierta={intento && Object.keys(errores).some((k) => k.startsWith("prueba:"))}
        contentClassName="flex flex-col gap-3 p-4"
        accion={
          <Button type="button" size="sm" variant="outline" onClick={() => onChange([...pruebas, pruebaVacia()])}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar prueba
          </Button>
        }
      >
        {pruebas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguna. Son opcionales.</p>
        ) : (
          pruebas.map((p, i) => (
            <FilaPrueba
              key={p.key}
              fila={p}
              numero={i + 1}
              error={errores[`prueba:${p.key}`]}
              onChange={(patch) => onChange(pruebas.map((x) => (x.key === p.key ? { ...x, ...patch } : x)))}
              onQuitar={() => onChange(pruebas.filter((x) => x.key !== p.key))}
            />
          ))
        )}
      </SeccionPlegable>
    </div>
  )
}
