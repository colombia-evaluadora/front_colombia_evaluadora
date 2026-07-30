import { useMemo, useState } from "react"
import { useForm } from "@tanstack/react-form"
import {
  CheckIcon,
  PencilIcon,
  PlusCircleIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
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
import { FieldVariantContext } from "@/hooks/use-field-variant"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useCreateAreaSubject } from "../../../api/mutations/create-area-subject"
import { useUpdateAreaSubject } from "../../../api/mutations/update-area-subject"
import { useEspecialidadesQuery } from "../../../api/query/use-especialidades-query"
import type {
  AreaSubject,
  AreaSubjectItem,
} from "../../../api/types/academic-period/area-subject"
import { ColorPickerPopover } from "../color-picker"
import { EspecialidadSelect } from "../especialidad-select"
import { SortableHeader } from "../sortable-header"
import { SelectGeneralAreaDialog } from "./dialog-select-general-area"

const areaFormSchema = z.object({
  areaGeneral: z.string().min(1, "El área general es obligatoria"),
  nombreInterno: z.string().min(1, "El nombre interno es obligatorio"),
  abreviacion: z.string().min(1, "La abreviación es obligatoria"),
  ordenReportes: z.number().int().nonnegative(),
})
type AreaFormValues = z.infer<typeof areaFormSchema>

type SubjectDraft = {
  asignaturaGeneral: string
  nombreInterno: string
  abreviacion: string
  ordenReportes: number
  color: string
  especialidad: string
}

function emptyDraft(): SubjectDraft {
  return {
    asignaturaGeneral: "",
    nombreInterno: "",
    abreviacion: "",
    ordenReportes: 1,
    color: "",
    especialidad: "",
  }
}

function itemToDraft(item: AreaSubjectItem): SubjectDraft {
  return {
    asignaturaGeneral: item.asignaturaGeneral,
    nombreInterno: item.nombreInterno,
    abreviacion: item.abreviacion,
    ordenReportes: item.ordenReportes,
    color: item.color ?? "",
    especialidad: item.especialidad ?? "",
  }
}

const FORM_ID = "area-subject-form"

type SortKey =
  | "asignaturaGeneral"
  | "nombreInterno"
  | "abreviacion"
  | "ordenReportes"
  | "especialidad"
type SortState = { key: SortKey; dir: "asc" | "desc" } | null

interface AreaSubjectFormDialogProps {
  academicPeriodId?: number
  areaSubject?: AreaSubject
}

export function AreaSubjectFormDialog({
  academicPeriodId,
  areaSubject,
}: AreaSubjectFormDialogProps) {
  const isEdit = areaSubject != null

  const [open, setOpen] = useState(false)
  const [subjectsStarted, setSubjectsStarted] = useState(isEdit)
  const [subjects, setSubjects] = useState<SubjectDraft[]>(
    () => areaSubject?.subjects.map(itemToDraft) ?? []
  )
  const [draft, setDraft] = useState<SubjectDraft>(emptyDraft())
  // Edición inline de una asignatura ya agregada (estilo rating-scale): la fila
  // pasa a inputs con guardar/cancelar.
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<SubjectDraft | null>(null)
  const { data: backendEspecialidades = [] } = useEspecialidadesQuery()
  const [especialidades, setEspecialidades] = useState<string[]>(
    backendEspecialidades
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sort, setSort] = useState<SortState>(null)

  const areaDefaults: AreaFormValues = {
    areaGeneral: areaSubject?.areaGeneral ?? "",
    nombreInterno: areaSubject?.nombreInterno ?? "",
    abreviacion: areaSubject?.abreviacion ?? "",
    ordenReportes: areaSubject?.ordenReportes ?? 0,
  }

  const createAreaSubject = useCreateAreaSubject()
  const updateAreaSubject = useUpdateAreaSubject()
  const isPending = createAreaSubject.isPending || updateAreaSubject.isPending

  const form = useForm({
    defaultValues: areaDefaults,
    validators: { onSubmit: areaFormSchema },
    onSubmit: async ({ value }) => {
      const base = areaFormSchema.parse(value)
      const payloadSubjects: AreaSubjectItem[] = subjects.map((subject) => ({
        asignaturaGeneral: subject.asignaturaGeneral,
        nombreInterno: subject.nombreInterno || subject.asignaturaGeneral,
        abreviacion: subject.abreviacion,
        ordenReportes: subject.ordenReportes,
        color: subject.color || undefined,
        especialidad: subject.especialidad || undefined,
      }))

      if (isEdit) {
        const result = await updateAreaSubject.mutateAsync({
          codigo: areaSubject.codigo,
          values: {
            ...areaSubject,
            ...base,
            subjects: payloadSubjects,
          },
        })
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
      } else {
        await createAreaSubject.mutateAsync({
          codigo: Date.now(),
          areaGeneral: base.areaGeneral,
          nombreInterno: base.nombreInterno,
          abreviacion: base.abreviacion,
          ordenReportes: base.ordenReportes,
          subjects: payloadSubjects,
          academicPeriodId,
        })
        toast.success(
          payloadSubjects.length > 0
            ? `Área creada con ${payloadSubjects.length} asignatura(s) general(es).`
            : "Área creada."
        )
      }
      setOpen(false)
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // Al abrir, (re)sembramos el estado desde el área (edición) o limpio (alta).
      form.reset()
      setSubjects(areaSubject?.subjects.map(itemToDraft) ?? [])
      setSubjectsStarted(isEdit)
      setDraft(emptyDraft())
      setEditingIndex(null)
      setEditDraft(null)
      setEspecialidades(backendEspecialidades)
      setConfirmOpen(false)
      setSort(null)
    }
  }

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

  function startSubject(useAreaInfo: boolean) {
    const area = form.state.values
    setDraft(
      useAreaInfo
        ? {
            asignaturaGeneral: area.areaGeneral,
            nombreInterno: area.nombreInterno,
            abreviacion: area.abreviacion,
            // El orden de la asignatura es independiente del orden del área.
            ordenReportes: 1,
            color: "",
            especialidad: "",
          }
        : emptyDraft()
    )
    setSubjectsStarted(true)
    setConfirmOpen(false)
  }

  function patchDraft(patch: Partial<SubjectDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function commitDraft() {
    // La identidad de la asignatura es su área general del catálogo; exigimos
    // al menos eso (o un nombre interno) para no meter filas vacías.
    if (!draft.asignaturaGeneral.trim() && !draft.nombreInterno.trim()) {
      toast.error("Elegí una asignatura general o completá el nombre interno.")
      return
    }
    setSubjects((prev) => [...prev, draft])
    setDraft(emptyDraft())
  }

  function removeSubject(index: number) {
    setSubjects((prev) => prev.filter((_, i) => i !== index))
    // Si estaba en edición esa (u otra) fila, cancelamos para no dejar índices
    // colgados.
    cancelEditSubject()
  }

  function startEditSubject(index: number) {
    setEditingIndex(index)
    setEditDraft({ ...subjects[index] })
  }

  function cancelEditSubject() {
    setEditingIndex(null)
    setEditDraft(null)
  }

  function patchEditDraft(patch: Partial<SubjectDraft>) {
    setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function saveEditSubject() {
    if (editingIndex === null || !editDraft) return
    if (!editDraft.asignaturaGeneral.trim() && !editDraft.nombreInterno.trim()) {
      toast.error("Elegí una asignatura general o completá el nombre interno.")
      return
    }
    const next = editDraft
    setSubjects((prev) =>
      prev.map((item, i) => (i === editingIndex ? next : item))
    )
    cancelEditSubject()
  }

  function addEspecialidad(nombre: string) {
    setEspecialidades((prev) =>
      prev.includes(nombre) ? prev : [...prev, nombre]
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEdit ? (
        <DialogTrigger
          render={
            <Button
              variant="fill"
              color="secondary"
              size="icon"
              className="size-8"
            />
          }
        >
          <span className="sr-only">Editar área</span>
          <PencilIcon />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button color="primary" size="sm" />}>
          <PlusCircleIcon weight="fill" data-icon="inline-start" />
          Agregar
        </DialogTrigger>
      )}

      <DialogContent
        className={subjectsStarted ? "sm:max-w-7xl" : "sm:max-w-5xl"}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar área" : "Agregar área"}</DialogTitle>
          <DialogDescription>
            Completá los datos del área y asigná sus asignaturas generales.
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
                <Field
                  variant="outlined"
                  data-invalid={isInvalid}
                  className="w-auto min-w-[11rem] flex-1"
                >
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    Área general*
                  </FieldLabel>
                  <SelectGeneralAreaDialog
                    id={field.name}
                    value={field.state.value}
                    onChange={(value) => {
                      field.handleChange(value)
                      if (!form.state.values.nombreInterno) {
                        form.setFieldValue("nombreInterno", value)
                      }
                    }}
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
                <Field
                  variant="outlined"
                  data-invalid={isInvalid}
                  className="w-auto min-w-[11rem] flex-1"
                >
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    Nombre interno del área*
                  </FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="ej. Matemáticas"
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
                <Field
                  variant="outlined"
                  data-invalid={isInvalid}
                  className="w-auto min-w-[11rem] flex-1"
                >
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    Abreviación*
                  </FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="ej. MAT"
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
                <Field
                  variant="outlined"
                  data-invalid={isInvalid}
                  className="w-auto min-w-[11rem] flex-1"
                >
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    Orden en los reportes*
                  </FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    placeholder="ej. 1"
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
                    Añadir asignatura
                  </Button>
                </div>
              ) : null
            }
          </form.Subscribe>
        </form>

        {subjectsStarted && (
          <div className="overflow-x-auto border [&_[data-slot=input]]:bg-background [&_[data-slot=select-trigger]]:bg-background">
            {/* Los controles de la tabla usan la variante `outlined`: cada
                input queda recuadrado y se distingue del color de hover de la
                fila. */}
            <FieldVariantContext.Provider value="outlined">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader
                      title="Orden"
                      sortKey="ordenReportes"
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
                {/* Asignaturas generales ya agregadas. */}
                {sortedSubjects.map((subject, index) => {
                  // Editamos contra el índice real del arreglo (no el ordenado).
                  const realIndex = subjects.indexOf(subject)
                  const isEditing =
                    editingIndex === realIndex && editDraft !== null

                  if (isEditing && editDraft) {
                    return (
                      <TableRow key={realIndex}>
                        <TableCell>
                          <Input
                            aria-label="Orden en los reportes"
                            type="number"
                            min={0}
                            className="w-20"
                            value={
                              Number.isNaN(editDraft.ordenReportes)
                                ? ""
                                : editDraft.ordenReportes
                            }
                            onChange={(e) =>
                              patchEditDraft({
                                ordenReportes: e.target.valueAsNumber,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <SelectGeneralAreaDialog
                            value={editDraft.asignaturaGeneral}
                            onChange={(value) =>
                              patchEditDraft({ asignaturaGeneral: value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            aria-label="Nombre interno"
                            value={editDraft.nombreInterno}
                            onChange={(e) =>
                              patchEditDraft({ nombreInterno: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            aria-label="Abreviación"
                            value={editDraft.abreviacion}
                            onChange={(e) =>
                              patchEditDraft({ abreviacion: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <ColorPickerPopover
                            value={editDraft.color}
                            onChange={(hex) => patchEditDraft({ color: hex })}
                          />
                        </TableCell>
                        <TableCell>
                          <EspecialidadSelect
                            value={editDraft.especialidad}
                            options={especialidades}
                            onChange={(value) =>
                              patchEditDraft({ especialidad: value })
                            }
                            onAddOption={addEspecialidad}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              color="primary"
                              size="icon"
                              className="size-8"
                              aria-label="Guardar cambios"
                              onClick={saveEditSubject}
                            >
                              <CheckIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-8"
                              aria-label="Cancelar edición"
                              onClick={cancelEditSubject}
                            >
                              <XIcon />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  }

                  return (
                    <TableRow key={realIndex}>
                      <TableCell>{subject.ordenReportes}</TableCell>
                      <TableCell>{subject.asignaturaGeneral || "—"}</TableCell>
                      <TableCell>{subject.nombreInterno || "—"}</TableCell>
                      <TableCell>{subject.abreviacion || "—"}</TableCell>
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="fill"
                            color="secondary"
                            size="icon"
                            className="size-8"
                            aria-label={`Editar asignatura ${index + 1}`}
                            disabled={editingIndex !== null}
                            onClick={() => startEditSubject(realIndex)}
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="fill"
                            color="destructive"
                            size="icon"
                            className="size-8"
                            aria-label={`Quitar asignatura ${index + 1}`}
                            disabled={editingIndex !== null}
                            onClick={() => removeSubject(realIndex)}
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {/* Fila de carga para agregar otra asignatura general. */}
                <TableRow>
                  <TableCell>
                    <Input
                      aria-label="Orden en los reportes"
                      type="number"
                      min={0}
                      placeholder="0"
                      className="w-20"
                      value={
                        Number.isNaN(draft.ordenReportes)
                          ? ""
                          : draft.ordenReportes
                      }
                      onChange={(e) =>
                        patchDraft({ ordenReportes: e.target.valueAsNumber })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <SelectGeneralAreaDialog
                      value={draft.asignaturaGeneral}
                      onChange={(value) =>
                        patchDraft({ asignaturaGeneral: value })
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
            </FieldVariantContext.Provider>
          </div>
        )}

        <DialogFooter className="sm:justify-end">
          <Button
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            Guardar
          </Button>
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
              ¿Desea agregar una asignatura general utilizando la misma
              información de esta área?
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
