import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { GestionEvento } from "@/features/gestion-estudiantil/prevencion/api/types"

/** Persona abreviada; sin persona, su rol (p. ej. «Supervisor de sede»). */
const persona = (nombre: string | null, rol: string | null) => abreviarPersona(nombre) || rol || "—"

/**
 * Texto de una línea del historial de responsables (§9.11): «Pasó a intervención · de X a Y», «Tomada por X»…
 * La fecha va aparte, en su columna.
 */
function textoEvento(e: GestionEvento): string {
  const quien = persona(e.quien_nombre, e.quien_rol_nombre)
  const hacia = e.sin_responsable_hacia ? "Sin responsable" : persona(e.hacia_nombre, e.hacia_rol_nombre)
  const desde = persona(e.desde_nombre, e.desde_rol_nombre)
  switch (e.evento) {
    case "ACTIVADA":
      return e.sin_responsable_hacia
        ? "Alerta activada · Sin responsable"
        : `Alerta activada · ${e.hacia_rol_nombre ?? "Responsable"}: ${abreviarPersona(e.hacia_nombre) || "—"}`
    case "INTERVENCION":
      return `Pasó a intervención · de ${desde} a ${hacia}`
    case "TOMADA":
      return `Tomada por ${quien}`
    case "ESCALADA":
      return `Escalada a la entidad territorial · por ${quien}`
    case "ORIENTACION":
      return "Orientación de la entidad territorial recibida"
    case "EN_GESTION":
      return `En gestión · por ${quien}`
    case "APOYO_ORIENTACION":
      return `Apoyo de orientación solicitado · por ${quien}`
    case "RUTA_PROTECCION":
      return `Ruta de protección activada · por ${quien}`
    case "RESUELTA":
      return `Resuelta · por ${quien}`
    default:
      return e.evento
  }
}

export function HistorialGestion({ eventos }: { eventos: GestionEvento[] }) {
  if (eventos.length === 0) return <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
  return (
    <ol className="flex flex-col divide-y">
      {eventos.map((e, i) => {
        const texto = textoEvento(e)
        // El detalle del backend a veces repite el evento («Escalada a la entidad territorial»).
        const detalle = e.detalle && !texto.includes(e.detalle) ? e.detalle : null
        return (
          <li key={`${e.fecha}-${i}`} className="flex flex-wrap gap-x-6 gap-y-1 py-2 text-sm">
            <span className="w-24 shrink-0 text-muted-foreground">{formatFecha(e.fecha)}</span>
            <span className="min-w-0 flex-1">
              {texto}
              {detalle && <span className="text-muted-foreground"> · {detalle}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
