import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import type { SesionFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-sesion-form"
import { LIM } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** Invitados (Nombre y Calidad): con voz, sin voto y sin contar para el quórum. */
export function SeccionInvitados({ form }: { form: SesionFormState }) {
  const { v, errores } = form
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <SeccionPlegable
        titulo={`Invitados (${v.invitados.length})`}
        forzarAbierta={Object.keys(errores.invitados).length > 0}
        accion={
          <Button type="button" size="sm" variant="outline" onClick={form.agregarInvitado}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar invitado
          </Button>
        }
      >
        <div className="flex flex-col gap-3 px-4 py-3">
          <p className="text-xs text-muted-foreground">Tienen voz, pero no voto, y no cuentan para el quórum.</p>
          {v.invitados.map((i) => {
            const err = errores.invitados[i.key]
            return (
              <div key={i.key} className="flex items-center gap-2 rounded-lg border border-border p-3">
                <div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-3 sm:grid-cols-2">
                  <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err?.nombre) || undefined}>
                    <FieldLabel htmlFor={`inv-nombre-${i.key}`}>Nombre*</FieldLabel>
                    <Input
                      id={`inv-nombre-${i.key}`}
                      maxLength={LIM.invitadoNombre.max}
                      value={i.nombre}
                      aria-invalid={Boolean(err?.nombre) || undefined}
                      onChange={(e) => form.cambiarInvitado(i.key, { nombre: e.target.value })}
                    />
                    {err?.nombre && <FieldError>{err.nombre}</FieldError>}
                  </Field>
                  <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err?.calidad) || undefined}>
                    <FieldLabel htmlFor={`inv-calidad-${i.key}`}>Calidad*</FieldLabel>
                    <Input
                      id={`inv-calidad-${i.key}`}
                      maxLength={LIM.invitadoCalidad.max}
                      value={i.calidad}
                      aria-invalid={Boolean(err?.calidad) || undefined}
                      onChange={(e) => form.cambiarInvitado(i.key, { calidad: e.target.value })}
                    />
                    {err?.calidad && <FieldError>{err.calidad}</FieldError>}
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label="Quitar invitado"
                  onClick={() => form.quitarInvitado(i.key)}
                >
                  <XIcon />
                </Button>
              </div>
            )
          })}
        </div>
      </SeccionPlegable>
    </div>
  )
}
