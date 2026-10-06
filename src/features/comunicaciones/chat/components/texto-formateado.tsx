import {
  bloques,
  segmentosEnLinea,
  type Segmento,
} from "@/features/comunicaciones/chat/lib/formato-texto"

// Pinta el texto de un mensaje con su formato (negrita, listas, código…).
export function TextoFormateado({ texto }: { texto: string }) {
  return (
    <div className="space-y-1.5 text-sm wrap-break-word">
      {bloques(texto).map((b, i) => {
        if (b.tipo === "codigo") {
          return (
            <pre key={i} className="overflow-x-auto rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs">
              <code>{b.valor}</code>
            </pre>
          )
        }
        if (b.tipo === "numerada" || b.tipo === "vinetas") {
          const Lista = b.tipo === "numerada" ? "ol" : "ul"
          return (
            <Lista key={i} className={b.tipo === "numerada" ? "list-decimal pl-5" : "list-disc pl-5"}>
              {b.lineas.map((l, j) => (
                <li key={j}>
                  <EnLinea linea={l} />
                </li>
              ))}
            </Lista>
          )
        }
        if (b.tipo === "cita") {
          return (
            <blockquote key={i} className="border-l-3 border-muted-foreground/40 pl-3 text-muted-foreground">
              {b.lineas.map((l, j) => (
                <p key={j}>
                  <EnLinea linea={l} />
                </p>
              ))}
            </blockquote>
          )
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {b.lineas.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <EnLinea linea={l} />
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function EnLinea({ linea }: { linea: string }) {
  return segmentosEnLinea(linea).map((s, i) => <Pieza key={i} segmento={s} />)
}

function Pieza({ segmento: s }: { segmento: Segmento }) {
  switch (s.tipo) {
    case "negrita":
      return <strong className="font-semibold">{s.valor}</strong>
    case "cursiva":
      return <em>{s.valor}</em>
    case "tachado":
      return <s>{s.valor}</s>
    case "codigo":
      return <code className="rounded bg-muted/50 px-1 py-0.5 font-mono text-[0.85em]">{s.valor}</code>
    case "enlace":
      return (
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
          {s.valor}
        </a>
      )
    default:
      return s.valor
  }
}
