import { TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import type { EstrategiaDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/badge-estado-estrategia"
import { useDialogosEstrategias } from "@/features/gestion-estudiantil/prevencion/components/estrategias/dialogos/use-dialogos-estrategias"
import { BloqueBeneficiarios } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/bloque-beneficiarios"
import { CamposEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campos-estrategia"
import { useEstrategiaForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-estrategia-form"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

/**
 * Pantalla de Nueva estrategia y Modificar estrategia (G.8.EST.4): encabezado con Cancelar y Guardar, los campos y,
 * al modificar, el bloque Beneficiarios (aparece tras el primer guardado). Al modificar se monta con la estrategia ya cargada.
 */
export function PantallaEstrategia({ estrategia }: { estrategia?: EstrategiaDetalle }) {
  const f = useEstrategiaForm(estrategia)
  const { irEstrategia } = useNavegacionPrevencion()
  const dialogos = useDialogosEstrategias()
  // Una estrategia Finalizada no se modifica (el backend responde 400): se ve, pero no se guarda.
  const bloqueado = estrategia != null && !estrategia.puede_modificar

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={f.pending} onClick={f.volver}>
                Cancelar
              </Button>
              <Button size="sm" type="button" disabled={f.pending || bloqueado} onClick={f.guardar}>
                <IconoCarga cargando={f.pending}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
            {estrategia ? `Prevención › Estrategia · ${estrategia.nombre}` : "Prevención › Nueva estrategia"}
            {estrategia && <BadgeEstadoEstrategia estado={estrategia.estado} nombre={estrategia.estado_nombre} />}
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ErrorNoticeBanner error={f.errorBackend} />
          {bloqueado && (
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                {estrategia.estado === "FINALIZADA"
                  ? "Una estrategia Finalizada no se modifica."
                  : "No tiene permiso para modificar esta estrategia."}
              </AlertDescription>
            </Alert>
          )}
          <CamposEstrategia f={f} bloqueado={bloqueado} />
          {estrategia && (
            <BloqueBeneficiarios
              estrategia={estrategia}
              onAgregar={() => dialogos.abrir({ dialogo: "beneficiarios", estrategia })}
              onRetirar={(beneficiario) =>
                dialogos.abrir({
                  dialogo: "retirar",
                  estrategia: { id: estrategia.id, nombre: estrategia.nombre },
                  beneficiario,
                })
              }
              onVerTodos={() => irEstrategia(estrategia.id)}
            />
          )}
        </div>
      </TableScreenBody>
      {dialogos.dialogos}
    </>
  )
}
