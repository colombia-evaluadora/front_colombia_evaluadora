import { useRef, useState } from "react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowRightIcon,
  CaretLeftIcon,
  CheckCircleFillIcon,
  CheckIcon,
  DotsSixVerticalIcon,
  InfoIcon,
  WarningIcon,
  XIcon,
} from "@/components/ui/icons"

import { cn } from "@/lib/utils"

/** Periodo de evaluación del colegio de origen del estudiante (mock). */
export interface OriginGradePeriod {
  id: string
  label: string
  startDate: string
  endDate: string
}

/**
 * Periodo de evaluación de la institución actual — sale del mismo catálogo
 * que "Establecimiento > Periodos académicos > Periodos de evaluación"
 * (`EvaluationPeriod`): `abbreviation` es `abreviacion` y `name` es `nombre`.
 */
export interface InstitutionGradePeriod {
  id: number
  abbreviation: string
  name: string
}

/**
 * Relación automática entre una asignatura del colegio de origen y una de la
 * institución actual (paso 2, "Asignaturas") — `null` en uno de los dos lados
 * cuando el sistema no encontró equivalente y el usuario todavía tiene que
 * ajustarlo a mano. `grades` trae una nota (o `null` = "-") por cada columna
 * de `gradePeriodLabels`.
 */
export interface SubjectMatch {
  id: string
  originSubject: string | null
  institutionSubject: string | null
  grades: (string | null)[]
}

interface TransferGradesDialogProps {
  lastUpdated: string
  originPeriods: OriginGradePeriod[]
  institutionPeriods: InstitutionGradePeriod[]
  subjectMatches: SubjectMatch[]
  /** Encabezados de las columnas de notas del paso 2 (ej. "P1", "P2"...). */
  gradePeriodLabels: string[]
  onCancel: () => void
}

const NO_MIGRATE = "no-migrar"

type Step = "periodo" | "asignaturas"

/**
 * Wizard de traslado de calificaciones — se abre cuando el usuario elige "Sí,
 * homologar" en `HomologationMatriculaDialog`. Paso 1 relaciona los periodos
 * de evaluación del colegio de origen con los de la institución actual; paso
 * 2 muestra el cruce automático de asignaturas para revisar antes de aplicar.
 * Todas las listas (periodos de origen, de institución, asignaturas, columnas
 * de notas) se recorren dinámicamente — no hay una cantidad fija asumida.
 */
export function TransferGradesDialog({
  lastUpdated,
  originPeriods,
  institutionPeriods,
  subjectMatches,
  gradePeriodLabels,
  onCancel,
}: TransferGradesDialogProps) {
  const [step, setStep] = useState<Step>("periodo")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [targetByOrigin, setTargetByOrigin] = useState<Record<string, string>>({})
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false)

  // Cada lado de la fila se puede arrastrar INDEPENDIENTE del otro: la
  // asignatura de origen (con sus notas, que son del estudiante en ESE
  // colegio) y la de la institución, cada una a otra fila de su misma
  // columna, para corregir un cruce automático mal hecho.
  const [originAssignments, setOriginAssignments] = useState(() =>
    subjectMatches.map((match) => ({
      originSubject: match.originSubject,
      grades: match.grades,
    })),
  )
  const [institutionAssignments, setInstitutionAssignments] = useState(() =>
    subjectMatches.map((match) => match.institutionSubject),
  )
  type DragColumn = "origin" | "institution"
  const [dragging, setDragging] = useState<{ column: DragColumn; index: number } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  function handleDrop(column: DragColumn, targetIndex: number) {
    if (!dragging || dragging.column !== column || dragging.index === targetIndex) return
    const { index: sourceIndex } = dragging
    if (column === "origin") {
      setOriginAssignments((prev) => {
        const next = [...prev]
        ;[next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]]
        return next
      })
    } else {
      setInstitutionAssignments((prev) => {
        const next = [...prev]
        ;[next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]]
        return next
      })
    }
    setDragging(null)
  }

  // Auto-scroll mientras se arrastra: sin esto, si la fila a intercambiar está
  // fuera del área visible (ej. la primera y la última en una lista larga),
  // no hay forma de llegar hasta ella sin soltar antes.
  function handleDragOverContainer(e: React.DragEvent<HTMLDivElement>) {
    if (!dragging) return
    const container = scrollContainerRef.current
    if (!container) return
    const { top, bottom } = container.getBoundingClientRect()
    const threshold = 40
    if (e.clientY - top < threshold) {
      container.scrollTop -= 12
    } else if (bottom - e.clientY < threshold) {
      container.scrollTop += 12
    }
  }

  const targetItems = Object.fromEntries([
    [NO_MIGRATE, "No migrar"],
    ...institutionPeriods.map((period) => [String(period.id), `${period.abbreviation} - ${period.name}`]),
  ])

  const matchedCount = originAssignments.filter(
    (assignment, index) => assignment.originSubject && institutionAssignments[index],
  ).length

  return (
    <>
      <Dialog open>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl"
        >
          <DialogHeader className="shrink-0 flex-row items-start justify-between gap-4 space-y-0">
            <DialogTitle>Trasladar calificaciones</DialogTitle>
            <span className="shrink-0 text-xs text-muted-foreground">
              Última actualización: {lastUpdated}
            </span>
          </DialogHeader>

          <DialogDescription className="-mt-4 shrink-0">
            {step === "periodo" ? (
              <>
                Este estudiante viene de otro establecimiento y tiene calificaciones registradas.
                <br />
                Selecciona los períodos de evaluación del colegio de origen y asígnalos al período
                correspondiente de tu institución.
              </>
            ) : (
              <>
                El sistema relacionó automáticamente las asignaturas del colegio de origen con las
                de tu institución.
                <br />
                Revisa las relaciones y ajusta si es necesario antes de aplicar el traslado.
              </>
            )}
          </DialogDescription>

          {/* Único bloque con scroll: header y footer quedan fijos afuera —
              el `DialogContent` no tenía `max-h`/límite de altura antes, así
              que la tabla de asignaturas (potencialmente larga) podía
              empujar todo el diálogo (título + footer) fuera de la
              pantalla. */}
          <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <ol className="flex items-center justify-center gap-3">
            <li className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  step === "asignaturas"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary text-primary",
                )}
              >
                {step === "asignaturas" ? <CheckIcon className="size-4" /> : "1"}
              </span>
              <span className="text-xs font-medium text-primary">Periodo</span>
            </li>
            <div
              className={cn("mb-4 h-px w-16", step === "asignaturas" ? "bg-primary" : "bg-border")}
            />
            <li className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  step === "asignaturas"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                2
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  step === "asignaturas" ? "text-primary" : "text-muted-foreground",
                )}
              >
                Asignaturas
              </span>
            </li>
          </ol>

          {step === "periodo" ? (
            <>
              <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <p>
                  Relaciona los períodos de evaluación del colegio de origen con los períodos de tu
                  institución.
                  <br />
                  Solo se migrarán los períodos que selecciones.
                </p>
              </div>

              <div className="rounded-md border border-border">
                <div className="grid grid-cols-2 gap-4 border-b border-border p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      PERIODOS DEL COLEGIO DE ORIGEN
                    </p>
                    <p className="text-xs text-muted-foreground">Fechas registradas</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">PERIODOS DE TU COLEGIO</p>
                    <p className="text-xs text-muted-foreground">
                      Selecciona a qué periodo se asignará:
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {originPeriods.map((period) => (
                    <div key={period.id} className="grid grid-cols-2 items-center gap-4 p-3">
                      <label className="flex cursor-pointer items-start gap-2">
                        <Checkbox
                          className="mt-0.5"
                          checked={selected[period.id] ?? false}
                          onCheckedChange={(checked) =>
                            setSelected((prev) => ({ ...prev, [period.id]: checked === true }))
                          }
                        />
                        <span>
                          <span className="block text-sm font-semibold text-foreground">
                            {period.label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {period.startDate} - {period.endDate}
                          </span>
                        </span>
                      </label>

                      <Select
                        items={targetItems}
                        value={targetByOrigin[period.id] ?? NO_MIGRATE}
                        onValueChange={(next) =>
                          setTargetByOrigin((prev) => ({ ...prev, [period.id]: next ?? NO_MIGRATE }))
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          variant="outlined"
                          aria-label="Periodo de tu colegio"
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_MIGRATE}>No migrar</SelectItem>
                          {institutionPeriods.map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                              {option.abbreviation} - {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <Field orientation="vertical" variant="outlined" className="gap-0">
                  <FieldLabel>Periodo de tu institución</FieldLabel>
                  <div className="flex-1 rounded-md border border-border bg-muted/40 p-4">
                    <div className={cn("grid gap-3", institutionPeriods.length > 1 && "grid-cols-2")}>
                      {institutionPeriods.map((period) => (
                        <div key={period.id}>
                          <p className="text-sm font-semibold text-foreground">
                            {period.abbreviation}
                          </p>
                          <p className="text-xs text-muted-foreground">{period.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Field>
                <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                  <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p>
                    Tu institución cuenta con {institutionPeriods.length} período
                    {institutionPeriods.length === 1 ? "" : "s"} disponible
                    {institutionPeriods.length === 1 ? "" : "s"}.
                    <br />
                    Solo se migrarán los períodos que selecciones a la izquierda. Puedes dejar
                    algunos como &quot;No migrar&quot; si no aplica.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2 rounded-md border border-green/30 bg-green/5 p-3 text-sm text-foreground">
                <CheckCircleFillIcon className="mt-0.5 size-4 shrink-0 text-green" />
                <p>
                  Se relacionaron {matchedCount} de {subjectMatches.length} asignaturas. Revisa las
                  relaciones y realiza los ajustes que consideres necesarios.
                </p>
              </div>

              <div
                ref={scrollContainerRef}
                onDragOver={handleDragOverContainer}
                className="max-h-80 overflow-y-auto rounded-lg border border-border"
              >
                <Table containerClassName="rounded-none border-0">
                  <TableHeader className="sticky top-0 z-10 bg-popover">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-foreground">
                        ASIGNATURA DEL
                        <br />
                        COLEGIO DE ORIGEN
                      </TableHead>
                      <TableHead />
                      <TableHead className="text-xs font-semibold text-foreground">
                        ASIGNATURA DE TU
                        <br />
                        INSTITUCIÓN
                      </TableHead>
                      <TableHead
                        colSpan={gradePeriodLabels.length}
                        className="text-center text-xs font-semibold text-foreground"
                      >
                        NOTAS A MIGRAR
                      </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                      <TableHead />
                      <TableHead />
                      <TableHead />
                      {gradePeriodLabels.map((label) => (
                        <TableHead
                          key={label}
                          className="text-center text-xs font-semibold text-foreground"
                        >
                          {label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectMatches.map((match, index) => {
                      const origin = originAssignments[index]
                      const institutionSubject = institutionAssignments[index]
                      const matched = Boolean(origin.originSubject && institutionSubject)
                      return (
                        <TableRow key={match.id}>
                          <TableCell
                            draggable
                            onDragStart={() => setDragging({ column: "origin", index })}
                            onDragEnd={() => setDragging(null)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop("origin", index)}
                            className={cn(
                              "flex cursor-grab items-center gap-1.5 active:cursor-grabbing",
                              dragging?.column === "origin" &&
                                dragging.index === index &&
                                "opacity-50",
                            )}
                          >
                            <DotsSixVerticalIcon className="size-4 shrink-0 text-muted-foreground" />
                            {matched ? (
                              <CheckCircleFillIcon className="size-4 shrink-0 text-green" />
                            ) : (
                              <WarningIcon className="size-4 shrink-0 text-orange" />
                            )}
                            {origin.originSubject ?? ""}
                          </TableCell>
                          <TableCell>
                            <ArrowRightIcon className="size-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell
                            draggable
                            onDragStart={() => setDragging({ column: "institution", index })}
                            onDragEnd={() => setDragging(null)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop("institution", index)}
                            className={cn(
                              "flex cursor-grab items-center gap-1.5 active:cursor-grabbing",
                              dragging?.column === "institution" &&
                                dragging.index === index &&
                                "opacity-50",
                            )}
                          >
                            <DotsSixVerticalIcon className="size-4 shrink-0 text-muted-foreground" />
                            {institutionSubject ?? ""}
                          </TableCell>
                          {gradePeriodLabels.map((label, gradeIndex) => (
                            <TableCell key={label} className="text-center">
                              {origin.grades[gradeIndex] ?? "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          </div>

          <DialogFooter className="shrink-0">
            {step === "asignaturas" && (
              <Button
                type="button"
                variant="outline"
                color="primary"
                size="sm"
                onClick={() => setStep("periodo")}
              >
                <CaretLeftIcon data-icon="inline-start" />
                Anterior
              </Button>
            )}
            {step === "periodo" ? (
              <Button
                type="button"
                variant="fill"
                color="primary"
                size="sm"
                onClick={() => setStep("asignaturas")}
              >
                Siguiente
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="fill"
                color="primary"
                size="sm"
                onClick={() => setConfirmFinishOpen(true)}
              >
                <CheckIcon data-icon="inline-start" />
                Finalizar
              </Button>
            )}
            <Button type="button" variant="fill" color="neutral" size="sm" onClick={onCancel}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmFinishOpen} onOpenChange={setConfirmFinishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader className="items-center text-center">
            <AlertDialogTitle>Confirmar homologación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de finalizar el proceso de homologación de calificaciones?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <Button type="button" variant="fill" color="primary" size="sm" onClick={onCancel}>
              <CheckIcon data-icon="inline-start" />
              Sí, finalizar
            </Button>
            <Button
              type="button"
              variant="fill"
              color="neutral"
              size="sm"
              onClick={() => setConfirmFinishOpen(false)}
            >
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
