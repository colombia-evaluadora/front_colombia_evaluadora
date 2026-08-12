import { useMemo, useRef, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { ControlPointIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"

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

import { useCreateGrade } from "../../../api/mutations/grades/create-grade"
import { useUpdateGrade } from "../../../api/mutations/grades/update-grade"
import { useStudyPlansQuery } from "../../../api/query/study-plans/use-study-plans-query"
import { useAreaSubjectQuery } from "../../../api/query/area-subjects/use-area-subject"
import { useGradeGroupsQuery } from "../../../api/query/grades/use-grade-groups-query"
import { useTeachingLevelsQuery } from "../../../api/query/use-teaching-levels-query"
import type { Grade } from "../../../api/types/grade"
import { TabGradeGroups } from "../tabs/tab-grade-groups"
import {
  TabPromotionCriteria,
  type PromotionCriteriaHandle,
} from "../../promotion-criteria/tabs/tab-promotion-criteria"
import { TabStudyPlan } from "../../study-plans/tabs/tab-study-plan"
import { ScheduleBuilder, type ScheduleBuilderHandle } from "../../schedule/schedule-builder"
import {
  DEFAULT_SUBJECT_COLOR,
  type Jornada,
  type ScheduleSubject,
} from "../../schedule/schedule-data"

// La card sobre la que se apoyan las pestañas tipo carpeta. Sin borde superior:
// esa línea la dibuja el borde inferior de las pestañas, y la activa la borra.
const PANEL = "min-w-0 rounded-b-lg border border-t-0 bg-background p-4"

interface CreateGradeDialogProps {
  jornada: Jornada
  academicPeriodId?: number
  grade?: Grade
}

export function CreateGradeDialog({ jornada, academicPeriodId, grade }: CreateGradeDialogProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [gradeId, setGradeId] = useState<number | null>(grade?.id ?? null)

  // Una vez creado el grado (o si venimos editando uno existente) el diálogo
  // pasa a modo edición: cambia el título y las acciones. Igual que en periodo
  // académico, "agregar" se transforma en "editar" al persistir.
  const isEditing = gradeId != null

  const [teachingLevelId, setTeachingLevelId] = useState<number | null>(
    grade?.teachingLevelId ?? null,
  )
  const [nombre, setNombre] = useState(grade?.nombre ?? "")
  const [gradoSiguiente, setGradoSiguiente] = useState(grade?.gradoSiguiente ?? "")
  const [tieneGradoSiguiente, setTieneGradoSiguiente] = useState(
    grade ? (grade.tieneGradoSiguiente ? "si" : "no") : "",
  )

  function resetForm() {
    setGradeId(grade?.id ?? null)
    setTeachingLevelId(grade?.teachingLevelId ?? null)
    setNombre(grade?.nombre ?? "")
    setGradoSiguiente(grade?.gradoSiguiente ?? "")
    setTieneGradoSiguiente(grade ? (grade.tieneGradoSiguiente ? "si" : "no") : "")
  }

  const { data: teachingLevels = [] } = useTeachingLevelsQuery()

  const gradoOptions = useMemo(
    () => [...new Set(teachingLevels.flatMap((level) => level.grados))],
    [teachingLevels],
  )

  function handleChangeTeachingLevel(value: string | null) {
    if (!value) return
    setTeachingLevelId(Number(value))
  }

  const createGrade = useCreateGrade()
  const updateGrade = useUpdateGrade()

  const hasNextGrade = tieneGradoSiguiente === "si"

  const promotionRef = useRef<PromotionCriteriaHandle>(null)
  const scheduleRef = useRef<ScheduleBuilderHandle>(null)

  const [saving, setSaving] = useState(false)

  async function handleSaveGrade() {
    if (!nombre.trim() || teachingLevelId == null) {
      notify("Completa el nivel de enseñanza y el nombre del grado.", {
        variant: "error",
      })
      return
    }
    const payload = {
      nombre,
      grado: nombre,
      teachingLevelId,
      tieneGradoSiguiente: hasNextGrade,
      gradoSiguiente: hasNextGrade ? gradoSiguiente || undefined : undefined,
    }
    setSaving(true)
    try {
      if (gradeId == null) {
        const created = await createGrade.mutateAsync({
          ...payload,
          academicPeriodId,
        })
        setGradeId(created.id)
        notify("Grado creado. Ahora puedes configurar grupos, plan de estudio y horario.")
      } else {
        const result = await updateGrade.mutateAsync({
          id: gradeId,
          values: payload,
        })
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        await promotionRef.current?.save(gradeId)
        await scheduleRef.current?.save(gradeId)
        notify(SUCCESS_MESSAGES.grade.updated)
      }
    } catch {
      notify("Ocurrió un error al guardar el grado.", { variant: "error" })
    } finally {
      setSaving(false)
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
      (gradeGroupsData?.rows ?? []).map((g) => [g.codigo, g.jornada].filter(Boolean).join(" - ")),
    [gradeGroupsData],
  )

  const scheduleSubjects = useMemo<ScheduleSubject[]>(() => {
    const colorByName = new Map<string, string>()
    for (const area of areaData?.rows ?? []) {
      for (const subject of area.subjects) {
        if (!subject.color) continue
        colorByName.set(subject.nombreInterno.toLowerCase(), subject.color)
        colorByName.set(subject.abreviacion.toLowerCase(), subject.color)
      }
    }
    return (planData?.rows ?? []).map((item) => ({
      id: String(item.codigo),
      name: item.asignatura,
      blocks: item.intensidadHoraria,
      color: colorByName.get(item.asignatura.toLowerCase()) ?? DEFAULT_SUBJECT_COLOR,
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
            <Button variant="ghost" color="neutral" size="icon-sm" />
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
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:max-w-4xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grado" : "Agregar grado"}</DialogTitle>
        </DialogHeader>

        <div className="sticky top-0 z-10 bg-popover pb-2 empty:hidden">
          <NoticeOutlet />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field variant="outlined">
            <FieldLabel htmlFor="grade-nivel">Nivel de enseñanza*</FieldLabel>
            <Select
              value={teachingLevelId != null ? String(teachingLevelId) : ""}
              onValueChange={handleChangeTeachingLevel}
            >
              <SelectTrigger id="grade-nivel">
                <SelectValue>
                  {(value) =>
                    teachingLevels.find((l) => String(l.id) === value)?.nombre ?? "Seleccionar"
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

          <Field variant="outlined">
            <FieldLabel htmlFor="grade-nombre">Nombre*</FieldLabel>
            {gradeId == null ? (
              <Select
                value={nombre || undefined}
                onValueChange={(value) => value && setNombre(value)}
              >
                <SelectTrigger id="grade-nombre">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {gradoOptions.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay grados cargados.
                      </div>
                    ) : (
                      gradoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="grade-nombre"
                placeholder="Agregar"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            )}
          </Field>
          <Field variant="outlined">
            <FieldLabel>Tiene grado siguiente</FieldLabel>
            <RadioGroup
              className="flex min-h-10 items-center gap-6 rounded-md border border-input px-3"
              value={tieneGradoSiguiente}
              onValueChange={(value) => value && setTieneGradoSiguiente(value)}
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
              <Field variant="outlined">
                <FieldLabel htmlFor="grade-siguiente">Grado siguiente</FieldLabel>
                <Select
                  value={gradoSiguiente || undefined}
                  onValueChange={(value) => value && setGradoSiguiente(value)}
                >
                  <SelectTrigger id="grade-siguiente">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {gradoOptions.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No hay grados cargados.
                        </div>
                      ) : (
                        gradoOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
        </div>

        {gradeId == null ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Guarda el grado para configurar sus grupos, plan de estudio y horario.
          </p>
        ) : (
          <Tabs defaultValue="grupo" className="w-full min-w-0">
            <TabsList variant="folder">
              <TabsTrigger value="grupo">Grupo</TabsTrigger>
              <TabsTrigger value="promocion">Criterios de promoción</TabsTrigger>
              <TabsTrigger value="plan">Plan de estudio</TabsTrigger>
              <TabsTrigger value="horario">Horario</TabsTrigger>
            </TabsList>

            <TabsContent value="grupo" className={PANEL}>
              <TabGradeGroups gradeId={gradeId} academicPeriodId={academicPeriodId} />
            </TabsContent>

            <TabsContent value="promocion" keepMounted className={PANEL}>
              <TabPromotionCriteria
                ref={promotionRef}
                hideSubmit
                gradeId={gradeId}
                academicPeriodId={academicPeriodId}
              />
            </TabsContent>

            <TabsContent value="plan" className={PANEL}>
              <TabStudyPlan academicPeriodId={academicPeriodId} gradeId={gradeId} />
            </TabsContent>

            <TabsContent value="horario" keepMounted className={PANEL}>
              <ScheduleBuilder
                ref={scheduleRef}
                jornada={jornada}
                subjects={scheduleSubjects}
                gradeGroups={gradeGroupOptions}
                gradeId={gradeId}
              />
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button
            size="sm"
            type="button"
            color="primary"
            onClick={handleSaveGrade}
            disabled={saving}
            aria-busy={saving}
          >
            {saving && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            {gradeId == null ? "Crear" : "Guardar"}
          </Button>
          <DialogClose render={<Button size="sm" type="button" variant="outline" />}>
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
