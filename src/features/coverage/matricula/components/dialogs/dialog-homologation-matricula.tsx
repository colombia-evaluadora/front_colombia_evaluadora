import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckIcon, XIcon } from "@/components/ui/icons"

interface HomologationMatriculaDialogProps {
  /** «<estudiante> · <Grado> · <Grupo> · <IE> · <Jornada>». */
  resumen: string
  /** Establecimiento de donde viene el estudiante, según el snapshot del traslado. */
  institucionOrigen: string
  onChoice: (homologate: boolean) => void
}

/**
 * AGR.7: pregunta de homologación al guardar un traslado (Sección 4.5). La
 * matrícula ya quedó guardada; «No homologar por ahora» deja el snapshot para
 * después. Homologar exige la autorización de datos del origen (Ley 1581).
 */
export function HomologationMatriculaDialog({ resumen, institucionOrigen, onChoice }: HomologationMatriculaDialogProps) {
  const [autorizado, setAutorizado] = useState(false)
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Homologar las notas del traslado?</DialogTitle>
          <p className="text-sm font-medium">{resumen}</p>
          <DialogDescription>
            El estudiante tiene notas en <span className="font-semibold text-foreground">{institucionOrigen}</span>. Si
            no las homologa ahora, los períodos transcurridos quedan Pendientes por nivelación.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            id="homologacion-autorizacion-origen"
            checked={autorizado}
            onCheckedChange={(checked) => setAutorizado(checked === true)}
            className="mt-0.5"
          />
          <span>
            El acudiente autorizó el tratamiento de los datos del establecimiento de origen (Ley 1581 de 2012){" "}
            <span className="text-red">*</span>
          </span>
        </label>
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onChoice(false)}>
            <XIcon data-icon="inline-start" />
            No homologar por ahora
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={!autorizado}
            onClick={() => onChoice(true)}
          >
            <CheckIcon data-icon="inline-start" />
            Homologar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
