import type { ReactNode } from "react"

/** Filas etiqueta | valor en solo lectura, como el recuadro «Orientación» del prototipo (E.1.ORI.2). */
export function OrientacionResumen({ filas }: { filas: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] overflow-hidden rounded-lg border border-border text-sm">
      {filas.map(({ label, value }, i) => (
        <div
          key={label}
          className={i > 0 ? "contents [&>*]:border-t [&>*]:border-border" : "contents"}
        >
          <dt className="bg-muted/40 px-4 py-3 text-muted-foreground">{label}</dt>
          <dd className="px-4 py-3 break-words whitespace-pre-line">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
