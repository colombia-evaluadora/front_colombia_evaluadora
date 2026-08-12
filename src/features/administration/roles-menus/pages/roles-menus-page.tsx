import { useMemo, useState } from "react"

import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Field, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { useCreateRole } from "../api/mutations/create-role"
import { useUpdateRoleMenus } from "../api/mutations/update-role-menus"
import { useMenusQuery } from "../api/query/use-menus-query"
import { useRoleMenusQuery } from "../api/query/use-role-menus-query"
import { useRolesQuery } from "../api/query/use-roles-query"
import { buildMenuTree } from "../api/types/role-menu"
import { MenuTransfer } from "../components/menu-transfer"

export function RolesMenusPage() {
  const { notify } = useNotify()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [newRoleName, setNewRoleName] = useState("")

  const { data: roles = [], isPending: rolesPending } = useRolesQuery()
  // Sin selección explícita se edita el primer rol: la pantalla no tiene
  // estado válido "sin rol", y así no arranca vacía.
  const roleId = selectedRoleId ?? roles[0]?.id ?? null

  const { data: menus = [], isPending: menusPending } = useMenusQuery()
  const { data: assignedIds = [], isPending: assignedPending } = useRoleMenusQuery(roleId)

  const tree = useMemo(() => buildMenuTree(menus), [menus])

  const createRole = useCreateRole({
    mutationConfig: {
      onSuccess: (role) => {
        setNewRoleName("")
        // El rol nuevo queda seleccionado: se crea para configurarle los menús.
        setSelectedRoleId(role.id)
        notify("El rol se creó correctamente.")
      },
    },
  })

  function handleCreateRole() {
    if (newRoleName.trim().length === 0) return
    createRole.mutate({ name: newRoleName })
  }

  const updateRoleMenus = useUpdateRoleMenus({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Los menús del rol se actualizaron correctamente.")
      },
    },
  })

  function save(nextIds: number[]) {
    if (roleId == null) return
    updateRoleMenus.mutate({ roleId, menuIds: nextIds })
  }

  function handleAssign(ids: number[]) {
    save([...new Set([...assignedIds, ...ids])])
  }

  function handleUnassign(ids: number[]) {
    save(assignedIds.filter((id) => !ids.includes(id)))
  }

  const isLoading = rolesPending || menusPending || assignedPending

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Configuración de roles y menús</TableScreenTitle>
        {/* Esta pantalla no tiene barra de herramientas —no hay buscador ni
            acciones sobre una tabla—, así que los avisos van sueltos bajo el
            título en vez de colgar del `TableScreenToolbar`. */}
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-6">
          <Field variant="outlined" className="max-w-md">
            <FieldLabel htmlFor="role">Rol</FieldLabel>
            <Select
              value={roleId != null ? String(roleId) : ""}
              onValueChange={(value) => value && setSelectedRoleId(Number(value))}
            >
              <SelectTrigger id="role">
                <SelectValue>
                  {(value) =>
                    roles.find((role) => String(role.id) === value)?.name ?? "Seleccionar"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {/* Alta rápida al pie de la lista: crear un rol es parte de esta
                    pantalla y no amerita salir a otro formulario. Los eventos se
                    frenan acá para que el select no los tome como navegación por
                    teclado ni cierre el desplegable al escribir. */}
                <div
                  className="flex items-center gap-2 border-t border-border p-2"
                  onKeyDown={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <Input
                    aria-label="Nombre del nuevo rol"
                    placeholder="Agregar"
                    className="h-9"
                    value={newRoleName}
                    onChange={(event) => setNewRoleName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        handleCreateRole()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    disabled={newRoleName.trim().length === 0 || createRole.isPending}
                    onClick={handleCreateRole}
                  >
                    <span className="sr-only">Crear rol</span>
                    <ControlPointIcon />
                  </Button>
                </div>
              </SelectContent>
            </Select>
          </Field>

          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          ) : (
            <MenuTransfer
              tree={tree}
              assignedIds={assignedIds}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              disabled={updateRoleMenus.isPending}
            />
          )}
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
