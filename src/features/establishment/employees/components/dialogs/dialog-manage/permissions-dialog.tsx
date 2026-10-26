import { useState, type ComponentProps, type Dispatch, type SetStateAction } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CheckIcon, ControlPointIcon, LockIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TableSortableHeader,
  compareBySortKey,
  type TableSort,
} from "@/components/table-sort-header"
import { toSelectItemsMap, type SelectOption } from "@/lib/catalog-options"
import { cn } from "@/lib/utils"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { usePuedeGestionarEstablecimientosQuery } from "@/features/establishment/institution/api/query/use-puede-gestionar-establecimientos"
import { PERMISSION_STATUS_OPTIONS, type Permission, type PermissionStatus } from "@/features/establishment/institution/api/types/permission"
import {
  permissionDraftSchema,
  type PermissionDraft,
} from "@/features/establishment/employees/components/dialogs/dialog-manage/schema"
import {
  DIRECTOR_GRUPO_ROLE_CODE,
  permissionSortValue,
  type PermissionSortKey,
} from "@/features/establishment/employees/components/dialogs/dialog-manage/helpers"

/**
 * Badge por estado del permiso, con el mismo criterio que los estados de
 * periodo académico: `soft` y el color según la carga del estado. Lo consumen
 * el select del formulario y la columna Estado de la tabla, para que el mismo
 * dato no se pinte de dos maneras distintas en el mismo diálogo.
 */
const PERMISSION_STATUS_BADGE: Record<
  PermissionStatus,
  Pick<ComponentProps<typeof Badge>, "variant" | "color">
> = {
  ACTIVE: { variant: "soft", color: "success" },
  SUSPENDED: { variant: "soft", color: "destructive" },
}

/*
 * Columna de acciones al estilo de `DataTable` y de la tabla de escalas de
 * valoración: la celda es `sticky` y de 1px —los botones son absolutos, su
 * min-content es 0— y el `spacer` que va justo antes es quien le reserva el
 * ancho en el flujo, para que no se lleve una tajada del reparto.
 */
const PERMISSION_ACTIONS_CELL_CLASS = "sticky right-0 z-10 w-px"
const PERMISSION_ACTIONS_SPACER_WIDTH = 96

const PERMISSION_ACTIONS_SPACER_CELL = (
  <td aria-hidden className="p-0">
    <div style={{ width: PERMISSION_ACTIONS_SPACER_WIDTH }} />
  </td>
)

const PERMISSION_ACTIONS_SPACER_HEAD = (
  <th aria-hidden className="p-0">
    <div style={{ width: PERMISSION_ACTIONS_SPACER_WIDTH }} />
  </th>
)

/*
 * El bloque va a sangre contra el borde derecho, con el alto completo de la
 * fila, y aparece con el mismo fade que el hover. El fondo es el color del
 * hover de `TableRow` (`bg-muted/50`) ya resuelto: acá hace falta opaco porque
 * tapa las columnas que pasan por debajo al scrollear, y se mezcla contra
 * `--popover` —la tabla vive dentro de un Dialog—.
 */
const permissionActionsOverlayClass = () =>
  cn(
    "absolute inset-y-0 right-0 z-10 flex items-center gap-1 px-2 transition-opacity",
    "bg-[color-mix(in_srgb,var(--muted)_50%,var(--popover))]",
    "opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100",
  )

interface PermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  permissionDraft: PermissionDraft
  onDraftChange: Dispatch<SetStateAction<PermissionDraft>>
  permissionErrors: Record<string, string>
  roleItems: SelectOption<number>[]
  campusItems: SelectOption<number>[]
  workScheduleItems: SelectOption<number>[]
  isLoadingSedeJornadas: boolean
  workScheduleEmptyMessage: string
  workScheduleEmptyShortMessage: string
  permissions: Permission[]
  onAdd: () => void
  onRemove: (permission: Permission) => void
  hasChanges: boolean
  onSave: () => Promise<void>
  isSaving: boolean
}

// Sub-diálogo "Asignar permisos": borrador del permiso + tabla.
export function PermissionsDialog({
  open,
  onOpenChange,
  permissionDraft,
  onDraftChange,
  permissionErrors,
  roleItems,
  campusItems,
  workScheduleItems,
  isLoadingSedeJornadas,
  workScheduleEmptyMessage,
  workScheduleEmptyShortMessage,
  permissions,
  onAdd,
  onRemove,
  hasChanges,
  onSave,
  isSaving,
}: PermissionsDialogProps) {
  // El permiso que da el cargo de rector o secretaria solo lo quita quien
  // gestiona los directivos: Eliminar en ESTABLECIMIENTO y nivel territorial.
  const { data: puedeGestionarDirectivos } = usePuedeGestionarEstablecimientosQuery()
  // Orden de la tabla de permisos: estado local, la tabla se arma a mano.
  const [permissionSort, setPermissionSort] = useState<TableSort<PermissionSortKey>>(null)
  const sortedPermissions = (() => {
    if (!permissionSort) return permissions
    const { key, dir } = permissionSort
    const sorted = [...permissions].sort((a, b) =>
      compareBySortKey(permissionSortValue(a, key), permissionSortValue(b, key)),
    )
    return dir === "desc" ? sorted.reverse() : sorted
  })()
  // Estado del permiso: dominio fijo (TSEDE_USUARIO.TLV_ESTADO, no un
  // catálogo real), value por `.code` a propósito — ver
  // PERMISSION_STATUS_OPTIONS en institution/api/types/permission.ts.
  const permissionStatusItems = PERMISSION_STATUS_OPTIONS.map((status) => ({ value: status.code, label: status.name }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] flex-col overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Asignar permisos</DialogTitle>
        </DialogHeader>

        <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-6 pt-2">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-0">
          <Field
            orientation="vertical"
            variant="outlined"
            className="mt-0 min-w-56 grow basis-[calc(33%-1rem)]"
            data-invalid={permissionErrors["order"] ? "true" : undefined}
          >
            <FieldLabel htmlFor="permission-order">Orden*</FieldLabel>
            <Input
              id="permission-order"
              placeholder="Agregar"
              type="number"
              min={1}
              value={permissionDraft.order}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, order: event.target.value }))
              }
            />
            <FieldError>{permissionErrors["order"]}</FieldError>
          </Field>

          <Field
            orientation="vertical"
            variant="outlined"
            className="mt-0 min-w-56 grow basis-[calc(33%-1rem)]"
            data-invalid={permissionErrors["roleId"] ? "true" : undefined}
          >
            <FieldLabel htmlFor="permission-role">Rol*</FieldLabel>
            <ComboboxField
              id="permission-role"
              value={permissionDraft.roleId}
              onValueChange={(value) =>
                onDraftChange((prev) => ({ ...prev, roleId: value ?? null }))
              }
              items={toSelectItemsMap(roleItems)}
            >
              <ComboboxFieldTrigger aria-invalid={Boolean(permissionErrors["roleId"])}>
                <ComboboxFieldValue placeholder="Seleccionar" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {roleItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
            <FieldError>{permissionErrors["roleId"]}</FieldError>
          </Field>

          <Field
            orientation="vertical"
            variant="outlined"
            className="mt-0 min-w-56 grow basis-[calc(33%-1rem)]"
            data-invalid={permissionErrors["campusId"] ? "true" : undefined}
          >
            <FieldLabel htmlFor="permission-campus">Sede educativa*</FieldLabel>
            <ComboboxField
              id="permission-campus"
              value={permissionDraft.campusId}
              onValueChange={(value) =>
                onDraftChange((prev) => ({
                  ...prev,
                  campusId: value ?? null,
                  workScheduleId: null,
                }))
              }
              items={toSelectItemsMap(campusItems)}
            >
              <ComboboxFieldTrigger aria-invalid={Boolean(permissionErrors["campusId"])}>
                <ComboboxFieldValue placeholder="Seleccionar" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {campusItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value} title={item.label}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
            <FieldError>{permissionErrors["campusId"]}</FieldError>
          </Field>

          <Field
            orientation="vertical"
            variant="outlined"
            className="mt-0 min-w-56 grow basis-[calc(33%-1rem)]"
            data-invalid={permissionErrors["workScheduleId"] ? "true" : undefined}
          >
            <FieldLabel htmlFor="permission-schedule">Jornada*</FieldLabel>
            <ComboboxField
              id="permission-schedule"
              value={permissionDraft.workScheduleId}
              onValueChange={(value) =>
                onDraftChange((prev) => ({ ...prev, workScheduleId: value ?? null }))
              }
              items={toSelectItemsMap(workScheduleItems)}
              disabled={
                permissionDraft.campusId == null || isLoadingSedeJornadas || workScheduleItems.length === 0
              }
            >
              <ComboboxFieldTrigger
                aria-invalid={Boolean(permissionErrors["workScheduleId"])}
                title={
                  permissionDraft.campusId != null && workScheduleItems.length === 0 && !isLoadingSedeJornadas
                    ? workScheduleEmptyMessage
                    : undefined
                }
              >
                <ComboboxFieldValue
                  placeholder={
                    isLoadingSedeJornadas
                      ? "Cargando..."
                      : permissionDraft.campusId != null && workScheduleItems.length === 0
                        ? workScheduleEmptyShortMessage
                        : "Seleccionar"
                  }
                />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {workScheduleItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
            <FieldError>{permissionErrors["workScheduleId"]}</FieldError>
          </Field>

          <Field
            orientation="vertical"
            variant="outlined"
            className="mt-0 min-w-56 grow basis-[calc(33%-1rem)]"
            data-invalid={permissionErrors["status"] ? "true" : undefined}
          >
            <FieldLabel htmlFor="permission-status">Estado*</FieldLabel>
            <Select
              id="permission-status"
              value={permissionDraft.status}
              onValueChange={(value) =>
                onDraftChange((prev) => ({
                  ...prev,
                  status: (value ?? "") as PermissionStatus | "",
                }))
              }
              items={permissionStatusItems}
            >
              <SelectTrigger aria-invalid={Boolean(permissionErrors["status"])}>
                <SelectValue placeholder="Seleccionar">
                  {(value) => {
                    const badge = PERMISSION_STATUS_BADGE[value as PermissionStatus]
                    if (!badge) return "Seleccionar"
                    const label =
                      permissionStatusItems.find((item) => item.value === value)?.label ?? value
                    return (
                      <Badge {...badge} className="text-xs">
                        {label}
                      </Badge>
                    )
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {permissionStatusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{permissionErrors["status"]}</FieldError>
          </Field>

          <div className="flex w-full flex-col gap-1.5 sm:w-auto">
            <FieldLabel className="invisible">Agregar</FieldLabel>
            <Button
              variant="fill"
              color="primary"
              onClick={onAdd}
              disabled={!permissionDraftSchema.safeParse(permissionDraft).success}
              className="w-full sm:w-auto"
            >
              <ControlPointIcon data-icon="inline-start" />
              Agregar
            </Button>
          </div>
        </div>

        <NoticeOutlet />

        {permissions.length > 0 && (
          <Table containerClassName="max-h-[36vh] overflow-y-auto">
            <TableHeader>
              <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                <TableHead className="text-foreground">
                  <TableSortableHeader
                    title="Orden"
                    sortKey="order"
                    sort={permissionSort}
                    onSortChange={setPermissionSort}
                  />
                </TableHead>
                <TableHead className="text-foreground">
                  <TableSortableHeader
                    title="Rol"
                    sortKey="role"
                    sort={permissionSort}
                    onSortChange={setPermissionSort}
                  />
                </TableHead>
                <TableHead className="text-foreground">
                  <TableSortableHeader
                    title="Sede educativa"
                    sortKey="campus"
                    sort={permissionSort}
                    onSortChange={setPermissionSort}
                  />
                </TableHead>
                <TableHead className="text-foreground">
                  <TableSortableHeader
                    title="Jornada"
                    sortKey="workSchedule"
                    sort={permissionSort}
                    onSortChange={setPermissionSort}
                  />
                </TableHead>
                <TableHead className="text-foreground">
                  <TableSortableHeader
                    title="Estado"
                    sortKey="status"
                    sort={permissionSort}
                    onSortChange={setPermissionSort}
                  />
                </TableHead>
                {PERMISSION_ACTIONS_SPACER_HEAD}
                <TableHead className="w-px text-foreground">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPermissions.map((permission) => (
                <TableRow
                  key={`${permission.role.id}-${permission.campus.id}-${permission.order}`}
                  className="group/row"
                >
                  <TableCell className="font-medium">{permission.order}</TableCell>
                  <TableCell>{permission.role.name}</TableCell>
                  <TableCell>{permission.campus.name}</TableCell>
                  <TableCell>{permission.workSchedule.name}</TableCell>
                  <TableCell>
                    <Badge {...PERMISSION_STATUS_BADGE[permission.status]}>
                      {permission.status === "ACTIVE" ? "Activo" : "Suspendido"}
                    </Badge>
                  </TableCell>
                  {PERMISSION_ACTIONS_SPACER_CELL}
                  <TableCell className={PERMISSION_ACTIONS_CELL_CLASS}>
                    <div className={permissionActionsOverlayClass()}>
                      {permission.principalDe && !puedeGestionarDirectivos ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span
                                className="inline-flex size-8 items-center justify-center text-muted-foreground"
                                aria-label={`Permiso principal de ${permission.principalDe === "RECTOR" ? "rector" : "secretaria"}: solo lo quita quien gestiona los directivos del establecimiento`}
                              />
                            }
                          >
                            <LockIcon />
                          </TooltipTrigger>
                          <TooltipContent>
                            {permission.principalDe === "RECTOR"
                              ? "Es el permiso de rector del establecimiento: solo lo quita quien gestiona los directivos del establecimiento."
                              : "Es el permiso de la secretaria del establecimiento: solo lo quita quien gestiona los directivos del establecimiento."}
                          </TooltipContent>
                        </Tooltip>
                      ) : permission.role.code === DIRECTOR_GRUPO_ROLE_CODE ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span
                                className="inline-flex size-8 items-center justify-center text-muted-foreground"
                                aria-label="Permiso de director de grupo: se gestiona desde el grupo"
                              />
                            }
                          >
                            <LockIcon />
                          </TooltipTrigger>
                          <TooltipContent>
                            El director de grupo se asigna y se quita desde el grupo.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <ConfirmRemoveButton
                          label={`Quitar permiso ${permission.order}`}
                          description={
                            <>
                              Se quitará el permiso de {permission.role.name} en{" "}
                              {permission.campus.name}. Esta acción no se puede deshacer.
                            </>
                          }
                          onConfirm={() => onRemove(permission)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        </div>

        <DialogFooter className="shrink-0 justify-end px-6 pb-6 sm:justify-end">
          {hasChanges && (
            <Button
              variant="fill"
              color="primary"
              size="sm"
              onClick={() => void onSave()}
              disabled={isSaving}
            >
              <CheckIcon data-icon="inline-start" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          )}
          <Button
            variant="fill"
            color="neutral"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
