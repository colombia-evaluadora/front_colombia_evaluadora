import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, BankIcon, CheckIcon, InfoIcon, XIcon } from "@/components/ui/icons"
import { formatGrade } from "@/features/coverage/api/ui-mappings"

interface CambioSedeMatriculaDialogProps {
  open: boolean
  fromSede: string
  toSede: string
  fromGrade: number
  toGrade: number
  fromGroup: string
  toGroup: string
  /** Solo el diálogo "Modificar" en lote tiene un paso previo al que volver
   * — en la edición individual no hay wizard, así que se omite el botón. */
  onBack?: () => void
  onConfirm: () => void
  onClose: () => void
}

function ComparisonLine({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <li>
      <span className="font-medium">{label}:</span> {from} {from === to ? "=" : "→"}{" "}
      <strong>{to}</strong>
    </li>
  )
}

export function CambioSedeMatriculaDialog({
  open,
  fromSede,
  toSede,
  fromGrade,
  toGrade,
  fromGroup,
  toGroup,
  onBack,
  onConfirm,
  onClose,
}: CambioSedeMatriculaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BankIcon className="size-5 text-primary" />
            Cambio de sede
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-input bg-muted/30 p-4">
            <p className="mb-1 text-sm font-semibold text-foreground">
              Cambios a aplicar - Cambio de sede:
            </p>
            <ul className="flex list-disc flex-col gap-0 pl-5 text-sm text-foreground leading-tight">
              <ComparisonLine label="Sede" from={fromSede} to={toSede} />
              <ComparisonLine
                label="Grado"
                from={formatGrade(fromGrade)}
                to={formatGrade(toGrade)}
              />
              <ComparisonLine label="Grupo" from={fromGroup} to={toGroup} />
            </ul>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-blue-stroke bg-blue-22 px-4 py-3 text-sm text-foreground">
            <InfoIcon className="size-5 shrink-0 text-blue" />
            <p>
              Se registrará: <strong>Corrección de matrícula (Cambio de sede)</strong>
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          {onBack && (
            <Button type="button" variant="outline" color="primary" size="sm" onClick={onBack}>
              <ArrowLeftIcon data-icon="inline-start" />
              Anterior
            </Button>
          )}
          <Button type="button" color="primary" size="sm" onClick={onConfirm}>
            <CheckIcon data-icon="inline-start" />
            Confirmar cambio de sede
          </Button>
          <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
