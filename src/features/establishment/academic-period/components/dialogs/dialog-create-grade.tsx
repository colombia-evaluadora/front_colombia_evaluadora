import { useMemo, useRef, useState } from "react"
import Axios from "axios"
import { z } from "zod"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { cleanErrorMessage } from "@/lib/api-client"
import { ControlPointIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"

import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"

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
import {
  useGradosCatalogQuery,
  type GradoCatalogOption,
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

// La card sobre la que se apoyan las pestañas tipo carpeta. Lleva su borde
// superior completo (así no queda hueco a la derecha de la última pestaña); las
// pestañas se montan encima y la activa lo tapa con su fondo. La esquina
// superior derecha va redondeada solo mientras las pestañas no lleguen al final
// del contenedor; cuando lo ocupan todo (data-tabs-filled) se cuadra para
// fundirse con la última pestaña.
const PANEL =
  "min-w-0 rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

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

// `fn_grado_crear` responde "Ya existe un grado con el codigo <valor> en
// este periodo" — `<valor>` es el crudo del catálogo GRADOS (p.ej. "-1"),
// que no le dice nada al usuario. Lo resolvemos al nombre legible del mismo
// catálogo que ya usa el select de "Nombre".
function humanizeGradeCodeError(message: string, gradoOptions: GradoCatalogOption[]): string {
  return message.replace(/con el codigo\s+(-?\d+)\s+en este periodo/i, (match, codigo) => {
    const nombre = gradoOptions.find((o) => o.valor === codigo)?.nombre
    return nombre ? `de nombre "${nombre}" en este periodo` : match
  })
}

export function CreateGradeDialog({ jornada, academicPeriodId, grade }: CreateGradeDialogProps) {
  const [open, setOpen] = useState(false)
  const [gradeId, setGradeId] = useState<number | null>(grade?.id ?? null)

  // Aviso local, propio del diálogo: nunca se cierra al guardar (pasa a modo
  // edición con las pestañas de grupo/promoción/plan/horario), así que si el
  // mensaje pasara por el `notify()` global se veía duplicado —una vez acá,
  // otra detrás del overlay, en el `<NoticeOutlet />` de la página—.
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
          notify(humanizeGradeCodeError(cleanErrorMessage(result.message), gradoOptions), {
            variant: "error",
          })
          return
        }
        await promotionRef.current?.save(gradeId)
        await scheduleRef.current?.save(gradeId)
        notify(SUCCESS_MESSAGES.grade.updated)
      }
    } catch (error) {
      // Mismo mensaje real que ya mostraba el toast global, en vez de un
      // genérico que no dice nada de por qué falló.
      const message = Axios.isAxiosError(error)
        ? humanizeGradeCodeError(
            cleanErrorMessage(error.response?.data?.message || error.message),
            gradoOptions,
          )
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
    const abbreviationByName = new Map<string, string>()
    for (const area of areaData?.rows ?? []) {
      for (const subject of area.subjects) {
        abbreviationByName.set(subject.nombreInterno.toLowerCase(), subject.abreviacion)
        if (!subject.color) continue
        colorByName.set(subject.nombreInterno.toLowerCase(), subject.color)
        colorByName.set(subject.abreviacion.toLowerCase(), subject.color)
      }
    }
    return (planData?.rows ?? []).map((item) => ({
      id: String(item.codigo),
      name: item.asignatura,
      abbreviation: abbreviationByName.get(item.asignatura.toLowerCase()),
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
                        <SelectItem key={option.id} value={option.valor} title={option.nombre}>
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
                          <SelectItem key={option.id} value={option.valor} title={option.nombre}>
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
          {/* Al crear, el botón recién aparece con los campos obligatorios
              completos (nivel, nombre, "tiene grado siguiente" y, si esa
              respuesta es "sí", también el grado siguiente en sí) — en
              edición siempre se muestra ("Guardar" no depende de llenar
              nada de nuevo). */}
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
