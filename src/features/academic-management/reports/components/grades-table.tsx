import { Checkbox } from "@/components/ui/checkbox"
import { CaretDownIcon, CaretUpIcon, InfoIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import type {
  AsignaturaInforme,
  FilaInforme,
} from "@/features/academic-management/reports/api/types"
import type {
  ColumnaAsignatura,
  EstudianteFilas,
} from "@/features/academic-management/reports/lib/agrupar-filas"

interface GradesTableProps {
  estudiantes: EstudianteFilas[]
  columnas: ColumnaAsignatura[]
  seleccionados: Set<number>
  onToggleEstudiante: (matriculaId: number) => void
  onToggleTodos: () => void
}

function formatNota(valor: number | null): string {
  return valor != null ? valor.toLocaleString("es-CO", { minimumFractionDigits: 1 }) : "—"
}

function CeldaAsignatura({ asignatura }: { asignatura: AsignaturaInforme | undefined }) {
  if (!asignatura || asignatura.estado === "sin_nota") {
    return <span className="text-muted-foreground">—</span>
  }

  if (!asignatura.esNumerico) {
    return <span>{asignatura.simbolo ?? asignatura.valoracion ?? "—"}</span>
  }

  if (asignatura.estado === "requerido") {
    const texto = asignatura.yaAsegurado
      ? "✓"
      : asignatura.alcanzable
        ? formatNota(asignatura.nota)
        : "*"
    const detalle = asignatura.yaAsegurado
      ? `Ya tiene asegurada ${asignatura.nombre}: no necesita nota en este período.`
      : asignatura.alcanzable
        ? `Nota mínima que debe sacar en este período para no perder ${asignatura.nombre}.`
        : `Ni sacando la nota máxima alcanzaría a aprobar ${asignatura.nombre} este año.`
    return (
      <Tooltip>
        <TooltipTrigger className="text-amber-600 italic outline-none dark:text-amber-500">
          {texto}
        </TooltipTrigger>
        <TooltipContent>{detalle}</TooltipContent>
      </Tooltip>
    )
  }

  if (asignatura.estado === "cambio_propuesto") {
    const subio =
      asignatura.notaPropuesta != null &&
      asignatura.nota != null &&
      asignatura.notaPropuesta > asignatura.nota
    return (
      <Tooltip>
        <TooltipTrigger className="inline-flex items-center gap-1 outline-none">
          <span className="font-medium">{formatNota(asignatura.nota)}</span>
          <span className="text-muted-foreground italic">
            {asignatura.notaPropuesta != null ? formatNota(asignatura.notaPropuesta) : "sin nota"}
          </span>
          {asignatura.notaPropuesta != null &&
            (subio ? (
              <CaretUpIcon className="size-3 text-green" />
            ) : (
              <CaretDownIcon className="size-3 text-red" />
            ))}
        </TooltipTrigger>
        <TooltipContent>
          {asignatura.notaPropuesta != null
            ? "El docente cambió la nota después de consolidar: primero la guardada, luego la propuesta."
            : "El docente dio de baja las actividades que sustentaban esta nota."}
        </TooltipContent>
      </Tooltip>
    )
  }

  const proyectada = asignatura.estado === "proyectada"
  return (
    <span
      className={cn(proyectada && "text-muted-foreground italic")}
      title={proyectada ? "Nota proyectada, sin consolidar" : undefined}
    >
      {formatNota(asignatura.nota)}
    </span>
  )
}

function CeldaPromedio({ fila }: { fila: FilaInforme }) {
  if (fila.modoPeriodo === "requerido") {
    return (
      <Tooltip>
        <TooltipTrigger className="text-amber-600 italic outline-none dark:text-amber-500">
          {formatNota(fila.promedioProyectado)}
        </TooltipTrigger>
        <TooltipContent>Mínimo del grado para aprobar.</TooltipContent>
      </Tooltip>
    )
  }
  const sinConsolidar = fila.promedioGuardado == null
  return (
    <span
      className={cn(sinConsolidar && "text-muted-foreground italic")}
      title={sinConsolidar ? "Promedio proyectado, sin consolidar" : undefined}
    >
      {formatNota(sinConsolidar ? fila.promedioProyectado : fila.promedioGuardado)}
    </span>
  )
}

const COLUMNAS_RESUMEN = [
  { key: "promedio", label: "PR", descripcion: "Promedio general del período" },
  { key: "puesto", label: "PU", descripcion: "Puesto dentro del grupo" },
  { key: "aprobadas", label: "AP", descripcion: "Asignaturas aprobadas" },
  { key: "reprobadas", label: "RE", descripcion: "Asignaturas reprobadas" },
] as const

function valorResumen(fila: FilaInforme, key: (typeof COLUMNAS_RESUMEN)[number]["key"]) {
  switch (key) {
    case "puesto":
      return fila.puesto != null ? String(fila.puesto) : "—"
    case "aprobadas":
      return String(fila.aprobadas)
    case "reprobadas":
      return String(fila.reprobadas)
    default:
      return null
  }
}

export function GradesTable({
  estudiantes,
  columnas,
  seleccionados,
  onToggleEstudiante,
  onToggleTodos,
}: GradesTableProps) {
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
              <InfoIcon className="ml-1 inline size-3 text-muted-foreground" />
            </th>
            {COLUMNAS_RESUMEN.map((columna) => (
              <th
                key={columna.key}
                className="border-l border-border px-3 py-3 text-center font-semibold uppercase"
              >
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 outline-none">
                    {columna.label}
                    <InfoIcon className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{columna.descripcion}</TooltipContent>
                </Tooltip>
              </th>
            ))}
            {columnas.map((columna) => (
              <th
                key={columna.id}
                className="border-l border-border px-3 py-3 text-center font-semibold uppercase"
              >
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 outline-none">
                    {columna.abreviacion}
                    <InfoIcon className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{columna.nombre}</TooltipContent>
                </Tooltip>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {estudiantes.map((estudiante) => (
            <tr
              key={estudiante.matriculaId}
              className={cn(seleccionados.has(estudiante.matriculaId) && "bg-primary/5")}
            >
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
                    <span key={fila.periodoId} className="px-2 py-1.5" title={fila.periodoNombre}>
                      {fila.periodoNombre.match(/\d+/)?.[0] ?? fila.periodoNombre}
                    </span>
                  ))}
                </div>
              </td>
              {COLUMNAS_RESUMEN.map((columna) => (
                <td
                  key={columna.key}
                  className="border-l border-border p-0 text-center align-top"
                >
                  <div className="flex flex-col divide-y divide-border">
                    {estudiante.filas.map((fila) => (
                      <div key={fila.periodoId} className="px-3 py-1.5">
                        {columna.key === "promedio" ? (
                          <CeldaPromedio fila={fila} />
                        ) : (
                          <span>{valorResumen(fila, columna.key)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
              ))}
              {columnas.map((columna) => (
                <td key={columna.id} className="border-l border-border p-0 text-center align-top">
                  <div className="flex flex-col divide-y divide-border">
                    {estudiante.filas.map((fila) => (
                      <div key={fila.periodoId} className="px-3 py-1.5">
                        <CeldaAsignatura
                          asignatura={fila.asignaturas.find((a) => a.asignaturaId === columna.id)}
                        />
                      </div>
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
