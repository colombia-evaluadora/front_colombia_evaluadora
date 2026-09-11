import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { CaretDownIcon, GearIcon, InfoIcon } from "@/components/ui/icons"
import { inputTriggerVariants, inputVariants } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  TableSortableHeader,
  sortBySortKey,
  type TableSort,
} from "@/components/table-sort-header"
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
import { useUpdateAcademicPeriodReservation } from "@/features/establishment/academic-period/api/mutations/update-academic-period-reservation"
import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
import { useReservationsQuery } from "@/features/coverage/api/query/use-reservations-query"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/subjects-multi-select"
import { DateRangeField, type DateRange } from "@/features/establishment/academic-period/components/date-range-field"
import { formatGrade, GRADE_OPTIONS } from "@/features/coverage/api/ui-mappings"
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

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-4", className)}>
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
  const [toggleNotice, setToggleNotice] = useState<{ enabled: boolean } | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [editRoleNames, setEditRoleNames] = useState(["Administrador", "Coordinador", "Acudiente"])
  const [readRoleNames, setReadRoleNames] = useState(["Administrador", "Coordinador", "Acudiente"])
  const [gradeCounts, setGradeCounts] = useState<Record<number, number>>({})
  const [gradeCountsBaseline, setGradeCountsBaseline] = useState<Record<number, number>>({})
  const [gradesSheetOpen, setGradesSheetOpen] = useState(false)
  const [gradeSort, setGradeSort] = useState<TableSort<"label" | "count">>(null)
  const [dateRangeOverride, setDateRangeOverride] = useState<DateRange | null>(null)

  const { puedeEditar, isLoading: isPermissionLoading } = useMenuPermission("PERIODOS_ACADEMICOS")
  const { data: user } = useUser()
  const canManage = !isPermissionLoading && puedeEditar && user?.role === "ADMIN"
  const hasDateRange = Boolean(period?.startDate && period?.endDate)
  const canToggle = Boolean(period && canManage && hasDateRange)

  const {
    data: detail,
    isFetching,
  } = useAcademicPeriodQuery(sheetOpen && period ? period.id : undefined)
  const { data: roles = [] } = useRolesQuery()
  const { data: reservationCatalogs } = useReservationCatalogsQuery()
  const { data: reservationsData } = useReservationsQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 1000,
  })

  const roleOptions = [...roles, ...ADDITIONAL_ROLES].filter(
    (role, index, allRoles) =>
      allRoles.findIndex((candidate) => candidate.name === role.name) === index,
  )
  const roleSelectOptions = roleOptions.map((role) => ({ id: role.name, label: role.name }))
  const dateRange = dateRangeOverride ?? {
    startDate: period?.startDate ?? "",
    endDate: period?.endDate ?? "",
  }
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
  const sortedGradeRows = sortBySortKey(gradeRows, gradeSort)

  const updateReservation = useUpdateAcademicPeriodReservation({
    mutationConfig: {
      onSuccess: (result, variables) => {
        if (result.status === "error") {
          setErrorMessage(result.message)
          setToggleNotice(null)
          return
        }
        setErrorMessage("")
        setToggleNotice({ enabled: variables.body.RESERVA === "S" })
        toast.success("La configuración de Inscripciones se actualizó correctamente.")
      },
      onError: (error) => {
        setErrorMessage(getErrorMessage(error))
        setToggleNotice(null)
      },
    },
  })

  function handleToggle(checked: boolean) {
    if (!period || !canToggle || !detail || checked === period.reservationEnabled) return
    setErrorMessage("")
    setToggleNotice(null)
    updateReservation.mutate({
      id: period.id,
      body: toUpdateRequest(detail, checked),
    })
  }

  function updateGradeCount(grade: number, value: string) {
    setGradeCounts((current) => ({ ...current, [grade]: Number(value) }))
  }

  function saveGradeCounts() {
    setGradeCountsBaseline(gradeCounts)
    toast.success("Los cupos por grado se actualizaron correctamente.")
  }

  const hasGradeChanges = JSON.stringify(gradeCounts) !== JSON.stringify(gradeCountsBaseline)
  const isBusy = updateReservation.isPending || isFetching

  return (
    <>
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) {
            setToggleNotice(null)
            setErrorMessage("")
            setDateRangeOverride(null)
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
          className="flex w-full flex-col gap-0 data-[side=right]:sm:max-w-lg"
        >
          <SheetHeader className="pb-3">
            <SheetTitle className="text-2xl font-heading">Opciones de configuración</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-7">
            {toggleNotice ? (
              toggleNotice.enabled ? (
                <Alert className="mb-3 border-transparent bg-green-22 text-foreground after:bg-green [&>svg]:text-green">
                  <InfoIcon />
                  <AlertDescription>
                    Se ha habilitado las inscripciones. La oferta educativa y las consultas de
                    Inscripciones ya reflejan el nuevo estado.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="mb-3 border-amber-200 bg-amber-50 text-amber-800 after:bg-amber-500 [&>svg]:text-amber-600">
                  <InfoIcon />
                  <AlertDescription>
                    Se ha deshabilitado las inscripciones. Tenga en cuenta que aún hay estudiantes
                    pendientes por confirmar su situación.
                  </AlertDescription>
                </Alert>
              )
            ) : null}
            {errorMessage ? (
              <Alert className="mb-3" variant="destructive">
                <InfoIcon />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex min-h-14 items-center gap-2">
              <p className="text-base font-medium">Habilitar / Deshabilitar inscripción</p>
              <Switch
                checked={period?.reservationEnabled ?? false}
                disabled={!canToggle || !detail || isBusy}
                onCheckedChange={(checked) => handleToggle(checked)}
                aria-label="Habilitar o deshabilitar inscripción"
                className="rounded-full border-2! border-primary! bg-background! data-[size=default]:h-4! data-checked:bg-background! data-unchecked:border-primary! data-unchecked:bg-background! [&_[data-slot=switch-thumb]]:rounded-full [&_[data-slot=switch-thumb]]:scale-75 [&_[data-slot=switch-thumb]]:bg-primary! [&_[data-slot=switch-thumb]]:shadow-sm [&_[data-slot=switch-thumb]]:dark:bg-primary!"
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

            <Field variant="outlined" className="mt-1">
              <FieldLabel>Fecha de inicio y final</FieldLabel>
              <DateRangeField
                value={dateRange}
                onChange={setDateRangeOverride}
                disabled={!canManage || !period}
              />
            </Field>

            <Section title="Agregar rol" className="mt-6">
              <div className="space-y-4">
                <Field variant="outlined">
                  <FieldLabel>Editar</FieldLabel>
                  <SubjectsMultiSelect
                    options={roleSelectOptions}
                    value={editRoleNames}
                    onChange={setEditRoleNames}
                    placeholder="Seleccionar roles"
                    emptyMessage="No hay roles disponibles."
                    disabled={!canManage}
                  />
                </Field>
                <Field variant="outlined">
                  <FieldLabel>Leer</FieldLabel>
                  <SubjectsMultiSelect
                    options={roleSelectOptions}
                    value={readRoleNames}
                    onChange={setReadRoleNames}
                    placeholder="Seleccionar roles"
                    emptyMessage="No hay roles disponibles."
                    disabled={!canManage}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Oferta educativa" className="mt-6">
              <Field variant="outlined">
                <FieldLabel>Grados</FieldLabel>
                <button
                  type="button"
                  onClick={() => setGradesSheetOpen(true)}
                  className={cn(
                    inputVariants({ variant: "outlined" }),
                    inputTriggerVariants({ variant: "outlined" }),
                    "relative flex h-auto min-h-11 flex-wrap items-center gap-2 pr-8 text-left",
                  )}
                >
                  {gradeRows.map((row) => (
                    <span
                      key={row.grade}
                      className="inline-flex w-fit items-center gap-2 rounded-md bg-muted-22 px-3 py-1.5 text-sm font-medium text-muted-foreground"
                    >
                      {row.label}
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        {row.count}
                      </span>
                    </span>
                  ))}
                  <CaretDownIcon className="absolute top-3 right-3 size-4 shrink-0 text-muted-foreground" />
                </button>
              </Field>
            </Section>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={gradesSheetOpen}
        onOpenChange={(open) => {
          setGradesSheetOpen(open)
          if (open) setGradeCountsBaseline(gradeCounts)
        }}
      >
        <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-sm">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-2xl font-heading">Oferta educativa</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-7">
            <Table containerClassName="rounded-md border">
              <TableHeader>
                <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Grados"
                      sortKey="label"
                      sort={gradeSort}
                      onSortChange={setGradeSort}
                    />
                  </TableHead>
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Cantidad"
                      sortKey="count"
                      sort={gradeSort}
                      onSortChange={setGradeSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGradeRows.map((row) => (
                  <TableRow key={row.grade}>
                    <TableCell className="py-1.5">{row.label}</TableCell>
                    <TableCell className="py-1.5">
                      <Select
                        value={String(row.count)}
                        onValueChange={(value) => {
                          if (value) updateGradeCount(row.grade, value)
                        }}
                        disabled={!canManage}
                      >
                        <SelectTrigger variant="outlined" size="sm" className="w-24">
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

          <div className="shrink-0 flex justify-center gap-2 p-6">
            {hasGradeChanges ? (
              <Button size="sm" color="primary" onClick={saveGradeCounts}>
                Guardar
              </Button>
            ) : null}
            <SheetClose render={<Button size="sm" variant="fill" color="neutral" />}>
              Cerrar
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
