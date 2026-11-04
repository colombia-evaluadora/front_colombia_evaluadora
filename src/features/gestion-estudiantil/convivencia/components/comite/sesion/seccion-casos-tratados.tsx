import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { ControlPointIcon } from "@/components/ui/icons"

import { FilaCasoTratado } from "@/features/gestion-estudiantil/convivencia/components/comite/sesion/fila-caso-tratado"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import type { SesionFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-sesion-form"

/** Constructor de «Casos tratados»: cada caso una sola vez, con su decisión y su seguimiento. */
export function SeccionCasosTratados({ form, comite, periodo }: { periodo: number; form: SesionFormState; comite: number }) {
  const { v, errores } = form
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <SeccionPlegable
          titulo={`Casos tratados (${v.casos.length})`}
          forzarAbierta={Object.keys(errores.casos).length > 0 || Boolean(errores.contenido)}
          accion={
            <Button type="button" size="sm" variant="outline" onClick={form.agregarCaso}>
              <ControlPointIcon data-icon="inline-start" />
              Agregar caso
            </Button>
          }
        >
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Busque por número de caso o estudiante. Primero, los casos En seguimiento sin sesión.
            </p>
            {v.casos.map((c) => (
              <FilaCasoTratado
                key={c.key}
                fila={c}
                comite={comite}
                periodo={periodo}
                fechaSesion={v.fecha}
                elegidosEnOtras={v.casos.filter((o) => o.key !== c.key && o.fk_caso != null).map((o) => o.fk_caso as number)}
                error={errores.casos[c.key]}
                onChange={(patch) => form.cambiarCaso(c.key, patch)}
                onQuitar={() => form.quitarCaso(c.key)}
              />
            ))}
          </div>
        </SeccionPlegable>
      </div>
      {errores.contenido && <FieldError>{errores.contenido}</FieldError>}
    </div>
  )
}
