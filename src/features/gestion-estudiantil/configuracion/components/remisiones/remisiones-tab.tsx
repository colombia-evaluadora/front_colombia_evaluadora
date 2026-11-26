import type { ReactNode } from "react"

import { TableScreenBody } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Skeleton } from "@/components/ui/skeleton"

import type { AccesoConfiguracion } from "@/features/gestion-estudiantil/configuracion/api/types"
import { CampoNumerico, REJILLA_CAMPOS } from "@/features/gestion-estudiantil/configuracion/components/campo-numerico"
import { AccionesFormulario, EncabezadoConfiguracion } from "@/features/gestion-estudiantil/configuracion/components/encabezado-configuracion"
import { usePlazoRemisionesForm } from "@/features/gestion-estudiantil/configuracion/hooks/use-plazo-remisiones-form"
import { usePlazoRemisionesQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-remisiones-query"

interface Props {
  tabs: ReactNode
  establecimiento: number | null
  acceso: AccesoConfiguracion
}

function FormPlazo({ plazo, establecimiento, puedeEditar, tabs }: { plazo: number; establecimiento: number; puedeEditar: boolean; tabs: ReactNode }) {
  const f = usePlazoRemisionesForm({ plazo, establecimiento })

  return (
    <>
      <EncabezadoConfiguracion
        tabs={tabs}
        action={<AccionesFormulario guardando={f.pendiente} cambios={f.cambios} deshabilitado={!puedeEditar} onCancelar={f.cancelar} onGuardar={f.guardar} />}
      />
      <TableScreenBody>
        <div className="flex flex-col gap-2 pb-6">
          <ErrorNoticeBanner error={f.error} />
          <div className={REJILLA_CAMPOS}>
            <CampoNumerico
              id="remisiones-plazo"
              label="Plazo de seguimiento de remisiones (días hábiles)"
              inputMode="numeric"
              disabled={!puedeEditar}
              value={f.valor}
              error={f.errorCampo}
              ayuda="Número entero positivo. Predeterminado: 5. Rige solo para remisiones nuevas."
              // ⓘ del prototipo (G.10.PLA.1): qué hace el plazo (§10.4).
              ayudaTitulo="Propone la fecha esperada de respuesta de cada remisión nueva: la fecha de remisión más este plazo, de lunes a viernes. No recalcula las remisiones existentes."
              onChange={f.cambiar}
            />
          </div>
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

/** Seguimiento de remisiones (G.10.PLA.1, §10.4): plazo en días hábiles del establecimiento. */
export function RemisionesTab({ tabs, establecimiento, acceso }: Props) {
  const { data, isPending, error } = usePlazoRemisionesQuery(establecimiento)

  if (establecimiento == null || isPending || !data) {
    return (
      <>
        <EncabezadoConfiguracion tabs={tabs} />
        <TableScreenBody>
          {error ? <ErrorNoticeBanner error={error} /> : <Skeleton className="h-16 w-full max-w-md" />}
        </TableScreenBody>
      </>
    )
  }
  return (
    <FormPlazo
      key={data.plazo_seguimiento_dias}
      plazo={data.plazo_seguimiento_dias}
      establecimiento={establecimiento}
      puedeEditar={acceso.puede_editar && data.puede_editar}
      tabs={tabs}
    />
  )
}
