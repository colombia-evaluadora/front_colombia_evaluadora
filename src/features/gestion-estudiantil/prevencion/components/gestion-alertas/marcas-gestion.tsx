import { Badge } from "@/components/ui/badge"

import type { GestionAlertaRow } from "@/features/gestion-estudiantil/prevencion/api/types"

/** Marcas separadas (Regla 44): Reincidente, Seguimiento reforzado, Vencida y Sin responsable. */
export function MarcasGestion({ f }: { f: GestionAlertaRow }) {
  const marcas: { id: string; texto: string; color: "warning" | "destructive" | "orange" | "muted"; title?: string }[] = []
  if (f.vencida) marcas.push({ id: "vencida", texto: "Vencida", color: "destructive" })
  if (f.sin_responsable) marcas.push({ id: "sin", texto: "Sin responsable", color: "warning" })
  if (f.reincidente) marcas.push({ id: "reincidente", texto: "Reincidente", color: "orange" })
  if (f.seguimiento_reforzado)
    marcas.push({
      id: "reforzado",
      texto: "Seguimiento reforzado",
      color: "muted",
      title: f.motivos_seguimiento.length ? f.motivos_seguimiento.join(", ") : undefined,
    })
  if (marcas.length === 0) return <>—</>
  return (
    <span className="flex flex-wrap gap-1">
      {marcas.map((m) => (
        <Badge key={m.id} variant="soft" color={m.color} title={m.title}>
          <span>{m.texto}</span>
        </Badge>
      ))}
    </span>
  )
}
