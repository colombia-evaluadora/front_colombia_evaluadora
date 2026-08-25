import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CalendarIcon,
  ArrowRightIcon,
  CaretDownIcon,
  GearIcon,
  InfoIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useUser } from "@/lib/auth"
import { getErrorMessage } from "@/lib/api-client"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useRolesQuery } from "@/features/administration/roles-menus/api/query/use-roles-query"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import { useUpdateAcademicPeriodReservation } from "@/features/establishment/academic-period/api/mutations/update-academic-period-reservation"
import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
import { useReservationsQuery } from "@/features/coverage/api/query/use-reservations-query"
import { formatGrade, GRADE_OPTIONS } from "@/features/coverage/api/ui-mappings"
import type { EducationLevel } from "@/features/coverage/api/types/reservation"
import type {
  AcademicPeriod,
  AcademicPeriodDetail,
  CreateAcademicPeriodRequest,
} from "@/features/establishment/academic-period/api/types/academic-period"
import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"

interface EnrollmentsSettingsSheetProps {
  period: AcademicPeriod | undefined
  isLoading: boolean
  isError: boolean
}

const GRADE_LABELS = [
  "0° (Cero)",
  "1° (primero)",
  "2° (Segundo)",
  "3° (Tercero)",
  "4° (Cuarto)",
  "5° (Quinto)",
  "6° (Sexto)",
  "7° (Séptimo)",
  "8° (Octavo)",
  "9° (Noveno)",
  "10° (Décimo)",
  "11° (Undécimo)",
] as const

const ADDITIONAL_ROLES: Role[] = [
  { id: 5, name: "Estudiante" },
  { id: 6, name: "Acudiente" },
]

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function getEducationLevelKey(name: string): EducationLevel | null {
  const normalized = name.toLocaleLowerCase()
  if (normalized === "preescolar") return "PREESCOLAR"
  if (normalized === "básica primaria") return "BASICA_PRIMARIA"
  if (normalized === "secundaria") return "BASICA_SECUNDARIA"
  if (normalized === "educación media") return "MEDIA"
  return null
}

function toUpdateRequest(
  detail: AcademicPeriodDetail,
  reservationEnabled: boolean,
): CreateAcademicPeriodRequest {
  const { config } = detail
  return {
    FK_SEDE: Number(detail.sedeId),
    FK_ESTADO: detail.statusId ?? 0,
    FECHA_INICIO: detail.startDate,
    FECHA_FIN: detail.endDate,
    FECHA_LIMITE_MATRICULA: detail.enrollmentDeadline,
    FK_JORNADA: config.jornadaId,
    HORA_INICIO: config.scheduleStartTime ?? null,
    HORA_FIN: config.scheduleEndTime ?? null,
    RESERVA: reservationEnabled ? "S" : "N",
    BLOQUES_POR_DEFECTO: config.defaultBlocksCount,
    FK_PERIODO_ANTERIOR: detail.previousPeriodId,
    DESCANSO_INICIO: (config.breaks ?? []).map((item) => item.startTime),
    DESCANSO_FIN: (config.breaks ?? []).map((item) => item.endTime),
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function quantityOptions(count: number): number[] {
  return Array.from(
    new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, count]),
  ).sort((a, b) => a - b)
}

export function EnrollmentsSettingsSheet({
  period,
  isLoading,
  isError,
}: EnrollmentsSettingsSheetProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [confirmationTarget, setConfirmationTarget] = useState<boolean | null>(null)
  const [shouldFetch, setShouldFetch] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [editRoleNames, setEditRoleNames] = useState(["Administrador", "Coordinador", "Acudiente"])
  const [readRoleNames, setReadRoleNames] = useState(["Administrador", "Coordinador", "Acudiente"])
  const [offerOpen, setOfferOpen] = useState(false)
  const [selectedTeachingLevels, setSelectedTeachingLevels] = useState<EducationLevel[]>([])
  const [gradeCounts, setGradeCounts] = useState<Record<number, number>>({})

  const { puedeEditar, isLoading: isPermissionLoading } = useMenuPermission("PERIODOS_ACADEMICOS")
  const { data: user } = useUser()
  const canManage = !isPermissionLoading && puedeEditar && user?.role === "ADMIN"
  const hasDateRange = Boolean(period?.startDate && period?.endDate)
  const canToggle = Boolean(period && canManage && hasDateRange)

  const {
    data: detail,
    isFetching,
    isError: isDetailError,
    error: detailError,
  } = useAcademicPeriodQuery(shouldFetch && period ? period.id : undefined)
  const { data: roles = [] } = useRolesQuery()
  const { data: teachingLevels = [] } = useTeachingLevelsQuery()
  const { data: reservationCatalogs } = useReservationCatalogsQuery()
  const { data: reservationsData } = useReservationsQuery({
    filters: { levels: selectedTeachingLevels },
    sorting: [],
    pageIndex: 0,
    pageSize: 1000,
  })

  const roleOptions = [...roles, ...ADDITIONAL_ROLES].filter(
    (role, index, allRoles) =>
      allRoles.findIndex((candidate) => candidate.name === role.name) === index,
  )
  const selectableTeachingLevels = teachingLevels.filter(
    (level) => getEducationLevelKey(level.nombre) !== null,
  )
  const teachingLevelKeys = selectableTeachingLevels
    .map((level) => getEducationLevelKey(level.nombre))
    .filter((level): level is EducationLevel => level !== null)
  const gradeOptions = reservationCatalogs?.grades.length
    ? reservationCatalogs.grades
    : GRADE_OPTIONS
  const gradeRows = gradeOptions.map((grade) => ({
    grade,
    label: GRADE_LABELS[grade] ?? formatGrade(grade),
    count:
      gradeCounts[grade] ??
      reservationsData?.rows.filter((reservation) => reservation.grade === grade).length ??
      0,
  }))

  const updateReservation = useUpdateAcademicPeriodReservation({
    mutationConfig: {
      onSuccess: (result) => {
        setConfirmationOpen(false)
        setConfirmationTarget(null)
        setShouldFetch(false)
        if (result.status === "error") {
          setErrorMessage(result.message)
          return
        }
        setErrorMessage("")
        setConfirmationVisible(true)
        toast.success("La configuración de Inscripciones se actualizó correctamente.")
      },
      onError: (error) => {
        setConfirmationOpen(false)
        setConfirmationTarget(null)
        setShouldFetch(false)
        setErrorMessage(getErrorMessage(error))
      },
    },
  })

  function handleToggle(checked: boolean) {
    if (!period || !canToggle || checked === period.reservationEnabled) return
    setConfirmationTarget(checked)
    setConfirmationVisible(false)
    setErrorMessage("")
    setShouldFetch(true)
    setConfirmationOpen(true)
  }

  function handleConfirm() {
    if (!period || !detail || confirmationTarget === null) return
    updateReservation.mutate({
      id: period.id,
      body: toUpdateRequest(detail, confirmationTarget),
    })
  }

  function toggleEditRole(name: string) {
    setEditRoleNames((current) =>
      current.includes(name) ? current.filter((role) => role !== name) : [...current, name],
    )
  }

  function toggleReadRole(name: string) {
    setReadRoleNames((current) =>
      current.includes(name) ? current.filter((role) => role !== name) : [...current, name],
    )
  }

  function setAllEditRoles(selected: boolean) {
    setEditRoleNames(selected ? roleOptions.map((role) => role.name) : [])
  }

  function setAllReadRoles(selected: boolean) {
    setReadRoleNames(selected ? roleOptions.map((role) => role.name) : [])
  }

  function toggleTeachingLevel(level: EducationLevel) {
    setSelectedTeachingLevels((current) =>
      current.includes(level) ? current.filter((item) => item !== level) : [...current, level],
    )
  }

  function setAllTeachingLevels(selected: boolean) {
    setSelectedTeachingLevels(selected ? [...teachingLevelKeys] : [])
  }

  function updateGradeCount(grade: number, value: string) {
    setGradeCounts((current) => ({ ...current, [grade]: Number(value) }))
  }

  const isBusy = updateReservation.isPending || isFetching
  const allRolesSelected = roleOptions.length > 0 && editRoleNames.length === roleOptions.length
  const allReadRolesSelected = roleOptions.length > 0 && readRoleNames.length === roleOptions.length
  const allTeachingLevelsSelected =
    teachingLevelKeys.length > 0 && selectedTeachingLevels.length === teachingLevelKeys.length

  return (
    <>
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) {
            setConfirmationVisible(false)
            setErrorMessage("")
            setConfirmationTarget(null)
            setShouldFetch(false)
          }
        }}
      >
        <SheetTrigger
          render={
            <Button
              size="icon-sm"
              variant="outline"
              color="muted"
              className="bg-background"
              disabled={!period || isLoading || isError}
            />
          }
        >
          <GearIcon />
          <span className="sr-only">Abrir opciones de configuración</span>
        </SheetTrigger>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-full flex-col gap-0 sm:max-w-none"
        >
          <SheetHeader className="border-b px-6 py-7">
            <SheetTitle className="text-2xl font-heading">Opciones de configuración</SheetTitle>
            <SheetDescription className="mt-2 text-base leading-relaxed">
              Configura el periodo que se muestra en Inscripciones y habilita o deshabilita sus
              reservas.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-7">
            <div className="flex min-h-14 items-center justify-between gap-4">
              <p className="text-base font-medium">Habilitar / Deshabilitar inscripción</p>
              <Switch
                checked={period?.reservationEnabled ?? false}
                disabled={!canToggle}
                onCheckedChange={(checked) => handleToggle(checked)}
                aria-label="Habilitar o deshabilitar inscripción"
                className="h-5 w-10 [&_[data-slot=switch-thumb]]:size-4"
              />
            </div>

            {!canManage && !isPermissionLoading && period ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Tu usuario puede consultar la configuración, pero no tiene permiso para cambiarla.
              </p>
            ) : null}
            {!hasDateRange && period ? (
              <Alert className="mt-2 border-amber-200 bg-amber-50 text-amber-800 after:bg-amber-500 [&>svg]:text-amber-600">
                <InfoIcon />
                <AlertDescription>
                  No se puede cambiar el estado hasta definir una fecha de inicio y una fecha de
                  finalización.
                </AlertDescription>
              </Alert>
            ) : null}
            {confirmationVisible ? (
              <Alert className="mt-2 border-transparent bg-green-22 text-foreground after:bg-green [&>svg]:text-green">
                <InfoIcon />
                <AlertDescription>
                  La oferta educativa y las consultas de Inscripciones ya reflejan el nuevo estado.
                </AlertDescription>
              </Alert>
            ) : null}
            {errorMessage ? (
              <Alert className="mt-2" variant="destructive">
                <InfoIcon />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="mt-3 flex min-h-12 items-center gap-3 rounded-md border px-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs text-muted-foreground">Fecha de inicio y final</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="tabular-nums">
                    {period ? formatDate(period.startDate) : "—"}
                  </span>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                  <span className="tabular-nums">{period ? formatDate(period.endDate) : "—"}</span>
                </div>
              </div>
              <CalendarIcon className="ml-auto size-5 text-primary/80" />
            </div>

            <Section title="Agregar rol">
              <div className="space-y-2">
                <div className="rounded-md border p-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 text-left"
                          disabled={!canManage}
                        />
                      }
                    >
                      <span className="text-base font-semibold">Editar</span>
                      <CaretDownIcon className="size-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-64 normal-case">
                      <DropdownMenuCheckboxItem
                        checked={allRolesSelected}
                        onCheckedChange={(checked) => setAllEditRoles(checked === true)}
                        disabled={!canManage}
                      >
                        Seleccionar todos
                      </DropdownMenuCheckboxItem>
                      {roleOptions.map((role) => (
                        <DropdownMenuCheckboxItem
                          key={role.id}
                          checked={editRoleNames.includes(role.name)}
                          onCheckedChange={() => toggleEditRole(role.name)}
                          disabled={!canManage}
                          className="normal-case"
                        >
                          {role.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {editRoleNames.length > 0 ? (
                      editRoleNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-muted px-2 text-[11px] font-semibold tracking-wide text-muted-foreground"
                          aria-label={`Quitar ${name} de editar`}
                          onClick={() => toggleEditRole(name)}
                          disabled={!canManage}
                        >
                          {name}
                          <XIcon className="size-3" />
                        </button>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Ningún rol seleccionado</span>
                    )}
                  </div>
                </div>
                <div className="rounded-md border p-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 text-left"
                          disabled={!canManage}
                        />
                      }
                    >
                      <span className="text-base font-semibold">Leer</span>
                      <CaretDownIcon className="size-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-64 normal-case">
                      <DropdownMenuCheckboxItem
                        checked={allReadRolesSelected}
                        onCheckedChange={(checked) => setAllReadRoles(checked === true)}
                        disabled={!canManage}
                      >
                        Seleccionar todos
                      </DropdownMenuCheckboxItem>
                      {roleOptions.map((role) => (
                        <DropdownMenuCheckboxItem
                          key={role.id}
                          checked={readRoleNames.includes(role.name)}
                          onCheckedChange={() => toggleReadRole(role.name)}
                          disabled={!canManage}
                          className="normal-case"
                        >
                          {role.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {readRoleNames.length > 0 ? (
                      readRoleNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-muted px-2 text-[11px] font-semibold tracking-wide text-muted-foreground"
                          aria-label={`Quitar ${name} de leer`}
                          onClick={() => toggleReadRole(name)}
                          disabled={!canManage}
                        >
                          {name}
                          <XIcon className="size-3" />
                        </button>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Ningún rol seleccionado</span>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Oferta educativa">
              <Popover open={offerOpen} onOpenChange={setOfferOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex items-center gap-2 text-base font-semibold"
                    />
                  }
                >
                  Oferta educativa
                  <CaretDownIcon className="size-4 text-muted-foreground" />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="right"
                  className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0"
                >
                  <PopoverHeader className="border-b px-4 py-3">
                    <PopoverTitle className="text-base normal-case">Oferta educativa</PopoverTitle>
                  </PopoverHeader>
                  <div className="max-h-[70dvh] overflow-y-auto p-3">
                    <div className="space-y-2 border-b pb-3">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={allTeachingLevelsSelected}
                          onCheckedChange={(checked) => setAllTeachingLevels(checked === true)}
                          disabled={!canManage}
                        />
                        Seleccionar todos
                      </label>
                      {selectableTeachingLevels.map((level) => {
                        const levelKey = getEducationLevelKey(level.nombre)
                        if (!levelKey) return null
                        return (
                          <label
                            key={level.id}
                            className="flex items-center gap-2 text-sm normal-case"
                          >
                            <Checkbox
                              checked={selectedTeachingLevels.includes(levelKey)}
                              onCheckedChange={() => toggleTeachingLevel(levelKey)}
                              disabled={!canManage}
                            />
                            {level.nombre}
                          </label>
                        )
                      })}
                    </div>
                    <Table className="mt-3 text-sm" containerClassName="rounded-md border">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="normal-case">Grados</TableHead>
                          <TableHead className="normal-case">Cantidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gradeRows.map((row) => (
                          <TableRow key={row.grade}>
                            <TableCell>{row.label}</TableCell>
                            <TableCell>
                              <Select
                                value={String(row.count)}
                                onValueChange={(value) => {
                                  if (value) updateGradeCount(row.grade, value)
                                }}
                                disabled={!canManage}
                              >
                                <SelectTrigger size="sm" className="h-8 w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {quantityOptions(row.count).map((quantity) => (
                                    <SelectItem key={quantity} value={String(quantity)}>
                                      {quantity}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </PopoverContent>
              </Popover>
              <Alert className="border-transparent bg-green-22 text-foreground after:bg-green [&>svg]:text-green">
                <InfoIcon />
                <AlertDescription>
                  La oferta educativa ha sido actualizada correctamente.
                </AlertDescription>
              </Alert>
              <Accordion defaultValue={["grades"]} className="rounded-md border">
                <AccordionItem value="grades">
                  <AccordionTrigger className="px-4 py-3 text-base font-semibold">
                    Grados
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {gradeRows.map((row) => (
                        <span
                          key={row.grade}
                          className="inline-flex min-h-7 items-center gap-1 rounded-md bg-muted px-2 text-[11px] font-semibold tracking-wide text-muted-foreground"
                        >
                          <span>{row.label}</span>
                          <span className="rounded-xs bg-background px-1.5 text-[10px]">
                            {row.count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Section>
          </div>

          <div className="shrink-0 flex justify-center p-6">
            <SheetClose render={<Button size="sm" variant="fill" color="neutral" />}>
              Cerrar
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          setConfirmationOpen(open)
          if (!open) {
            setConfirmationTarget(null)
            setShouldFetch(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmationTarget ? "Activar inscripción" : "Desactivar inscripción"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationTarget
                ? "Al activar este periodo, los usuarios podrán realizar reservas y las consultas relacionadas mostrarán el estado Activo. La acción quedará registrada en el historial del sistema."
                : "Al desactivar este periodo, los usuarios no podrán realizar nuevas reservas y las consultas relacionadas mostrarán el estado Inactivo. La acción quedará registrada en el historial del sistema."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isDetailError ? (
            <p className="text-sm text-destructive">{getErrorMessage(detailError)}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogAction
              color="primary"
              disabled={!detail || isBusy}
              aria-busy={isBusy}
              onClick={handleConfirm}
            >
              {isBusy ? <SpinnerIcon className="animate-spin" /> : null}
              {confirmationTarget ? "Activar" : "Desactivar"}
            </AlertDialogAction>
            <AlertDialogCancel variant="fill" color="neutral" disabled={isBusy}>
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
