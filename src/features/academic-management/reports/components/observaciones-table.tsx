import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { EraserIcon, EyeIcon, PlusIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { PERIODOS } from "@/features/academic-management/reports/api/mock-data"
import type { EstudianteInforme, PeriodoId } from "@/features/academic-management/reports/api/types"

interface ObservacionesTableProps {
  estudiantes: EstudianteInforme[]
  periodos: PeriodoId[]
  seleccionados: Set<number>
  onToggleEstudiante: (id: number) => void
  onToggleTodos: () => void
  onAbrirObservacion: (estudiante: EstudianteInforme, periodo: PeriodoId) => void
  onLimpiar: (estudiante: EstudianteInforme, periodo: PeriodoId) => void
}

/**
 * Preescolar no califica con notas — evalúa con una sola observación de
 * texto por período, así que en vez de las columnas PR/PU/AP/RE + materia
 * por materia de primaria/secundaria hay una única columna ancha
 * "Observación". Cada fila de período muestra el inicio del texto
 * recortado (ícono de ojo, para leerla/editarla) o "Sin observación" con un
 * "+" para crearla — ambos abren el mismo panel lateral.
 */
export function ObservacionesTable({
  estudiantes,
  periodos,
  seleccionados,
  onToggleEstudiante,
  onToggleTodos,
  onAbrirObservacion,
  onLimpiar,
}: ObservacionesTableProps) {
  const periodosOrdenados = PERIODOS.filter((p) => periodos.includes(p.id))
  const todosSeleccionados = estudiantes.length > 0 && estudiantes.every((e) => seleccionados.has(e.id))

  if (periodosOrdenados.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Selecciona al menos un período para ver el informe.
      </p>
    )
  }

  if (estudiantes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No se encontraron estudiantes para la búsqueda.
      </p>
    )
  }

  return (
    <div className="overflow-auto rounded-md border border-input">
      <table className="w-full min-w-max text-sm">
        <thead className="border-b bg-muted/10">
          <tr>
            <th rowSpan={2} className="w-10 px-4 py-3 align-bottom">
              <Checkbox
                aria-label="Seleccionar todos"
                checked={todosSeleccionados}
                onCheckedChange={onToggleTodos}
              />
            </th>
            <th rowSpan={2} className="px-4 py-3 text-left align-bottom font-semibold uppercase">
              Apellidos y nombres
            </th>
            <th rowSpan={2} className="px-2 py-3 text-center align-bottom font-semibold uppercase">
              Pe
            </th>
            <th className="px-3 py-3 text-left font-semibold uppercase">Observación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {estudiantes.map((estudiante) => (
            <tr key={estudiante.id}>
              <td className="px-4 py-3 align-top">
                <Checkbox
                  aria-label={`Seleccionar ${estudiante.nombreCompleto}`}
                  checked={seleccionados.has(estudiante.id)}
                  onCheckedChange={() => onToggleEstudiante(estudiante.id)}
                />
              </td>
              <td className="px-4 py-3 align-top font-medium whitespace-nowrap">
                {estudiante.nombreCompleto}
              </td>
              <td className="px-2 py-3 text-center align-top text-muted-foreground">
                <div className="flex flex-col gap-2.5">
                  {periodosOrdenados.map((periodo) => (
                    <span key={periodo.id} className="leading-6">
                      {periodo.id}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-3 align-top">
                <div className="flex flex-col gap-2.5">
                  {periodosOrdenados.map((periodo) => {
                    const texto = estudiante.observacionesPorPeriodo?.[periodo.id]
                    return (
                      <div key={periodo.id} className="flex max-w-md items-center gap-1.5">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                color={texto ? "primary" : "neutral"}
                                size="icon-xs"
                                className="shrink-0"
                                aria-label={
                                  texto
                                    ? `Ver observación de ${estudiante.nombreCompleto}`
                                    : `Agregar observación de ${estudiante.nombreCompleto}`
                                }
                                onClick={() => onAbrirObservacion(estudiante, periodo.id)}
                              />
                            }
                          >
                            {texto ? <EyeIcon /> : <PlusIcon />}
                          </TooltipTrigger>
                          <TooltipContent>{texto ? "Ver observación" : "Sin observación"}</TooltipContent>
                        </Tooltip>
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left hover:underline"
                          onClick={() => onAbrirObservacion(estudiante, periodo.id)}
                          title={texto}
                        >
                          {texto ? (
                            <span className="text-foreground">{texto}</span>
                          ) : (
                            <span className="text-muted-foreground">Sin observación</span>
                          )}
                        </button>
                        {texto && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  color="neutral"
                                  size="icon-xs"
                                  className="shrink-0"
                                  aria-label="Limpiar observación"
                                  onClick={() => onLimpiar(estudiante, periodo.id)}
                                />
                              }
                            >
                              <EraserIcon />
                            </TooltipTrigger>
                            <TooltipContent>Limpiar observación</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    )
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
