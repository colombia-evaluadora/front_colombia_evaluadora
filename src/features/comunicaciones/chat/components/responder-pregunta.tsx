import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { TipoPregunta } from "@/features/comunicaciones/chat/api/types"
import type { RespuestaLocal } from "@/features/comunicaciones/chat/lib/respuestas"

// Una pregunta de evaluación o encuesta lista para responder (casillas, opción única o texto).
export function ResponderPregunta({
  numero,
  pregunta: p,
  valor,
  onCambio,
  extra,
}: {
  numero: number
  pregunta: { id: number; tipo: TipoPregunta; texto: string; opciones: { id: number; texto: string }[] }
  valor: RespuestaLocal
  onCambio: (cambio: Partial<RespuestaLocal>) => void
  // Dato al lado del enunciado, p. ej. los puntos de la pregunta.
  extra?: string
}) {
  const titulo = `pregunta-${p.id}`
  return (
    <li role="group" aria-labelledby={titulo} className="space-y-2">
      <p id={titulo} className="flex gap-3 font-medium">
        <span className="min-w-0 flex-1">
          {numero}. {p.texto}
        </span>
        {extra && <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">{extra}</span>}
      </p>
      {p.tipo === "REDACCION" ? (
        <textarea
          aria-labelledby={titulo}
          value={valor.texto}
          onChange={(ev) => onCambio({ texto: ev.target.value })}
          maxLength={2000}
          rows={4}
          placeholder="Escribe tu respuesta"
          className="w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      ) : p.tipo === "MULTIPLE" ? (
        <ul className="space-y-1.5">
          {p.opciones.map((o) => (
            <li key={o.id}>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={valor.opcionIds.includes(o.id)}
                  onCheckedChange={(c) =>
                    onCambio({
                      opcionIds: c ? [...valor.opcionIds, o.id] : valor.opcionIds.filter((x) => x !== o.id),
                    })
                  }
                />
                {o.texto}
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <RadioGroup
          aria-labelledby={titulo}
          value={valor.opcionIds[0] != null ? String(valor.opcionIds[0]) : ""}
          onValueChange={(v) => onCambio({ opcionIds: [Number(v)] })}
          className="gap-1.5"
        >
          {p.opciones.map((o) => (
            <label key={o.id} className="flex items-center gap-3 text-sm">
              <RadioGroupItem value={String(o.id)} />
              {o.texto}
            </label>
          ))}
        </RadioGroup>
      )}
    </li>
  )
}
