import { useMemo, useState } from "react"
import { PencilIcon, PlusCircleIcon, SpinnerIcon } from "@/components/ui/icons"
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

interface CreateGradeDialogProps {
  jornada: Jornada
  academicPeriodId?: number
  grade?: Grade
}

export function CreateGradeDialog({
  jornada,
  academicPeriodId,
  grade,
}: CreateGradeDialogProps) {
  const isEditing = grade != null

  const [open, setOpen] = useState(false)
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
  const hasNextGrade = tieneGradoSiguiente === "si"

  function handleSaveGrade() {
    if (!nombre.trim() || teachingLevelId == null) {
      toast.error("Completá el nivel de enseñanza y el nombre del grado.")
      return
    }
    const payload = {
      nombre,
      grado: nombre,
      teachingLevelId,
      tieneGradoSiguiente: hasNextGrade,
      gradoSiguiente: hasNextGrade ? gradoSiguiente || undefined : undefined,
    }
    if (gradeId == null) {
      createGrade.mutate({ ...payload, academicPeriodId })
    } else {
      updateGrade.mutate({ id: gradeId, values: payload })
    }
  }

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
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:max-w-4xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grado" : "Agregar grado"}</DialogTitle>
        </DialogHeader>

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

          {hasNextGrade && (
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
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            color="primary"
            size="sm"
            className="w-full sm:w-auto"
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

        {gradeId == null ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Guardá el grado para configurar sus grupos, plan de estudio y
            horario.
          </p>
        ) : (
          <Tabs defaultValue="grupo" className="w-full min-w-0">
            <TabsList
              variant="line"
              className="w-full justify-start overflow-x-auto"
            >
              <TabsTrigger value="grupo">Grupo</TabsTrigger>
              <TabsTrigger value="promocion">Criterios de promoción</TabsTrigger>
              <TabsTrigger value="plan">Plan de estudio</TabsTrigger>
              <TabsTrigger value="horario">Horario</TabsTrigger>
            </TabsList>

            <TabsContent value="grupo" className="mt-4 min-w-0">
              <TabGradeGroups gradeId={gradeId} />
            </TabsContent>

            <TabsContent value="promocion" className="mt-4 min-w-0">
              <TabPromotionCriteria
                gradeId={gradeId}
                academicPeriodId={academicPeriodId}
              />
            </TabsContent>

            <TabsContent value="plan" className="mt-4 min-w-0">
              <TabStudyPlan
                academicPeriodId={academicPeriodId}
                gradeId={gradeId}
              />
            </TabsContent>

            <TabsContent value="horario" className="mt-4 min-w-0">
              <ScheduleBuilder
                jornada={jornada}
                subjects={scheduleSubjects}
                gradeGroups={gradeGroupOptions}
                gradeId={gradeId}
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
