import { useMemo, useState } from "react"
import { PencilIcon, PlusCircleIcon, SpinnerIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useCreateGrade } from "../../../api/mutations/create-grade"
import { useUpdateGrade } from "../../../api/mutations/update-grade"
import { useStudyPlansQuery } from "../../../api/query/use-study-plans-query"
import { useAreaSubjectQuery } from "../../../api/query/use-area-subject"
import { useGradeGroupsQuery } from "../../../api/query/use-grade-groups-query"
import { useTeachingLevelsQuery } from "../../../api/query/use-teaching-levels-query"
import type { Grade } from "../../../api/types/academic-period/grade"
import { TabGradeGroups } from "../tabs/tab-grade-groups"
import { TabPromotionCriteria } from "../tabs/tab-promotion-criteria"
import { TabStudyPlan } from "../tabs/tab-study-plan"
import { ScheduleBuilder } from "../schedule/schedule-builder"
import {
  DEFAULT_SUBJECT_COLOR,
  type Jornada,
  type ScheduleSubject,
} from "../schedule/schedule-data"

const GRADO_SIGUIENTE_OPTIONS = [
  "Transición",
  "Primero",
  "Segundo",
  "Tercero",
  "Cuarto",
  "Quinto",
  "Sexto",
  "Séptimo",
  "Octavo",
  "Noveno",
  "Décimo",
  "Undécimo",
]

// Normaliza el nombre del grado (sin acentos ni mayúsculas) para detectar el
// último grado, que no tiene grado siguiente.
function normalizeGrade(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

const LAST_GRADE_NAMES = new Set(["undecimo", "once", "11", "11°", "11º"])

interface CreateGradeDialogProps {
  jornada: Jornada
  academicPeriodId?: number
  // Si se pasa un grado, el diálogo abre en modo edición.
  grade?: Grade
}

export function CreateGradeDialog({
  jornada,
  academicPeriodId,
  grade,
}: CreateGradeDialogProps) {
  const isEditing = grade != null

  const [open, setOpen] = useState(false)
  // Id del grado: viene del grado editado, o del recién creado (paso 1). Hasta
  // que exista, las pestañas (grupo/plan/horario) quedan deshabilitadas.
  const [gradeId, setGradeId] = useState<number | null>(grade?.id ?? null)

  const [teachingLevelId, setTeachingLevelId] = useState<number | null>(
    grade?.teachingLevelId ?? null
  )
  const [nombre, setNombre] = useState(grade?.nombre ?? "")
  const [gradoSiguiente, setGradoSiguiente] = useState(
    grade?.gradoSiguiente ?? ""
  )
  const [tieneGradoSiguiente, setTieneGradoSiguiente] = useState(
    grade ? (grade.tieneGradoSiguiente ? "si" : "no") : ""
  )

  function resetForm() {
    setGradeId(grade?.id ?? null)
    setTeachingLevelId(grade?.teachingLevelId ?? null)
    setNombre(grade?.nombre ?? "")
    setGradoSiguiente(grade?.gradoSiguiente ?? "")
    setTieneGradoSiguiente(grade ? (grade.tieneGradoSiguiente ? "si" : "no") : "")
  }

  const { data: teachingLevels = [] } = useTeachingLevelsQuery()

  const createGrade = useCreateGrade({
    mutationConfig: {
      onSuccess: (created) => {
        setGradeId(created.id)
        toast.success(
          "Grado creado. Ahora podés configurar grupos, plan de estudio y horario."
        )
      },
    },
  })

  const updateGrade = useUpdateGrade({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
      },
    },
  })

  const isSaving = createGrade.isPending || updateGrade.isPending

  // El último grado (Undécimo) no tiene grado siguiente.
  const isLastGrade = LAST_GRADE_NAMES.has(normalizeGrade(nombre))

  function handleSaveGrade() {
    if (!nombre.trim() || teachingLevelId == null) {
      toast.error("Completá el nivel de enseñanza y el nombre del grado.")
      return
    }
    const payload = {
      nombre,
      grado: nombre,
      teachingLevelId,
      gradoSiguiente: isLastGrade ? undefined : gradoSiguiente || undefined,
      tieneGradoSiguiente: isLastGrade ? false : tieneGradoSiguiente === "si",
    }
    if (gradeId == null) {
      createGrade.mutate({ ...payload, academicPeriodId })
    } else {
      updateGrade.mutate({ id: gradeId, values: payload })
    }
  }

  // Materias del horario = asignaturas del plan de estudio del grado (nombre +
  // intensidad horaria como bloques), coloreadas según área/asignatura.
  const { data: planData } = useStudyPlansQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    gradeId: gradeId ?? undefined,
  })
  const { data: areaData } = useAreaSubjectQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    academicPeriodId,
  })

  // Opciones del select Grado/Grupo del horario = grupos reales del grado.
  const { data: gradeGroupsData } = useGradeGroupsQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    gradeId: gradeId ?? undefined,
  })
  const gradeGroupOptions = useMemo(
    () =>
      (gradeGroupsData?.rows ?? []).map((g) =>
        [g.planEstudio, g.codigo, g.jornada].filter(Boolean).join(" - ")
      ),
    [gradeGroupsData]
  )

  const scheduleSubjects = useMemo<ScheduleSubject[]>(() => {
    const colorByName = new Map<string, string>()
    for (const area of areaData?.rows ?? []) {
      if (!area.color) continue
      colorByName.set(area.nombreInterno.toLowerCase(), area.color)
      colorByName.set(area.abreviacion.toLowerCase(), area.color)
    }
    return (planData?.rows ?? []).map((item) => ({
      id: String(item.codigo),
      name: item.asignatura,
      blocks: item.intensidadHoraria,
      color:
        colorByName.get(item.asignatura.toLowerCase()) ?? DEFAULT_SUBJECT_COLOR,
    }))
  }, [planData, areaData])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger
        render={
          isEditing ? (
            <Button
              variant="fill"
              color="secondary"
              size="icon"
              className="size-8"
            />
          ) : (
            <Button color="primary" size="sm" />
          )
        }
      >
        {isEditing ? (
          <>
            <span className="sr-only">Editar grado</span>
            <PencilIcon />
          </>
        ) : (
          <>
            <PlusCircleIcon weight="fill" data-icon="inline-start" />
            Agregar
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grado" : "Agregar grado"}</DialogTitle>
        </DialogHeader>

        {/* Paso 1: encabezado del grado */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="grade-nivel">Nivel de enseñanza*</FieldLabel>
            <Select
              value={teachingLevelId != null ? String(teachingLevelId) : ""}
              onValueChange={(value) => value && setTeachingLevelId(Number(value))}
            >
              <SelectTrigger id="grade-nivel">
                <SelectValue placeholder="Seleccionar">
                  {(value) =>
                    teachingLevels.find((l) => String(l.id) === value)?.nombre ??
                    ""
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {teachingLevels.map((level) => (
                    <SelectItem key={level.id} value={String(level.id)}>
                      {level.nombre}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="grade-nombre">Nombre*</FieldLabel>
            <Input
              id="grade-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>

          {/* El último grado (Undécimo) no tiene grado siguiente. */}
          {!isLastGrade && (
            <>
              <Field>
                <FieldLabel htmlFor="grade-siguiente">
                  Grado siguiente
                </FieldLabel>
                <Select
                  value={gradoSiguiente}
                  onValueChange={(value) => value && setGradoSiguiente(value)}
                >
                  <SelectTrigger id="grade-siguiente">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {GRADO_SIGUIENTE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Tiene grado siguiente</FieldLabel>
                <RadioGroup
                  className="flex gap-6 pt-2"
                  value={tieneGradoSiguiente}
                  onValueChange={(value) =>
                    value && setTieneGradoSiguiente(value)
                  }
                >
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="si" />
                    Sí
                  </label>
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="no" />
                    No
                  </label>
                </RadioGroup>
              </Field>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            color="primary"
            size="sm"
            onClick={handleSaveGrade}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            {gradeId == null ? "Crear grado" : "Guardar cambios"}
          </Button>
        </div>

        {/* Paso 2: configuración del grado (habilitada al existir el grado) */}
        {gradeId == null ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Guardá el grado para configurar sus grupos, plan de estudio y
            horario.
          </p>
        ) : (
          <Tabs defaultValue="grupo" className="w-full">
            <TabsList
              variant="line"
              className="w-full justify-start overflow-x-auto"
            >
              <TabsTrigger value="grupo">Grupo</TabsTrigger>
              <TabsTrigger value="promocion">Criterios de promoción</TabsTrigger>
              <TabsTrigger value="plan">Plan de estudio</TabsTrigger>
              <TabsTrigger value="horario">Horario</TabsTrigger>
            </TabsList>

            <TabsContent value="grupo" className="mt-4">
              <TabGradeGroups gradeId={gradeId} />
            </TabsContent>

            <TabsContent value="promocion" className="mt-4">
              <TabPromotionCriteria hideSubmit />
            </TabsContent>

            <TabsContent value="plan" className="mt-4">
              <TabStudyPlan
                academicPeriodId={academicPeriodId}
                gradeId={gradeId}
              />
            </TabsContent>

            <TabsContent value="horario" className="mt-4">
              <ScheduleBuilder
                jornada={jornada}
                subjects={scheduleSubjects}
                gradeGroups={gradeGroupOptions}
                onClose={() => setOpen(false)}
                hideActions
              />
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
