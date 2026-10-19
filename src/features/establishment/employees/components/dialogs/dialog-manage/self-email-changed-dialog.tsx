import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SelfEmailChangedDialogProps {
  open: boolean
  onConfirm: () => Promise<void>
  isPending: boolean
}

// Aviso bloqueante: cerrarlo por cualquier vía también confirma.
export function SelfEmailChangedDialog({ open, onConfirm, isPending }: SelfEmailChangedDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void onConfirm()
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Correo electrónico actualizado</DialogTitle>
          <DialogDescription>
            El correo electrónico se actualizó correctamente. Por seguridad, se cerrará su sesión.
            Le llegará un correo de activación a su nuevo correo electrónico: active la cuenta
            desde ese enlace y defina su contraseña para volver a iniciar sesión.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            onClick={() => void onConfirm()}
            disabled={isPending}
          >
            {isPending ? "Cerrando sesión..." : "Entendido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
