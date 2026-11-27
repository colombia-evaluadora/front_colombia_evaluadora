import { Fragment, useContext, type ReactNode } from "react"

import { CoincideTodoContext, coincideBusqueda, normalizarBusqueda, Resaltado, useBusquedaDetalle } from "@/components/busqueda-detalle"
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
 * Con poco ancho va un par por fila: lo decide el ancho del contenedor (`@container`), no el de la pantalla,
 * porque en un modal angosto dos pares por fila partían los valores letra a letra. Las líneas salen del `gap-px` sobre el fondo del borde, así que
 * las celdas van con fondos sólidos (un gris semitransparente dejaba ver el borde y se veía oscuro).
 */
export function FichaDatos({ datos, className }: { datos: DatoFicha[]; className?: string }) {
  // Dentro de un detalle con buscador (`DetalleConBusqueda`): solo los pares que coinciden, resaltados.
  const busqueda = useBusquedaDetalle()
  const textoDe = (v: ReactNode) => (typeof v === "string" || typeof v === "number" ? String(v) : "")
  const todo = useContext(CoincideTodoContext)
  const visibles = todo ? datos : datos.filter((d) => coincideBusqueda(`${d.etiqueta} ${textoDe(d.valor)}`, busqueda))
  if (normalizarBusqueda(busqueda) && visibles.length === 0) return null
  return (
    <div className={cn("@container", className)}>
    <dl
      className={cn(
        "grid grid-cols-[minmax(7rem,12rem)_1fr] gap-px overflow-hidden rounded-lg border border-border bg-border text-sm",
        "@2xl:grid-cols-[12rem_1fr_12rem_1fr]",
      )}
    >
      {aFilas(visibles).map((f, i) => (
        <Fragment key={i}>
          {f.datos.map((d) => (
            <Fragment key={d.etiqueta}>
              <dt data-par-ficha="" className="flex items-center bg-table-screen-title px-4 py-2.5 text-muted-foreground">
                <Resaltado texto={d.etiqueta} busqueda={busqueda} />
              </dt>
              <dd className={cn("flex min-w-0 items-center bg-background px-4 py-2.5 [overflow-wrap:anywhere]", f.completa && "@2xl:col-span-3")}>
                {textoDe(d.valor) ? <Resaltado texto={textoDe(d.valor)} busqueda={busqueda} /> : d.valor || "—"}
              </dd>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </dl>
    </div>
  )
}
