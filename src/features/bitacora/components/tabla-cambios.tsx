import { Fragment, type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface Props {
  /** Títulos de las columnas de valores (p. ej. «Valor anterior», «Valor nuevo»). */
  columnas: [string, string]
  filas: { campo: string; valores: [ReactNode, ReactNode]; resaltar?: [boolean, boolean] }[]
}

/**
 * Comparación campo a campo con el estilo de `TablaDatos`: encabezado y columna «Campo» en gris claro, valores
 * en blanco, líneas finas y marco redondeado. Las líneas salen del `gap-px` sobre el fondo del borde, así que
 * todas las celdas llevan fondo sólido.
 */
export function TablaCambios({ columnas, filas }: Props) {
  const encabezado = "bg-table-screen-title px-4 py-2.5 font-medium text-muted-foreground"
  return (
    <div
      role="table"
      className="grid grid-cols-[7rem_1fr_1fr] gap-px overflow-hidden rounded-lg border border-border bg-border text-sm sm:grid-cols-[12rem_1fr_1fr]"
    >
      <div role="row" className="contents">
        <div role="columnheader" className={encabezado}>
          Campo
        </div>
        <div role="columnheader" className={encabezado}>
          {columnas[0]}
        </div>
        <div role="columnheader" className={encabezado}>
          {columnas[1]}
        </div>
      </div>
      {filas.map((f) => (
        <Fragment key={f.campo}>
          <div role="row" className="contents">
            <div role="rowheader" className="flex items-center bg-table-screen-title px-4 py-2.5 text-muted-foreground">
              {f.campo}
            </div>
            {f.valores.map((v, i) => (
              <div
                key={i}
                role="cell"
                className={cn("flex min-w-0 items-center bg-background px-4 py-2.5 break-words", f.resaltar?.[i] && "text-red")}
              >
                {v}
              </div>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  )
}
