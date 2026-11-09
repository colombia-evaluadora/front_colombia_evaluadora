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
import { PauseCircleIcon, SpinnerIcon, TrashIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useEliminarRol, useInactivarRol } from "@/features/establishment/employees/api/mutations/roles-funcionario"
import type { RolAsignado } from "@/features/establishment/employees/api/types/rol-asignado"
import { sedeJornada } from "@/features/establishment/employees/utils/rol-asignado"

interface DialogConfirmarRolProps {
  accion: "inactivar" | "eliminar"
  /** El rol abierto; `null` cierra el diálogo. */
  rol: RolAsignado | null
  employeeName: string
  onClose: () => void
}

/** Inactivar (Regla 24: suspende sin borrar) y Eliminar (con sus permisos, sin deshacer). */
export function DialogConfirmarRol({ accion, rol, employeeName, onClose }: DialogConfirmarRolProps) {
  const { notify } = useNotify()
  const inactivar = useInactivarRol()
  const eliminar = useEliminarRol()
  const mutation = accion === "inactivar" ? inactivar : eliminar
  const esInactivar = accion === "inactivar"

  function confirmar() {
    if (!rol) return
    mutation.mutate(
      { asignacionId: rol.id },
      {
        onSuccess: () => {
          notify(esInactivar ? `Se inactivó el rol ${rol.roleName}.` : `Se eliminó el rol ${rol.roleName}.`)
          onClose()
        },
        onError: (error) => {
          notify(getErrorMessage(error), { variant: "error" })
          onClose()
        },
      },
    )
  }

  return (
    <AlertDialog open={rol != null} onOpenChange={(open) => !open && !mutation.isPending && onClose()}>
      <AlertDialogContent>
        {rol ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-start gap-2">
                <WarningIcon className={esInactivar ? "mt-0.5 size-6 shrink-0 text-orange" : "mt-0.5 size-6 shrink-0 text-red"} aria-hidden />
                {esInactivar ? "Inactivar" : "Eliminar"} el rol {rol.roleName}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {esInactivar
                  ? `El rol ${rol.roleName} de ${employeeName} en ${sedeJornada(rol)} quedará Inactivo y dejará de dar acceso. Puede activarlo de nuevo desde Roles y permisos.`
                  : `Se eliminará el rol ${rol.roleName} de ${employeeName} en ${sedeJornada(rol)}, con sus permisos. Esta acción no se puede deshacer.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" color="neutral" disabled={mutation.isPending}>
                <XIcon data-icon="inline-start" />
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                color="destructive"
                disabled={mutation.isPending}
                aria-busy={mutation.isPending}
                onClick={(event) => {
                  event.preventDefault()
                  confirmar()
                }}
              >
                {mutation.isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : esInactivar ? (
                  <PauseCircleIcon data-icon="inline-start" />
                ) : (
                  <TrashIcon data-icon="inline-start" />
                )}
                {esInactivar ? "Inactivar" : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  )
}
