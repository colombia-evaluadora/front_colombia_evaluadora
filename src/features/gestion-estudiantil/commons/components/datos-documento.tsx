import type { ReactNode } from "react"

/** Cuadrícula de datos: etiqueta en negrita y valor, de a dos pares por fila. */
export function DatosDocumento({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] border border-border sm:grid-cols-[auto_1fr_auto_1fr]">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="contents">
          <dt className="border-b border-border bg-muted px-3 py-1.5 font-semibold">{etiqueta}</dt>
          <dd className="border-b border-border px-3 py-1.5">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}
