import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { evalCol } from "@/lib/eval-col-client"

export interface SugerenciaPiar {
  fk_tpiar_ajuste: number
  fk_tmatricula: number
  estudiante_nombre: string
  tipo_adaptacion: string
  especificacion: string | null
  descripcion: string
}

function useSugerenciasPiar(actividadId: number) {
  return useQuery({
    queryKey: ["planeador", "sugerencias-piar", actividadId],
    queryFn: () => evalCol.getRows<SugerenciaPiar>(`/planeador/actividades/${actividadId}/sugerencias-piar`),
    enabled: actividadId > 0,
    staleTime: 60_000,
  })
}

interface Props {
  actividadId: number
  yaAgregadas: number[]
  matriculasActividad: number[]
  disabled: boolean
  onAgregar: (sugerencias: SugerenciaPiar[]) => void
}

/**
 * Regla 29: agregar precarga la adaptación y conserva el vínculo al ajuste; guardar la actividad
 * registra planeación, no aplicación. La barrera y los apoyos se quedan en el PIAR.
 */
export function SugerenciasPiar({ actividadId, yaAgregadas, matriculasActividad, disabled, onAgregar }: Props) {
  const { data } = useSugerenciasPiar(actividadId)
  const pendientes = (data ?? []).filter((s) => !yaAgregadas.includes(s.fk_tpiar_ajuste) && matriculasActividad.includes(s.fk_tmatricula))
  if (!pendientes.length) return null
  return (
    <section className="mt-3 grid gap-2 rounded-md border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          Sugerencias del PIAR
          <Badge variant="soft" color="info">{pendientes.length}</Badge>
        </span>
        <Button size="xs" variant="outline" color="muted" type="button" disabled={disabled} onClick={() => onAgregar(pendientes)}>
          Agregar todas
        </Button>
      </div>
      {pendientes.map((s) => (
        <div key={s.fk_tpiar_ajuste} className="flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong className="font-medium">{s.estudiante_nombre}</strong> · {s.tipo_adaptacion} — {s.descripcion}
          </span>
          <Button size="xs" variant="ghost" color="muted" type="button" disabled={disabled} onClick={() => onAgregar([s])}>
            Agregar
          </Button>
        </div>
      ))}
    </section>
  )
}
