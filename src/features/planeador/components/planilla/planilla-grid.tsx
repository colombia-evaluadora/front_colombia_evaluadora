import { Button } from "@/components/ui/button"
import { CaretDownIcon, CaretUpIcon, ClipboardCheckIcon, ProhibitIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { EstadoAsistencia, NotaCriterio } from "@/features/planeador/api/types/calificacion"
import {
  NOTA_MINIMA_APROBATORIA,
  itemsPonderables,
  notaDefinitiva,
  notaEnEscalaCinco,
  porcentajeFinal,
} from "@/features/planeador/api/types/calificacion"
import { CeldaNotaPopover } from "@/features/planeador/components/planilla/celda-nota-popover"

interface FilaEstudiante {
  id: number
  nombres: string
  apellidos: string
}

interface PlanillaGridProps {
  actividades: Actividad[]
  /** "Actividad": una columna por actividad, sin agrupar. "Unidad": las
   *  mismas columnas, agrupadas bajo un `<th colSpan>` con el nombre de la
   *  unidad temática de cada actividad (`actividad.unidad`). */
  verPor: "actividad" | "unidad"
  /** Notas de cada estudiante por actividad, ya con los overrides locales
   *  (bulk/popover) aplicados encima de lo que trajo el mock —
   *  `PlaneadorPlanillaPage` resuelve esa fusión, acá solo se lee. Mapa de
   *  `actividadId` → mapa de `estudianteId` → notas. */
  notasPorActividad: Map<number, Map<number, NotaCriterio[]>>
  /** Asistencia de cada estudiante a cada actividad — si faltó
   *  (`"no-asistio"`), la celda se bloquea en vez de mostrar una nota
   *  editable: no hay qué calificar de una actividad a la que no fue. */
  asistenciaPorActividad: Map<number, Map<number, EstadoAsistencia>>
  estudiantes: FilaEstudiante[]
  onAbrirBulk: (actividadId: number) => void
  onGuardarCelda: (actividadId: number, estudianteId: number, nota: NotaCriterio[]) => void
}

interface GrupoUnidad {
  id: number
  nombre: string
  actividades: Actividad[]
}

/** Agrupa manteniendo el orden de aparición de cada unidad en `actividades`
 *  (no alfabético) — así el orden de columnas no salta al cambiar "Ver por". */
function agruparPorUnidad(actividades: Actividad[]): GrupoUnidad[] {
  const grupos: GrupoUnidad[] = []
  const porId = new Map<number, GrupoUnidad>()
  for (const actividad of actividades) {
    let grupo = porId.get(actividad.unidad.id)
    if (!grupo) {
      grupo = { id: actividad.unidad.id, nombre: actividad.unidad.nombre, actividades: [] }
      porId.set(actividad.unidad.id, grupo)
      grupos.push(grupo)
    }
    grupo.actividades.push(actividad)
  }
  return grupos
}

/**
 * Grilla de la Planilla: una fila por estudiante, una columna por actividad
 * filtrada (más "Definit. Proy." al frente), opcionalmente agrupadas por
 * unidad temática. Markup crudo, mismo estilo que `CalificacionesView` (no
 * el `DataTable` genérico — criterio ya establecido en esta sub-feature del
 * Planeador).
 *
 * El botón del header de cada columna dispara la calificación en bloque de
 * esa actividad (`onAbrirBulk`); el de cada celda abre el popover de
 * calificación puntual (`CeldaNotaPopover`) para ese estudiante.
 */
export function PlanillaGrid({
  actividades,
  verPor,
  notasPorActividad,
  asistenciaPorActividad,
  estudiantes,
  onAbrirBulk,
  onGuardarCelda,
}: PlanillaGridProps) {
  if (actividades.length === 0) {
    return (
      <div className="text-muted-foreground px-6 py-12 text-center text-sm">
        No hay actividades para el Grado/Grupo/Asignatura/Periodo elegidos.
      </div>
    )
  }

  if (estudiantes.length === 0) {
    return (
      <div className="text-muted-foreground px-6 py-12 text-center text-sm">
        Ninguna de estas actividades tiene estudiantes asignados.
      </div>
    )
  }

  const grupos = verPor === "unidad" ? agruparPorUnidad(actividades) : null

  return (
    <div className="border-input overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/10 border-b">
          {grupos ? (
            <>
              <tr>
                <th rowSpan={2} className="px-4 py-3 text-left align-bottom font-semibold uppercase">
                  Nombres
                </th>
                <th rowSpan={2} className="px-4 py-3 text-left align-bottom font-semibold uppercase">
                  Definit. Proy.
                </th>
                {grupos.map((grupo) => (
                  <th
                    key={grupo.id}
                    colSpan={grupo.actividades.length}
                    className="border-b px-4 py-2 text-center font-semibold uppercase"
                  >
                    {grupo.nombre}
                  </th>
                ))}
              </tr>
              <tr>
                {grupos.map((grupo) =>
                  grupo.actividades.map((actividad) => (
                    <ColumnaActividadHeader
                      key={actividad.id}
                      actividad={actividad}
                      onAbrirBulk={onAbrirBulk}
                    />
                  )),
                )}
              </tr>
            </>
          ) : (
            <tr>
              <th className="px-4 py-3 text-left font-semibold uppercase">Nombres</th>
              <th className="px-4 py-3 text-left font-semibold uppercase">Definit. Proy.</th>
              {actividades.map((actividad) => (
                <ColumnaActividadHeader
                  key={actividad.id}
                  actividad={actividad}
                  onAbrirBulk={onAbrirBulk}
                />
              ))}
            </tr>
          )}
        </thead>
        <tbody className="divide-border divide-y">
          {estudiantes.map((estudiante) => {
            const entradasDefinitiva = actividades.map((actividad) => ({
              actividad,
              notas: notasPorActividad.get(actividad.id)?.get(estudiante.id) ?? [],
            }))
            const definitivaPct = notaDefinitiva(entradasDefinitiva)
            const definitiva = definitivaPct !== null ? notaEnEscalaCinco(definitivaPct) : null

            return (
              <tr key={estudiante.id}>
                <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">
                  {estudiante.nombres} {estudiante.apellidos}
                </td>
                <td className="px-4 py-3 align-middle">
                  {definitiva !== null ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 font-semibold",
                        definitiva >= NOTA_MINIMA_APROBATORIA ? "text-green" : "text-red",
                      )}
                    >
                      {definitiva >= NOTA_MINIMA_APROBATORIA ? <CaretUpIcon /> : <CaretDownIcon />}
                      {definitiva.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Agregar</span>
                  )}
                </td>
                {actividades.map((actividad) => {
                  const bloqueada =
                    asistenciaPorActividad.get(actividad.id)?.get(estudiante.id) === "no-asistio"
                  if (bloqueada) {
                    return (
                      <td key={actividad.id} className="px-4 py-3 align-middle">
                        <span
                          className="text-red inline-flex items-center"
                          aria-label="No asistió — sin calificación"
                          title="No asistió"
                        >
                          <ProhibitIcon className="size-4" />
                        </span>
                      </td>
                    )
                  }

                  const notas = notasPorActividad.get(actividad.id)?.get(estudiante.id) ?? []
                  const porcentaje = porcentajeFinal(notas, itemsPonderables(actividad))
                  const nota = porcentaje !== null ? notaEnEscalaCinco(porcentaje) : null
                  return (
                    <td key={actividad.id} className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        {nota !== null ? (
                          <span
                            className={cn(
                              "font-medium",
                              nota >= NOTA_MINIMA_APROBATORIA ? "text-green" : "text-red",
                            )}
                          >
                            {nota.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Agregar</span>
                        )}
                        <CeldaNotaPopover
                          actividad={actividad}
                          estudianteNombre={`${estudiante.nombres} ${estudiante.apellidos}`}
                          notaActual={notas}
                          onGuardar={(next) => onGuardarCelda(actividad.id, estudiante.id, next)}
                        />
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Ancho fijo por columna de actividad — mismo criterio para las tres
 *  celdas que comparten esta medida (header, `<colgroup>` y celdas de
 *  datos no lo necesitan explícito porque heredan del header): así ninguna
 *  actividad hace más ancha su columna que las demás. */
const ANCHO_COLUMNA_ACTIVIDAD = "w-40"

function ColumnaActividadHeader({
  actividad,
  onAbrirBulk,
}: {
  actividad: Actividad
  onAbrirBulk: (actividadId: number) => void
}) {
  return (
    <th className={cn(ANCHO_COLUMNA_ACTIVIDAD, "px-4 py-3 text-left font-semibold uppercase")}>
      <div className="flex items-start gap-1.5">
        {/* `line-clamp-2` en vez de `truncate` (una sola línea): el nombre
            de la actividad puede ser largo y una sola línea recortaba
            demasiado texto útil — dos líneas con "…" al final de la
            segunda aprovechan mejor el ancho fijo de la columna. */}
        <span className="line-clamp-2 min-w-0 flex-1 normal-case">{actividad.nombre}</span>
        <Button
          variant="ghost"
          color="neutral"
          size="icon-xs"
          className="shrink-0"
          onClick={() => onAbrirBulk(actividad.id)}
          aria-label={`Calificar "${actividad.nombre}" en bloque`}
        >
          <ClipboardCheckIcon className="size-4" />
        </Button>
      </div>
    </th>
  )
}
