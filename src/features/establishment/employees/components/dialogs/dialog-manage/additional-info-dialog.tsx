import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon, XIcon } from "@/components/ui/icons"
import { NoticeOutlet } from "@/components/notice/notice-context"
import {
  EmployeeAdditionalInfoForm,
  type EmployeeAdditionalInfoValue,
} from "@/features/establishment/employees/components/forms/form-employee-additional-info"

interface AdditionalInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: EmployeeAdditionalInfoValue
  onChange: (value: EmployeeAdditionalInfoValue) => void
  hasChanges: boolean
  onSave: () => Promise<void>
  isSaving: boolean
}

export function AdditionalInfoDialog({
  open,
  onOpenChange,
  value,
  onChange,
  hasChanges,
  onSave,
  isSaving,
}: AdditionalInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] flex-col overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Información complementaria</DialogTitle>
        </DialogHeader>

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6">
          <NoticeOutlet className="mb-2" />

          <EmployeeAdditionalInfoForm
            value={value}
            onChange={onChange}
          />
        </div>

        <DialogFooter className="shrink-0 justify-end px-6 pb-6 sm:justify-end">
          {hasChanges && (
            <Button
              variant="fill"
              color="primary"
              size="sm"
              onClick={() => void onSave()}
              disabled={isSaving}
            >
              <CheckIcon data-icon="inline-start" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          )}
          <Button
            variant="fill"
            color="neutral"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
