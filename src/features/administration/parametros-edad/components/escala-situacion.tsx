import { cn } from "@/lib/utils"

import { formatDiferencia, type Cortes } from "@/features/administration/parametros-edad/api/types"

/** Tramo de la escala: `desde`/`hasta` en años de diferencia; null = abierto. */
interface Tramo {
  situacion: string
  desde: number | null
  hasta: number | null
  clase: string
}

// Colores fijos por situación: la regla se lee igual en la vista y en cada grado.
function tramos(c: Cortes): Tramo[] {
  return [
    { situacion: "Baja edad", desde: null, hasta: c.bajaEdadHasta, clase: "bg-blue-22 text-blue" },
    {
      situacion: "En edad",
      desde: c.bajaEdadHasta + 1,
      hasta: c.preextraedadDesde - 1,
      clase: "bg-green-22 text-green",
    },
    {
      situacion: "Preextraedad",
      desde: c.preextraedadDesde,
      hasta: c.extraedadDesde - 1,
      clase: "bg-yellow-22 text-yellow",
    },
    { situacion: "Extraedad", desde: c.extraedadDesde, hasta: null, clase: "bg-orange-22 text-orange" },
  ]
}

/** Texto del tramo en años de diferencia. */
function rango(t: Tramo, fmt: (n: number) => string) {
  if (t.desde == null) return `${fmt(t.hasta!)} o menos`
  if (t.hasta == null) return `${fmt(t.desde)} o más`
  if (t.desde === t.hasta) return fmt(t.desde)
  return `${fmt(t.desde)} a ${fmt(t.hasta)}`
}

/** Edades del tramo en la fila de un grado, donde el espacio es poco: ≤4, 5–6, ≥8. */
function rangoCorto(t: Tramo, edad: number) {
  if (t.desde == null) return `≤${edad + t.hasta!}`
  if (t.hasta == null) return `≥${edad + t.desde}`
  if (t.desde === t.hasta) return String(edad + t.desde)
  return `${edad + t.desde}–${edad + t.hasta}`
}

/** Ancho de cada tramo: los cerrados según sus años, los abiertos fijos. */
const peso = (t: Tramo) => (t.desde == null || t.hasta == null ? 2 : t.hasta - t.desde + 1.5)

/**
 * Regla de la situación de edad. Sin `edad` muestra los cortes en años de
 * diferencia (la política); con `edad` traduce cada tramo a edades cumplidas
 * del grado, que es lo que se compara al inscribir.
 */
export function EscalaSituacion({
  cortes,
  edad,
  className,
}: {
  cortes: Cortes
  edad?: number
  className?: string
}) {
  const grado = edad != null
  return (
    <ol
      aria-label="Situación de edad por tramo"
      className={cn("flex w-full gap-0.5 overflow-hidden rounded-sm", className)}
    >
      {tramos(cortes).map((t) => (
        <li
          key={t.situacion}
          style={{ flexGrow: peso(t) }}
          className={cn(
            "flex min-w-0 basis-0 flex-col justify-center px-2",
            grado ? "py-1" : "py-2.5",
            t.clase,
          )}
        >
          {grado ? (
            <span className="truncate text-xs font-semibold tabular-nums">
              <span className="sr-only">{t.situacion}: </span>
              {rangoCorto(t, edad)}
            </span>
          ) : (
            <>
              <span className="truncate text-xs font-semibold">{t.situacion}</span>
              <span className="truncate text-xs tabular-nums opacity-80">
                {rango(t, formatDiferencia)} años
              </span>
            </>
          )}
        </li>
      ))}
    </ol>
  )
}
