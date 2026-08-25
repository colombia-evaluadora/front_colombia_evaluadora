import { useMemo, useState } from "react"

import {
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  FileXlsIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"

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
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/subjects-multi-select"

import { useExportAcademicAssignmentReport } from "@/features/establishment/academic-period/api/mutations/export-academic-assignment-report"
import { useTeacherOptionsQuery } from "@/features/establishment/academic-period/api/query/use-assignment-report-filters"
import {
  useGradeOptionsQuery,
  useSubjectOptionsQuery,
} from "@/features/establishment/academic-period/api/query/use-study-plan-report-filters"
import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/use-jornadas"
import type { ExportFormat } from "@/features/establishment/institution/api/types/export"

interface ExportAcademicAssignmentsDialogProps {
  academicPeriodId?: number
}

const ALL_VALUE = ""
const ESTADO_OPTIONS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
]

// Reporte dedicado de asignación académica (`fn_asignacion_reporte_listar`,
// V140): una fila por asignación docente+grado+grupo+asignatura+jornada, para
// TODO el periodo — no el listado de docentes que muestra esta pestaña.
export function ExportAcademicAssignmentsDialog({
  academicPeriodId,
}: ExportAcademicAssignmentsDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedJornadas, setSelectedJornadas] = useState<string[]>([])
  const [estado, setEstado] = useState("")
  const { notify } = useNotify()

  const { data: teacherOptions = [] } = useTeacherOptionsQuery(open ? academicPeriodId : undefined)
  const { data: gradeOptions = [] } = useGradeOptionsQuery(open ? academicPeriodId : undefined)
  const { data: subjectOptions = [] } = useSubjectOptionsQuery(open ? academicPeriodId : undefined)
  const { data: jornadaOptions = [] } = useJornadasQuery()

  const teacherNames = useMemo(() => teacherOptions.map((o) => o.nombre), [teacherOptions])
  const gradeNames = useMemo(() => gradeOptions.map((o) => o.nombre), [gradeOptions])
  const subjectNames = useMemo(() => subjectOptions.map((o) => o.nombre), [subjectOptions])
  const jornadaNames = useMemo(() => (jornadaOptions ?? []).map((o) => o.name), [jornadaOptions])

  const exportAll = useExportAcademicAssignmentReport({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        setOpen(false)
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportAll.mutate({
      format,
      filters: {
        academicPeriodId,
        teacherIds: teacherOptions
          .filter((o) => selectedTeachers.includes(o.nombre))
          .map((o) => o.id),
        gradeIds: gradeOptions.filter((o) => selectedGrades.includes(o.nombre)).map((o) => o.id),
        subjectIds: subjectOptions
          .filter((o) => selectedSubjects.includes(o.nombre))
          .map((o) => o.id),
        jornadaIds: (jornadaOptions ?? [])
          .filter((o) => selectedJornadas.includes(o.name))
          .map((o) => o.id),
        estado: estado || undefined,
      },
    })
  }

  const pendingFormat = exportAll.isPending ? exportAll.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            color="muted"
            size="icon-sm"
            aria-label="Exportar asignación académica"
          />
        }
      >
        <FileDownloadOutlinedIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Filtra (opcional) y elige un formato para exportar la asignación académica del periodo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Docente</FieldLabel>
            <SubjectsMultiSelect
              options={teacherNames}
              value={selectedTeachers}
              onChange={setSelectedTeachers}
              placeholder="Todos los docentes"
              emptyMessage="No hay docentes en este periodo."
            />
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Grado</FieldLabel>
            <SubjectsMultiSelect
              options={gradeNames}
              value={selectedGrades}
              onChange={setSelectedGrades}
              placeholder="Todos los grados"
              emptyMessage="No hay grados en este periodo."
            />
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Asignatura</FieldLabel>
            <SubjectsMultiSelect
              options={subjectNames}
              value={selectedSubjects}
              onChange={setSelectedSubjects}
              placeholder="Todas las asignaturas"
              emptyMessage="No hay asignaturas en este periodo."
            />
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Jornada</FieldLabel>
            <SubjectsMultiSelect
              options={jornadaNames}
              value={selectedJornadas}
              onChange={setSelectedJornadas}
              placeholder="Todas las jornadas"
              emptyMessage="No hay jornadas disponibles."
            />
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Estado del docente</FieldLabel>
            <ComboboxField value={estado} onValueChange={(v) => setEstado(v ?? "")}>
              <ComboboxFieldTrigger size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                <ComboboxGroup>
                  <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
                  {ESTADO_OPTIONS.map((option) => (
                    <ComboboxFieldItem key={option.value} value={option.value}>
                      {option.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxGroup>
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>
        </div>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={exportAll.isPending}
              aria-busy={pendingFormat === "excel"}
              onClick={() => handleExport("excel")}
            >
              {pendingFormat === "excel" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FileXlsIcon data-icon="inline-start" />
              )}
              Excel
            </Button>
            <Button
              size="sm"
              type="button"
              color="primary"
              disabled={exportAll.isPending}
              aria-busy={pendingFormat === "pdf"}
              onClick={() => handleExport("pdf")}
            >
              {pendingFormat === "pdf" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FilePdfIcon data-icon="inline-start" />
              )}
              PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
