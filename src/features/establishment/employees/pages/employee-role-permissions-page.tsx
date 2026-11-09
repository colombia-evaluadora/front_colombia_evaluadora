import { useEffect, useState, type ReactNode } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { FloppyDiskIcon, InfoIcon, LockIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { employeeRolePermissionsRoute } from "@/router"

import { useGuardarPermisosRol } from "@/features/establishment/employees/api/mutations/roles-funcionario"
import { useFuncionarioFichaQuery } from "@/features/establishment/employees/api/query/use-funcionario-ficha"
import { usePermisosRolQuery, useRolesFuncionarioQuery } from "@/features/establishment/employees/api/query/use-roles-funcionario"
import type { PermisoVista } from "@/features/establishment/employees/api/types/rol-asignado"
import { useEstablecimientoFuncionarios } from "@/features/establishment/employees/hooks/use-establecimiento-funcionarios"
import {
  agruparPorModulo,
  cambiarPermiso,
  etiquetaPermiso,
  hayCambios,
  rolLoDa,
  toPermisosInput,
  type CampoPermiso,
  type EtiquetaPermiso,
} from "@/features/establishment/employees/utils/permisos-rol"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"

const CAMPOS: { campo: CampoPermiso; label: string }[] = [
  { campo: "access", label: "Acceso" },
  { campo: "save", label: "Guardar" },
  { campo: "delete", label: "Eliminar" },
]

const ETIQUETA_COLOR: Record<EtiquetaPermiso, "warning" | "info" | "muted"> = {
  Parcial: "warning",
  "Solo lectura": "info",
  "Sin acceso": "muted",
}

/**
 * Permisos de un rol asignado (Sección 4.2, Reglas 25 y 82): Acceso, Guardar y Eliminar por
 * módulo y submódulo. Solo se restringe lo que da el rol, y solo para este funcionario en este
 * rol, Sede y Jornada.
 */
export function EmployeeRolePermissionsPage() {
  const { employeeId, asignacionId } = employeeRolePermissionsRoute.useParams()
  const search = employeeRolePermissionsRoute.useSearch()
  const establecimiento = useEstablecimientoFuncionarios(search.establecimiento)
  const funcionarioId = Number(employeeId)
  const asignacion = Number(asignacionId)
  const navigate = useNavigate()
  const { notify } = useNotify()

  const ficha = useFuncionarioFichaQuery(funcionarioId, establecimiento.id)
  const roles = useRolesFuncionarioQuery(funcionarioId, establecimiento.id)
  const permisos = usePermisosRolQuery(funcionarioId, asignacion)
  const guardar = useGuardarPermisosRol()

  const [vistas, setVistas] = useState<PermisoVista[]>([])
  const [discardOpen, setDiscardOpen] = useState(false)
  const original = permisos.data
  useEffect(() => {
    if (original) setVistas(original)
  }, [original])

  const rol = roles.data?.find((r) => r.id === asignacion) ?? null
  const nombre = ficha.data ? [ficha.data.firstName, ficha.data.lastName].filter(Boolean).join(" ") : ""
  const rolesHref = paths.app.establishments.officialRoles.getHref(funcionarioId)
  const rolesSearch = { establecimiento: establecimiento.id ?? undefined }
  const cambios = original != null && hayCambios(original, vistas)

  function volver() {
    void navigate({ to: rolesHref, search: rolesSearch })
  }

  async function onGuardar() {
    try {
      await guardar.mutateAsync({ asignacionId: asignacion, permisos: toPermisosInput(vistas) })
      // El NoticeProvider es el del layout de Establecimiento: sigue montado al volver.
      notify(`Se guardaron los permisos del rol ${rol?.roleName ?? ""}.`)
      volver()
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  const titulo = [nombre, rol?.roleName, rol?.campusName, rol?.workScheduleName].filter(Boolean).join(" · ")
  const bloqueado = `Bloqueado: el rol ${rol?.roleName ?? ""} no tiene este permiso`

  let cuerpo: ReactNode
  if (permisos.isPending || roles.isPending) {
    cuerpo = (
      <p className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <SpinnerIcon className="animate-spin" /> Cargando permisos…
      </p>
    )
  } else if (permisos.isError) {
    cuerpo = <p className="py-12 text-sm text-red">{getErrorMessage(permisos.error)}</p>
  } else {
    cuerpo = (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-xl text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Módulo / submódulo</th>
              {CAMPOS.map((c) => (
                <th key={c.campo} className="w-28 px-4 py-2.5 text-center font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agruparPorModulo(vistas).map(({ modulo, submodulos }) => {
              const Icono = getNavIcon(modulo.icon)
              return [modulo, ...submodulos].map((vista) => {
                const esModulo = vista === modulo
                const padreSinAcceso = !esModulo && !modulo.access
                const etiqueta = etiquetaPermiso(vista, esModulo ? submodulos : [])
                return (
                  <tr key={vista.menuId} className={cn("border-t border-border", esModulo && "bg-muted/20")}>
                    <td className={cn("px-4 py-2.5", !esModulo && "pl-11")}>
                      <span className="flex flex-wrap items-center gap-2">
                        {esModulo ? <Icono className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
                        <span className={cn(esModulo && "font-medium")}>{vista.name}</span>
                        {etiqueta ? (
                          <Badge variant="soft" color={ETIQUETA_COLOR[etiqueta]}>
                            {etiqueta}
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    {CAMPOS.map(({ campo, label }) => (
                      <td key={campo} className="px-4 py-2.5 text-center">
                        {rolLoDa(vista, campo) ? (
                          <Switch
                            checked={vista[campo]}
                            disabled={guardar.isPending || (padreSinAcceso && !vista[campo])}
                            aria-label={`${label} en ${vista.name}`}
                            onCheckedChange={(valor) => setVistas((actual) => cambiarPermiso(actual, vista.menuId, campo, valor))}
                          />
                        ) : (
                          <Tooltip>
                            <TooltipTrigger
                              render={<span className="inline-flex items-center gap-1.5" tabIndex={0} aria-label={`${label}: ${bloqueado}`} />}
                            >
                              <Switch checked={false} disabled aria-hidden tabIndex={-1} />
                              <LockIcon className="size-3.5 text-muted-foreground" aria-hidden />
                            </TooltipTrigger>
                            <TooltipContent>{bloqueado}</TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                color="neutral"
                size="sm"
                disabled={guardar.isPending}
                onClick={() => (cambios ? setDiscardOpen(true) : volver())}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button
                type="button"
                color="primary"
                size="sm"
                disabled={!cambios || guardar.isPending || rol?.canRestrict === false}
                aria-busy={guardar.isPending}
                onClick={() => void onGuardar()}
              >
                {guardar.isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link to={rolesHref} search={rolesSearch} className="shrink-0 text-sm font-normal text-muted-foreground hover:text-foreground">
              Roles y permisos ›
            </Link>
            <span className="truncate">Permisos{titulo ? ` — ${titulo}` : ""}</span>
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-4">
          {cuerpo}
          <p className="flex items-start gap-2 rounded-lg border border-blue-stroke bg-blue-22 p-3 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
            <span>
              Solo se restringe: lo que el rol no tiene aparece inactivo y bloqueado. Desactivar un permiso en un módulo lo
              desactiva en todos sus submódulos. Los cambios aplican solo a este funcionario, en este rol, Sede y Jornada.
            </span>
          </p>
        </div>
      </TableScreenBody>

      <ConfirmDiscardDialog open={discardOpen} onOpenChange={setDiscardOpen} onConfirm={volver} />
    </TableScreen>
  )
}
