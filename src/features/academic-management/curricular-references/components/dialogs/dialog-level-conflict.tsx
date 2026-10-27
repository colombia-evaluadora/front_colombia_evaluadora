import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CheckIcon, EyeIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type { LevelConflict } from "@/features/academic-management/curricular-references/utils/level-conflict"

interface LevelConflictDialogProps {
  conflict: LevelConflict | null
  isPending?: boolean
  /** Sin esta opción (toggle de la fila) solo se ofrece abrir el otro referente. */
  onSaveInactive?: () => void
  onCancel: () => void
}

// Regla 7: un solo referente activo por nivel educativo.
export function LevelConflictDialog({
  conflict,
  isPending = false,
  onSaveInactive,
  onCancel,
}: LevelConflictDialogProps) {
  function openConflicting() {
    if (conflict?.referenceId == null) return
    // En otra pestaña: así el formulario abierto conserva lo que se lleva escrito.
    window.open(paths.app.gestionAcademicaReferentesCurricularesDetalle.getHref(conflict.referenceId), "_blank", "noopener")
    onCancel()
  }

  return (
    <AlertDialog open={conflict != null} onOpenChange={(next) => !next && !isPending && onCancel()}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Nivel educativo en conflicto</AlertDialogTitle>
          <AlertDialogDescription render={<div />} className="flex flex-col gap-3 text-left">
            <p>
              El nivel educativo <span className="font-bold text-foreground">{conflict?.levelName}</span> ya lo
              gobierna el referente activo{" "}
              <span className="font-bold text-foreground">{conflict?.referenceName}</span>. Solo puede haber un
              referente activo por nivel.
            </p>
            <p>
              {onSaveInactive
                ? "Puedes guardar este referente como Inactivo o abrir el referente en conflicto en otra pestaña para inactivarlo primero. Tus cambios aquí se conservan."
                : "Abre el referente en conflicto en otra pestaña para inactivarlo primero."}
            </p>
            {conflict?.referenceId == null ? (
              <p>No fue posible ubicar el referente en conflicto; búscalo en el listado.</p>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-wrap">
          {onSaveInactive ? (
            <Button size="sm" variant="fill" color="primary" disabled={isPending} onClick={onSaveInactive}>
              {isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar como Inactivo
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="fill"
            color={onSaveInactive ? "neutral" : "primary"}
            disabled={isPending || conflict?.referenceId == null}
            onClick={openConflicting}
          >
            <EyeIcon data-icon="inline-start" />
            Abrir referente en conflicto
          </Button>
          <Button size="sm" variant="fill" color="neutral" disabled={isPending} onClick={onCancel}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
