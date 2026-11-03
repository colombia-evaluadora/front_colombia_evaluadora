import { useEffect, useRef, useState } from "react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  BankIcon,
  FloppyDiskIcon,
  PencilIcon,
  SpinnerIcon,
  WarningIcon,
  XIcon,
  ArrowLeftIcon,
} from "@/components/ui/icons"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useUser } from "@/lib/auth"
import { FormDisabledProvider, useAppForm } from "@/lib/forms"
import { SUCCESS_MESSAGES, campusMovedMessage } from "@/lib/success-messages"
import { campusDetailRoute } from "@/router"

import { buildCampusFormSchema, hasRepeatedName } from "@/features/establishment/campuses/api/schema"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"
import { useCampusQuery } from "@/features/establishment/campuses/api/query/use-campus"
import {
  describeCampusProcesses,
  useCampusProcessesQuery,
} from "@/features/establishment/campuses/api/query/use-campus-processes"
import {
  fetchEstablishmentCampuses,
  useEstablishmentCampusesQuery,
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
import { ConvertCampusDialog } from "@/features/establishment/campuses/components/dialogs/dialog-convert-campus"
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

/**
 * Advertencia de Mover (Regla 75), con lo que la sede tiene en curso: se pide al
 * abrirla para que la cuenta esté al día.
 */
function MoveCampusConfirm({
  campus,
  establishment,
  open,
  onCancel,
  onConfirm,
}: {
  campus: CampusDetail
  establishment: string
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { data: processes, isPending } = useCampusProcessesQuery(campus.id, open)
  const inCourse = describeCampusProcesses(processes)
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-start gap-2">
            <WarningIcon className="mt-0.5 size-6 shrink-0 text-orange" aria-hidden />
            Mover «{campus.name}» a {establishment}
          </AlertDialogTitle>
          <AlertDialogDescription render={<div />} className="flex flex-col gap-3">
            {inCourse ? (
              <p>
                La sede tiene procesos en curso: {inCourse}. Al moverla, los funcionarios actuales ya no podrán hacerles
                seguimiento.
              </p>
            ) : null}
            <p>
              Sus períodos académicos, grados, asignaciones y especialidades se moverán con ella, y el Rector y la
              Secretaria de {establishment} recibirán sus roles en la sede.
            </p>
            <p>{inCourse ? "Confirme con el establecimiento antes de continuar. ¿Desea continuar?" : "¿Desea continuar?"}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" color="neutral">
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction color="primary" disabled={isPending} onClick={onConfirm}>
            <ArrowRightIcon data-icon="inline-start" />
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CampusForm({ mode, campus }: { mode: Mode; campus: CampusDetail | null }) {
  const { notify } = useNotify()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { puedeEditar } = useMenuPermission("SEDES_EDUCATIVAS", { onlineOnlyWrites: true })
  const principal = campus?.isPrincipal === true
  const readOnly = mode === "detail"
  const listHref = paths.app.establishments.campuses.getHref()

  const [repeatedName, setRepeatedName] = useState<{ values: CampusFormValues; establishment: string } | null>(null)
  // Cambiar establecimiento (Reglas 75 y 92): solo el Superadministrador y solo en una sede anexa.
  const { data: user } = useUser()
  const canTransfer = mode === "edit" && campus != null && !principal && user?.isSuperAdmin === true
  const [moving, setMoving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [moveConfirm, setMoveConfirm] = useState<CampusFormValues | null>(null)

  const { data: establishments = [] } = useEstablishmentsOptionsQuery(mode === "create" || canTransfer)
  const { data: workSchedules = [] } = useQuery(selectCategoryQueryOptions("JORNADA"))
  const establishmentName = (id: number | null) =>
    establishments.find((e) => e.id === id)?.name ?? (id === campus?.establishmentId ? campus.establishmentName : "")
  const isMove = (values: CampusFormValues) =>
    moving && campus != null && values.establishmentId != null && values.establishmentId !== campus.establishmentId

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
      onSuccess: (_id, { values, moveTo }) => {
        notify(
          moveTo != null
            ? campusMovedMessage(values.name.trim() || (campus?.name ?? ""), establishmentName(moveTo))
            : SUCCESS_MESSAGES.campus.updated,
        )
        navigate({ to: listHref })
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })
  const isSaving = createMutation.isPending || updateMutation.isPending

  function save(values: CampusFormValues) {
    if (mode === "create") createMutation.mutate(values)
    else if (campus)
      updateMutation.mutate({
        campusId: campus.id,
        values,
        isPrincipal: principal,
        moveTo: isMove(values) ? values.establishmentId : null,
      })
  }

  /** Tras el nombre repetido: mover se confirma aparte, con lo que la sede tiene en curso. */
  function proceed(values: CampusFormValues) {
    if (isMove(values)) setMoveConfirm(values)
    else save(values)
  }

  const form = useAppForm({
    defaultValues: toFormValues(campus),
    // Al editar, lo que no cambió no se revalida: las sedes viejas conservan sus datos.
    validators: { onSubmit: buildCampusFormSchema({ principal, original: campus ? toFormValues(campus) : undefined }) },
    onSubmit: async ({ value }) => {
      // Un nombre repetido en el establecimiento (o en el de destino, al mover) se advierte antes de guardar (Regla 52).
      if (!principal && value.establishmentId != null) {
        const sedes = await queryClient
          .fetchQuery({
            queryKey: campusKeys.porEstablecimiento(value.establishmentId),
            queryFn: () => fetchEstablishmentCampuses(value.establishmentId as number),
          })
          .catch(() => [])
        if (hasRepeatedName(value.name, sedes, campus?.id ?? null)) {
          setRepeatedName({ values: value, establishment: establishmentName(value.establishmentId) })
          return
        }
      }
      proceed(value)
    },
  })

  const establishmentId = useStore(form.store, (s) => s.values.establishmentId)
  const { data: zones = [] } = useZonasSedeQuery(establishmentId)
  const { data: nextConsecutive } = useNextConsecutiveQuery(mode === "create" ? establishmentId : null)

  // Al mover, la sede llega como anexa: su consecutivo no puede repetir uno del destino.
  const moveTarget = moving && campus != null && establishmentId !== campus.establishmentId ? establishmentId : null
  const { data: targetCampuses } = useEstablishmentCampusesQuery(moveTarget)
  const { data: targetNextConsecutive } = useNextConsecutiveQuery(moveTarget)
  const takenInTarget = new Set((targetCampuses ?? []).map((c) => Number(c.consecutive)).filter((n) => n > 0))
  const originalTaken = campus != null && moveTarget != null && takenInTarget.has(Number(campus.consecutive))
  const suggestedFor = useRef<number | null>(null)
  useEffect(() => {
    if (moveTarget == null || targetCampuses == null || targetNextConsecutive == null) return
    if (suggestedFor.current === moveTarget) return
    suggestedFor.current = moveTarget
    // Si el suyo ya existe en el destino, se propone el siguiente libre (se puede cambiar).
    const actual = Number(form.getFieldValue("consecutive"))
    if (targetCampuses.some((c) => Number(c.consecutive) === actual)) {
      form.setFieldValue("consecutive", String(targetNextConsecutive))
    }
  }, [moveTarget, targetCampuses, targetNextConsecutive, form])

  // La zona del destino puede no admitir la de la sede: se vuelve a elegir.
  useEffect(() => {
    if (!moving || zones.length === 0) return
    const zoneId = form.getFieldValue("zoneId")
    if (zoneId != null && !zones.some((z) => z.id === zoneId)) form.setFieldValue("zoneId", null)
  }, [moving, zones, form])

  function stopMoving() {
    setMoving(false)
    suggestedFor.current = null
    if (campus) {
      form.setFieldValue("establishmentId", campus.establishmentId)
      form.setFieldValue("consecutive", campus.consecutive)
      form.setFieldValue("zoneId", campus.zoneId)
    }
  }

  function validateConsecutiveInTarget({ value }: { value: string }) {
    if (moveTarget == null || !value.trim()) return undefined
    return takenInTarget.has(Number(value))
      ? `El consecutivo ${Number(value)} ya existe en el establecimiento. Elija otro.`
      : undefined
  }

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
                      ) : moving ? (
                        <div className="md:col-span-9">
                          <form.AppField name="establishmentId">
                            {(f) => (
                              <f.SelectField
                                label="Establecimiento"
                                required
                                options={establishments.map((e) => ({ value: e.id, label: e.name }))}
                                emptyValue={null}
                                description="Mover a otro establecimiento: la sede llega como anexa."
                              />
                            )}
                          </form.AppField>
                        </div>
                      ) : (
                        <div className="md:col-span-9">
                          <ReadOnlyValue id="campus-establishment" label="Establecimiento" value={campus?.establishmentName ?? ""} locked required />
                        </div>
                      )}

                      {canTransfer ? (
                        <div className="flex items-start md:col-span-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button type="button" variant="outline" color="neutral" className="h-10 w-full md:w-auto" />
                              }
                            >
                              <ArrowsLeftRightIcon data-icon="inline-start" />
                              Cambiar establecimiento
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-auto min-w-60">
                              {moving ? (
                                <DropdownMenuItem className="normal-case tracking-normal" onClick={stopMoving}>
                                  <XIcon />
                                  Dejar en {campus?.establishmentName}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="normal-case tracking-normal" onClick={() => setMoving(true)}>
                                  <ArrowsLeftRightIcon />
                                  Mover a otro establecimiento
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="normal-case tracking-normal" onClick={() => setConverting(true)}>
                                <BankIcon />
                                Convertir en establecimiento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : null}

                      <FormDisabledProvider disabled={sinEstablecimiento}>
                        {principal ? (
                          <div className="md:col-span-3">
                            <ReadOnlyValue id="campus-consecutive" label="Consecutivo de la sede" value="1" description="Asignado por el sistema." />
                          </div>
                        ) : (
                          <div className="md:col-span-3">
                            <form.AppField
                              name="consecutive"
                              validators={{ onChange: validateConsecutiveInTarget, onSubmit: validateConsecutiveInTarget }}
                            >
                              {(f) => (
                                <f.NumberField
                                  label="Consecutivo de la sede"
                                  required
                                  maxDigits={2}
                                  description={
                                    mode === "create" && nextConsecutive != null
                                      ? `Siguiente disponible: ${nextConsecutive}.`
                                      : originalTaken && campus
                                        ? `El ${Number(campus.consecutive)} ya existe en ${establishmentName(moveTarget)}.`
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
                if (repeatedName) proceed(repeatedName.values)
                setRepeatedName(null)
              }}
            >
              <ArrowRightIcon data-icon="inline-start" />
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {campus ? (
        <MoveCampusConfirm
          campus={campus}
          establishment={moveConfirm ? establishmentName(moveConfirm.establishmentId) : ""}
          open={moveConfirm != null}
          onCancel={() => setMoveConfirm(null)}
          onConfirm={() => {
            if (moveConfirm) save(moveConfirm)
            setMoveConfirm(null)
          }}
        />
      ) : null}

      {canTransfer && campus ? (
        <ConvertCampusDialog
          campus={campus}
          open={converting}
          onOpenChange={setConverting}
          onConverted={() => {
            setConverting(false)
            navigate({ to: listHref })
          }}
        />
      ) : null}
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
