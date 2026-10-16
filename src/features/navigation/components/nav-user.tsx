import { useState } from "react"

import { CloudOffIcon, CloudSyncIcon, SignOutIcon } from "@/components/ui/icons"
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
import { outboxStore } from "@/lib/offline/outbox/store"
import { LogoutPendingDialog } from "@/features/offline/components/logout-pending-dialog"

export function NavUser() {
  const navigate = useNavigate()
  const { data: user, isPending } = useUser()
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [logoutPendingOpen, setLogoutPendingOpen] = useState(false)
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
          <DropdownMenuItem
            disabled={logoutMutation.isPending}
            onClick={() => {
              // Con cambios sin sincronizar se pregunta antes (plan §7.8).
              if (outboxStore.getSummary().total > 0) setLogoutPendingOpen(true)
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
    </DropdownMenu>
  )
}