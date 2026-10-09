import { useEffect, useState } from "react"
import { useIsFetching } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CaretDownIcon,
  CaretUpIcon,
  ClipboardCheckIcon,
  LockIcon,
  ProhibitIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { PlanillaCelda, PlanillaColumna, PlanillaFila } from "@/features/planeador/api/types/planilla"
import {
  CeldaNotaPopover,
  type CambioPendiente,
} from "@/features/planeador/components/planilla/celda-nota-popover"
import { CeldaObservacionTrigger } from "@/features/planeador/components/planilla/celda-observacion-trigger"
import { esColumnaFormativa } from "@/features/planeador/lib/actividad-formativa"
import { todayDateOnly } from "@/features/planeador/lib/format-date"
import { useStudyPlanSubjectLabel } from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

interface PlanillaGridProps {
  columnas: PlanillaColumna[]
  verPor: "actividad" | "unidad"
  filas: PlanillaFila[]
  onAbrirBulk: (columna: PlanillaColumna) => void
  gradoId?: number
  /** Periodo cerrado: cambios sin enviar por `pkTactividadEstudiante`. */
  cambios?: Map<number, CambioPendiente>
  onCambio?: (pkTactividadEstudiante: number, cambio: CambioPendiente | null) => void
}

interface GrupoUnidad {
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

export function PlanillaGrid({
  columnas,
  verPor,
  filas,
  onAbrirBulk,
  gradoId,
  cambios,
  onCambio,
}: PlanillaGridProps) {
  const subjectLabel = useStudyPlanSubjectLabel(gradoId, false)

  const [refrescando, setRefrescando] = useState<Set<string>>(new Set())
  const fetchingPlanilla = useIsFetching({ queryKey: planeadorKeys.planilla.calificaciones.all })

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
  const mostrarDefinitiva = filas.some((fila) => fila.definitivaProyectada !== null)

  return (
    <div className="border-input overflow-auto rounded-md border">
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
                />
              ))}
            </tr>
          )}
        </thead>
        <tbody className="divide-border divide-y">
          {filas.map((fila) => {
            const definitiva = fila.definitivaProyectadaHomologada
            const propuesta = fila.definitivaPropuestaHomologada ?? null
            const nota = propuesta ?? definitiva

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
                    {nota !== null && (
                      <NotaConCambio
                        nota={nota}
                        anterior={propuesta !== null ? definitiva : null}
                        titulo="Con los cambios pendientes de aprobación"
                      />
                    )}
                  </td>
                )}
                {columnas.map((columna) => {
                  const celda = celdaDe(fila, columna)
                  if (celda?.estado === "NO_ASIGNADA") {
                    return (
                      <td key={columna.pkTactividad} className="bg-muted/40 px-4 py-1.5 align-middle">
                        <span
                          className="text-muted-foreground inline-flex"
                          title="Este estudiante no está asignado a esta actividad."
                          aria-label="No asignado"
                        >
                          <LockIcon />
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
                  const bloqueo = nota === null ? BLOQUEO_RESULTADO[celda?.estadoResultado ?? ""] : undefined
                  if (bloqueo) {
                    return (
                      <td key={columna.pkTactividad} className="px-4 py-1.5 align-middle">
                        <span className="text-muted-foreground" title={bloqueo.titulo}>
                          {bloqueo.texto}
                        </span>
                      </td>
                    )
                  }
                  const claveCelda =`${columna.pkTactividad}:${celda?.pkTactividadEstudiante}`
                  const actualizandoNota = fetchingPlanilla > 0 && refrescando.has(claveCelda)
                  const cambio = celda ? cambios?.get(celda.pkTactividadEstudiante) : undefined
                  const propuesta = cambio
                    ? cambio.notaPropuesta
                    : celda?.solicitudPendiente
                      ? celda.notaPropuestaHomologada
                      : null
                  const tituloCambio = cambio ? "Cambio sin enviar" : "Pendiente de aprobación"
                  return (
                    <td key={columna.pkTactividad} className="px-4 py-1.5 align-middle">
                      <div className="flex items-start gap-1.5">
                        {actualizandoNota ? (
                          <Spinner className="size-4" />
                        ) : propuesta != null ? (
                          <div className="w-12">
                            <NotaConCambio nota={propuesta} anterior={nota} titulo={tituloCambio} />
                          </div>
                        ) : nota !== null ? (
                          <span className="w-12 font-medium">{nota.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">Agregar</span>
                        )}
                        {!actualizandoNota && propuesta == null && (cambio || celda?.solicitudPendiente) && (
                          <span className="text-orange text-xs font-semibold" title={tituloCambio}>
                            {cambio ? "Editado" : "Pendiente"}
                          </span>
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
                            onCambio={onCambio}
                            cambioPendiente={cambio}
                            calificacionPropuesta={
                              celda.solicitudPendiente ? celda.calificacionPropuesta : undefined
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

/** Nota nueva con flecha (sube/baja) y la anterior debajo, atenuada. */
function NotaConCambio({ nota, anterior, titulo }: { nota: number; anterior: number | null; titulo?: string }) {
  const cambio = anterior !== null && anterior !== nota
  return (
    <div className="flex flex-col leading-tight" title={cambio ? titulo : undefined}>
      <span className="inline-flex items-center gap-0.5 font-medium">
        {nota.toFixed(2)}
        {cambio &&
          (nota > anterior ? <CaretUpIcon className="text-green" /> : <CaretDownIcon className="text-red" />)}
      </span>
      {cambio && <span className="text-muted-foreground text-xs">{anterior.toFixed(2)}</span>}
    </div>
  )
}

/** Estados de resultado que impiden calificar (Regla 62), con su rótulo. */
const BLOQUEO_RESULTADO: Record<string, { texto: string; titulo: string }> = {
  NO_PRESENTO: { texto: "No presentó", titulo: "El estudiante no presentó." },
  NO_ASISTIO_JUSTIFICADA: { texto: "No asistió (J)", titulo: "No asistió, con excusa." },
  NO_ASISTIO_NO_JUSTIFICADA: { texto: "No asistió (NJ)", titulo: "No asistió, sin excusa." },
}

const ANCHO_COLUMNA_ACTIVIDAD = "w-40"

function ColumnaHeader({
  columna,
  onAbrirBulk,
}: {
  columna: PlanillaColumna
  onAbrirBulk: (columna: PlanillaColumna) => void
}) {
  const formativa = esFormativa(columna)
  const accion = `Calificar "${columna.titulo}" en bloque`
  return (
    <th className={cn(ANCHO_COLUMNA_ACTIVIDAD, "px-4 py-3 text-left font-semibold uppercase")}>
      <div className="flex items-start gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={<span className="line-clamp-2 min-w-0 flex-1 cursor-default normal-case" />}
          >
            {columna.titulo}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs normal-case">{columna.titulo}</TooltipContent>
        </Tooltip>
        {!formativa && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-xs"
                  className="shrink-0"
                  onClick={() => onAbrirBulk(columna)}
                  aria-label={accion}
                />
              }
            >
              <ClipboardCheckIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{accion}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </th>
  )
}
