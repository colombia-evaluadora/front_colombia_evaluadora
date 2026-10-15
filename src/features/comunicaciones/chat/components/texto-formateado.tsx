import {
  bloques,
  segmentosEnLinea,
  type Segmento,
} from "@/features/comunicaciones/chat/lib/formato-texto"
import { segmentarMenciones } from "@/features/comunicaciones/chat/lib/menciones"
import type { Mencion } from "@/features/comunicaciones/chat/api/types"
import { cn } from "@/lib/utils"

// Pinta el texto de un mensaje con su formato (negrita, listas, código…).
// `menciones`: las que reconoció el servidor; solo esas se resaltan.
export function TextoFormateado({ texto, menciones }: { texto: string; menciones?: Mencion[] }) {
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
                  <EnLinea linea={l} menciones={menciones} />
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
                  <EnLinea linea={l} menciones={menciones} />
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
                <EnLinea linea={l} menciones={menciones} />
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function EnLinea({ linea, menciones }: { linea: string; menciones?: Mencion[] }) {
  return segmentosEnLinea(linea).map((s, i) =>
    s.tipo === "texto" && menciones?.length ? (
      segmentarMenciones(s.valor, menciones).map((p, j) =>
        p.tipo === "texto" ? (
          <span key={`${i}-${j}`}>{p.valor}</span>
        ) : (
          <MencionChip key={`${i}-${j}`} mencion={p.mencion} />
        ),
      )
    ) : (
      <Pieza key={i} segmento={s} />
    ),
  )
}

function MencionChip({ mencion }: { mencion: Mencion }) {
  const masiva = mencion.tipo !== "USUARIO"
  return (
    <span
      className={cn(
        "rounded px-0.5 font-medium",
        masiva ? "bg-yellow-22 text-yellow-foreground" : "bg-primary/15 text-primary",
      )}
    >
      @{mencion.nombre}
    </span>
  )
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
