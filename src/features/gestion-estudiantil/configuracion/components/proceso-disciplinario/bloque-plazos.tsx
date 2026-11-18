import type { ReactNode } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { usePlazosDisciplinarioQuery } from "@/features/gestion-estudiantil/configuracion/api/query/use-proceso-query"
import type { PlazosDisciplinario } from "@/features/gestion-estudiantil/configuracion/api/types"
import { usePlazosForm } from "@/features/gestion-estudiantil/configuracion/hooks/use-plazos-form"
import { CampoNumerico, REJILLA_CAMPOS } from "@/features/gestion-estudiantil/configuracion/components/campo-numerico"

interface Props {
  establecimiento: number | null
  puedeEditar: boolean
}

function Marco({ accion, children }: { accion?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4" aria-labelledby="plazos-titulo">
      <div className="flex items-center justify-between gap-2">
        <h2 id="plazos-titulo" className="text-sm font-semibold">
          Plazos del proceso
        </h2>
        {accion}
      </div>
      {children}
    </section>
  )
}

function FormPlazos({ plazos, establecimiento, puedeEditar }: { plazos: PlazosDisciplinario; establecimiento: number; puedeEditar: boolean }) {
  const f = usePlazosForm({ plazos, establecimiento })
  return (
    <Marco
      accion={
        <Button size="sm" type="button" variant="outline" color="neutral" disabled={!puedeEditar || f.pendiente} onClick={f.guardar}>
          <IconoCarga cargando={f.pendiente}>
            <FloppyDiskIcon data-icon="inline-start" />
          </IconoCarga>
          Guardar plazos
        </Button>
      }
    >
      <ErrorNoticeBanner error={f.error} />
      <div className={REJILLA_CAMPOS}>
        <CampoNumerico
          id="plazos-descargos"
          label="Días hábiles para presentar descargos"
          inputMode="numeric"
          disabled={!puedeEditar}
          value={f.valores.descargos}
          error={f.errores.descargos}
          ayuda="Entre 1 y 15. Predeterminado: 3."
          onChange={(x) => f.cambiar("descargos", x)}
        />
        <CampoNumerico
          id="plazos-recursos"
          label="Días hábiles para interponer recursos"
          inputMode="numeric"
          disabled={!puedeEditar}
          value={f.valores.recursos}
          error={f.errores.recursos}
          ayuda="Entre 1 y 15. Predeterminado: 5."
          onChange={(x) => f.cambiar("recursos", x)}
        />
      </div>
      <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
    </Marco>
  )
}

/** Plazos del proceso (G.10.PRD): días hábiles de descargos y de recursos, con su propio «Guardar plazos». */
export function BloquePlazos({ establecimiento, puedeEditar }: Props) {
  const { data, error } = usePlazosDisciplinarioQuery(establecimiento)
  if (establecimiento == null || !data) {
    return <Marco>{error ? <ErrorNoticeBanner error={error} /> : <Skeleton className="h-16 w-full" />}</Marco>
  }
  return (
    <FormPlazos
      key={`${data.dias_descargos}-${data.dias_recursos}`}
      plazos={data}
      establecimiento={establecimiento}
      puedeEditar={puedeEditar}
    />
  )
}
