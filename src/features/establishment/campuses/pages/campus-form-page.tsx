import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-form"
import { Link, useMatch, useNavigate, useParams } from "@tanstack/react-router"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, FloppyDiskIcon, PencilIcon, SpinnerIcon, WarningIcon, XIcon, ArrowLeftIcon } from "@/components/ui/icons"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { FormDisabledProvider, useAppForm } from "@/lib/forms"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { campusDetailRoute } from "@/router"

import { buildCampusFormSchema, hasRepeatedName } from "@/features/establishment/campuses/api/schema"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"
import { useCampusQuery } from "@/features/establishment/campuses/api/query/use-campus"
import {
  fetchEstablishmentCampuses,
  useNextConsecutiveQuery,
} from "@/features/establishment/campuses/api/query/use-establishment-campuses"
import { useZonasSedeQuery } from "@/features/establishment/campuses/api/query/use-zonas-sede"
import { useCreate } from "@/features/establishment/campuses/api/mutations/use-create"
import { useUpdate } from "@/features/establishment/campuses/api/mutations/use-update"
import type { CampusDetail, CampusFormValues } from "@/features/establishment/campuses/api/types/campus"
import { CampusStatusBadge, PrincipalBadge } from "@/features/establishment/campuses/components/campus-badges"
import {
  MapPlaceholder,
  ReadOnlyValue,
  SyncedWithEstablishment,
} from "@/features/establishment/campuses/components/campus-read-only"
import { WorkSchedulesField, ZoneRadioField } from "@/features/establishment/campuses/components/fields/campus-fields"
import { CampusSpecialtiesSection } from "@/features/establishment/campuses/components/specialties/campus-specialties-section"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import { toDireccionInput, toTextoInput } from "@/features/establishment/shared/text-field-rules"
import { toTelefonoInput } from "@/features/establishment/shared/person-field-rules"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const FORM_ID = "campus-form"

/** Caret a la izquierda del título, como en el formulario del establecimiento. */
const accordionTriggerClassName =
  "flex-row-reverse justify-end items-center gap-2 py-3 text-base **:data-[slot=accordion-trigger-icon]:ml-0 **:data-[slot=accordion-trigger-icon]:size-4"
const accordionItemClassName = "rounded-lg border border-border bg-muted/40 not-last:border-b"

type Mode = "create" | "edit" | "detail"

function toFormValues(campus: CampusDetail | null): CampusFormValues {
  return {
    establishmentId: campus?.establishmentId ?? null,
    consecutive: campus?.consecutive ?? "",
    name: campus?.name ?? "",
    dane: campus?.dane ?? "",
    zoneId: campus?.zoneId ?? null,
    neighborhood: campus?.neighborhood ?? "",
    commune: campus?.commune ?? "",
    address: campus?.address ?? "",
    phone: campus?.phone ?? "",
    workScheduleIds: campus?.workSchedules.map((j) => j.id) ?? [],
  }
}

const siNo = (value: boolean) => (value ? "Sí" : "No")

function CampusForm({ mode, campus }: { mode: Mode; campus: CampusDetail | null }) {
  const { notify } = useNotify()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { puedeEditar } = useMenuPermission("SEDES_EDUCATIVAS", { onlineOnlyWrites: true })
  const principal = campus?.isPrincipal === true
  const readOnly = mode === "detail"
  const listHref = paths.app.establishments.campuses.getHref()

  const [repeatedName, setRepeatedName] = useState<{ values: CampusFormValues; establishment: string } | null>(null)

  const { data: establishments = [] } = useEstablishmentsOptionsQuery(mode === "create")
  const { data: workSchedules = [] } = useQuery(selectCategoryQueryOptions("JORNADA"))

  const createMutation = useCreate({
    mutationConfig: {
      onSuccess: (id) => {
        notify(SUCCESS_MESSAGES.campus.created)
        // El catálogo de especialidades se gestiona con la sede ya creada (sección 3.2).
        navigate({ to: paths.app.establishments.campusEdit.getHref(id) })
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })
  const updateMutation = useUpdate({
    mutationConfig: {
      onSuccess: () => {
        notify(SUCCESS_MESSAGES.campus.updated)
        navigate({ to: listHref })
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })
  const isSaving = createMutation.isPending || updateMutation.isPending

  function save(values: CampusFormValues) {
    if (mode === "create") createMutation.mutate(values)
    else if (campus) updateMutation.mutate({ campusId: campus.id, values, isPrincipal: principal })
  }

  const form = useAppForm({
    defaultValues: toFormValues(campus),
    // Al editar, lo que no cambió no se revalida: las sedes viejas conservan sus datos.
    validators: { onSubmit: buildCampusFormSchema({ principal, original: campus ? toFormValues(campus) : undefined }) },
    onSubmit: async ({ value }) => {
      // Un nombre repetido en el establecimiento se advierte antes de guardar (Regla 52).
      if (!principal && value.establishmentId != null) {
        const sedes = await queryClient
          .fetchQuery({
            queryKey: campusKeys.porEstablecimiento(value.establishmentId),
            queryFn: () => fetchEstablishmentCampuses(value.establishmentId as number),
          })
          .catch(() => [])
        if (hasRepeatedName(value.name, sedes, campus?.id ?? null)) {
          const establishment =
            campus?.establishmentName ?? establishments.find((e) => e.id === value.establishmentId)?.name ?? ""
          setRepeatedName({ values: value, establishment })
          return
        }
      }
      save(value)
    },
  })

  const establishmentId = useStore(form.store, (s) => s.values.establishmentId)
  const { data: zones = [] } = useZonasSedeQuery(establishmentId)
  const { data: nextConsecutive } = useNextConsecutiveQuery(mode === "create" ? establishmentId : null)

  // Con un solo establecimiento posible, ya viene elegido.
  useEffect(() => {
    if (mode === "create" && establishments.length === 1 && form.getFieldValue("establishmentId") == null) {
      form.setFieldValue("establishmentId", establishments[0].id)
    }
  }, [mode, establishments, form])

  // El sistema sugiere el siguiente consecutivo libre; se puede cambiar sin repetir uno existente.
  useEffect(() => {
    if (mode !== "create" || nextConsecutive == null) return
    if (form.getFieldMeta("consecutive")?.isDirty) return
    form.setFieldValue("consecutive", String(nextConsecutive), { dontUpdateMeta: true })
  }, [mode, nextConsecutive, form])

  const zoneOptions = zones.map((z) => ({ id: z.id, name: z.name }))
  const scheduleOptions = workSchedules.map((j) => ({ id: j.pk_lista_valor, name: j.nombre }))
  const sinEstablecimiento = mode === "create" && establishmentId == null

  const title = mode === "create" ? "Nueva sede" : (campus?.name ?? "")

  return (
    <TableScreen>
      {/* El encabezado es sticky: las acciones quedan a mano en todo el formulario. */}
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              {readOnly ? (
                <>
                  <Button render={<Link to={listHref} />} nativeButton={false} variant="outline" color="neutral" size="sm">
                    <ArrowLeftIcon data-icon="inline-start" />
                    Volver
                  </Button>
                  {puedeEditar && campus ? (
                    <Button
                      render={<Link to={paths.app.establishments.campusEdit.getHref(campus.id)} />}
                      nativeButton={false}
                      variant="fill"
                      color="primary"
                      size="sm"
                    >
                      <PencilIcon data-icon="inline-start" />
                      Modificar
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <Button render={<Link to={listHref} />} nativeButton={false} variant="outline" color="neutral" size="sm">
                    <XIcon data-icon="inline-start" />
                    Cancelar
                  </Button>
                  <Button type="submit" form={FORM_ID} variant="fill" color="primary" size="sm" disabled={isSaving} aria-busy={isSaving}>
                    {isSaving ? (
                      <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <FloppyDiskIcon data-icon="inline-start" />
                    )}
                    Guardar
                  </Button>
                </>
              )}
            </div>
          }
        >
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link to={listHref} className="shrink-0 text-sm font-normal text-muted-foreground hover:text-foreground">
              Sedes educativas ›
            </Link>
            <span className="truncate">{title}</span>
            {principal ? <PrincipalBadge /> : null}
            {campus?.status === "I" ? <CampusStatusBadge status="I" /> : null}
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <Accordion multiple defaultValue={["datos", "especialidades"]} keepMounted className="gap-4">
          <AccordionItem value="datos" className={accordionItemClassName}>
            <AccordionTrigger className={accordionTriggerClassName}>Datos de la sede</AccordionTrigger>
            <AccordionContent>
              <div className="-mx-4 border-t border-border bg-card px-4 pt-4">
                <form
                  id={FORM_ID}
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                  }}
                >
                  <FormDisabledProvider disabled={readOnly}>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-5 pb-4 md:grid-cols-12">
                      {/* Establecimiento (Regla 19): se elige primero; después de guardar no cambia. */}
                      {mode === "create" ? (
                        <div className="md:col-span-12">
                          <form.AppField
                            name="establishmentId"
                            listeners={{
                              onChange: () => {
                                form.setFieldValue("zoneId", null)
                                form.resetField("consecutive")
                              },
                            }}
                          >
                            {(f) => (
                              <f.SelectField
                                label="Establecimiento"
                                required
                                placeholder="Elija el establecimiento"
                                options={establishments.map((e) => ({ value: e.id, label: e.name }))}
                                emptyValue={null}
                              />
                            )}
                          </form.AppField>
                        </div>
                      ) : (
                        <div className="md:col-span-9">
                          <ReadOnlyValue id="campus-establishment" label="Establecimiento" value={campus?.establishmentName ?? ""} locked required />
                        </div>
                      )}

                      <FormDisabledProvider disabled={sinEstablecimiento}>
                        {principal ? (
                          <div className="md:col-span-3">
                            <ReadOnlyValue id="campus-consecutive" label="Consecutivo de la sede" value="1" description="Asignado por el sistema." />
                          </div>
                        ) : (
                          <div className="md:col-span-3">
                            <form.AppField name="consecutive">
                              {(f) => (
                                <f.NumberField
                                  label="Consecutivo de la sede"
                                  required
                                  maxDigits={2}
                                  description={
                                    mode === "create" && nextConsecutive != null
                                      ? `Siguiente disponible: ${nextConsecutive}.`
                                      : undefined
                                  }
                                />
                              )}
                            </form.AppField>
                          </div>
                        )}

                        {principal && campus ? (
                          // Regla 85: lo que viene del establecimiento se muestra en solo lectura.
                          <div className="md:col-span-12">
                            <SyncedWithEstablishment
                              pairs={[
                                ["Nombre de la sede", campus.name],
                                ["Código DANE antiguo", campus.dane],
                                ...(campus.zoneSynced ? ([["Zona", campus.zoneName]] as [string, string][]) : []),
                                ["Barrio", campus.neighborhood],
                                ["Comuna", campus.commune],
                                ["Dirección", campus.address],
                                ["Teléfono", campus.phone],
                              ]}
                            />
                          </div>
                        ) : (
                          <>
                            <div className={mode === "create" ? "md:col-span-4" : "md:col-span-5"}>
                              <form.AppField name="name">
                                {(f) => (
                                  <f.TextField
                                    label="Nombre de la sede"
                                    required
                                    maxLength={150}
                                    showCounter
                                    transform={(v) => toTextoInput(v, 150)}
                                  />
                                )}
                              </form.AppField>
                            </div>
                            <div className={mode === "create" ? "md:col-span-3" : "md:col-span-4"}>
                              <form.AppField name="dane">
                                {(f) => <f.NumberField label="Código DANE antiguo de la sede" required maxDigits={12} />}
                              </form.AppField>
                            </div>
                          </>
                        )}

                        {principal && campus?.zoneSynced ? null : (
                          <div className={principal ? "md:col-span-12" : mode === "create" ? "md:col-span-2" : "md:col-span-3"}>
                            <form.AppField name="zoneId">
                              {() => <ZoneRadioField label="Zona" options={zoneOptions} />}
                            </form.AppField>
                          </div>
                        )}

                        {principal ? null : (
                          <>
                            <div className="md:col-span-3">
                              <form.AppField name="neighborhood">
                                {(f) => <f.TextField label="Barrio" maxLength={100} transform={(v) => toTextoInput(v, 100)} />}
                              </form.AppField>
                            </div>
                            <div className="md:col-span-2">
                              <form.AppField name="commune">
                                {(f) => <f.TextField label="Comuna" maxLength={50} transform={(v) => toTextoInput(v, 50)} />}
                              </form.AppField>
                            </div>
                            <div className="md:col-span-4">
                              <form.AppField name="address">
                                {(f) => (
                                  <f.TextField label="Dirección de la sede" maxLength={150} transform={(v) => toDireccionInput(v, 150)} />
                                )}
                              </form.AppField>
                            </div>
                            <div className="md:col-span-3">
                              <form.AppField name="phone">
                                {(f) => (
                                  <f.TextField label="Teléfono de la sede" inputMode="tel" maxLength={16} transform={toTelefonoInput} />
                                )}
                              </form.AppField>
                            </div>
                          </>
                        )}

                        <div className="md:col-span-12">
                          <form.AppField name="workScheduleIds">
                            {() => <WorkSchedulesField label="Jornadas" options={scheduleOptions} />}
                          </form.AppField>
                        </div>

                        {campus ? (
                          <>
                            <div className="md:col-span-12">
                              <ReadOnlyValue
                                id="campus-attends-disability"
                                label="Atiende población con discapacidad, trastorno o condición"
                                value={siNo(campus.attendsDisability)}
                              />
                            </div>
                            <div className="md:col-span-12">
                              <ReadOnlyValue
                                id="campus-attends-victims"
                                label="Atiende población desplazada o desmovilizada del conflicto armado"
                                value={siNo(campus.attendsConflictVictims)}
                              />
                            </div>
                          </>
                        ) : null}

                        <div className="md:col-span-6">
                          <MapPlaceholder title="Ubicación de la sede" required kind="point" />
                        </div>
                        <div className="md:col-span-6">
                          <MapPlaceholder title="Área de influencia" kind="area" />
                        </div>
                      </FormDisabledProvider>
                    </div>
                  </FormDisabledProvider>
                </form>
              </div>
            </AccordionContent>
          </AccordionItem>

          {campus ? (
            <AccordionItem value="especialidades" className={accordionItemClassName}>
              <AccordionTrigger className={accordionTriggerClassName}>Especialidades de la sede</AccordionTrigger>
              <AccordionContent>
                <div className="-mx-4 border-t border-border bg-card px-4 py-4">
                  <CampusSpecialtiesSection campusId={campus.id} readOnly={readOnly || !puedeEditar} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      </TableScreenBody>

      {/* Nombre repetido (Regla 52): advertencia, no bloqueo. */}
      <AlertDialog open={repeatedName != null} onOpenChange={(open) => !open && setRepeatedName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-start gap-2">
              <WarningIcon className="mt-0.5 size-6 shrink-0 text-orange" aria-hidden />
              Nombre de sede repetido
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ya existe una sede llamada {repeatedName?.values.name.trim()} en {repeatedName?.establishment}. Las dos sedes
              tendrán el mismo nombre. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" color="neutral">
              <XIcon data-icon="inline-start" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              color="primary"
              onClick={() => {
                if (repeatedName) save(repeatedName.values)
                setRepeatedName(null)
              }}
            >
              <ArrowRightIcon data-icon="inline-start" />
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableScreen>
  )
}

/** Nueva sede, Modificar y Ver detalle: el mismo formulario; en el detalle, todo en solo lectura. */
export function CampusFormPage() {
  const params = useParams({ strict: false }) as { campusId?: string }
  const isDetail = useMatch({ from: campusDetailRoute.id, shouldThrow: false }) != null
  const campusId = params.campusId ? Number(params.campusId) : null
  const mode: Mode = campusId == null ? "create" : isDetail ? "detail" : "edit"
  const campusQuery = useCampusQuery(campusId)

  if (campusId != null && campusQuery.isPending) {
    return (
      <TableScreen>
        <TableScreenBody>
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <SpinnerIcon className="animate-spin" aria-hidden />
            Cargando la sede…
          </div>
        </TableScreenBody>
      </TableScreen>
    )
  }

  if (campusId != null && (campusQuery.isError || !campusQuery.data)) {
    // Sin filas el SSO dice que la sede no existe o está borrada.
    const message = campusQuery.error instanceof Error && campusQuery.error.message.startsWith("La respuesta de")
      ? "No se encontró la sede."
      : getErrorMessage(campusQuery.error)
    return (
      <TableScreen>
        <TableScreenBody>
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">{message}</p>
            <Button
              render={<Link to={paths.app.establishments.campuses.getHref()} />}
              nativeButton={false}
              variant="outline"
              color="neutral"
              size="sm"
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Volver a sedes educativas
            </Button>
          </div>
        </TableScreenBody>
      </TableScreen>
    )
  }

  // `key`: los valores iniciales del formulario se leen una sola vez al montar.
  return <CampusForm key={`${mode}-${campusId ?? "nueva"}`} mode={mode} campus={campusQuery.data ?? null} />
}
