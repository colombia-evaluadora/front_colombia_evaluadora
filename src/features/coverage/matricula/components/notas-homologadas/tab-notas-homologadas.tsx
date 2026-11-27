import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FichaDatos } from "@/components/ficha-datos"
import { ACTIONS_CELL_CLASS, actionsOverlayClass } from "@/components/table-row-actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ArrowCounterClockwiseIcon, EyeIcon, GitMergeIcon, InfoIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { OnlineOnlyAction } from "@/components/offline/online-only-action"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useNotasHomologadasQuery } from "@/features/coverage/matricula/api/query/use-notas-homologadas"
import { useSnapshotPendienteQuery } from "@/features/coverage/matricula/api/query/use-snapshot-pendiente"
import { DialogHomologarSnapshot } from "@/features/coverage/matricula/components/notas-homologadas/dialog-homologar-snapshot"
import type { NotaHomologada, SnapshotHomologacion } from "@/features/coverage/matricula/api/types/notas-homologadas"
import { DialogOrigenNota } from "@/features/coverage/matricula/components/notas-homologadas/dialog-origen-nota"
import { DialogCorregirNota } from "@/features/coverage/matricula/components/notas-homologadas/dialog-corregir-nota"
import { formatFecha, formatNota } from "@/features/coverage/matricula/components/notas-homologadas/nota-format"

interface Props {
  matriculaId: string
  /** «Ana Sofía Pérez Gómez · 6°C · Sede 2 · Tarde», para el encabezado de la corrección. */
  contexto: string
  /** «Miguel Ángel Castro Vargas (Quinto · 5°B · IE Central · Mañana)», para homologar desde snapshot. */
  estudiante: string
  /** Matrículas cerradas (Reubicado, Promovido) se ven pero no se corrigen ni se homologan. */
  editable: boolean
}

const marcaDe = (n: NotaHomologada, s: SnapshotHomologacion) =>
  n.tipo === "PENDIENTE"
    ? "Pendiente por nivelación"
    : n.corregida
      ? "Homologada (corregida)"
      : n.tipo === "PARCIAL"
        ? `Parcial — grupo ${s.grupoOrigen}`
        : `Homologada — grupo ${s.grupoOrigen}`

/**
 * Pestaña «Notas homologadas» de Ver detalle (Sección 4.2): un bloque por snapshot,
 * del cambio más reciente al más antiguo (cada cambio del año toma el suyo). Por
 * fila: ver de dónde salió la nota y, con permiso, corregirla.
 */
export function TabNotasHomologadas({ matriculaId, contexto, estudiante, editable }: Props) {
  const { notify } = useNotify()
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const { data, isPending, isError, error, refetch } = useNotasHomologadasQuery(matriculaId)
  const [origen, setOrigen] = useState<NotaHomologada | null>(null)
  const [corregir, setCorregir] = useState<{ nota: NotaHomologada; snapshot: SnapshotHomologacion } | null>(null)
  const { data: pendiente } = useSnapshotPendienteQuery(matriculaId)
  const [homologando, setHomologando] = useState(false)

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
        <SpinnerIcon className="animate-spin" />
        Cargando…
      </div>
    )
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-sm text-red">
        {getErrorMessage(error)}
        <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => refetch()}>
          <ArrowCounterClockwiseIcon data-icon="inline-start" />
          Reintentar
        </Button>
      </div>
    )
  }
  const puedeCorregir = puedeEditar && editable

  // Sección 4.5: un traslado guardado con «No homologar por ahora» se completa desde aquí.
  const avisoPendiente = pendiente && (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-yellow-stroke bg-yellow-22 px-4 py-3 text-sm">
      <InfoIcon className="size-5 shrink-0 text-yellow" aria-hidden />
      <p className="min-w-60 flex-1">
        Las notas del traslado desde {pendiente.institucionOrigen} no se han homologado: los períodos transcurridos
        siguen pendientes por nivelación.
      </p>
      {puedeCorregir && (
        <OnlineOnlyAction>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setHomologando(true)}>
            <GitMergeIcon data-icon="inline-start" />
            Homologar desde snapshot
          </Button>
        </OnlineOnlyAction>
      )}
    </div>
  )
  const dialogoHomologar = pendiente && homologando && (
    <DialogHomologarSnapshot
      matriculaId={matriculaId}
      snapshot={pendiente}
      estudiante={estudiante}
      onOpenChange={(open) => !open && setHomologando(false)}
      onHomologated={({ notasHomologadas, pendientes }) => {
        setHomologando(false)
        notify(
          `Se homologaron ${notasHomologadas} notas del traslado` +
            (pendientes > 0 ? `; ${pendientes} quedan pendientes por nivelación.` : "."),
          { variant: "success" },
        )
      }}
    />
  )

  if (data.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {avisoPendiente}
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Esta matrícula no tiene notas homologadas</EmptyTitle>
            <EmptyDescription>
              Las notas se homologan cuando el estudiante cambia de grupo, jornada o sede, o llega por traslado con
              calificaciones del año.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        {dialogoHomologar}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {avisoPendiente}
      {dialogoHomologar}
      {data.map((snapshot) => (
        <section key={snapshot.id} aria-label={`Snapshot del ${formatFecha(snapshot.fecha)}`} className="flex flex-col gap-4">
          {/* Datos del snapshot en la ficha de solo lectura (CLAUDE.md §13 «Ver detalle»). */}
          <FichaDatos
            datos={[
              { etiqueta: "Snapshot", valor: `${snapshot.motivo} · ${formatFecha(snapshot.fecha)}` },
              {
                etiqueta: "Grupo de origen",
                valor: `${snapshot.grupoOrigen} · ${snapshot.institucionOrigen} · ${snapshot.jornadaOrigen} · Resp. de enseñanza: ${snapshot.responsableEnsenanza}`,
              },
              { etiqueta: "Grupo actual", valor: snapshot.grupoActual },
              { etiqueta: "Confirmado por", valor: snapshot.confirmadoPor },
              { etiqueta: "Fallas acumuladas", valor: `${snapshot.fallas} · se suman a las del grupo actual` },
            ]}
          />

          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asignatura</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      Período
                      <Tooltip>
                        <TooltipTrigger
                          render={<button type="button" aria-label="Qué es el período" className="rounded-xs text-muted-foreground" />}
                        >
                          <InfoIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Período de evaluación del grupo actual. En el período en curso, la nota parcial pesa el
                          porcentaje cursado en el grupo anterior.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead className="text-center">Definitiva</TableHead>
                  <TableHead>Valoración</TableHead>
                  <TableHead>Marca</TableHead>
                  {/* Relleno: el ancho que sobra queda al final, no entre columnas (CLAUDE.md §13, tablas). */}
                  <TableHead aria-hidden className="w-full p-0" />
                  <TableHead className={cn(ACTIONS_CELL_CLASS, "p-0")}>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.notas.map((n) => {
                  const pendiente = n.tipo === "PENDIENTE"
                  const etiqueta = `${n.asignatura} ${n.periodo}`
                  return (
                    <TableRow key={n.id} className="group/row">
                      <TableCell>{n.asignatura}</TableCell>
                      <TableCell>
                        {n.periodo}
                        {n.tipo === "PARCIAL" && (
                          <span className="ml-1 text-muted-foreground">
                            (en curso · {n.porcentajeCursado} % cursado)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {n.nota == null ? (
                          "—"
                        ) : n.notaOriginal != null ? (
                          <>
                            <span className="text-muted-foreground">{formatNota(n.notaOriginal)}</span>
                            <span className="text-muted-foreground" aria-label="corregida a">
                              {" → "}
                            </span>
                            <span className="font-semibold">{formatNota(n.nota)}</span>
                          </>
                        ) : (
                          formatNota(n.nota)
                        )}
                      </TableCell>
                      <TableCell>{n.valoracion ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="soft" color={pendiente ? "warning" : "primary"}>
                          {marcaDe(n, snapshot)}
                        </Badge>
                      </TableCell>
                      <TableCell aria-hidden className="p-0" />
                      <TableCell className={cn(ACTIONS_CELL_CLASS, "p-0")}>
                        {!pendiente && (
                          // Íconos al hover de la fila, con el hover azul claro de las tablas (table-row-actions).
                          <div className={actionsOverlayClass(false, "background")}>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    color="neutral"
                                    size="icon-sm"
                                    aria-label={`Ver origen de la nota de ${etiqueta}`}
                                    onClick={() => setOrigen(n)}
                                  />
                                }
                              >
                                <EyeIcon />
                              </TooltipTrigger>
                              <TooltipContent>Ver origen de la nota</TooltipContent>
                            </Tooltip>
                            {puedeCorregir && (
                              <OnlineOnlyAction>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        color="neutral"
                                        size="icon-sm"
                                        aria-label={`Corregir la nota de ${etiqueta}`}
                                        onClick={() => setCorregir({ nota: n, snapshot })}
                                      />
                                    }
                                  >
                                    <PencilIcon />
                                  </TooltipTrigger>
                                  <TooltipContent>Corregir nota homologada</TooltipContent>
                                </Tooltip>
                              </OnlineOnlyAction>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
          </Table>
        </section>
      ))}

      <DialogOrigenNota matriculaId={matriculaId} nota={origen} onOpenChange={(open) => !open && setOrigen(null)} />
      {corregir && (
        <DialogCorregirNota
          key={corregir.nota.id}
          matriculaId={matriculaId}
          nota={corregir.nota}
          escala={corregir.snapshot.escala}
          contexto={contexto}
          marca={marcaDe(corregir.nota, corregir.snapshot)}
          onOpenChange={(open) => !open && setCorregir(null)}
          onCorrected={() => {
            setCorregir(null)
            notify(`Se corrigió la nota de ${corregir.nota.asignatura} ${corregir.nota.periodo}.`, { variant: "success" })
          }}
        />
      )}
    </div>
  )
}
