import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClipboardTextIcon } from "@/components/ui/icons"

interface Props {
  estudianteNombre: string
  onAhoraNo: () => void
  onCrearPlan: () => void
}

/** Tras guardar la valoración de un estudiante sin plan abierto (G.8.TAB.5): ofrece crear el plan. */
export function DialogOfrecerPlan({ estudianteNombre, onAhoraNo, onCrearPlan }: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onAhoraNo()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Valoración guardada</DialogTitle>
          <DialogDescription render={<div />}>
            <p>{estudianteNombre} no tiene un plan de acompañamiento abierto.</p>
            <p>¿Desea crearle un plan a partir de esta valoración?</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Ahora no</DialogClose>
          <Button size="sm" type="button" onClick={onCrearPlan}>
            <ClipboardTextIcon data-icon="inline-start" />
            Crear plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
