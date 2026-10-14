import { useEffect, useMemo, useState } from "react"

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
import { useUpdateRoleMenus } from "@/features/administration/roles-menus/api/mutations/update-role-menus"
import { useMenusQuery } from "@/features/administration/roles-menus/api/query/use-menus-query"
import { useRoleMenusQuery } from "@/features/administration/roles-menus/api/query/use-role-menus-query"
import { useRolesQuery } from "@/features/administration/roles-menus/api/query/use-roles-query"
import {
  buildMenuTree,
  partitionKnownMenus,
  withRequiredParents,
} from "@/features/administration/roles-menus/api/types/role-menu"
import type { RoleViews } from "@/features/administration/roles-menus/api/types/role-views"
import { MenuTransfer } from "@/features/administration/roles-menus/components/menu-transfer"
import { RoleViewsEditor } from "@/features/administration/roles-menus/components/role-views-editor"


/**
 * El `NoticeProvider` va acá y no adentro del contenido: `useNotify` lee el
 * contexto de sus ancestros, así que montarlo en el mismo componente que lo
 * consume lo dejaría leyendo el fallback (que manda un toast suelto en vez del
 * aviso de la barra de herramientas).
 */
export function RolesMenusPage() {
  return (
    <NoticeProvider>
      <RolesMenusPageContent />
    </NoticeProvider>
  )
}

function RolesMenusPageContent() {
  const { notify } = useNotify()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [newRoleName, setNewRoleName] = useState("")

  const { data: roles = [], isPending: rolesPending } = useRolesQuery()
  // Sin selección explícita se edita el primer rol: la pantalla no tiene
  // estado válido "sin rol", y así no arranca vacía.
  const roleId = selectedRoleId ?? roles[0]?.id ?? null

  const { data: menus = [], isPending: menusPending } = useMenusQuery()
  const { data: roleMenus = [], isPending: assignedPending } = useRoleMenusQuery(roleId)
  const assignedIds = useMemo(() => roleMenus.map((menu) => menu.id), [roleMenus])

  const tree = useMemo(() => buildMenuTree(menus), [menus])

  const savedViews: RoleViews = useMemo(
    () =>
      new Map(
        roleMenus.map((menu) => [
          menu.id,
          { acceso: true, guardar: menu.guardar, eliminar: menu.eliminar },
        ]),
      ),
    [roleMenus],
  )
  // Con cambios sin guardar en "Vistas base por rol" no se cambia de rol: se
  // perderían sin aviso.
  const [viewsDirty, setViewsDirty] = useState(false)

  const [readOnlyIds, setReadOnlyIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setReadOnlyIds(new Set(roleMenus.filter((menu) => menu.soloLectura).map((menu) => menu.id)))
  }, [roleMenus])

  const createRole = useCreateRole({
    mutationConfig: {
      onSuccess: (role) => {
        setNewRoleName("")
        // El rol nuevo queda seleccionado: se crea para configurarle los menús.
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

  const updateRoleMenus = useUpdateRoleMenus({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Los menús del rol se actualizaron correctamente.")
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  function save(nextIds: number[], nextReadOnly: Set<number> = readOnlyIds) {
    if (roleId == null) return
    // Sin catálogo no hay con qué resolver la jerarquía, y todo id parecería
    // huérfano: guardar acá vaciaría el rol. No debería pasar (la pantalla no
    // monta el transfer mientras carga), pero el costo de equivocarse es alto.
    if (tree.length === 0) return

    // Los fantasmas —asignados cuyo padre fue dado de baja, así que el catálogo
    // ya no los ubica— viajaban en cada guardado y el backend rechazaba la
    // operación entera por la invariante de jerarquía. No se pueden ver ni
    // quitar desde la pantalla, así que se descartan acá y se avisa: es la
    // única forma de que el rol vuelva a ser editable.
    const { known, unknown } = partitionKnownMenus(nextIds, tree)
    if (unknown.length > 0) {
      notify(
        // Antes decía "cuyo menú padre ya no existe", y eso mandaba a buscar el
        // problema donde no estaba: el padre normalmente SÍ existe, solo que
        // dado de baja (`active = false`), así que el catálogo no lo devuelve.
        // El único hecho que esta pantalla puede afirmar es que no supo dónde
        // ubicarlos; el porqué se decide en la base.
        `Se descartaron ${unknown.length} menú(s) asignados que el catálogo ya no ubica (${unknown.join(", ")}): su menú padre está dado de baja o quedó fuera del árbol.`,
        { variant: "info" },
      )
    }

    // El backend rechaza la lista entera si trae un submenú sin su padre, y la
    // lista puede venir así desde la base. Se completa acá, en el único punto
    // por el que pasan asignar, quitar y reordenar.
    const finalIds = withRequiredParents(known, tree)
    updateRoleMenus.mutate({
      roleId,
      menus: finalIds.map((id) => ({ id, soloLectura: nextReadOnly.has(id) })),
    })
  }

  function handleAssign(ids: number[]) {
    save([...new Set([...assignedIds, ...ids])])
  }

  function handleUnassign(ids: number[]) {
    const nextReadOnly = new Set(readOnlyIds)
    ids.forEach((id) => nextReadOnly.delete(id))
    setReadOnlyIds(nextReadOnly)
    save(
      assignedIds.filter((id) => !ids.includes(id)),
      nextReadOnly,
    )
  }

  function handleToggleReadOnly(id: number, checked: boolean) {
    const nextReadOnly = new Set(readOnlyIds)
    if (checked) nextReadOnly.add(id)
    else nextReadOnly.delete(id)
    setReadOnlyIds(nextReadOnly)
    save(assignedIds, nextReadOnly)
  }

  const isLoading = rolesPending || menusPending || assignedPending

  const roleName = roles.find((role) => role.id === roleId)?.name ?? ""

  // El rol va dentro de cada pestaña, como en el prototipo: de él depende todo
  // lo de abajo. Con cambios sin guardar queda bloqueado.
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
          {/* Alta rápida al pie de la lista. Los eventos se frenan acá para que
              el select no los tome como navegación ni se cierre al escribir. */}
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
          <NoticeOutlet />
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            // Pestañas de la Sección 4 (4.1 y 4.2). "Módulos y submódulos"
            // todavía asigna menús al rol con el transfer de antes: el catálogo
            // solo (sin rol) queda para cuando el SSO exponga las acciones
            // disponibles de cada vista.
            <Tabs defaultValue="vistas-base">
              <TabsList variant="line">
                <TabsTrigger value="modulos" disabled={viewsDirty}>
                  Módulos y submódulos
                </TabsTrigger>
                <TabsTrigger value="vistas-base">Vistas base por rol</TabsTrigger>
              </TabsList>
              <TabsContent value="modulos" className="flex flex-col gap-4 pt-4">
                <div className="w-full max-w-xs">{roleSelect}</div>
                <MenuTransfer
                  tree={tree}
                  assignedIds={assignedIds}
                  onAssign={handleAssign}
                  onUnassign={handleUnassign}
                  readOnlyIds={readOnlyIds}
                  onToggleReadOnly={handleToggleReadOnly}
                  disabled={updateRoleMenus.isPending}
                />
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
