import { useMemo, useRef, useState } from "react"
import { z } from "zod"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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

import { useCreateGrade } from "@/features/establishment/academic-period/api/mutations/create-grade"
import { useUpdateGrade } from "@/features/establishment/academic-period/api/mutations/update-grade"
import { useStudyPlansQuery } from "@/features/establishment/academic-period/api/query/use-study-plans"
import { useAreaSubjectQuery } from "@/features/establishment/academic-period/api/query/use-area-subject"
import { useGradeGroupsQuery } from "@/features/establishment/academic-period/api/query/use-grade-groups"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import { useGradosCatalogQuery } from "@/features/establishment/academic-period/api/query/use-grados-catalog"
import type { Grade } from "@/features/establishment/academic-period/api/types/grade"
import { TabGradeGroups } from "@/features/establishment/academic-period/components/tabs/tab-grade-groups"
import {
  TabPromotionCriteria,
  type PromotionCriteriaHandle,
} from "@/features/establishment/academic-period/components/tabs/tab-promotion-criteria"
import { TabStudyPlan } from "@/features/establishment/academic-period/components/tabs/tab-study-plan"
import {
  ScheduleBuilder,
  type ScheduleBuilderHandle,
} from "@/features/establishment/academic-period/components/schedule-builder"
import {
  DEFAULT_SUBJECT_COLOR,
  type Jornada,
  type ScheduleSubject,
} from "@/features/establishment/academic-period/components/schedule-data"

// La card sobre la que se apoyan las pestañas tipo carpeta. Sin borde superior:
// esa línea la dibuja el borde inferior de las pestañas, y la activa la borra.
const PANEL = "min-w-0 rounded-b-lg border border-t-0 bg-background p-4"

interface CreateGradeDialogProps {
  jornada: Jornada
  academicPeriodId?: number
  grade?: Grade
}

/**
 * Los dos campos con asterisco. El nivel llega como `number | null` del
 * select, y el nombre como texto tanto si es select (alta) como input
 * (edición).
 */
const gradeSchema = z.object({
  teachingLevelId: z
    .number({ error: "Selecciona el nivel de enseñanza." })
    .int("Selecciona el nivel de enseñanza."),
  nombre: z.string().trim().min(1, "Selecciona el nombre del grado."),
})

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

  // Catálogo global GRADOS, no depende del nivel de enseñanza elegido (ver
  // use-grados-catalog.ts). Se guarda/manda por `valor` (lo que
  // `fn_grado_crear`/`resolveGradoSiguienteId` matchean), pero se muestra
  // `nombre` — mostrar el `valor` crudo (el código, "1"/"2"/...) hacía que
  // el select pareciera listar ids en vez de nombres de grado.
  const { data: gradosCatalog = [] } = useGradosCatalogQuery()
  const gradoOptions = gradosCatalog

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
  // Mensaje por campo, indexado por su nombre en `gradeSchema`.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSaveGrade() {
    const parsed = gradeSchema.safeParse({ teachingLevelId, nombre })

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        nextErrors[issue.path.join(".")] ??= issue.message
      }
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})
    // Del resultado del parseo: ahí `teachingLevelId` ya viene sin `null`.
    const payload = {
      nombre: parsed.data.nombre,
      grado: parsed.data.nombre,
      teachingLevelId: parsed.data.teachingLevelId,
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
        // El `<Input value={nombre}>` que toma el relevo post-create mostraría
        // el código crudo del catálogo (p.ej. "1") si dejáramos el estado tal
        // cual — el `<SelectItem value={option.valor}>` guarda el `valor` en
        // `nombre`, no el nombre legible. Resolvemos a nombre para que el
        // render inmediato del form coincida con lo que el back va a devolver
        // en el siguiente fetch (y con lo que muestra la tabla).
        const option = gradoOptions.find(
          (o) => o.valor === parsed.data.nombre,
        )
        if (option) setNombre(option.nombre)
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
      (gradeGroupsData?.rows ?? []).map((g) => ({
        id: g.id,
        // `jornadaName` es el nombre legible (TLISTA_VALOR.NOMBRE); caemos a
        // `jornada` (código corto) si el back no lo está devolviendo.
        label: [g.codigo, g.jornadaName ?? g.jornada]
          .filter(Boolean)
          .join(" - "),
      })),
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:max-w-5xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grado" : "Agregar grado"}</DialogTitle>
        </DialogHeader>

        <div className="sticky top-0 z-10 bg-popover pb-2 empty:hidden">
          <NoticeOutlet />
        </div>

        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            variant="outlined"
            data-invalid={fieldErrors["teachingLevelId"] ? "true" : undefined}
          >
            <FieldLabel htmlFor="grade-nivel">Nivel de enseñanza*</FieldLabel>
            <Select
              value={teachingLevelId != null ? String(teachingLevelId) : ""}
              onValueChange={handleChangeTeachingLevel}
            >
              <SelectTrigger
                id="grade-nivel"
                aria-invalid={Boolean(fieldErrors["teachingLevelId"])}
              >
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
            <FieldError>{fieldErrors["teachingLevelId"]}</FieldError>
          </Field>

          <Field variant="outlined" data-invalid={fieldErrors["nombre"] ? "true" : undefined}>
            <FieldLabel htmlFor="grade-nombre">Nombre*</FieldLabel>
            {gradeId == null ? (
              <Select
                value={nombre || undefined}
                onValueChange={(value) => value && setNombre(value)}
              >
                <SelectTrigger id="grade-nombre" aria-invalid={Boolean(fieldErrors["nombre"])}>
                  <SelectValue>
                    {(value) =>
                      gradoOptions.find((o) => o.valor === value)?.nombre ?? "Seleccionar"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {gradoOptions.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay grados cargados.
                      </div>
                    ) : (
                      gradoOptions.map((option) => (
                        <SelectItem key={option.id} value={option.valor}>
                          {option.nombre}
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
                aria-invalid={Boolean(fieldErrors["nombre"])}
                onChange={(e) => setNombre(e.target.value)}
              />
            )}
            <FieldError>{fieldErrors["nombre"]}</FieldError>
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
                    <SelectValue>
                      {(value) =>
                        gradoOptions.find((o) => o.valor === value)?.nombre ?? "Seleccionar"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {gradoOptions.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No hay grados cargados.
                        </div>
                      ) : (
                        gradoOptions.map((option) => (
                          <SelectItem key={option.id} value={option.valor}>
                            {option.nombre}
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
