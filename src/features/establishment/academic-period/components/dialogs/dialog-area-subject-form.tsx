import { useMemo, useRef, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"
import {
  CheckIcon,
  ControlPointIcon,
  PencilIcon,
  PlusIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"

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
import { Input } from "@/components/ui/input"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import {
  ACTIONS_CELL_CLASS,
  actionsOverlayClass,
  actionsSpacerCell,
  actionsSpacerHeadCell,
} from "@/components/table-row-actions"
import { FieldVariantContext } from "@/hooks/use-field-variant"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useGeneralAreasQuery } from "../../api/query/use-general-areas"
import { useCreateAreaSubject } from "@/features/establishment/academic-period/api/mutations/create-area-subject"
import { useUpdateAreaSubject } from "@/features/establishment/academic-period/api/mutations/update-area-subject"
import type { AreaSubject, AreaSubjectItem } from "@/features/establishment/academic-period/api/types/area-subject"
import { AreaField } from "@/features/establishment/academic-period/components/area-field"
import { TableSortableHeader, sortBySortKey, type TableSort } from "@/components/table-sort-header"
import {
  SubjectNoticeBanner,
  type SubjectNotice,
} from "@/features/establishment/academic-period/components/subject-notice"
import {
  SubjectRowFields,
  emptyDraft,
  itemToDraft,
  type SubjectDraft,
} from "@/features/establishment/academic-period/components/subject-row-fields"
import { SelectGeneralAreaDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-select-general-area"
import {
  areaSubjectFormSchema,
  type AreaSubjectFormValues,
} from "@/features/establishment/academic-period/api/schema"
import { useRowEdit } from "@/features/establishment/academic-period/hooks/use-row-edit"

const FORM_ID = "area-subject-form"

type SortKey =
  | "asignaturaGeneral"
  | "nombreInterno"
  | "abreviacion"
  | "ordenReportes"
  | "color"
  | "especialidad"
type SortState = TableSort<SortKey>

interface AreaSubjectFormDialogProps {
  academicPeriodId?: number
  areaSubject?: AreaSubject
}

export function AreaSubjectFormDialog({
  academicPeriodId,
  areaSubject,
}: AreaSubjectFormDialogProps) {
  const isEdit = areaSubject != null

  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [subjectsStarted, setSubjectsStarted] = useState(isEdit)
  const [subjects, setSubjects] = useState<SubjectDraft[]>(
    () => areaSubject?.subjects.map(itemToDraft) ?? [],
  )
  const [draft, setDraft] = useState<SubjectDraft>(emptyDraft())
  const {
    editingKey: editingIndex,
    draft: editDraft,
    startEdit: startRowEdit,
    patchDraft: patchEditDraft,
    cancelEdit: cancelEditSubject,
  } = useRowEdit<SubjectDraft>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [sort, setSort] = useState<SortState>(null)

  const [notice, setNotice] = useState<SubjectNotice | null>(null)
  const noticeIdRef = useRef(0)

  function showNotice(message: string) {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message })
  }

  const nombreInternoEditedRef = useRef(false)

  const areaDefaults: AreaSubjectFormValues = {
    areaGeneral: areaSubject?.areaGeneral ?? "",
    nombreInterno: areaSubject?.nombreInterno ?? "",
    abreviacion: areaSubject?.abreviacion ?? "",
    ordenReportes: areaSubject?.ordenReportes ?? 0,
  }

  const createAreaSubject = useCreateAreaSubject()
  const updateAreaSubject = useUpdateAreaSubject()
  const isPending = createAreaSubject.isPending || updateAreaSubject.isPending

  // Catálogo de áreas generales para mapear el nombre (que usa la UI) al id
  // (fk_area_asignatura) que el backend espera en el bulk. La UI sigue con
  // nombres; solo el payload viaja como id.
  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const areaGeneralNameToId = (nombre: string): string => {
    const match = generalAreas.find((a) => a.nombre === nombre)
    return match ? String(match.id) : ""
  }

  const form = useForm({
    defaultValues: areaDefaults,
    validators: { onSubmit: areaSubjectFormSchema },
    onSubmit: async ({ value }) => {
      const base = areaSubjectFormSchema.parse(value)

      const payloadSubjects: AreaSubjectItem[] = subjects.map((subject) => ({
        // Se conserva para poder diferenciar alta/edición/baja contra el
        // endpoint real al guardar (asignaturas ya existentes vs. nuevas).
        id: subject.id,
        // El backend espera el id del área general (fk_area_asignatura), no el
        // nombre. La UI/estado conserva el nombre; aquí se mapea a id.
        asignaturaGeneral: areaGeneralNameToId(subject.asignaturaGeneral),
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
            // El backend espera el id del área general (fk_area_asignatura), no
            // el nombre. La UI conserva el nombre; aquí se manda como id.
            areaGeneral: areaGeneralNameToId(base.areaGeneral),
            subjects: payloadSubjects,
          },
        })

        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }

        setOpen(false)
        notify(SUCCESS_MESSAGES.areaSubject.updated)
        return
      }

      await createAreaSubject.mutateAsync({
        // Id del área general (fk_area_asignatura); la UI lo maneja por nombre.
        areaGeneral: areaGeneralNameToId(base.areaGeneral),
        nombreInterno: base.nombreInterno,
        abreviacion: base.abreviacion,
        ordenReportes: base.ordenReportes,
        subjects: payloadSubjects,
        academicPeriodId,
      })

      setSuccessOpen(true)

      setSuccessOpen(true)
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)

    if (!next) return

    if (isEdit) {
      form.reset()
      setSubjects(areaSubject?.subjects.map(itemToDraft) ?? [])
      setSubjectsStarted(true)
      setNotice(null)
      nombreInternoEditedRef.current = false
    } else {
      resetCreateForm()
    }
  }

  function resetCreateForm() {
    form.reset()

    setSubjects([])
    setSubjectsStarted(false)
    setDraft(emptyDraft())

    cancelEditSubject()

    setConfirmOpen(false)
    setSort(null)
    setNotice(null)
    nombreInternoEditedRef.current = false
  }

  // El orden lo resuelve el mismo helper que la tabla de escalas de valoración,
  // así las dos ordenan igual y no hay dos comparadores que mantener.
  const sortedSubjects = useMemo(() => sortBySortKey(subjects, sort), [subjects, sort])

  function startSubject(useAreaInfo: boolean) {
    const area = form.state.values
    setDraft(
      useAreaInfo
        ? {
            asignaturaGeneral: area.areaGeneral,
            nombreInterno: area.nombreInterno,
            abreviacion: area.abreviacion,
            ordenReportes: 1,
            color: "",
            especialidad: "",
          }
        : emptyDraft(),
    )
    setSubjectsStarted(true)
    setConfirmOpen(false)
  }

  function patchDraft(patch: Partial<SubjectDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function commitDraft() {
    if (!draft.asignaturaGeneral.trim() && !draft.nombreInterno.trim()) {
      notify("Elige una asignatura general o completa el nombre interno.", { variant: "error" })
      return
    }
    setSubjects((prev) => [...prev, draft])
    setDraft(emptyDraft())
    showNotice("Asignatura agregada exitosamente.")
  }

  function removeSubject(index: number) {
    setSubjects((prev) => prev.filter((_, i) => i !== index))
    cancelEditSubject()
    showNotice("Asignatura eliminada exitosamente.")
  }

  function startEditSubject(index: number) {
    startRowEdit(index, subjects[index])
  }

  function saveEditSubject() {
    if (editingIndex === null || !editDraft) return
    if (!editDraft.asignaturaGeneral.trim() && !editDraft.nombreInterno.trim()) {
      notify("Elige una asignatura general o completa el nombre interno.", { variant: "error" })
      return
    }
    const next = editDraft
    setSubjects((prev) => prev.map((item, i) => (i === editingIndex ? next : item)))
    cancelEditSubject()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {isEdit ? (
          <DialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />}>
            <span className="sr-only">Editar área</span>
            <PencilIcon />
          </DialogTrigger>
        ) : (
          <DialogTrigger render={<Button color="primary" size="sm" />}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </DialogTrigger>
        )}

        <DialogContent className={subjectsStarted ? "sm:max-w-6xl" : "sm:max-w-5xl"}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar área" : "Agregar área"}</DialogTitle>
            <DialogDescription>
              Completa los datos del área y asigna sus asignaturas generales.
            </DialogDescription>
          </DialogHeader>

          {/* `min-w-0`: los ítems del grid de `DialogContent` arrancan con
              `min-width: auto`, así que el min-content de la tabla —celdas
              `nowrap`, aunque su contenedor scrollee— estiraba la columna por
              fuera del popup y se llevaba puesto al form y al footer. Mismo
              envoltorio que el diálogo de escalas de valoración. */}
          <div className="flex min-w-0 flex-col gap-6">
            <NoticeOutlet />

            <form
              id={FORM_ID}
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
              className="flex flex-wrap items-end gap-4"
            >
              <form.Field name="areaGeneral">
                {(field) => (
                  <AreaField field={field} label="Área general*">
                    {(isInvalid) => (
                      <SelectGeneralAreaDialog
                        id={field.name}
                        value={field.state.value}
                        onChange={(value) => {
                          field.handleChange(value)
                          if (!nombreInternoEditedRef.current) {
                            form.setFieldValue("nombreInterno", value)
                          }
                        }}
                        invalid={isInvalid}
                      />
                    )}
                  </AreaField>
                )}
              </form.Field>

              <form.Field name="nombreInterno">
                {(field) => (
                  <AreaField field={field} label="Nombre interno del área*">
                    {(isInvalid) => (
                      <Input
                        id={field.name}
                        placeholder="Agregar"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          nombreInternoEditedRef.current = true
                          field.handleChange(e.target.value)
                        }}
                        aria-invalid={isInvalid}
                      />
                    )}
                  </AreaField>
                )}
              </form.Field>

              <form.Field name="abreviacion">
                {(field) => (
                  <AreaField field={field} label="Abreviación*">
                    {(isInvalid) => (
                      <Input
                        id={field.name}
                        placeholder="Agregar"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                    )}
                  </AreaField>
                )}
              </form.Field>

              <form.Field name="ordenReportes">
                {(field) => (
                  <AreaField field={field} label="Orden en los reportes*">
                    {(isInvalid) => (
                      <Input
                        id={field.name}
                        type="number"
                        min={0}
                        placeholder="Agregar"
                        value={Number.isNaN(field.state.value) ? "" : field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                        aria-invalid={isInvalid}
                      />
                    )}
                  </AreaField>
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => ({
                  areaGeneral: state.values.areaGeneral,
                  nombreInterno: state.values.nombreInterno,
                  abreviacion: state.values.abreviacion,
                  ordenReportes: state.values.ordenReportes,
                })}
              >
                {({ areaGeneral, nombreInterno, abreviacion, ordenReportes }) =>
                  !subjectsStarted &&
                  areaGeneral &&
                  nombreInterno &&
                  abreviacion &&
                  !Number.isNaN(ordenReportes) ? (
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
                        <ControlPointIcon data-icon="inline-start" />
                        Añadir
                      </Button>
                    </div>
                  ) : null
                }
              </form.Subscribe>
            </form>

            <SubjectNoticeBanner key={notice?.id} notice={notice} onClose={() => setNotice(null)} />

            {subjectsStarted && (
              <div className="[&_[data-slot=input]]:bg-background [&_[data-slot=select-trigger]]:bg-background">
                <FieldVariantContext.Provider value="outlined">
                  <Table>
                    <TableHeader>
                      {/* Mismo encabezado que la tabla de escalas de valoración:
                        sin fondo propio ni hover —`has-aria-expanded` cubre el
                        rato en que un menú de orden está abierto— y los títulos
                        en `text-foreground`. */}
                      <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Orden"
                            sortKey="ordenReportes"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Asignatura general"
                            sortKey="asignaturaGeneral"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Nombre interno"
                            sortKey="nombreInterno"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Abreviación"
                            sortKey="abreviacion"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        {/* Ordena por el valor del color (el hex): no es un orden
                          con significado propio, pero agrupa los repetidos, que
                          es para lo que se ordena esta columna. */}
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Color"
                            sortKey="color"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Especialidad"
                            sortKey="especialidad"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        {/* La columna de acciones no rotula: el título queda para
                          lectores de pantalla. El ancho lo reserva el spacer
                          que va justo antes; la celda en sí es `sticky`. */}
                        {actionsSpacerHeadCell}
                        <TableHead className={cn(ACTIONS_CELL_CLASS, "text-foreground")}>
                          <span className="sr-only">Acciones</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Asignaturas generales ya agregadas. */}
                      {sortedSubjects.map((subject, index) => {
                        // Editamos contra el índice real del arreglo (no el ordenado).
                        const realIndex = subjects.indexOf(subject)
                        const isEditing = editingIndex === realIndex && editDraft !== null

                        if (isEditing && editDraft) {
                          return (
                            <TableRow key={realIndex} className="group/row">
                              <SubjectRowFields
                                draft={editDraft}
                                onPatch={patchEditDraft}
                                academicPeriodId={academicPeriodId}
                              />
                              {actionsSpacerCell}
                              <TableCell className={ACTIONS_CELL_CLASS}>
                                {/* `true`: la fila en edición mantiene el bloque
                                  fijo, no sujeto al hover. */}
                                <div className={actionsOverlayClass(true)}>
                                  <Button
                                    type="button"
                                    color="primary"
                                    size="icon-sm"
                                    aria-label="Guardar cambios"
                                    onClick={saveEditSubject}
                                  >
                                    <CheckIcon />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
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
                          <TableRow key={realIndex} className="group/row">
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
                            {actionsSpacerCell}
                            <TableCell className={ACTIONS_CELL_CLASS}>
                              <div className={actionsOverlayClass()}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  color="neutral"
                                  size="icon-sm"
                                  aria-label={`Editar asignatura ${index + 1}`}
                                  disabled={editingIndex !== null}
                                  onClick={() => startEditSubject(realIndex)}
                                >
                                  <PencilIcon />
                                </Button>
                                <ConfirmRemoveButton
                                  label={`Quitar asignatura ${index + 1}`}
                                  description={
                                    subject.asignaturaGeneral.trim()
                                      ? `Se quitará la asignatura «${subject.asignaturaGeneral}». Esta acción no se puede deshacer.`
                                      : "Se quitará la asignatura. Esta acción no se puede deshacer."
                                  }
                                  disabled={editingIndex !== null}
                                  onConfirm={() => removeSubject(realIndex)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}

                      {/* Fila de carga para agregar otra asignatura general. */}
                      <TableRow className="group/row">
                        <SubjectRowFields
                          draft={draft}
                          onPatch={patchDraft}
                          academicPeriodId={academicPeriodId}
                        />
                        {actionsSpacerCell}
                        <TableCell className={ACTIONS_CELL_CLASS}>
                          {/* Fijo: el botón de agregar es la acción principal de
                            la fila, no puede depender del hover. */}
                          <div className={actionsOverlayClass(true)}>
                            <Button
                              type="button"
                              color="primary"
                              size="icon-sm"
                              aria-label="Agregar asignatura a la lista"
                              onClick={commitDraft}
                            >
                              <PlusIcon weight="bold" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </FieldVariantContext.Provider>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-end">
            {subjectsStarted && (
              <Button
                size="sm"
                type="submit"
                color="primary"
                form={FORM_ID}
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
                Guardar
              </Button>
            )}
            <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>
              Cancelar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Prompt: precargar los datos del área o rellenar a mano. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Desea agregar una asignatura general utilizando la misma información de esta área?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => startSubject(true)}>Sí</AlertDialogAction>
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
      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              El área y sus asignaturas fueron guardadas exitosamente.
            </AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogAction
              variant="outline"
              color="neutral"
              onClick={() => {
                setSuccessOpen(false)
                setOpen(false)
              }}
            >
              Regresar al listado
            </AlertDialogAction>

            <AlertDialogAction
              onClick={() => {
                setSuccessOpen(false)
                resetCreateForm()
              }}
            >
              Continuar agregando
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
