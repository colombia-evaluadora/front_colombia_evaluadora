import { useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { useUpdateRoleMenus } from "../api/mutations/update-role-menus"
import { useMenusQuery } from "../api/query/use-menus-query"
import { useRoleMenusQuery } from "../api/query/use-role-menus-query"
import { useRolesQuery } from "../api/query/use-roles-query"
import { buildMenuTree } from "../api/types/role-menu"
import { MenuTransfer } from "../components/menu-transfer"

export function RolesMenusPage() {
  const { notify } = useNotify()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)

  const { data: roles = [], isPending: rolesPending } = useRolesQuery()
  // Sin selección explícita se edita el primer rol: la pantalla no tiene
  // estado válido "sin rol", y así no arranca vacía.
  const roleId = selectedRoleId ?? roles[0]?.id ?? null

  const { data: menus = [], isPending: menusPending } = useMenusQuery()
  const { data: assignedIds = [], isPending: assignedPending } = useRoleMenusQuery(roleId)

  const tree = useMemo(() => buildMenuTree(menus), [menus])

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
    <Card>
      <CardHeader>
        <CardTitle>Configuración de roles y menús</CardTitle>
        <CardDescription>
          Administra los roles del sistema y los menús a los que tiene acceso cada rol.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Field variant="outlined" className="max-w-md">
          <FieldLabel htmlFor="role">Rol</FieldLabel>
          <Select
            value={roleId != null ? String(roleId) : ""}
            onValueChange={(value) => value && setSelectedRoleId(Number(value))}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Seleccionar">
                {(value) => roles.find((role) => String(role.id) === value)?.name ?? "Seleccionar"}
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
      </CardContent>
    </Card>
  )
}
