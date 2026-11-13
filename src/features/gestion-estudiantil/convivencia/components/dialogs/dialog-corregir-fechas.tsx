import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarBlankIcon, InfoIcon, WarningIcon } from "@/components/ui/icons"

import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import { DialogCasoShell } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-caso-shell"
import { SeccionFechas } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-fechas"
import { useCorregirFechas } from "@/features/gestion-estudiantil/convivencia/hooks/use-corregir-fechas"

interface Props {
  caso: CasoResumen
  onClose: () => void
}

/** Corregir fechas (G.2.CAS.GES.3, Sección 3.1): lo aclarado, con motivo y el valor anterior en la bitácora. */
export function DialogCorregirFechas({ caso, onClose }: Props) {
  const s = useCorregirFechas(caso.id, onClose)
  return (
    <DialogCasoShell
      caso={caso}
      titulo="Corregir fechas"
      className="sm:max-w-3xl"
      onClose={onClose}
      error={s.errorMutacion}
      pending={s.guardando}
      confirmar={{
        label: "Guardar corrección",
        icon: <CalendarBlankIcon data-icon="inline-start" />,
        disabled: !s.puedeGuardar,
        onClick: s.guardar,
      }}
    >
      {s.incompleto ? (
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            El Lugar o la Manifestación de este caso faltan o ya no están vigentes. Actualícelos con Modificar antes de corregir las fechas.
          </AlertDescription>
        </Alert>
      ) : (
        !s.cargando && <SeccionFechas form={s} />
      )}
      {s.pasaADesconocida && (
        <Alert variant="warning">
          <WarningIcon aria-hidden="true" />
          <AlertDescription>
            <label className="flex items-center gap-2">
              <Checkbox checked={s.confirmado} onCheckedChange={(v) => s.setConfirmado(v === true)} />
              Confirmo que la fecha registrada pasa a desconocida. El valor anterior queda en la bitácora.
            </label>
          </AlertDescription>
        </Alert>
      )}
    </DialogCasoShell>
  )
}
