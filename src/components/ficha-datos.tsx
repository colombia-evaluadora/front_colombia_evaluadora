import { Fragment, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface DatoFicha {
  etiqueta: string
  valor: ReactNode
  /** Ocupa la fila entera (textos largos como el motivo). */
  ancho?: boolean
}

type Fila = { datos: [DatoFicha] | [DatoFicha, DatoFicha]; completa: boolean }

/** Agrupa de a dos; un dato `ancho`, o el último que queda solo, ocupa la fila entera (sin celdas vacías). */
function aFilas(datos: DatoFicha[]): Fila[] {
  const filas: Fila[] = []
  let pendiente: DatoFicha | null = null
  for (const d of datos) {
    if (d.ancho) {
      if (pendiente) filas.push({ datos: [pendiente], completa: true })
      pendiente = null
      filas.push({ datos: [d], completa: true })
    } else if (pendiente) {
      filas.push({ datos: [pendiente, d], completa: false })
      pendiente = null
    } else pendiente = d
  }
  if (pendiente) filas.push({ datos: [pendiente], completa: true })
  return filas
}

/**
 * Datos de solo lectura en tabla: celda del nombre en gris claro y celda del valor en blanco, dos pares por
 * fila, con líneas finas y marco redondeado (como la ficha de datos personales de la referencia de diseño).
 * En pantallas angostas va un par por fila. Las líneas salen del `gap-px` sobre el fondo del borde, así que
 * las celdas van con fondos sólidos (un gris semitransparente dejaba ver el borde y se veía oscuro).
 */
export function FichaDatos({ datos, className }: { datos: DatoFicha[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[8.5rem_1fr] gap-px overflow-hidden rounded-lg border border-border bg-border text-sm",
        "sm:grid-cols-[12rem_1fr_12rem_1fr]",
        className,
      )}
    >
      {aFilas(datos).map((f, i) => (
        <Fragment key={i}>
          {f.datos.map((d) => (
            <Fragment key={d.etiqueta}>
              <dt className="flex items-center bg-table-screen-title px-4 py-2.5 text-muted-foreground">{d.etiqueta}</dt>
              <dd className={cn("flex min-w-0 items-center bg-background px-4 py-2.5 [overflow-wrap:anywhere]", f.completa && "sm:col-span-3")}>
                {d.valor || "—"}
              </dd>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </dl>
  )
}
