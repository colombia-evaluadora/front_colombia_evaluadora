import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"

import type { CitacionRow } from "@/features/gestion-estudiantil/citaciones/api/types"
import { COLOR_ESTADO_CITACION, origenEnlace } from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"
import { formatFechaHora } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"

/** Origen del registro: enlace cuando el front ya tiene su detalle; si no, texto. */
function Origen({ c }: { c: CitacionRow }) {
  const origen = origenEnlace(c.origen_tipo, c.origen_id)
  if (!origen) return null
  return (
    <>
      {" · Origen: "}
      {origen.href ? (
        <Link to={origen.href} className="text-primary hover:underline">
          {origen.texto}
        </Link>
      ) : (
        origen.texto
      )}
    </>
  )
}

/** G.3.CIT.1 (Programar): «Acudiente · Motivo · Origen» bajo el título. */
export function ResumenProgramar({ c }: { c: CitacionRow }) {
  return (
    <span>
      Acudiente: <strong className="font-medium text-foreground">{c.acudiente_nombre ?? "—"}</strong>
      {" · Motivo: "}
      <strong className="font-medium text-foreground">{c.motivo_nombre}</strong>
      <Origen c={c} />
    </span>
  )
}

/** G.3.CIT.5/6 (Cancelar, Asistencia): chip de estado, fecha, motivo y acudiente. */
export function ResumenCitacion({ c }: { c: CitacionRow }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant="soft" color={COLOR_ESTADO_CITACION[c.estado_valor] ?? "muted"}>
        <span>{c.estado_nombre}</span>
      </Badge>
      {c.fecha_programada && <span>{formatFechaHora(c.fecha_programada)} ·</span>}
      <span>{c.motivo_nombre}</span>
      <span>
        · Acudiente: <strong className="font-medium text-foreground">{c.acudiente_nombre ?? "—"}</strong>
      </span>
    </span>
  )
}
