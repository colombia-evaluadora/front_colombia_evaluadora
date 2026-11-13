import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty"
import { InboxIcon, LockIcon, PlusCircleIcon, RemoveCircleOutlineIcon } from "@/components/ui/icons"
import type {
  MatriculaAsignatura,
  MatriculaAsignaturasCambios,
} from "@/features/coverage/matricula/api/types/matricula"
import { MatriculaFormSection } from "./fields"

interface AsignaturasSectionProps {
  /** El plan del grado tal como está guardado (o, en el alta, con las obligatorias). */
  asignaturas: MatriculaAsignatura[]
  cambios: MatriculaAsignaturasCambios
  onChange: (cambios: MatriculaAsignaturasCambios) => void
  mediaTecnicaExterna: boolean
  institucionExterna: string
  /** Sin grupo todavía no hay grado del que leer el plan. */
  sinGrupo?: boolean
  isLoading?: boolean
  estudiante?: string
  disabled?: boolean
}

function Bloqueado({ motivo }: { motivo: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex text-muted-foreground" aria-label={motivo} />}>
        <LockIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{motivo}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Bloque 15 (informe 2.15): asignaturas del plan de estudio del grado. Las
 * obligatorias no se desmatriculan (Regla 22) ni las que ya tienen notas; con
 * media técnica externa se marca cuáles se cursan afuera (Regla 41). Los
 * cambios se guardan junto con la matrícula, no fila por fila.
 */
export function MatriculaAsignaturasSection({
  asignaturas,
  cambios,
  onChange,
  mediaTecnicaExterna,
  institucionExterna,
  sinGrupo = false,
  isLoading = false,
  estudiante,
  disabled = false,
}: AsignaturasSectionProps) {
  const [porDesmatricular, setPorDesmatricular] = useState<MatriculaAsignatura | null>(null)

  const filas = asignaturas.map((asignatura) => ({ ...asignatura, ...cambios[asignatura.id] }))

  function cambiar(asignatura: MatriculaAsignatura, cambio: Partial<{ matriculada: boolean; externa: boolean }>) {
    const actual = cambios[asignatura.id] ?? { matriculada: asignatura.matriculada, externa: asignatura.externa }
    const siguiente = { ...actual, ...cambio }
    const original = asignaturas.find((a) => a.id === asignatura.id)
    const next = { ...cambios }
    // Volver al estado guardado no es un cambio: no se manda.
    if (original && original.matriculada === siguiente.matriculada && original.externa === siguiente.externa) {
      delete next[asignatura.id]
    } else {
      next[asignatura.id] = siguiente
    }
    onChange(next)
  }

  const vacio = sinGrupo
    ? "Elija el grupo para ver las asignaturas del plan de estudio."
    : isLoading
      ? "Cargando asignaturas…"
      : asignaturas.length === 0
        ? "El grado aún no tiene plan de estudio. Las asignaturas se matriculan cuando se agreguen al plan."
        : null

  return (
    <MatriculaFormSection title="Asignaturas matriculadas" columns={2}>
      <div className="flex flex-col gap-3 md:col-span-2">
        {mediaTecnicaExterna && institucionExterna.trim() ? (
          <p className="text-sm">
            Media técnica en institución externa: <strong className="font-semibold">{institucionExterna}</strong>
          </p>
        ) : null}

        {vacio ? (
          <Empty className="border-0 py-8" role="status">
            <EmptyHeader>
              <EmptyMedia className="text-muted-foreground/60">
                <InboxIcon className="size-10" aria-hidden />
              </EmptyMedia>
              <EmptyDescription>{vacio}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asignatura</TableHead>
                  <TableHead>Matrícula obligatoria</TableHead>
                  <TableHead>Matriculada</TableHead>
                  {mediaTecnicaExterna ? <TableHead>Se cursa en la institución externa</TableHead> : null}
                  <TableHead className="w-12">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((fila) => {
                  const original = asignaturas.find((a) => a.id === fila.id) as MatriculaAsignatura
                  const puedeDesmatricular = !fila.obligatoria && !fila.tieneRegistros
                  return (
                    <TableRow key={fila.id}>
                      <TableCell>{fila.nombre}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          {fila.obligatoria ? "Sí" : "No"}
                          {fila.obligatoria ? <Bloqueado motivo="Obligatoria en el plan de estudio del grado" /> : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          color={fila.matriculada ? "success" : "muted"}
                          className="rounded-full text-xs font-medium tracking-normal"
                        >
                          {fila.matriculada ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      {mediaTecnicaExterna ? (
                        <TableCell>
                          {fila.matriculada ? (
                            <span className="inline-flex items-center gap-2">
                              <Switch
                                round
                                aria-label={`${fila.nombre} se cursa en la institución externa`}
                                checked={fila.externa}
                                disabled={disabled || fila.tieneRegistros}
                                onCheckedChange={(externa) => cambiar(original, { externa })}
                              />
                              {fila.tieneRegistros ? <Bloqueado motivo="Ya tiene notas del estudiante" /> : null}
                            </span>
                          ) : (
                            <span className="text-muted-foreground" aria-label="No aplica">
                              —
                            </span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right">
                        {fila.matriculada ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  color="neutral"
                                  size="icon-sm"
                                  aria-label={`Desmatricular ${fila.nombre}`}
                                  disabled={disabled || !puedeDesmatricular}
                                  onClick={() => setPorDesmatricular(original)}
                                />
                              }
                            >
                              <RemoveCircleOutlineIcon />
                            </TooltipTrigger>
                            <TooltipContent>
                              {fila.obligatoria
                                ? "Obligatoria: no se desmatricula"
                                : fila.tieneRegistros
                                  ? "Ya tiene notas: no se desmatricula"
                                  : "Desmatricular"}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  color="neutral"
                                  size="icon-sm"
                                  aria-label={`Matricular ${fila.nombre}`}
                                  disabled={disabled}
                                  onClick={() => cambiar(original, { matriculada: true })}
                                />
                              }
                            >
                              <PlusCircleIcon />
                            </TooltipTrigger>
                            <TooltipContent>Matricular</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
        )}
      </div>

      <AlertDialog open={porDesmatricular != null} onOpenChange={(open) => !open && setPorDesmatricular(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmatricular {porDesmatricular?.nombre}</AlertDialogTitle>
            <AlertDialogDescription>
              {estudiante?.trim() || "El estudiante"} dejará de cursar {porDesmatricular?.nombre}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (porDesmatricular) cambiar(porDesmatricular, { matriculada: false, externa: false })
                setPorDesmatricular(null)
              }}
            >
              Desmatricular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MatriculaFormSection>
  )
}
