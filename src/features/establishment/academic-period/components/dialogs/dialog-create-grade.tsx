import { useMemo, useRef, useState } from "react"
import Axios from "axios"
import { z } from "zod"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { cleanErrorMessage } from "@/lib/api-client"
import { ControlPointIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"

import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"

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
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useCreateGrade } from "@/features/establishment/academic-period/api/mutations/create-grade"
import { useUpdateGrade } from "@/features/establishment/academic-period/api/mutations/update-grade"
import { useStudyPlansQuery } from "@/features/establishment/academic-period/api/query/use-study-plans"
import { useAreaSubjectQuery } from "@/features/establishment/academic-period/api/query/use-area-subject"
import { useGradeGroupsQuery } from "@/features/establishment/academic-period/api/query/use-grade-groups"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import {
  useGradosCatalogQuery,
} from "@/features/establishment/academic-period/api/query/use-grados-catalog"
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

const PANEL =
  "min-w-0 rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

interface CreateGradeDialogProps {
  jornada: Jornada
  academicPeriodId?: number
  grade?: Grade
}

const gradeSchema = z.object({
  teachingLevelId: z
    .number({ error: "Selecciona el nivel de enseñanza." })
    .int("Selecciona el nivel de enseñanza."),
  nombre: z
    .string()
    .trim()
    .min(1, "Selecciona el nombre del grado.")
    .max(130, "El nombre no puede superar los 130 caracteres."),
})

export function CreateGradeDialog({ jornada, academicPeriodId, grade }: CreateGradeDialogProps) {
  const [open, setOpen] = useState(false)
  const [gradeId, setGradeId] = useState<number | null>(grade?.id ?? null)
  const [notice, setNotice] = useState<{
    id: number
    message: string
    variant: NoticeVariant
  } | null>(null)
  const noticeIdRef = useRef(0)

  function notify(message: string, options?: { variant?: NoticeVariant }) {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant: options?.variant ?? "success" })
  }

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
    setNotice(null)
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
        // cual — el `<ComboboxFieldItem value={option.valor}>` guarda el `valor` en
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
          notify(cleanErrorMessage(result.message), { variant: "error" })
          return
        }
        await promotionRef.current?.save(gradeId)
        await scheduleRef.current?.save(gradeId)
        notify(SUCCESS_MESSAGES.grade.updated)
      }
    } catch (error) {
      const message = Axios.isAxiosError(error)
        ? cleanErrorMessage(error.response?.data?.message || error.message)
        : "Ocurrió un error al guardar el grado."
      notify(message, { variant: "error" })
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
        label: [g.codigo, g.jornadaName ?? g.jornada]
          .filter(Boolean)
          .join(" - "),
      })),
    [gradeGroupsData],
  )

  const scheduleSubjects = useMemo<ScheduleSubject[]>(() => {
    // Por `id` de asignatura, no por nombre: el nombre puede repetirse entre
    // distinto énfasis (y `item.asignatura` ya viene como "Nombre (Énfasis)"
    // desde `toStudyPlanItem`, así que un lookup por nombre nunca matchearía).
    const abbreviationById = new Map<number, string>()
    const colorById = new Map<number, string>()
    for (const area of areaData?.rows ?? []) {
      for (const subject of area.subjects) {
        if (subject.id == null) continue
        abbreviationById.set(subject.id, subject.abreviacion)
        if (subject.color) colorById.set(subject.id, subject.color)
      }
    }
    return (planData?.rows ?? []).map((item) => ({
      id: String(item.codigo),
      name: item.asignatura,
      abbreviation: abbreviationById.get(item.asignaturaId),
      blocks: item.intensidadHoraria,
      color: colorById.get(item.asignaturaId) ?? DEFAULT_SUBJECT_COLOR,
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
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto p-4 sm:max-w-5xl sm:p-6"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grado" : "Agregar grado"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            variant="outlined"
            data-invalid={fieldErrors["teachingLevelId"] ? "true" : undefined}
          >
            <FieldLabel htmlFor="grade-nivel">Nivel de enseñanza*</FieldLabel>
            <ComboboxField
              value={teachingLevelId != null ? String(teachingLevelId) : ""}
              onValueChange={handleChangeTeachingLevel}
            >
              <ComboboxFieldTrigger
                id="grade-nivel"
                aria-invalid={Boolean(fieldErrors["teachingLevelId"])}
              >
                <ComboboxFieldValue>
                  {(value) =>
                    teachingLevels.find((l) => String(l.id) === value)?.nombre ?? "Seleccionar"
                  }
                </ComboboxFieldValue>
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                <ComboboxGroup>
                  {teachingLevels.map((level) => (
                    <ComboboxFieldItem key={level.id} value={String(level.id)}>
                      {level.nombre}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxGroup>
              </ComboboxFieldContent>
            </ComboboxField>
            <FieldError>{fieldErrors["teachingLevelId"]}</FieldError>
          </Field>

          <Field variant="outlined" data-invalid={fieldErrors["nombre"] ? "true" : undefined}>
            <FieldLabel htmlFor="grade-nombre">Nombre*</FieldLabel>
            {gradeId == null ? (
              <ComboboxField
                value={nombre || undefined}
                onValueChange={(value) => value && setNombre(value)}
              >
                <ComboboxFieldTrigger id="grade-nombre" aria-invalid={Boolean(fieldErrors["nombre"])}>
                  <ComboboxFieldValue>
                    {(value) =>
                      gradoOptions.find((o) => o.valor === value)?.nombre ?? "Seleccionar"
                    }
                  </ComboboxFieldValue>
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  <ComboboxGroup>
                    {gradoOptions.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay grados cargados.
                      </div>
                    ) : (
                      gradoOptions.map((option) => (
                        <ComboboxFieldItem key={option.id} value={option.valor} title={option.nombre}>
                          {option.nombre}
                        </ComboboxFieldItem>
                      ))
                    )}
                  </ComboboxGroup>
                </ComboboxFieldContent>
              </ComboboxField>
            ) : (
              <Input
                id="grade-nombre"
                maxLength={130}
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
              className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
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
                <ComboboxField
                  value={gradoSiguiente || undefined}
                  onValueChange={(value) => value && setGradoSiguiente(value)}
                >
                  <ComboboxFieldTrigger id="grade-siguiente">
                    <ComboboxFieldValue>
                      {(value) =>
                        gradoOptions.find((o) => o.valor === value)?.nombre ?? "Seleccionar"
                      }
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      {gradoOptions.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No hay grados cargados.
                        </div>
                      ) : (
                        gradoOptions.map((option) => (
                          <ComboboxFieldItem key={option.id} value={option.valor} title={option.nombre}>
                            {option.nombre}
                          </ComboboxFieldItem>
                        ))
                      )}
                    </ComboboxGroup>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            </>
          )}
        </div>

        {/* Debajo de los campos del grado, en el flujo normal (no `sticky`):
            un aviso pegado arriba del contenedor con scroll se repintaba mal
            en Chromium/Firefox al desplazarse por la pestaña Horario, la más
            larga (bug conocido de `position: sticky` dentro de un ancestro
            con `transform` — `DialogContent` se centra así). Acá el aviso
            queda fijo en su lugar y no interactúa con el scroll. */}
        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? undefined : 4000}
        />

        {gradeId == null ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Crea el grado para configurar sus grupos, plan de estudio y horario.
          </p>
        ) : (
          // Provider propio: los diálogos de crear/eliminar de cada pestaña
          // (grupo, plan de estudio) usan `useNotify()` y, sin esto,
          // resolvían al provider de la página de atrás — el aviso aparecía
          // detrás de "Editar grado" en vez de en la tabla de la pestaña.
          <NoticeProvider>
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
          </NoticeProvider>
        )}

        <DialogFooter>
          {(gradeId != null ||
            (teachingLevelId != null &&
              nombre.trim() !== "" &&
              tieneGradoSiguiente !== "" &&
              (!hasNextGrade || gradoSiguiente.trim() !== ""))) && (
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
          )}
          <DialogClose
            render={<Button size="sm" type="button" variant="fill" color="neutral" />}
          >
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
