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
import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"

interface ConfirmRemoveButtonProps {
  description: ReactNode
  label: string
  title?: string
  onConfirm: () => void | boolean | Promise<void | boolean>
  disabled?: boolean
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}


export function ConfirmRemoveButton({
  description,
  label,
  title = "Eliminar",
  onConfirm,
  disabled,
  size = "icon-sm",
  className,
}: ConfirmRemoveButtonProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      const result = await onConfirm()
      if (result !== false) setOpen(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size={size}
            disabled={disabled}
            className={className}
          />
        }
      >
        <span className="sr-only">{label}</span>
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            onClick={handleConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={pending}>
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
