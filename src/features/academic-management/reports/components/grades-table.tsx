import { Checkbox } from "@/components/ui/checkbox"
import { InfoIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import {
  COLUMNAS_ASIGNATURAS,
  COLUMNAS_RESUMEN,
  NOTA_MAXIMA,
  NOTA_MINIMA_APROBATORIA,
  PERIODOS,
  PESOS_PERIODO,
} from "@/features/academic-management/reports/api/mock-data"
import type {
  ColumnaAsignatura,
  EstudianteInforme,
  PeriodoId,
} from "@/features/academic-management/reports/api/types"

interface GradesTableProps {
  estudiantes: EstudianteInforme[]
  periodos: PeriodoId[]
  seleccionados: Set<number>
  onToggleEstudiante: (id: number) => void
  onToggleTodos: () => void
}

function ColumnaHeader({ columna }: { columna: ColumnaAsignatura }) {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center gap-1 outline-none">
        {columna.label}
        <InfoIcon className="size-3 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>{columna.descripcion}</TooltipContent>
    </Tooltip>
  )
}

function valorCelda(estudiante: EstudianteInforme, periodo: PeriodoId, columna: ColumnaAsignatura): string {
  const notasPeriodo = estudiante.notasPorPeriodo[periodo]
  if (!notasPeriodo) return "—"
  const valor =
    columna.key in notasPeriodo.asignaturas
      ? notasPeriodo.asignaturas[columna.key]
      : (notasPeriodo[columna.key as keyof typeof notasPeriodo] as number | undefined)
  return valor != null ? valor.toLocaleString("es-CO", { minimumFractionDigits: 1 }) : "—"
}


function calcularNotaFaltante(
  estudiante: EstudianteInforme,
  columna: ColumnaAsignatura,
): { valor: number; imposible: boolean } | null {
  let sumaConocida = 0
  let pesoFaltante = 0
  for (const [periodoStr, peso] of Object.entries(PESOS_PERIODO)) {
    const periodo = Number(periodoStr) as PeriodoId
    const valor = estudiante.notasPorPeriodo[periodo]?.asignaturas[columna.key]
    if (valor != null) sumaConocida += valor * peso
    else pesoFaltante += peso ?? 0
  }
  if (pesoFaltante === 0) return null
  const requerido = (NOTA_MINIMA_APROBATORIA - sumaConocida) / pesoFaltante
  return { valor: requerido, imposible: requerido > NOTA_MAXIMA }
}


function CeldaValor({
  estudiante,
  periodo,
  columna,
  esAsignatura,
}: {
  estudiante: EstudianteInforme
  periodo: PeriodoId
  columna: ColumnaAsignatura
  esAsignatura: boolean
}) {
  const notasPeriodo = estudiante.notasPorPeriodo[periodo]

  if (!notasPeriodo && esAsignatura && periodo !== 4) {
    const faltante = calcularNotaFaltante(estudiante, columna)
    if (faltante) {
      return (
        <Tooltip>
          <TooltipTrigger className="text-amber-600 italic outline-none dark:text-amber-500">
            {faltante.imposible ? "*" : faltante.valor.toLocaleString("es-CO", { minimumFractionDigits: 1 })}
          </TooltipTrigger>
          <TooltipContent>
            {faltante.imposible
              ? "Ni sacando la nota máxima alcanzaría a aprobar esta asignatura este año."
              : `Nota mínima que debe sacar en este período para no perder ${columna.label}.`}
          </TooltipContent>
        </Tooltip>
      )
    }
  }

  const confirmado = notasPeriodo?.confirmado ?? true
  return (
    <span className={cn(!confirmado && "text-muted-foreground italic")} title={!confirmado ? "Nota proyectada, sin guardar" : undefined}>
      {valorCelda(estudiante, periodo, columna)}
    </span>
  )
}

export function GradesTable({
  estudiantes,
  periodos,
  seleccionados,
  onToggleEstudiante,
  onToggleTodos,
}: GradesTableProps) {
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
              <InfoIcon className="ml-1 inline size-3 text-muted-foreground" />
            </th>
            {COLUMNAS_RESUMEN.map((columna) => (
              <th key={columna.key} className="px-3 py-3 text-center font-semibold uppercase">
                <ColumnaHeader columna={columna} />
              </th>
            ))}
            {COLUMNAS_ASIGNATURAS.map((columna) => (
              <th key={columna.key} className="px-3 py-3 text-center font-semibold uppercase">
                <ColumnaHeader columna={columna} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {estudiantes.map((estudiante) => (
            <tr key={estudiante.id} className={cn(seleccionados.has(estudiante.id) && "bg-primary/5")}>
              <td className="px-4 py-3 align-top">
                <Checkbox
                  aria-label={`Seleccionar ${estudiante.nombreCompleto}`}
                  checked={seleccionados.has(estudiante.id)}
                  onCheckedChange={() => onToggleEstudiante(estudiante.id)}
                />
              </td>
              <td className="px-4 py-3 align-top font-medium whitespace-nowrap">{estudiante.nombreCompleto}</td>
              <td className="px-2 py-3 text-center align-top text-muted-foreground">
                <div className="flex flex-col gap-1.5">
                  {periodosOrdenados.map((periodo) => (
                    <span key={periodo.id}>{periodo.id}</span>
                  ))}
                </div>
              </td>
              {COLUMNAS_RESUMEN.map((columna) => (
                <td key={columna.key} className="px-3 py-3 text-center align-top">
                  <div className="flex flex-col gap-1.5">
                    {periodosOrdenados.map((periodo) => (
                      <CeldaValor
                        key={periodo.id}
                        estudiante={estudiante}
                        periodo={periodo.id}
                        columna={columna}
                        esAsignatura={false}
                      />
                    ))}
                  </div>
                </td>
              ))}
              {COLUMNAS_ASIGNATURAS.map((columna) => (
                <td key={columna.key} className="px-3 py-3 text-center align-top">
                  <div className="flex flex-col gap-1.5">
                    {periodosOrdenados.map((periodo) => (
                      <CeldaValor
                        key={periodo.id}
                        estudiante={estudiante}
                        periodo={periodo.id}
                        columna={columna}
                        esAsignatura
                      />
                    ))}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
