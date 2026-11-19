import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { SenalSMDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import type { useSenalDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-senal-detalle"

interface Props {
  senal: SenalSMDetalle
  d: ReturnType<typeof useSenalDetalle>
}

/** Atención (G.8.SAL.4 y 6): acciones en orden cronológico; se registran después de valorar. */
export function SeccionAtencion({ senal: s, d }: Props) {
  const sinValorar = s.estado === "POR_VALORAR"
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo={sinValorar ? "Atención (se registra después de valorar)" : "Atención"}
      accion={
        !sinValorar && (
          <Button size="sm" type="button" variant="outline" disabled={!s.puede_atender} onClick={d.abrirAtencion}>
            <ControlPointIcon data-icon="inline-start" />
            Registrar atención
          </Button>
        )
      }
      contentClassName="flex flex-col gap-3 px-4 py-4"
    >
      {s.atenciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay acciones registradas.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {s.atenciones.map((a) => (
            <li key={a.id} className="text-sm">
              <span className="text-muted-foreground">
                {formatFecha(a.fecha)} · {abreviarPersona(a.registrada_por)}
                {a.entidad_nombre ? ` · Remitida a ${a.entidad_nombre}` : ""}:{" "}
              </span>
              {a.accion}
            </li>
          ))}
        </ul>
      )}
    </SeccionPlegable>
  )
}
