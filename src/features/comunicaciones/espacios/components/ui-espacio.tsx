import { Badge } from "@/components/ui/badge"
import type { EspacioDetalle, EstadoEspacio } from "@/features/comunicaciones/espacios/api/types"

const ESTADO: Record<EstadoEspacio, { label: string; color: "success" | "muted" | "info" }> = {
  ABIERTO: { label: "Abierto", color: "success" },
  SOLO_LECTURA: { label: "Solo lectura", color: "muted" },
  POR_ABRIR: { label: "Por abrir", color: "info" },
}

export function BadgeEstadoEspacio({ estado }: { estado: EstadoEspacio }) {
  const e = ESTADO[estado]
  return (
    <Badge variant="soft" color={e.color}>
      {e.label}
    </Badge>
  )
}

/** `yyyy-MM-dd` a `dd/MM/yyyy` sin pasar por zona horaria. */
export function fechaDia(valor: string | null) {
  if (!valor) return "Sin fecha"
  const [a, m, d] = valor.split("-")
  return `${d}/${m}/${a}`
}

/** `yyyy-MM-dd` a `dd/MM`, como las fechas cortas del prototipo (M.3). */
export function fechaDiaMes(valor: string | null) {
  if (!valor) return "Sin fecha"
  const [, m, d] = valor.slice(0, 10).split("-")
  return `${d}/${m}`
}

/** Encabezado de herramienta (M.3.CHA.1/2): "Foro · Actividad · 7°B · Asignatura" + "Abierto hasta 30/05". */
export function EncabezadoHerramienta({ herramienta, detalle }: { herramienta: string; detalle: EspacioDetalle }) {
  const { espacio } = detalle
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-medium">
        {[herramienta, espacio.actividad, espacio.grupo, espacio.asignatura].filter(Boolean).join(" · ")}
      </h2>
      {espacio.estado === "ABIERTO" && espacio.fechaCierre && (
        <Badge variant="soft" color="success">
          Abierto hasta {fechaDiaMes(espacio.fechaCierre)}
        </Badge>
      )}
    </div>
  )
}
