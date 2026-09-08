import { Button } from "@/components/ui/button"
import { CaretDownIcon, CaretUpIcon, ClipboardCheckIcon, ProhibitIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { PlanillaCelda, PlanillaColumna, PlanillaFila } from "@/features/planeador/api/types/planilla"
import { NOTA_MINIMA_APROBATORIA, notaEnEscalaCinco } from "@/features/planeador/api/types/calificacion"
import { CeldaNotaPopover } from "@/features/planeador/components/planilla/celda-nota-popover"

interface PlanillaGridProps {
  columnas: PlanillaColumna[]
  /** "Actividad": una columna por actividad, sin agrupar. "Unidad": las
   *  mismas columnas, agrupadas bajo un `<th colSpan>` con la unidad
   *  temática de cada actividad (`PlanillaColumna.fkTunidad`/`unidad`).
   *  Catálogo real `AGRUPACION_PLANILLA`: "Actividades"/"Unidad". */
  verPor: "actividad" | "unidad"
  filas: PlanillaFila[]
  onAbrirBulk: (columna: PlanillaColumna) => void
}

interface GrupoUnidad {
  /** `null` = actividad huérfana (sin unidad) — agrupan todas juntas bajo
   *  "Sin unidad" en vez de una columna por cada una. */
  fkTunidad: number | null
  nombre: string
  columnas: PlanillaColumna[]
}

/** Agrupa manteniendo el orden de aparición de cada unidad en `columnas`
 *  (no alfabético) — así el orden de columnas no salta al cambiar
 *  "Ver por". Agrupa por `fkTunidad` (id real), no por el nombre: dos
 *  unidades distintas podrían compartir nombre. */
function agruparPorUnidad(columnas: PlanillaColumna[]): GrupoUnidad[] {
  const grupos: GrupoUnidad[] = []
  const porId = new Map<number | null, GrupoUnidad>()
  for (const columna of columnas) {
    let grupo = porId.get(columna.fkTunidad)
    if (!grupo) {
      grupo = { fkTunidad: columna.fkTunidad, nombre: columna.unidad ?? "Sin unidad", columnas: [] }
      porId.set(columna.fkTunidad, grupo)
      grupos.push(grupo)
    }
    grupo.columnas.push(columna)
  }
  return grupos
}

function celdaDe(fila: PlanillaFila, columna: PlanillaColumna): PlanillaCelda | undefined {
  return fila.celdas.find((c) => c.pkTactividad === columna.pkTactividad)
}

/** El backend ya devuelve `calificacion`/`definitiva` calculados — acá solo
 *  se convierten a la escala 1.0-5.0 que usa el boletín colombiano (mismo
 *  criterio que antes, cuando el porcentaje se calculaba en el cliente). */
function formatNota(porcentaje: number | null): number | null {
  return porcentaje !== null ? notaEnEscalaCinco(porcentaje) : null
}

/**
 * Grilla de la Planilla: una fila por estudiante, una columna por actividad
 * (más "Definit. Proy." al frente), opcionalmente agrupadas por unidad
 * temática. Lee directo lo que ya trae `/planilla/calificaciones` (estado,
 * calificación, definitiva) — no recalcula porcentajes en el cliente, el
 * backend real ya los resuelve.
 *
 * El botón del header de cada columna dispara la calificación en bloque de
 * esa actividad (`onAbrirBulk`); el de cada celda abre el popover de
 * calificación puntual (`CeldaNotaPopover`), que guarda directo contra el
 * backend.
 */
export function PlanillaGrid({ columnas, verPor, filas, onAbrirBulk }: PlanillaGridProps) {
  if (columnas.length === 0) {
    return (
      <div className="text-muted-foreground px-6 py-12 text-center text-sm">
        No hay actividades para el Grado/Grupo/Asignatura/Periodo elegidos.
      </div>
    )
  }

  if (filas.length === 0) {
    return (
      <div className="text-muted-foreground px-6 py-12 text-center text-sm">
        Ninguna de estas actividades tiene estudiantes asignados.
      </div>
    )
  }

  const grupos = verPor === "unidad" ? agruparPorUnidad(columnas) : null

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
                    key={grupo.fkTunidad ?? "sin-unidad"}
                    colSpan={grupo.columnas.length}
                    className="border-b px-4 py-2 text-center font-semibold uppercase"
                  >
                    {grupo.nombre}
                  </th>
                ))}
              </tr>
              <tr>
                {grupos.map((grupo) =>
                  grupo.columnas.map((columna) => (
                    <ColumnaHeader
                      key={columna.pkTactividad}
                      columna={columna}
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
              {columnas.map((columna) => (
                <ColumnaHeader
                  key={columna.pkTactividad}
                  columna={columna}
                  onAbrirBulk={onAbrirBulk}
                />
              ))}
            </tr>
          )}
        </thead>
        <tbody className="divide-border divide-y">
          {filas.map((fila) => {
            const definitiva = formatNota(fila.definitivaProyectada)

            return (
              <tr key={fila.pkTestudiante}>
                <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">
                  {fila.nombreEstudiante}
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
                {columnas.map((columna) => {
                  const celda = celdaDe(fila, columna)
                  const bloqueada = celda?.estado === "NO_CALIFICABLE"
                  if (bloqueada) {
                    return (
                      <td key={columna.pkTactividad} className="px-4 py-3 align-middle">
                        <span
                          className="text-red inline-flex items-center"
                          aria-label="No calificable"
                          title="No calificable (¿falta asistencia?)"
                        >
                          <ProhibitIcon className="size-4" />
                        </span>
                      </td>
                    )
                  }

                  const nota = celda ? formatNota(celda.calificacion) : null
                  return (
                    <td key={columna.pkTactividad} className="px-4 py-3 align-middle">
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
                        {celda && (
                          <CeldaNotaPopover
                            actividadId={columna.pkTactividad}
                            pkTactividadEstudiante={celda.pkTactividadEstudiante}
                            fecha={columna.fechaInicio}
                            estudianteNombre={fila.nombreEstudiante}
                          />
                        )}
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

/** Ancho fijo por columna de actividad — así ninguna actividad hace más
 *  ancha su columna que las demás. */
const ANCHO_COLUMNA_ACTIVIDAD = "w-40"

function ColumnaHeader({
  columna,
  onAbrirBulk,
}: {
  columna: PlanillaColumna
  onAbrirBulk: (columna: PlanillaColumna) => void
}) {
  return (
    <th className={cn(ANCHO_COLUMNA_ACTIVIDAD, "px-4 py-3 text-left font-semibold uppercase")}>
      <div className="flex items-start gap-1.5">
        {/* `line-clamp-2` en vez de `truncate` (una sola línea): el título
            de la actividad puede ser largo y una sola línea recortaba
            demasiado texto útil. */}
        <span className="line-clamp-2 min-w-0 flex-1 normal-case">{columna.titulo}</span>
        <Button
          variant="ghost"
          color="neutral"
          size="icon-xs"
          className="shrink-0"
          onClick={() => onAbrirBulk(columna)}
          aria-label={`Calificar "${columna.titulo}" en bloque`}
        >
          <ClipboardCheckIcon className="size-4" />
        </Button>
      </div>
    </th>
  )
}
