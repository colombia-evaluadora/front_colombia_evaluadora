import { FieldError } from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"

import { BadgeQuorum } from "@/features/gestion-estudiantil/convivencia/components/comite/badge-quorum"
import { textoMotivoQuorum } from "@/features/gestion-estudiantil/convivencia/utils/comite"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import type { SesionFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-sesion-form"

/** Casillas con los integrantes vigentes en la fecha elegida, contador «N de M» y quórum calculado. */
export function SeccionAsistentes({ form }: { form: SesionFormState }) {
  const { vigentes, asistentes, total, quorum, v } = form
  const q = quorum.data
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <SeccionPlegable
        titulo="Asistentes*"
      >
        {!v.fecha ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Elija la fecha para ver los integrantes vigentes ese día.</p>
        ) : total === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">No hay integrantes vigentes del comité en esa fecha.</p>
        ) : (
          <div className="flex flex-col gap-3 px-4 py-3">
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {vigentes.map((i) => (
                <li key={i.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={asistentes.includes(i.id)}
                      onCheckedChange={(c) => form.marcarAsistente(i.id, c === true)}
                    />
                    <span>
                      <span className="font-medium">{i.cargo_nombre}</span> · {i.nombre}
                      {i.estamento && <span className="text-muted-foreground"> · {i.estamento}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1 text-sm" aria-live="polite">
              <p className="flex flex-wrap items-center gap-2">
                <span>
                  {asistentes.length} de {total} integrantes
                </span>
                {q && <BadgeQuorum conQuorum={q.con_quorum} />}
                {q?.criterio_nombre && <span className="text-muted-foreground">Criterio de quórum: {q.criterio_nombre}</span>}
              </p>
              {q && !q.con_quorum && textoMotivoQuorum(q.motivo, true) && (
                <p className="text-muted-foreground">{textoMotivoQuorum(q.motivo, true)}</p>
              )}
            </div>
            {form.errores.asistentes && <FieldError>{form.errores.asistentes}</FieldError>}
          </div>
        )}
      </SeccionPlegable>
    </div>
  )
}
