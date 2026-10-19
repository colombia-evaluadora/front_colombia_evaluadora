import { useState } from "react"

import { CloudOffIcon, CloudSyncIcon, SignOutIcon, TrashIcon } from "@/components/ui/icons"
import { PrepareOfflineDialog } from "@/components/offline/prepare-offline-dialog"
import { Link, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { paths } from "@/config/paths"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useUser, useLogout } from "@/lib/auth"
import { logoutKeepsDeviceData } from "@/lib/offline/device-policy"
import { outboxStore } from "@/lib/offline/outbox/store"
import { getDeviceMode } from "@/lib/offline/query-persister"
import { LogoutDeviceDialog } from "@/features/offline/components/logout-device-dialog"
import { LogoutPendingDialog } from "@/features/offline/components/logout-pending-dialog"
import { WipeDeviceDataDialog } from "@/features/offline/components/wipe-device-data-dialog"

export function NavUser() {
  const navigate = useNavigate()
  const { data: user, isPending } = useUser()
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [logoutPendingOpen, setLogoutPendingOpen] = useState(false)
  // App instalada (D-12): cerrar sesión conserva y bloquea; borrar es aparte.
  const [logoutDeviceOpen, setLogoutDeviceOpen] = useState(false)
  const [wipeOpen, setWipeOpen] = useState(false)
  const personal = getDeviceMode() === "personal"
  const logoutMutation = useLogout({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Sesión cerrada.")
        navigate({ to: paths.auth.login.path })
      },
    },
  })

  if (isPending) {
    return <Skeleton className="size-10 rounded-full" />
  }

  if (!user) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label="Cuenta"
                    className="flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                }
              />
            }
          >
            <Avatar className="rounded-lg">
              <AvatarFallback className="rounded-lg">?</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>Cuenta</TooltipContent>
        </Tooltip>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Cuenta de usuario"
                  className="flex items-center gap-2 rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            />
          }
        >
          <Avatar className="size-10 rounded-full">
            <AvatarFallback className="rounded-full">{user.initials}</AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent>{user.name}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" side="bottom" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-10 rounded-full">
                <AvatarFallback className="rounded-full">{user.initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPrepareOpen(true)}>
            <CloudOffIcon data-icon="inline-start" />
            Preparar para usar sin conexión
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to={paths.app.sincronizar.getHref()} />}>
            <CloudSyncIcon data-icon="inline-start" />
            Sincronizar ahora
          </DropdownMenuItem>
          {personal && (
            <DropdownMenuItem variant="destructive" onClick={() => setWipeOpen(true)}>
              <TrashIcon data-icon="inline-start" />
              Borrar los datos de este equipo…
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={logoutMutation.isPending}
            onClick={() => {
              // App instalada: se conserva todo y se bloquea (D-12). En el
              // navegador, con cambios sin sincronizar se pregunta (§7.8).
              if (logoutKeepsDeviceData(getDeviceMode())) setLogoutDeviceOpen(true)
              else if (outboxStore.getSummary().total > 0) setLogoutPendingOpen(true)
              else logoutMutation.mutate(undefined)
            }}
          >
            <SignOutIcon data-icon="inline-start" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
      <PrepareOfflineDialog open={prepareOpen} onOpenChange={setPrepareOpen} />
      <LogoutPendingDialog
        open={logoutPendingOpen}
        onOpenChange={setLogoutPendingOpen}
        onLogout={() => {
          setLogoutPendingOpen(false)
          logoutMutation.mutate(undefined)
        }}
      />
      <LogoutDeviceDialog
        open={logoutDeviceOpen}
        onOpenChange={setLogoutDeviceOpen}
        onLogout={() => {
          setLogoutDeviceOpen(false)
          logoutMutation.mutate({ keepDeviceData: true })
        }}
        onWipe={() => {
          setLogoutDeviceOpen(false)
          setWipeOpen(true)
        }}
      />
      <WipeDeviceDataDialog
        open={wipeOpen}
        onOpenChange={setWipeOpen}
        onWiped={() => {
          setWipeOpen(false)
          logoutMutation.mutate({ keepDeviceData: false })
        }}
      />
    </DropdownMenu>
  )
}