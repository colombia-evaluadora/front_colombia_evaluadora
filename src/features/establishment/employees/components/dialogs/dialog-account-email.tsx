import { useState, type ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CheckIcon, KeyIcon, PaperPlaneTiltIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useResendActivation } from "@/features/establishment/employees/api/mutations/use-resend-activation"
import { useSendPasswordReset } from "@/features/establishment/employees/api/mutations/use-send-password-reset"
import type { EmployeeListItem } from "@/features/establishment/employees/api/types/employee"
import {
  useEmployeeAccount,
  type EmployeeAccountInfo,
} from "@/features/establishment/employees/components/table/account-context"

interface ConfirmEmailActionProps {
  icon: ReactNode
  label: string
  /** Si viene, el botón queda deshabilitado y el tooltip explica por qué. */
  disabledReason?: string
  title: string
  description: ReactNode
  isPending: boolean
  onConfirm: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Botón de ícono con tooltip + confirmación. No se usa `ConfirmRemoveButton`
 * porque está atado al ícono de papelera y al color destructivo; acá la
 * acción es inocua (manda un correo) y el botón necesita tooltip incluso
 * deshabilitado.
 */
function ConfirmEmailAction({
  icon,
  label,
  disabledReason,
  title,
  description,
  isPending,
  onConfirm,
  open,
  onOpenChange,
}: ConfirmEmailActionProps) {
  const disabled = Boolean(disabledReason)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // No se cierra mientras el envío está en curso.
        if (!isPending) onOpenChange(next)
      }}
    >
      <Tooltip>
        {/* Un <button disabled> no dispara eventos de puntero y el tooltip no
            se vería: el span recibe el hover y el botón va adentro. */}
        <TooltipTrigger render={<span className="inline-flex" />}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                aria-label={label}
                disabled={disabled}
              />
            }
          >
            {icon}
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{disabledReason ?? label}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="primary"
            disabled={isPending}
            aria-busy={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Enviar
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={isPending}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function noEmailReason(isLoading: boolean) {
  return isLoading ? "Cargando el correo del funcionario…" : "El funcionario no tiene correo registrado"
}

export function SendPasswordResetDialog({ employee }: { employee: EmployeeListItem }) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()
  const { email, isEmailLoading } = useEmployeeAccount(employee.id)

  const mutation = useSendPasswordReset({
    mutationConfig: {
      onSuccess: (_data, correo) => {
        setOpen(false)
        notify(`Se envió el correo para restablecer la contraseña a ${correo}.`)
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <ConfirmEmailAction
      icon={<KeyIcon />}
      label="Enviar correo para restablecer contraseña"
      disabledReason={email ? undefined : noEmailReason(isEmailLoading)}
      title="Restablecer contraseña"
      description={
        <>
          Se enviará a <strong>{email}</strong> un correo con el enlace para que {employee.name}{" "}
          restablezca su contraseña.
        </>
      }
      isPending={mutation.isPending}
      onConfirm={() => {
        if (email) mutation.mutate(email)
      }}
      open={open}
      onOpenChange={setOpen}
    />
  )
}

function resendDisabledReason(info: EmployeeAccountInfo): string | undefined {
  if (!info.email) return noEmailReason(info.isEmailLoading)
  if (info.isStatusError) return "No se pudo consultar el estado de la cuenta"
  if (info.isStatusLoading || !info.status) return "Consultando el estado de la cuenta…"
  switch (info.status) {
    case "PENDING_ACTIVATION":
      return undefined
    case "ACTIVE":
      return "La cuenta ya está activa; usa restablecer contraseña"
    case "INACTIVE":
      return "La cuenta está inactiva"
    case "NOT_FOUND":
      return "El funcionario no tiene una cuenta de usuario"
  }
}

export function ResendActivationDialog({ employee }: { employee: EmployeeListItem }) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()
  const info = useEmployeeAccount(employee.id)

  const mutation = useResendActivation({
    mutationConfig: {
      onSuccess: (_data, correo) => {
        setOpen(false)
        notify(`Se envió el correo de activación a ${correo}.`)
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <ConfirmEmailAction
      icon={<PaperPlaneTiltIcon />}
      label="Reenviar correo de activación"
      disabledReason={resendDisabledReason(info)}
      title="Reenviar activación"
      description={
        <>
          Se reenviará a <strong>{info.email}</strong> el correo para que {employee.name} active su
          cuenta.
        </>
      }
      isPending={mutation.isPending}
      onConfirm={() => {
        if (info.email) mutation.mutate(info.email)
      }}
      open={open}
      onOpenChange={setOpen}
    />
  )
}
