import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { EyeIcon, PlusIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { FilaInforme } from "@/features/academic-management/reports/api/types"
import { etiquetaPeriodo } from "@/features/academic-management/reports/lib/agrupar-filas"
import type { EstudianteFilas } from "@/features/academic-management/reports/lib/agrupar-filas"

interface ObservacionesTableProps {
  estudiantes: EstudianteFilas[]
  seleccionados: Set<number>
  onToggleEstudiante: (matriculaId: number) => void
  onToggleTodos: () => void
  onAbrirObservacion: (fila: FilaInforme) => void
}

export function ObservacionesTable({
  estudiantes,
  seleccionados,
  onToggleEstudiante,
  onToggleTodos,
  onAbrirObservacion,
}: ObservacionesTableProps) {
  const todosSeleccionados =
    estudiantes.length > 0 && estudiantes.every((e) => seleccionados.has(e.matriculaId))

  if (estudiantes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No se encontraron estudiantes para lo seleccionado.
      </p>
    )
  }

  return (
    <div className="overflow-auto rounded-md border border-input">
      <table className="w-full min-w-max text-sm">
        <thead className="border-b bg-muted/10">
          <tr>
            <th className="w-10 px-4 py-3 align-bottom">
              <Checkbox
                aria-label="Seleccionar todos"
                checked={todosSeleccionados}
                onCheckedChange={onToggleTodos}
              />
            </th>
            <th className="px-4 py-3 text-left align-bottom font-semibold uppercase">
              Apellidos y nombres
            </th>
            <th className="border-l border-border px-2 py-3 text-center align-bottom font-semibold uppercase">
              Pe
            </th>
            <th className="border-l border-border px-3 py-3 text-left font-semibold uppercase">
              Observación
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {estudiantes.map((estudiante) => (
            <tr key={estudiante.matriculaId}>
              <td className="px-4 py-3 align-top">
                <Checkbox
                  aria-label={`Seleccionar ${estudiante.nombreCompleto}`}
                  checked={seleccionados.has(estudiante.matriculaId)}
                  onCheckedChange={() => onToggleEstudiante(estudiante.matriculaId)}
                />
              </td>
              <td className="px-4 py-3 align-top font-medium whitespace-nowrap">
                {estudiante.nombreCompleto}
              </td>
              <td className="border-l border-border p-0 text-center align-top text-muted-foreground">
                <div className="flex flex-col divide-y divide-border">
                  {estudiante.filas.map((fila) => (
                    <span key={fila.periodoId} className="px-2 py-3 leading-6" title={fila.periodoNombre}>
                      {etiquetaPeriodo(fila)}
                    </span>
                  ))}
                </div>
              </td>
              <td className="border-l border-border p-0 align-top">
                <div className="flex flex-col divide-y divide-border">
                  {estudiante.filas.map((fila) => (
                    <div key={fila.periodoId} className="flex max-w-md items-center gap-1.5 px-3 py-3">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              color={fila.observacion ? "primary" : "neutral"}
                              size="icon-xs"
                              className="shrink-0"
                              aria-label={
                                fila.observacion
                                  ? `Ver observación de ${estudiante.nombreCompleto}`
                                  : `Agregar observación de ${estudiante.nombreCompleto}`
                              }
                              onClick={() => onAbrirObservacion(fila)}
                            />
                          }
                        >
                          {fila.observacion ? <EyeIcon /> : <PlusIcon />}
                        </TooltipTrigger>
                        <TooltipContent>
                          {fila.observacion ? "Ver observación" : "Sin observación"}
                        </TooltipContent>
                      </Tooltip>
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left hover:underline"
                        onClick={() => onAbrirObservacion(fila)}
                        title={fila.observacion ?? undefined}
                      >
                        {fila.observacion ? (
                          <span className="text-foreground">{fila.observacion}</span>
                        ) : (
                          <span className="text-muted-foreground">Sin observación</span>
                        )}
                      </button>
                      {fila.observacionDesactualizada && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Badge variant="soft" color="warning" className="shrink-0 cursor-default" />
                            }
                          >
                            Desactualizada
                          </TooltipTrigger>
                          <TooltipContent>
                            El docente dejó observaciones nuevas después de guardar este texto.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
