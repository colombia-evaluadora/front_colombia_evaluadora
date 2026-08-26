import { useRef, useState } from "react"
import { toast } from "sonner"

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

import { formatGrade, SHIFT_LABELS } from "@/features/coverage/api/ui-mappings"
import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/api/query/use-matricula-dependent-catalogs-query"
import { useRetireMatricula } from "@/features/coverage/api/mutations/retire-matricula"
import { useReingresarMatricula } from "@/features/coverage/api/mutations/reingresar-matricula"
import { CambioSedeMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-cambio-sede-matricula"
import type { Matricula } from "@/features/coverage/api/types/matricula"

type MatriculaAction = "sinCambios" | "retirar" | "reingresar"

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

export function ModificarMatriculaDialog({
  selected,
  onRemove,
  resetSelection,
}: ModificarMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  // "form" = el diálogo de abajo; "cambioSede" = la confirmación de cambio de
  // sede (segundo paso, solo cuando "Sede" cambió — ver `handleApply`).
  const [step, setStep] = useState<"form" | "cambioSede">("form")
  const [sede, setSede] = useState("")
  const [jornada, setJornada] = useState("")
  const [grado, setGrado] = useState("")
  const [grupo, setGrupo] = useState("")
  const [accion, setAccion] = useState<MatriculaAction>("sinCambios")
  // Para que el popover de "Ver lista" quede del mismo ancho que la card de
  // "Estudiantes seleccionados" — el popover se porta al final del <body>,
  // así que no hereda el ancho por CSS y hay que medirlo a mano al abrir.
  const studentsCardRef = useRef<HTMLDivElement>(null)
  const [listWidth, setListWidth] = useState<number>()

  const { data: catalogs } = useReservationCatalogsQuery()
  // Jornada depende de Sede; Grupo depende de Grado — ver
  // `use-matricula-dependent-catalogs-query.ts` (mock determinista, listo
  // para el endpoint real de oferta académica por sede).
  const { data: dependentCatalogs } = useMatriculaDependentCatalogsQuery({
    campus: sede || undefined,
    grade: grado ? Number(grado) : undefined,
  })

  const retireMutation = useRetireMatricula()
  const reingresarMutation = useReingresarMatricula()
  const isApplying = retireMutation.isPending || reingresarMutation.isPending

  function reset() {
    setStep("form")
    setSede("")
    setJornada("")
    setGrado("")
    setGrupo("")
    setAccion("sinCambios")
  }

  // Jornada depende de Sede; Grupo depende de Grado — las opciones salen de
  // `useMatriculaDependentCatalogsQuery` (mock determinista, ver ese
  // archivo). Acá solo se limpia el valor cuando cambia el prerequisito,
  // para no dejar seleccionada una combinación que ya no aplica.
  function handleSedeChange(value: string) {
    setSede(value)
    setJornada("")
  }

  function handleGradoChange(value: string) {
    setGrado(value)
    setGrupo("")
  }

  async function applyChanges() {
    // "Datos de matrícula" (sede/jornada/grado/grupo) todavía no tiene un
    // endpoint de edición en lote — solo se capturan acá. La "Acción sobre
    // la matrícula" sí es funcional: reusa retirar/reingresar por estudiante.
    if (accion !== "sinCambios") {
      const mutate =
        accion === "retirar" ? retireMutation.mutateAsync : reingresarMutation.mutateAsync
      const results = await Promise.allSettled(selected.map((m) => mutate(m.id)))
      const failed = results.filter((r) => r.status === "rejected").length
      if (failed > 0) {
        toast.error(`No se pudo aplicar el cambio a ${failed} de ${selected.length} estudiante(s).`)
      } else {
        toast.success(accion === "retirar" ? "Estudiantes retirados." : "Estudiantes reingresados.")
      }
    }
    setOpen(false)
    reset()
    resetSelection()
  }

  function handleApply() {
    // Cambiar la sede afecta calificaciones — se confirma en un segundo paso
    // (ver `docs`/mockup "Cambio de sede") antes de aplicar cualquier cosa.
    if (sede !== "" && selected.length > 0) {
      setStep("cambioSede")
      return
    }
    void applyChanges()
  }

  const first = selected[0]
  const count = selected.length

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
                              <TableCell>{formatGrade(matricula.grade)}</TableCell>
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
                      {formatGrade(matricula.grade)} - {matricula.group}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field variant="outlined">
                  <FieldLabel>Sede</FieldLabel>
                  <ComboboxField
                    value={sede || undefined}
                    onValueChange={(v) => handleSedeChange(v ?? "")}
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
                    items={SHIFT_LABELS}
                    value={jornada || undefined}
                    onValueChange={(v) => setJornada(v ?? "")}
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
                          {SHIFT_LABELS[value]}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxFieldContent>
                  </ComboboxField>
                </Field>

                <Field variant="outlined">
                  <FieldLabel>Grado</FieldLabel>
                  <ComboboxField
                    items={Object.fromEntries(
                      (catalogs?.grades ?? []).map((grade) => [String(grade), formatGrade(grade)]),
                    )}
                    value={grado || undefined}
                    onValueChange={(v) => handleGradoChange(v ?? "")}
                  >
                    <ComboboxFieldTrigger size="sm">
                      <ComboboxFieldValue placeholder="Seleccionar" />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                      {(catalogs?.grades ?? []).map((grade) => (
                        <ComboboxFieldItem key={grade} value={String(grade)}>
                          {formatGrade(grade)}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxFieldContent>
                  </ComboboxField>
                </Field>

                <Field variant="outlined">
                  <FieldLabel>Grupo</FieldLabel>
                  <ComboboxField
                    value={grupo || undefined}
                    onValueChange={(v) => setGrupo(v ?? "")}
                    disabled={!grado}
                  >
                    <ComboboxFieldTrigger size="sm">
                      <ComboboxFieldValue
                        placeholder={!grado ? "Elegí grado primero" : "Seleccionar"}
                      />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                      {(dependentCatalogs?.groups ?? []).map((group) => (
                        <ComboboxFieldItem key={group} value={group}>
                          {group}
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
              disabled={count === 0 || isApplying}
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
          open={open && step === "cambioSede"}
          fromSede={first.campus}
          toSede={sede || first.campus}
          fromGrade={first.grade}
          toGrade={grado ? Number(grado) : first.grade}
          fromGroup={first.group}
          toGroup={grupo || first.group}
          onBack={() => setStep("form")}
          onConfirm={() => void applyChanges()}
          onClose={() => {
            setOpen(false)
            reset()
          }}
        />
      )}
    </>
  )
}
