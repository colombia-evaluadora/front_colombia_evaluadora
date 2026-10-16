import { useMemo, useState } from "react"

import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getErrorMessage } from "@/lib/api-client"

import { useCreateRole } from "@/features/administration/roles-menus/api/mutations/create-role"
import { useMenusQuery } from "@/features/administration/roles-menus/api/query/use-menus-query"
import { useRoleMenusQuery } from "@/features/administration/roles-menus/api/query/use-role-menus-query"
import { useRolesQuery } from "@/features/administration/roles-menus/api/query/use-roles-query"
import {
  buildMenuTree,
  partitionKnownMenus,
} from "@/features/administration/roles-menus/api/types/role-menu"
import type { RoleViews } from "@/features/administration/roles-menus/api/types/role-views"
import { MenuCatalog } from "@/features/administration/roles-menus/components/menu-catalog"
import { RoleViewsEditor } from "@/features/administration/roles-menus/components/role-views-editor"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"


/** El provider va acá: `useNotify` lee el contexto de sus ancestros, no del mismo componente. */
export function RolesMenusPage() {
  return (
    <NoticeProvider>
      <RolesMenusPageContent />
    </NoticeProvider>
  )
}

function RolesMenusPageContent() {
  const { notify } = useNotify()
  const { puedeCrear } = useMenuPermission("CONFIG_ROLES_MENUS")
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [newRoleName, setNewRoleName] = useState("")

  const { data: roles = [], isPending: rolesPending } = useRolesQuery()
  // Sin selección se edita el primer rol: no hay estado válido "sin rol".
  const roleId = selectedRoleId ?? roles[0]?.id ?? null

  const { data: menus = [], isPending: menusPending } = useMenusQuery()
  const { data: roleMenus = [], isPending: assignedPending } = useRoleMenusQuery(roleId)

  const tree = useMemo(() => buildMenuTree(menus), [menus])

  // Asignados sin padre activo: el backend rechaza la lista entera si viajan.
  const savedViews: RoleViews = useMemo(() => {
    const { known } = partitionKnownMenus(
      roleMenus.map((menu) => menu.id),
      tree,
    )
    return new Map(
      roleMenus
        .filter((menu) => known.includes(menu.id))
        .map((menu) => [menu.id, { acceso: true, guardar: menu.guardar, eliminar: menu.eliminar }]),
    )
  }, [roleMenus, tree])
  // Con cambios sin guardar no se cambia de rol: se perderían sin aviso.
  const [viewsDirty, setViewsDirty] = useState(false)

  const createRole = useCreateRole({
    mutationConfig: {
      onSuccess: (role) => {
        setNewRoleName("")
        setSelectedRoleId(role.id)
        notify("El rol se creó correctamente.")
      },
      // El NoticeProvider apaga el toast global: el error va al aviso de la página.
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  function handleCreateRole() {
    if (newRoleName.trim().length === 0) return
    createRole.mutate({ name: newRoleName })
  }

  const isLoading = rolesPending || menusPending || assignedPending

  const roleName = roles.find((role) => role.id === roleId)?.name ?? ""

  // Con cambios sin guardar el rol queda bloqueado.
  const roleSelect = (
    <Field variant="outlined" className="w-full">
      <FieldLabel htmlFor="role">Rol*</FieldLabel>
      <Select
        disabled={viewsDirty}
        value={roleId != null ? String(roleId) : ""}
        onValueChange={(value) => value && setSelectedRoleId(Number(value))}
      >
        <SelectTrigger id="role" size="sm">
          <SelectValue>
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
          {/* Se frenan los eventos para que el select no los tome como navegación ni se cierre al escribir. */}
          {puedeCrear ? (
          <div
            className="flex items-center gap-2 border-t border-border p-2"
            onKeyDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Input
              aria-label="Nombre del nuevo rol"
              placeholder="Agregar"
              className="h-10"
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
          ) : null}
        </SelectContent>
      </Select>
    </Field>
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Vistas por rol</TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-4">
          <div className="sticky top-2 z-20 rounded-md bg-card shadow-md empty:hidden">
            <NoticeOutlet />
          </div>
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <Tabs defaultValue="vistas-base">
              <TabsList variant="line">
                <TabsTrigger value="modulos" disabled={viewsDirty}>
                  Módulos y submódulos
                </TabsTrigger>
                <TabsTrigger value="vistas-base">Vistas base por rol</TabsTrigger>
              </TabsList>
              <TabsContent value="modulos" className="pt-4">
                <MenuCatalog />
              </TabsContent>
              <TabsContent value="vistas-base" className="pt-4">
                {roleId != null ? (
                  <RoleViewsEditor
                    key={roleId}
                    roleId={roleId}
                    roleName={roleName}
                    tree={tree}
                    saved={savedViews}
                    roleSelect={roleSelect}
                    onDirtyChange={setViewsDirty}
                  />
                ) : null}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
