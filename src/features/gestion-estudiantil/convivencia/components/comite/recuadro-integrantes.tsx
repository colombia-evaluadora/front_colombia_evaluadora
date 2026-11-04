import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ArrowsLeftRightIcon, PencilIcon } from "@/components/ui/icons"

import type { ComiteDetalle, IntegranteComite } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { AvisoCargosVacios } from "@/features/gestion-estudiantil/convivencia/components/comite/aviso-cargos-vacios"
import { DialogReemplazarIntegrante } from "@/features/gestion-estudiantil/convivencia/components/comite/dialog-reemplazar-integrante"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { dia } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface Props {
  comite: ComiteDetalle
  puedeGestionar: boolean
  onAdministrar: () => void
}

/** «Integrantes del Comité» en el orden en que llegan: Cargo, Nombre, Desde y Reemplazar (G.2.COM.SES.1). */
export function RecuadroIntegrantes({ comite, puedeGestionar, onAdministrar }: Props) {
  const [reemplazando, setReemplazando] = useState<IntegranteComite | null>(null)
  const vigentes = comite.integrantes.filter((i) => i.vigente)
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <SeccionPlegable
          titulo={`Integrantes del Comité (${vigentes.length})`}
          accion={
            puedeGestionar && (
              <Button type="button" size="sm" variant="outline" onClick={onAdministrar}>
                <PencilIcon data-icon="inline-start" />
                Administrar integrantes
              </Button>
            )
          }
        >
          {vigentes.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No hay integrantes vigentes.</p>
          ) : (
            <ul className="divide-y divide-border">
              {vigentes.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-48 shrink-0 font-medium">{i.cargo_nombre}</span>
                  <span className="min-w-0 flex-1 truncate">{i.nombre}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">Desde {formatFecha(dia(i.desde))}</span>
                  {puedeGestionar && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      color="neutral"
                      aria-label={`Reemplazar ${i.cargo_nombre}`}
                      onClick={() => setReemplazando(i)}
                    >
                      <ArrowsLeftRightIcon data-icon="inline-start" />
                      Reemplazar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SeccionPlegable>
      </div>
      <AvisoCargosVacios cargos={comite.cargos_vacios} accion={puedeGestionar ? "Agréguelos en Administrar integrantes." : undefined} />
      <DialogReemplazarIntegrante integrante={reemplazando} periodo={comite.fk_periodo} onClose={() => setReemplazando(null)} />
    </div>
  )
}
