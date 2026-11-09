import { useCallback, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import type { LimitesSancion, OpcionSancion } from "@/features/gestion-estudiantil/convivencia/api/procesos-etapas-types"
import { FilaSancion } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/fila-sancion"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { sancionVacia, type Errores, type SancionFila } from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"

interface Props {
  filas: SancionFila[]
  onChange: (filas: SancionFila[]) => void
  catalogo: OpcionSancion[]
  limites: LimitesSancion | null | undefined
  errores: Errores
  /** Con error en una fila la sección se abre para que se vea el campo marcado. */
  intento: boolean
  /** Sanciones obligatorias (Sancionar o Modifica): marca el título con *. */
  obligatorio: boolean
}

/** «Sanciones (N)»: constructor repetible; cada una del catálogo de la instancia, con sus fechas si tiene duración. */
export function ConstructorSanciones({ filas, onChange, catalogo, limites, errores, intento, obligatorio }: Props) {
  const cambiar = useCallback(
    (key: string, patch: Partial<SancionFila>) => onChange(filas.map((f) => (f.key === key ? { ...f, ...patch } : f))),
    [filas, onChange],
  )
  const quitar = useCallback((key: string) => onChange(filas.filter((f) => f.key !== key)), [filas, onChange])
  const elegidas = useMemo(() => new Set(filas.map((f) => f.sancion).filter(Boolean)), [filas])
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <SeccionPlegable
        titulo={`Sanciones (${filas.length})${obligatorio ? "*" : ""}`}
        forzarAbierta={intento && Object.keys(errores).some((k) => k.startsWith("sancion"))}
        contentClassName="flex flex-col gap-3 p-4"
        accion={
          <Button type="button" size="sm" variant="outline" onClick={() => onChange([...filas, sancionVacia()])}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar sanción
          </Button>
        }
      >
        {filas.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay sanciones.</p>}
        {errores.sanciones && (
          <p role="alert" className="text-xs text-red">
            {errores.sanciones}
          </p>
        )}
        {filas.map((f, i) => (
          <FilaSancion
            key={f.key}
            fila={f}
            numero={i + 1}
            catalogo={catalogo}
            usadas={elegidas}
            limites={limites}
            errores={errores}
            onChange={cambiar}
            onQuitar={quitar}
          />
        ))}
      </SeccionPlegable>
    </div>
  )
}
