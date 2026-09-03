import { useEffect, useRef, useState } from "react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import {
  CaretUpDownIcon,
  CheckIcon,
  ClipboardTextIcon,
  PencilIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"

import { getErrorMessage } from "@/lib/api-client"
import { useMatriculaGradeLabel } from "@/features/coverage/hooks/use-matricula-grade-label"
import { useMatriculaCampusesQuery } from "@/features/coverage/api/query/use-matricula-campuses-query"
import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/api/query/use-matricula-dependent-catalogs-query"
import { useMoveMatricula, type MatriculaMoveKind } from "@/features/coverage/api/mutations/move-matricula"
import { useRetireMatricula } from "@/features/coverage/api/mutations/retire-matricula"
import { useReingresarMatricula } from "@/features/coverage/api/mutations/reingresar-matricula"
import { CambioSedeMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-cambio-sede-matricula"
import type { CambioSedeConfirmResult } from "@/features/coverage/components/dialogs/dialog-cambio-sede-matricula"
import { CambioGradoMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-cambio-grado-matricula"
import { CambioGrupoMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-cambio-grupo-matricula"
import {
  CambioMatriculaSummaryDialog,
  type CambioMatriculaSummary,
} from "@/features/coverage/components/dialogs/dialog-cambio-matricula-summary"
import type {
  BulkGradeChange,
  BulkGroupChange,
  Matricula,
} from "@/features/coverage/api/types/matricula"

const MAX_VISIBLE_STUDENTS = 2

interface ModificarMatriculaDialogProps {
  selected: Matricula[]
  onRemove: (id: string) => void
  resetSelection: () => void
}

function studentChipLabel(matricula: Matricula): string {
  const lastInitial = matricula.lastName.trim().charAt(0)
  return `${matricula.firstName} ${lastInitial ? `${lastInitial}.` : ""}`.trim()
}

/** Cada campo (Sede/Grado/Grupo) que el usuario llenó dispara su propio
 * diálogo de verificación, en este orden — no hay un selector de "tipo de
 * cambio": se detecta con los inputs. */
type ConfirmStep = "sede" | "grado" | "grupo"

/** Independiente de Sede/Grado/Grupo — no dispara ningún diálogo de la
 * cadena, se aplica directo al confirmar (mismo criterio que ya tenía este
 * diálogo antes de E01HU33). */
type MatriculaAction = "sinCambios" | "retirar" | "reingresar"

export function ModificarMatriculaDialog({
  selected,
  onRemove,
  resetSelection,
}: ModificarMatriculaDialogProps) {
  const gradeLabel = useMatriculaGradeLabel()
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  // "form" = el diálogo de abajo; el resto son los pasos de verificación
  // encadenados (ver `queue`/`queueIndex`, más abajo).
  const [step, setStep] = useState<"form" | ConfirmStep>("form")
  const [queue, setQueue] = useState<ConfirmStep[]>([])
  const [queueIndex, setQueueIndex] = useState(0)

  const [sede, setSede] = useState("")
  const [jornada, setJornada] = useState("")
  const [grado, setGrado] = useState("")
  const [grupo, setGrupo] = useState("")
  const [attemptedConfirm, setAttemptedConfirm] = useState(false)
  const [accion, setAccion] = useState<MatriculaAction>("sinCambios")
  const [summary, setSummary] = useState<CambioMatriculaSummary | null>(null)
  const [gradeChangeResult, setGradeChangeResult] = useState<BulkGradeChange | null>(null)
  const [groupChangeResult, setGroupChangeResult] = useState<BulkGroupChange | null>(null)
  const [sedeChangeResult, setSedeChangeResult] = useState<CambioSedeConfirmResult | null>(null)

  // Para que el popover de "Ver lista" quede del mismo ancho que la card de
  // "Estudiantes seleccionados" — el popover se porta al final del <body>,
  // así que no hereda el ancho por CSS y hay que medirlo a mano al abrir.
  const studentsCardRef = useRef<HTMLDivElement>(null)
  const [listWidth, setListWidth] = useState<number>()

  const { data: catalogs } = useMatriculaCampusesQuery()

  const sameGradeOrigin = selected.every((m) => m.grade === selected[0]?.grade)
  const commonGrade = sameGradeOrigin ? selected[0]?.grade : undefined

  // Corregir/promover/reubicar (cambio de Sede/Grado/Grupo) solo aplica
  // mientras el estudiante está cursando -- el resto son estados finales o
  // ya movidos a otra matrícula (ver `move-matricula.ts`).
  const allCursando = selected.length > 0 && selected.every((m) => m.status === "Cursando")

  // Sede → Jornada → Grado → Grupo — ver
  // `use-matricula-dependent-catalogs-query.ts` (mock determinista, listo
  // para el endpoint real de oferta académica por sede). "Grupo" depende de
  // que el usuario haya elegido Grado — no se infiere solo del grado común
  // de la selección, aunque coincida.
  const {
    data: dependentCatalogs,
    isPeriodoError,
    periodoError,
  } = useMatriculaDependentCatalogsQuery({
    campus: sede || undefined,
    shift: jornada || undefined,
    grade: grado ? Number(grado) : undefined,
  })
  useEffect(() => {
    if (isPeriodoError) notify(getErrorMessage(periodoError), { variant: "error" })
  }, [isPeriodoError, periodoError, notify])

  const moveMatricula = useMoveMatricula()
  const retireMutation = useRetireMatricula()
  const reingresarMutation = useReingresarMatricula()
  const isApplying =
    moveMatricula.isPending || retireMutation.isPending || reingresarMutation.isPending

  function reset() {
    setStep("form")
    setQueue([])
    setQueueIndex(0)
    setSede("")
    setJornada("")
    setGrado("")
    setGrupo("")
    setAttemptedConfirm(false)
    setAccion("sinCambios")
    setGradeChangeResult(null)
    setGroupChangeResult(null)
    setSedeChangeResult(null)
  }

  // Sede → Jornada → Grado → Grupo — las opciones salen de
  // `useMatriculaDependentCatalogsQuery` (mock determinista, ver ese
  // archivo). Acá solo se limpian los valores dependientes cuando cambia un
  // prerequisito, para no dejar seleccionada una combinación que ya no
  // aplica.
  function handleSedeChange(value: string) {
    setSede(value)
    setJornada("")
    setGrado("")
    setGrupo("")
  }

  function handleJornadaChange(value: string) {
    setJornada(value)
    setGrado("")
    setGrupo("")
  }

  function handleGradoChange(value: string) {
    setGrado(value)
    setGrupo("")
  }

  const count = selected.length

  // Un cambio solo cuenta si el campo difiere del valor común de TODOS los
  // seleccionados — si el origen ya es heterogéneo (`common* === undefined`),
  // cualquier valor elegido cuenta como cambio (no hay con qué comparar).
  const sameCampus = selected.every((m) => m.campus === selected[0]?.campus)
  const commonCampus = sameCampus ? selected[0]?.campus : undefined
  const sameGroupOrigin = selected.every((m) => m.group === selected[0]?.group)
  const commonGroup = sameGroupOrigin ? selected[0]?.group : undefined

  const sedeChanged = sede !== "" && sede !== commonCampus
  const gradoChanged = grado !== "" && Number(grado) !== commonGrade
  const grupoChanged = grupo !== "" && grupo !== commonGroup

  const missingGrupo = (sedeChanged || gradoChanged) && grupo === ""
  const canConfirm = count > 0 && (sedeChanged || gradoChanged || grupoChanged || accion !== "sinCambios")

  function resolveMoveKind(
    gradeChange: BulkGradeChange | null,
    sedeChangeConfirm: CambioSedeConfirmResult | null,
  ): MatriculaMoveKind {
    if (gradoChanged) {
      if (gradeChange?.subKind === "promocion") return "promover"
      if (gradeChange?.subKind === "reubicacion") return "reubicar"
      return "corregir"
    }
    if (sedeChanged) {
      return sedeChangeConfirm?.classification === "cambioGrado" ? "reubicar" : "corregir"
    }
    return "corregir"
  }

  async function applyChanges(
    gradeChange: BulkGradeChange | null,
    _groupChange: BulkGroupChange | null,
    sedeChangeConfirm: CambioSedeConfirmResult | null,
  ) {
    // "Acción sobre la matrícula" es independiente de Sede/Grado/Grupo — no
    // tiene diálogo de confirmación propio, se aplica junto con el resto acá.
    if (accion !== "sinCambios") {
      const mutate = accion === "retirar" ? retireMutation.mutateAsync : reingresarMutation.mutateAsync
      const results = await Promise.allSettled(selected.map((m) => mutate(m.id)))
      const failed = results.filter((r) => r.status === "rejected").length
      if (failed > 0) {
        notify(`No se pudo aplicar el cambio a ${failed} de ${selected.length} estudiante(s).`, {
          variant: "error",
        })
      } else {
        notify(accion === "retirar" ? "Estudiantes retirados." : "Estudiantes reingresados.")
      }
    }

    if (sedeChanged || gradoChanged || grupoChanged) {
      const targetGrupoId = dependentCatalogs?.groups.find((g) => g.codigo === grupo)?.id
      if (targetGrupoId == null) {
        throw new Error("No se pudo identificar el grupo destino para el movimiento.")
      }

      const kind = resolveMoveKind(gradeChange, sedeChangeConfirm)
      const needsDetails = kind !== "corregir"
      const motivo = needsDetails
        ? (gradoChanged ? gradeChange?.reason : sedeChangeConfirm?.reason)
        : undefined
      const soporte = needsDetails
        ? (gradoChanged ? gradeChange?.supportFile : sedeChangeConfirm?.supportFile)
        : undefined

      const result = await moveMatricula.mutateAsync({
        kind,
        ids: selected.map((m) => Number(m.id)),
        grupoDestino: targetGrupoId,
        motivo,
        soporte,
      })

      const movedByOriginalId = new Map(
        (result.matriculas ?? []).map((m) => [m.pkTmatriculaAnterior, m]),
      )
      setSummary({
        students: selected.map((original) => {
          const moved = movedByOriginalId.get(Number(original.id))
          return {
            id: String(moved?.pkTmatriculaNueva ?? moved?.pkTmatriculaAnterior ?? original.id),
            name: `${original.firstName} ${original.lastName}`,
            fromCampus: original.campus,
            toCampus: moved ? "" : sede || original.campus,
            fromGrade: moved?.anterior.grado ?? gradeLabel(original.grade),
            toGrade: moved?.nuevo.grado ?? (grado ? gradeLabel(Number(grado)) : gradeLabel(original.grade)),
            fromGroup: moved?.anterior.grupo ?? original.group,
            toGroup: moved?.nuevo.grupo ?? (grupo || original.group),
          }
        }),
      })
    }

    setOpen(false)
    reset()
    if (!(sedeChanged || gradoChanged || grupoChanged)) {
      resetSelection()
    }
  }

  function goToStep(
    nextQueue: ConfirmStep[],
    nextIndex: number,
    gradeChange: BulkGradeChange | null,
    groupChange: BulkGroupChange | null,
    sedeChangeConfirm: CambioSedeConfirmResult | null,
  ) {
    if (nextIndex < nextQueue.length) {
      setQueueIndex(nextIndex)
      setStep(nextQueue[nextIndex])
      return
    }
    void applyChanges(gradeChange, groupChange, sedeChangeConfirm).catch((error) => {
      notify(getErrorMessage(error), { variant: "error" })
    })
  }

  function handleApply() {
    if (!canConfirm) return
    if (missingGrupo) {
      setAttemptedConfirm(true)
      return
    }
    const nextQueue: ConfirmStep[] = [
      sedeChanged && "sede",
      gradoChanged && "grado",
      grupoChanged && !gradoChanged && !sedeChanged && "grupo",
    ].filter((value): value is ConfirmStep => value !== false)

    setQueue(nextQueue)
    goToStep(nextQueue, 0, null, null, null)
  }


  function handleSedeConfirm(result: CambioSedeConfirmResult) {
    setSedeChangeResult(result)
    goToStep(queue, queueIndex + 1, gradeChangeResult, groupChangeResult, result)
  }

  function handleGradoConfirm(result: BulkGradeChange) {
    setGradeChangeResult(result)
    goToStep(queue, queueIndex + 1, result, groupChangeResult, sedeChangeResult)
  }

  function handleGrupoConfirm(result: BulkGroupChange) {
    setGroupChangeResult(result)
    goToStep(queue, queueIndex + 1, gradeChangeResult, result, sedeChangeResult)
  }

  function handleBackFrom(current: ConfirmStep) {
    const currentIndex = queue.indexOf(current)
    if (currentIndex <= 0) {
      setStep("form")
      return
    }
    setQueueIndex(currentIndex - 1)
    setStep(queue[currentIndex - 1])
  }

  function handleWizardClose() {
    setOpen(false)
    reset()
  }

  const first = selected[0]

  return (
    <>
      <Dialog
        open={open && step === "form"}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) reset()
        }}
      >
        <DialogTrigger
          render={<Button variant="fill" color="primary" size="sm" disabled={count === 0} />}
        >
          <PencilIcon data-icon="inline-start" />
          Modificar
        </DialogTrigger>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Modificar</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div
              ref={studentsCardRef}
              className="flex flex-col gap-2 rounded-md border border-input p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Estudiantes seleccionados ({count})
                </span>
                <Popover
                  onOpenChange={(next) => {
                    if (next) setListWidth(studentsCardRef.current?.offsetWidth)
                  }}
                >
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      />
                    }
                  >
                    <ClipboardTextIcon className="size-4" />
                    Ver lista
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="p-0"
                    style={listWidth ? { width: listWidth } : undefined}
                  >
                    <div className="max-h-72 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-8" />
                            <TableHead>
                              <span className="inline-flex items-center gap-1">
                                Nombres y apellidos
                                <CaretUpDownIcon className="size-3.5" />
                              </span>
                            </TableHead>
                            <TableHead>
                              <span className="inline-flex items-center gap-1">
                                Sede
                                <CaretUpDownIcon className="size-3.5" />
                              </span>
                            </TableHead>
                            <TableHead>
                              <span className="inline-flex items-center gap-1">
                                Grado
                                <CaretUpDownIcon className="size-3.5" />
                              </span>
                            </TableHead>
                            <TableHead>
                              <span className="inline-flex items-center gap-1">
                                Grupo
                                <CaretUpDownIcon className="size-3.5" />
                              </span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.map((matricula) => (
                            <TableRow key={matricula.id}>
                              <TableCell>
                                <Checkbox
                                  checked
                                  aria-label={`Quitar ${matricula.firstName} ${matricula.lastName}`}
                                  onCheckedChange={() => onRemove(matricula.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium text-foreground">
                                {matricula.firstName} {matricula.lastName}
                              </TableCell>
                              <TableCell>{matricula.campus}</TableCell>
                              <TableCell>{gradeLabel(matricula.grade)}</TableCell>
                              <TableCell>{matricula.group}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selected.slice(0, MAX_VISIBLE_STUDENTS).map((matricula) => (
                  <div
                    key={matricula.id}
                    className="flex items-center gap-2 rounded-md border border-input px-3 py-1.5"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {studentChipLabel(matricula)}
                    </span>
                    <span className="rounded bg-secondary-22 px-1.5 py-0.5 text-xs font-medium text-foreground">
                      {gradeLabel(matricula.grade)} - {matricula.group}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(matricula.id)}
                      aria-label={`Quitar ${matricula.firstName} ${matricula.lastName}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
                {count > MAX_VISIBLE_STUDENTS && (
                  <span className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground">
                    +{count - MAX_VISIBLE_STUDENTS}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-input p-4">
              <span className="text-sm font-semibold text-foreground">Datos de matrícula</span>
              {!allCursando && (
                <p className="text-sm text-muted-foreground">
                  Solo se puede corregir, promover o reubicar mientras el estudiante está
                  cursando.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field variant="outlined">
                  <FieldLabel>Sede</FieldLabel>
                  <ComboboxField
                    value={sede}
                    onValueChange={(v) => handleSedeChange(v ?? "")}
                    disabled={!allCursando}
                  >
                    <ComboboxFieldTrigger size="sm">
                      <ComboboxFieldValue placeholder="Seleccionar" />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                      {(catalogs?.campuses ?? []).map((campus) => (
                        <ComboboxFieldItem key={campus} value={campus}>
                          {campus}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxFieldContent>
                  </ComboboxField>
                </Field>

                <Field variant="outlined">
                  <FieldLabel>Jornada:</FieldLabel>
                  <ComboboxField
                    value={jornada}
                    onValueChange={(v) => handleJornadaChange(v ?? "")}
                    disabled={!sede}
                  >
                    <ComboboxFieldTrigger size="sm">
                      <ComboboxFieldValue
                        placeholder={!sede ? "Elegí sede primero" : "Seleccionar"}
                      />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                      {(dependentCatalogs?.shifts ?? []).map((value) => (
                        <ComboboxFieldItem key={value} value={value}>
                          {value}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxFieldContent>
                  </ComboboxField>
                </Field>

                <Field variant="outlined">
                  <FieldLabel>Grado</FieldLabel>
                  <ComboboxField
                    items={Object.fromEntries(
                      (dependentCatalogs?.grades ?? []).map((grade) => [
                        String(grade.valor),
                        grade.nombre,
                      ]),
                    )}
                    value={grado}
                    onValueChange={(v) => handleGradoChange(v ?? "")}
                    disabled={!jornada}
                  >
                    <ComboboxFieldTrigger size="sm">
                      <ComboboxFieldValue
                        placeholder={!jornada ? "Elegí jornada primero" : "Seleccionar"}
                      />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                      {(dependentCatalogs?.grades ?? []).map((grade) => (
                        <ComboboxFieldItem key={grade.valor} value={String(grade.valor)}>
                          {grade.nombre}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxFieldContent>
                  </ComboboxField>
                </Field>

                <Field
                  variant="outlined"
                  data-invalid={attemptedConfirm && missingGrupo ? "true" : undefined}
                >
                  <FieldLabel>
                    Grupo
                    {(sedeChanged || gradoChanged) && "*"}
                  </FieldLabel>
                  <ComboboxField
                    value={grupo}
                    onValueChange={(v) => setGrupo(v ?? "")}
                    disabled={!grado}
                  >
                    <ComboboxFieldTrigger size="sm" aria-invalid={attemptedConfirm && missingGrupo}>
                      <ComboboxFieldValue
                        placeholder={!grado ? "Elegí grado primero" : "Seleccionar"}
                      />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                      {(dependentCatalogs?.groups ?? []).map((group) => (
                        <ComboboxFieldItem key={group.id} value={group.codigo}>
                          {group.codigo}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxFieldContent>
                  </ComboboxField>
                </Field>
              </div>
            </div>

            <Field variant="outlined">
              <FieldLabel>Acción sobre la matrícula</FieldLabel>
              <RadioGroup
                value={accion}
                onValueChange={(value) => value && setAccion(value as MatriculaAction)}
                className="flex min-h-11 flex-row flex-wrap items-center gap-6 rounded-md border border-input px-3"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="sinCambios" />
                  Sin cambios
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="retirar" />
                  Retirar estudiante
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="reingresar" />
                  Reingresar estudiante
                </label>
              </RadioGroup>
            </Field>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              color="primary"
              size="sm"
              disabled={!canConfirm || isApplying}
              aria-busy={isApplying}
              onClick={handleApply}
            >
              {isApplying ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Confirmar cambios
            </Button>
            <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {first && (
        <CambioSedeMatriculaDialog
          open={open && step === "sede"}
          fromSede={sameCampus && commonCampus ? commonCampus : first.campus}
          toSede={sede || first.campus}
          fromGrade={first.grade}
          toGrade={grado ? Number(grado) : first.grade}
          fromGroup={first.group}
          toGroup={grupo || first.group}
          gradeWillChange={gradoChanged}
          sameOrigin={sameGradeOrigin}
          onBack={queue.indexOf("sede") > 0 ? () => handleBackFrom("sede") : undefined}
          onConfirm={handleSedeConfirm}
          onClose={handleWizardClose}
        />
      )}

      {first && (
        <CambioGradoMatriculaDialog
          open={open && step === "grado"}
          sameOrigin={sameGradeOrigin}
          fromGrade={sameGradeOrigin ? (commonGrade ?? first.grade) : null}
          toGrade={grado ? Number(grado) : first.grade}
          onBack={() => handleBackFrom("grado")}
          onConfirm={handleGradoConfirm}
          onClose={handleWizardClose}
        />
      )}

      <CambioGrupoMatriculaDialog
        open={open && step === "grupo"}
        toGroup={grupo}
        studentCount={count}
        gradeChange={gradeChangeResult}
        onBack={() => handleBackFrom("grupo")}
        onConfirm={handleGrupoConfirm}
        onClose={handleWizardClose}
      />

      <CambioMatriculaSummaryDialog
        open={summary != null}
        summary={summary}
        onClose={() => {
          setSummary(null)
          resetSelection()
        }}
      />
    </>
  )
}
