import { useEffect, useState } from "react"
import { useIsFetching } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CaretDownIcon,
  CaretUpIcon,
  ClipboardCheckIcon,
  ProhibitIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { PlanillaCelda, PlanillaColumna, PlanillaFila } from "@/features/planeador/api/types/planilla"
import { NOTA_MINIMA_APROBATORIA } from "@/features/planeador/api/types/calificacion"
import { CeldaNotaPopover } from "@/features/planeador/components/planilla/celda-nota-popover"
import { CeldaObservacionTrigger } from "@/features/planeador/components/planilla/celda-observacion-trigger"
import { esColumnaFormativa } from "@/features/planeador/lib/actividad-formativa"
import { todayDateOnly } from "@/features/planeador/lib/format-date"
import { useStudyPlanSubjectLabel } from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import { planillaCalificacionesQueryKeyPrefix } from "@/features/planeador/api/query/use-planilla-calificaciones-query"

interface PlanillaGridProps {
  columnas: PlanillaColumna[]
  /** "Actividad": una columna por actividad, sin agrupar. "Unidad": las
   *  mismas columnas, agrupadas bajo un `<th colSpan>` con la unidad
   *  temática de cada actividad (`PlanillaColumna.fkTunidad`/`unidad`).
   *  Catálogo real `AGRUPACION_PLANILLA`: "Actividades"/"Unidad". */
  verPor: "actividad" | "unidad"
  filas: PlanillaFila[]
  onAbrirBulk: (columna: PlanillaColumna) => void
  /** Abre el registro narrativo (Observación/Momento/Evidencia) de una actividad formativa. */
  onAbrirRegistroNarrativo: (columna: PlanillaColumna) => void
  /** Grado del filtro aplicado — solo para el rótulo dinámico del mensaje
   *  vacío ("Dimensión" en vez de "Asignatura" si el referente del grado
   *  lo personalizó). */
  gradoId?: number
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

export function celdaDe(fila: PlanillaFila, columna: PlanillaColumna): PlanillaCelda | undefined {
  return fila.celdas.find((c) => c.pkTactividad === columna.pkTactividad)
}

/** Lo decide el backend (`fn_actividad_es_formativa`): la actividad cuelga
 *  de una unidad con referente NO evaluativo. No se deduce del instrumento —
 *  una actividad evaluativa sin instrumento definido también lo trae nulo. */
export function esFormativa(columna: PlanillaColumna, celda?: PlanillaCelda): boolean {
  return esColumnaFormativa(columna) || celda?.esFormativa === true
}

/** `BODY.FECHA` de calificar/observar: el día con asistencia válida de ESE
 *  estudiante, no la fecha de inicio de la actividad — ver
 *  `PlanillaCelda.fechaAsistencia`. */
export function fechaParaGuardar(columna: PlanillaColumna, celda?: PlanillaCelda): string | null {
  if (!celda) return columna.fechaInicio
  if (celda.fechaAsistencia) return celda.fechaAsistencia
  return celda.tieneAsistencia ? columna.fechaInicio : null
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
export function PlanillaGrid({
  columnas,
  verPor,
  filas,
  onAbrirBulk,
  onAbrirRegistroNarrativo,
  gradoId,
}: PlanillaGridProps) {
  const subjectLabel = useStudyPlanSubjectLabel(gradoId, false)

  // Celdas recién guardadas cuya nota todavía no refleja el cambio: la
  // mutación resuelve antes de que termine el refetch de la Planilla, así
  // que sin esto la nota vieja se ve un instante después de "Guardar".
  const [refrescando, setRefrescando] = useState<Set<string>>(new Set())
  const fetchingPlanilla = useIsFetching({ queryKey: planillaCalificacionesQueryKeyPrefix() })

  useEffect(() => {
    if (fetchingPlanilla === 0 && refrescando.size > 0) setRefrescando(new Set())
  }, [fetchingPlanilla, refrescando.size])

  if (columnas.length === 0) {
    return (
      <div className="text-muted-foreground px-6 py-12 text-center text-sm">
        {`No hay actividades para el Grado/Grupo/${subjectLabel}/Periodo elegidos.`}
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
  // El backend manda `definitiva_proyectada` en null hasta que el estudiante
  // tiene algo calificado — con la columna entera en null (grupo recién
  // creado, o ningún estudiante calificado todavía) no aporta nada mostrarla.
  const mostrarDefinitiva = filas.some((fila) => fila.definitivaProyectada !== null)

  return (
    <div className="border-input overflow-auto rounded-md border">
      {/* `table-fixed`: sin esto el `w-40`/`truncate` de las columnas de
          actividad no hacen nada — en `auto` (el default) la columna crece
          al contenido más ancho (ej. una observación larga), ignorando el
          ancho declarado. */}
      <table className="w-full table-fixed text-sm">
        <thead className="bg-muted/10 border-b">
          {grupos ? (
            <>
              <tr>
                <th
                  rowSpan={2}
                  className="w-80 px-4 py-3 text-left align-bottom font-semibold uppercase"
                >
                  Nombres
                </th>
                {mostrarDefinitiva && (
                  <th
                    rowSpan={2}
                    className="w-28 px-4 py-3 text-left align-bottom font-semibold uppercase"
                  >
                    Definit. Proy.
                  </th>
                )}
                {grupos.map((grupo) => (
                  <th
                    key={grupo.fkTunidad ?? "sin-unidad"}
                    colSpan={grupo.columnas.length}
                    title={grupo.nombre}
                    className="border-b px-4 py-2 text-center font-semibold uppercase"
                  >
                    {/* Máximo 2 líneas — el nombre de la unidad puede ser
                        largo y, sin este tope, empujaba el alto de la fila
                        de cabecera hasta 4+ líneas. */}
                    <span className="line-clamp-2">{grupo.nombre}</span>
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
                      onAbrirRegistroNarrativo={onAbrirRegistroNarrativo}
                    />
                  )),
                )}
              </tr>
            </>
          ) : (
            <tr>
              <th className="w-80 px-4 py-3 text-left font-semibold uppercase">Nombres</th>
              {mostrarDefinitiva && (
                <th className="w-28 px-4 py-3 text-left font-semibold uppercase">Definit. Proy.</th>
              )}
              {columnas.map((columna) => (
                <ColumnaHeader
                  key={columna.pkTactividad}
                  columna={columna}
                  onAbrirBulk={onAbrirBulk}
                  onAbrirRegistroNarrativo={onAbrirRegistroNarrativo}
                />
              ))}
            </tr>
          )}
        </thead>
        <tbody className="divide-border divide-y">
          {filas.map((fila) => {
            const definitiva = fila.definitivaProyectadaHomologada

            return (
              <tr key={fila.pkTestudiante}>
                <td
                  className="truncate px-4 py-1.5 align-middle font-medium"
                  title={fila.nombreEstudiante}
                >
                  {fila.nombreEstudiante}
                </td>
                {mostrarDefinitiva && (
                  <td className="px-4 py-1.5 align-middle">
                    {definitiva !== null && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 font-semibold",
                          definitiva >= NOTA_MINIMA_APROBATORIA ? "text-green" : "text-red",
                        )}
                      >
                        {definitiva >= NOTA_MINIMA_APROBATORIA ? <CaretUpIcon /> : <CaretDownIcon />}
                        {definitiva.toFixed(2)}
                      </span>
                    )}
                  </td>
                )}
                {columnas.map((columna) => {
                  const celda = celdaDe(fila, columna)
                  if (celda?.estado === "NO_ASIGNADA") {
                    return (
                      <td key={columna.pkTactividad} className="bg-muted/40 px-4 py-1.5 align-middle">
                        <span
                          className="text-muted-foreground"
                          title="Este estudiante no está asignado a esta actividad."
                        >
                          No asignado
                        </span>
                      </td>
                    )
                  }
                  if (esFormativa(columna, celda)) {
                    return (
                      <td key={columna.pkTactividad} className="px-4 py-1.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          {celda && (
                            <CeldaObservacionTrigger
                              pkTactividadEstudiante={celda.pkTactividadEstudiante}
                              contexto={columna.titulo}
                              fecha={fechaParaGuardar(columna, celda)}
                              estudianteNombre={fila.nombreEstudiante}
                              observacionActual={celda.observacion}
                              evidenciasActuales={celda.evidencias}
                              actividadSinComenzar={columna.fechaInicio > todayDateOnly()}
                            />
                          )}
                          {celda?.observacion?.trim() ? (
                            <span className="min-w-0 flex-1 truncate text-xs" title={celda.observacion}>
                              {celda.observacion}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Agregar observación</span>
                          )}
                        </div>
                      </td>
                    )
                  }

                  // Con nota, `NO_CALIFICABLE` sí es un bloqueo real (la causa
                  // habitual es que falte la asistencia de ese día).
                  if (celda?.estado === "NO_CALIFICABLE") {
                    return (
                      <td key={columna.pkTactividad} className="px-4 py-1.5 align-middle">
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

                  const nota = celda ? celda.notaHomologada : null
                  const sinAsistencia = celda != null && !celda.tieneAsistencia
                  if (sinAsistencia) {
                    return (
                      <td key={columna.pkTactividad} className="bg-muted/40 px-4 py-1.5 align-middle">
                        <span
                          className="text-muted-foreground inline-flex items-center"
                          aria-label="Sin asistencia registrada"
                          title="No se puede calificar: falta registrar la asistencia de este estudiante."
                        >
                          <ProhibitIcon className="size-4" />
                        </span>
                      </td>
                    )
                  }
                  const claveCelda = `${columna.pkTactividad}:${celda?.pkTactividadEstudiante}`
                  const actualizandoNota = fetchingPlanilla > 0 && refrescando.has(claveCelda)
                  return (
                    <td key={columna.pkTactividad} className="px-4 py-1.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        {actualizandoNota ? (
                          <Spinner className="size-4" />
                        ) : nota !== null ? (
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
                            fecha={fechaParaGuardar(columna, celda) ?? columna.fechaInicio}
                            estudianteNombre={fila.nombreEstudiante}
                            onGuardado={() =>
                              setRefrescando((prev) => new Set(prev).add(claveCelda))
                            }
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
  onAbrirRegistroNarrativo,
}: {
  columna: PlanillaColumna
  onAbrirBulk: (columna: PlanillaColumna) => void
  onAbrirRegistroNarrativo: (columna: PlanillaColumna) => void
}) {
  const formativa = esFormativa(columna)
  const accion = formativa
    ? `Registro narrativo de "${columna.titulo}"`
    : `Calificar "${columna.titulo}" en bloque`
  return (
    <th className={cn(ANCHO_COLUMNA_ACTIVIDAD, "px-4 py-3 text-left font-semibold uppercase")}>
      <div className="flex items-start gap-1.5">
        {/* `line-clamp-2` en vez de `truncate` (una sola línea): el título
            de la actividad puede ser largo y una sola línea recortaba
            demasiado texto útil. */}
        <span className="line-clamp-2 min-w-0 flex-1 normal-case">{columna.titulo}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-xs"
                className="shrink-0"
                onClick={() => (formativa ? onAbrirRegistroNarrativo(columna) : onAbrirBulk(columna))}
                aria-label={accion}
              />
            }
          >
            <ClipboardCheckIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{accion}</TooltipContent>
        </Tooltip>
      </div>
    </th>
  )
}
