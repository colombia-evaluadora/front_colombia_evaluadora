import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InfoIcon, MedalIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { SugerenciaPuesto } from "@/features/gestion-estudiantil/reconocimientos/api/types"

interface Props {
  sugerencias: SugerenciaPuesto[]
  /** El botón no hace nada en la fase 1: la fase 2 abre el formulario con el estudiante fijo. */
  onOtorgar: (sugerencia: SugerenciaPuesto) => void
  /** Otorgar crea un reconocimiento: sigue el permiso de crear. */
  puedeOtorgar: boolean
}

/**
 * Sugerencias por Puesto (§7.2, G.6.LIS.1): Puesto 1 de cada Grado/Grupo en el último período cerrado.
 * Solo se monta con sugerencias; los filtros del listado no la afectan.
 */
export function SugerenciasPorPuesto({ sugerencias, onOtorgar, puedeOtorgar }: Props) {
  const periodo = sugerencias[0]?.periodo_evaluacion_nombre
  return (
    <Card size="sm" className="mx-(--screen-spacing)">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Sugerencias por Puesto{periodo ? ` · ${periodo}` : ""}</h2>
          <Tooltip>
            <TooltipTrigger
              render={<span className="inline-flex text-muted-foreground" tabIndex={0} aria-label="Cómo se calculan las sugerencias" />}
            >
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent>
              Estudiantes con Puesto 1 de cada Grado/Grupo en el último período cerrado. Si hay empate, salen todos.
            </TooltipContent>
          </Tooltip>
        </div>
        <ul className="flex flex-col divide-y">
          {sugerencias.map((s) => (
            <li key={s.fk_tmatricula} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span>
                <span className="font-medium">{s.estudiante_nombre}</span>
                <span className="text-muted-foreground"> · Puesto 1 en {s.grado_grupo}</span>
              </span>
              <Button variant="outline" size="sm" disabled={!puedeOtorgar} onClick={() => onOtorgar(s)}>
                <MedalIcon data-icon="inline-start" />
                Otorgar
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
