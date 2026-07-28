import { useMemo, useState } from "react"
import { useForm } from "@tanstack/react-form"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretDownIcon,
  CaretUpDownIcon,
  CheckIcon,
  PlusCircleIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { toast } from "sonner"
import { z } from "zod"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { useCreateAreaSubject } from "../../../api/mutations/create-area-subject"
import { ColorPickerPopover } from "../color-picker"
import { SelectGeneralAreaDialog } from "./dialog-select-general-area"

const areaSubjectFormSchema = z.object({
  // El código no se ingresa en el formulario: se autogenera con Date.now() al
  // enviar. Por eso admite 0 (su valor por defecto) y no bloquea el submit.
  codigo: z.number().int().nonnegative(),
  areaGeneral: z.string().min(1, "El área general es obligatoria"),
  nombreInterno: z.string().min(1, "El nombre interno es obligatorio"),
  abreviacion: z.string().min(1, "La abreviación es obligatoria"),
  ordenReportes: z.number().int().nonnegative(),
})
type AreaSubjectFormValues = z.infer<typeof areaSubjectFormSchema>

const EMPTY: AreaSubjectFormValues = {
  codigo: 0,
  areaGeneral: "",
  nombreInterno: "",
  abreviacion: "",
  ordenReportes: 0,
}

const INITIAL_ESPECIALIDADES = [
  "General",
  "Técnica",
  "Académica",
  "Artística",
  "Deportiva",
]

type SubjectDraft = {
  orden: number
  asignaturaGeneral: string
  nombreInterno: string
  abreviacion: string
  color: string
  especialidad: string
}

function emptyDraft(orden: number): SubjectDraft {
  return {
    orden,
    asignaturaGeneral: "",
    nombreInterno: "",
    abreviacion: "",
    color: "",
    especialidad: "",
  }
}

const FORM_ID = "area-subject-form"

type SortKey = Exclude<keyof SubjectDraft, "color">
type SortState = { key: SortKey; dir: "asc" | "desc" } | null

interface CreateAreaSubjectDialogProps {
  academicPeriodId?: number
}

export function CreateAreaSubjectDialog({
  academicPeriodId,
}: CreateAreaSubjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [subjectsStarted, setSubjectsStarted] = useState(false)
  const [subjects, setSubjects] = useState<SubjectDraft[]>([])
  const [draft, setDraft] = useState<SubjectDraft>(emptyDraft(1))
  const [especialidades, setEspecialidades] = useState(INITIAL_ESPECIALIDADES)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sort, setSort] = useState<SortState>(null)

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return null
    })
  }

  const sortedSubjects = useMemo(() => {
    if (!sort) return subjects
    const { key, dir } = sort
    const copy = [...subjects]
    copy.sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv))
      return dir === "asc" ? cmp : -cmp
    })
    return copy
  }, [subjects, sort])

  const createAreaSubject = useCreateAreaSubject()

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onSubmit: areaSubjectFormSchema },
    onSubmit: async ({ value }) => {
      const base = areaSubjectFormSchema.parse(value)
      if (subjects.length > 0) {
        await Promise.all(
          subjects.map((subject, index) =>
            createAreaSubject.mutateAsync({
              codigo: Date.now() + index,
              areaGeneral: base.areaGeneral,
              nombreInterno: subject.nombreInterno || subject.asignaturaGeneral,
              abreviacion: subject.abreviacion || subject.asignaturaGeneral,
              ordenReportes: subject.orden,
              color: subject.color || undefined,
              academicPeriodId,
            })
          )
        )
        toast.success(`${subjects.length} asignatura(s) creada(s).`)
      } else {
        await createAreaSubject.mutateAsync({
          ...base,
          codigo: value.codigo || Date.now(),
          academicPeriodId,
        })
        toast.success("Área creada.")
      }
      reset()
      setOpen(false)
    },
  })

  function reset() {
    form.reset()
    setSubjectsStarted(false)
    setSubjects([])
    setDraft(emptyDraft(1))
    setEspecialidades(INITIAL_ESPECIALIDADES)
    setConfirmOpen(false)
  }

  function startSubject(useAreaInfo: boolean) {
    const area = form.state.values
    setDraft({
      orden: subjects.length + 1,
      asignaturaGeneral: useAreaInfo ? area.areaGeneral : "",
      nombreInterno: useAreaInfo ? area.nombreInterno : "",
      abreviacion: useAreaInfo ? area.abreviacion : "",
      color: "",
      especialidad: "",
    })
    setSubjectsStarted(true)
    setConfirmOpen(false)
  }

  function patchDraft(patch: Partial<SubjectDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function commitDraft() {
    if (!draft.asignaturaGeneral.trim()) {
      toast.error("Completá la asignatura general.")
      return
    }
    setSubjects((prev) => [...prev, draft])
    setDraft(emptyDraft(subjects.length + 2))
  }

  function removeSubject(subject: SubjectDraft) {
    setSubjects((prev) => prev.filter((item) => item !== subject))
  }

  function addEspecialidad(nombre: string) {
    setEspecialidades((prev) =>
      prev.includes(nombre) ? prev : [...prev, nombre]
    )
  }

  const hasSubjects = subjects.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={<Button color="primary" size="sm" />}>
        <PlusCircleIcon weight="fill" data-icon="inline-start" />
        Agregar
      </DialogTrigger>
      <DialogContent
        className={subjectsStarted ? "sm:max-w-7xl" : "sm:max-w-5xl"}
      >
        <DialogHeader>
          <DialogTitle>
            {hasSubjects ? "Agregar área/asignatura" : "Agregar área"}
          </DialogTitle>
          <DialogDescription>
            Completá los datos del área y, si querés, agregá asignaturas.
          </DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-wrap items-end gap-4"
        >
          <form.Field name="areaGeneral">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid} className="w-auto min-w-[11rem] flex-1">
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    Área general*
                  </FieldLabel>
                  <SelectGeneralAreaDialog
                    id={field.name}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value)}
                    invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="nombreInterno">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid} className="w-auto min-w-[11rem] flex-1">
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    Nombre interno del área*
                  </FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="abreviacion">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid} className="w-auto min-w-[11rem] flex-1">
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    Abreviación*
                  </FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="ordenReportes">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid} className="w-auto min-w-[11rem] flex-1">
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    Orden en los reportes*
                  </FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    value={
                      Number.isNaN(field.state.value) ? "" : field.state.value
                    }
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          {/* El botón aparece recién cuando el área está completa, en la
              columna de "Orden en los reportes". Al abrirlo ya expande el
              modal y muestra la tabla de fondo mientras pregunta. */}
          <form.Subscribe
            selector={(state) => ({
              areaGeneral: state.values.areaGeneral,
              nombreInterno: state.values.nombreInterno,
              abreviacion: state.values.abreviacion,
            })}
          >
            {({ areaGeneral, nombreInterno, abreviacion }) =>
              !subjectsStarted && areaGeneral && nombreInterno && abreviacion ? (
                <div className="flex items-end">
                  <Button
                    type="button"
                    color="primary"
                    size="sm"
                    onClick={() => {
                      setSubjectsStarted(true)
                      setConfirmOpen(true)
                    }}
                  >
                    <PlusCircleIcon weight="fill" data-icon="inline-start" />
                    Añadir
                  </Button>
                </div>
              ) : null
            }
          </form.Subscribe>
        </form>

        {subjectsStarted && (
          <div className="overflow-x-auto border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">
                    <SortableHeader
                      title="#"
                      sortKey="orden"
                      sort={sort}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      title="Asignatura general"
                      sortKey="asignaturaGeneral"
                      sort={sort}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      title="Nombre interno"
                      sortKey="nombreInterno"
                      sort={sort}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      title="Abreviación"
                      sortKey="abreviacion"
                      sort={sort}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>
                    <SortableHeader
                      title="Especialidad"
                      sortKey="especialidad"
                      sort={sort}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Asignaturas ya agregadas (solo lectura). */}
                {sortedSubjects.map((subject, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{subject.orden}</TableCell>
                    <TableCell className="font-medium">
                      {subject.asignaturaGeneral}
                    </TableCell>
                    <TableCell>{subject.nombreInterno}</TableCell>
                    <TableCell>{subject.abreviacion}</TableCell>
                    <TableCell>
                      {subject.color ? (
                        <span
                          className="inline-block size-4 rounded-full ring-1 ring-foreground/10"
                          style={{ backgroundColor: subject.color }}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{subject.especialidad || "—"}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Quitar asignatura ${index + 1}`}
                        onClick={() => removeSubject(subject)}
                      >
                        <TrashIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Fila de carga para agregar otra asignatura. */}
                <TableRow>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      aria-label="Orden"
                      placeholder="Orden"
                      value={Number.isNaN(draft.orden) ? "" : draft.orden}
                      onChange={(e) =>
                        patchDraft({ orden: e.target.valueAsNumber })
                      }
                      className="w-14"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Asignatura general"
                      placeholder="Agregar"
                      value={draft.asignaturaGeneral}
                      onChange={(e) =>
                        patchDraft({ asignaturaGeneral: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Nombre interno"
                      placeholder="Agregar"
                      value={draft.nombreInterno}
                      onChange={(e) =>
                        patchDraft({ nombreInterno: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Abreviación"
                      placeholder="Agregar"
                      value={draft.abreviacion}
                      onChange={(e) =>
                        patchDraft({ abreviacion: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <ColorPickerPopover
                      value={draft.color}
                      onChange={(hex) => patchDraft({ color: hex })}
                    />
                  </TableCell>
                  <TableCell>
                    <EspecialidadSelect
                      value={draft.especialidad}
                      options={especialidades}
                      onChange={(value) => patchDraft({ especialidad: value })}
                      onAddOption={addEspecialidad}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      color="primary"
                      size="icon-sm"
                      aria-label="Agregar asignatura a la lista"
                      onClick={commitDraft}
                    >
                      <PlusIcon weight="bold" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="sm:justify-end">
          {/* Guardar aparece recién cuando se empezó a agregar asignaturas;
              Cancelar queda a la derecha, al lado de Guardar. */}
          {subjectsStarted && (
            <Button
              type="submit"
              color="primary"
              form={FORM_ID}
              disabled={createAreaSubject.isPending}
              aria-busy={createAreaSubject.isPending}
            >
              {createAreaSubject.isPending && (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              )}
              Guardar
            </Button>
          )}
          <DialogClose render={<Button type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>

      {/* Prompt: precargar los datos del área o rellenar a mano. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Desea agregar una asignatura utilizando la misma información de
              esta área?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => startSubject(true)}>
              Sí
            </AlertDialogAction>
            <AlertDialogAction
              color="neutral"
              variant="outline"
              onClick={() => startSubject(false)}
            >
              No
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

// Header de columna clicable que cicla el orden (asc → desc → sin orden) con
// los mismos íconos que la tabla de periodos de evaluación.
function SortableHeader({
  title,
  sortKey,
  sort,
  onToggle,
}: {
  title: string
  sortKey: SortKey
  sort: SortState
  onToggle: (key: SortKey) => void
}) {
  const active = sort?.key === sortKey
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => onToggle(sortKey)}
    >
      <span>{title}</span>
      {active ? (
        sort?.dir === "desc" ? (
          <ArrowDownIcon data-icon="inline-end" />
        ) : (
          <ArrowUpIcon data-icon="inline-end" />
        )
      ) : (
        <CaretUpDownIcon data-icon="inline-end" />
      )}
    </Button>
  )
}

function EspecialidadSelect({
  value,
  options,
  onChange,
  onAddOption,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  onAddOption: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [nuevo, setNuevo] = useState("")

  function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    onAddOption(nombre)
    onChange(nombre)
    setNuevo("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between gap-1.5 rounded-none border border-transparent border-b-input bg-transparent px-0 py-1 text-left text-sm outline-none transition-[color,border-color] hover:border-b-ring/50 data-[popup-open]:border-b-ring",
              value ? "text-foreground" : "text-muted-foreground"
            )}
          />
        }
      >
        <span className="flex-1 truncate">{value || "Seleccionar"}</span>
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div className="flex flex-col">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              className="hover:bg-foreground/10 flex items-center justify-between gap-2 rounded-none px-2 py-1.5 text-left text-sm"
            >
              {option}
              {option === value && <CheckIcon className="size-4 shrink-0" />}
            </button>
          ))}

          {/* Agregar especialidad nueva */}
          <div className="mt-1 flex items-center gap-1 border-t pt-2">
            <Input
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  agregar()
                }
              }}
              placeholder="Nueva especialidad"
              className="h-8"
            />
            <Button
              type="button"
              color="primary"
              size="icon-sm"
              aria-label="Agregar especialidad"
              disabled={!nuevo.trim()}
              onClick={agregar}
            >
              <PlusIcon weight="bold" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
