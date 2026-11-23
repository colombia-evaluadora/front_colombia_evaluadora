import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InfoIcon, MedalIcon, TrophyIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { SugerenciaPuesto } from "@/features/gestion-estudiantil/reconocimientos/api/types"

interface Props {
  sugerencias: SugerenciaPuesto[]
  /** Período de las sugerencias; se guarda aparte para seguir mostrándolo cuando ya se otorgaron todas. */
  periodo?: string
  onOtorgar: (sugerencia: SugerenciaPuesto) => void
  /** Otorgar crea un reconocimiento: sigue el permiso de crear. */
  puedeOtorgar: boolean
}

/** «Mateo Herrera Lozano» → «MH». */
function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

/**
 * Sugerencias por Puesto (§7.2, G.6.LIS.1): Puesto 1 de cada Grado/Grupo en el último período cerrado.
 * Se presenta como un cuadro de honor (fondo dorado suave, trofeo y una tarjeta por estudiante) porque señala
 * méritos; los filtros del listado no la afectan. Si ya se otorgaron todas, lo dice en lugar de desaparecer.
 */
export function SugerenciasPorPuesto({ sugerencias, periodo, onOtorgar, puedeOtorgar }: Props) {
  const nombrePeriodo = periodo ?? sugerencias[0]?.periodo_evaluacion_nombre
  return (
    // mt-4: separa el recuadro de la línea del encabezado.
    <section
      aria-labelledby="sugerencias-titulo"
      className="mx-(--screen-spacing) mt-4 flex flex-col gap-4 rounded-lg border border-yellow-stroke bg-yellow/10 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow/30 text-yellow-foreground">
          <TrophyIcon className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 id="sugerencias-titulo" className="text-base font-semibold">
              Sugerencias por puesto{nombrePeriodo ? ` · ${nombrePeriodo}` : ""}
            </h2>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex text-muted-foreground" tabIndex={0} aria-label="Cómo se calculan las sugerencias" />
                }
              >
                <InfoIcon />
              </TooltipTrigger>
              <TooltipContent>
                Estudiantes con puesto 1 de cada grado/grupo en el último período cerrado. Si hay empate, salen todos.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            {sugerencias.length > 0
              ? "Mejores desempeños del período: otórgueles su reconocimiento."
              : "Todas las sugerencias del período ya fueron otorgadas."}
          </p>
        </div>
      </div>

      {/* Tarjetas de 18 a 22 rem, una tras otra: con una sola sugerencia la tarjeta no se estira a todo el ancho
          (el botón Otorgar quedaba lejos del nombre); en el celular ocupan el ancho completo. */}
      {sugerencias.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),22rem))] gap-3">
          {sugerencias.map((s) => (
            <li
              key={s.fk_tmatricula}
              className="flex items-center gap-3 rounded-md border border-border bg-background p-3 shadow-xs"
            >
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-22 text-sm font-semibold text-primary"
              >
                {iniciales(s.estudiante_nombre)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="w-full truncate text-sm font-semibold" title={s.estudiante_nombre}>
                  {s.estudiante_nombre}
                </span>
                <Badge variant="soft" color="warning">
                  <MedalIcon data-icon="inline-start" />
                  <span>Puesto 1 · {s.grado_grupo}</span>
                </Badge>
              </div>
              <Button
                variant="soft"
                color="primary"
                size="sm"
                disabled={!puedeOtorgar}
                onClick={() => onOtorgar(s)}
                aria-label={`Otorgar reconocimiento a ${s.estudiante_nombre}`}
              >
                <TrophyIcon data-icon="inline-start" />
                Otorgar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
