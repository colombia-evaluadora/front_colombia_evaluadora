import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { BotonQuitar } from "@/features/gestion-estudiantil/commons/components/boton-quitar"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import type { SesionFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-sesion-form"
import { LIM } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** «Elección de integrantes» (solo en sesiones de Conformación): cada integrante vigente con su forma de elección. */
export function SeccionEleccion({ form }: { form: SesionFormState }) {
  const { v, errores, vigentes } = form
  const opciones = (actual: string) =>
    vigentes
      .filter((i) => String(i.id) === actual || !v.eleccion.some((e) => e.integrante === String(i.id)))
      .map((i) => ({ value: String(i.id), label: `${i.cargo_nombre} · ${i.nombre}` }))
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <SeccionPlegable
          titulo={`Elección de integrantes (${v.eleccion.length})*`}
          forzarAbierta={Object.keys(errores.eleccion).length > 0 || Boolean(errores.eleccionGeneral)}
          accion={
            <Button type="button" size="sm" variant="outline" color="neutral" onClick={form.agregarEleccion}>
              <ControlPointIcon data-icon="inline-start" />
              Agregar integrante
            </Button>
          }
        >
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Cómo se eligió o designó a cada integrante, p. ej. «Votación del consejo de estudiantes».
            </p>
            {v.eleccion.map((f) => {
              const err = errores.eleccion[f.key]
              return (
                <div key={f.key} className="flex items-center gap-2 rounded-lg border border-border p-3">
                  <div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-3 sm:grid-cols-2">
                    <ComboOpciones
                      id={`eleccion-integrante-${f.key}`}
                      label="Integrante"
                      required
                      size="default"
                      todos={false}
                      value={f.integrante}
                      options={opciones(f.integrante)}
                      error={err?.integrante}
                      onChange={(integrante) => form.cambiarEleccion(f.key, { integrante })}
                    />
                    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err?.forma) || undefined}>
                      <FieldLabel htmlFor={`eleccion-forma-${f.key}`}>Forma de elección*</FieldLabel>
                      <Input
                        id={`eleccion-forma-${f.key}`}
                        maxLength={LIM.forma.max}
                        value={f.forma}
                        aria-invalid={Boolean(err?.forma) || undefined}
                        onChange={(e) => form.cambiarEleccion(f.key, { forma: e.target.value })}
                      />
                      {err?.forma && <FieldError>{err.forma}</FieldError>}
                    </Field>
                  </div>
                  <BotonQuitar label="Quitar elección" onClick={() => form.quitarEleccion(f.key)} className="shrink-0" />
                </div>
              )
            })}
          </div>
        </SeccionPlegable>
      </div>
      {errores.eleccionGeneral && <FieldError>{errores.eleccionGeneral}</FieldError>}
    </div>
  )
}
