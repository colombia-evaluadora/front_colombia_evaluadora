import { useId, useState } from "react"

import { MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import {
  buscarMensajes,
  fechaResultado,
  resaltar,
  textoPlano,
} from "@/features/comunicaciones/chat/lib/buscar-mensajes"

// Buscador del encabezado: lista los mensajes que coinciden y lleva al elegido.
export function BuscadorMensajes({
  mensajes,
  valor,
  onValor,
  onIr,
}: {
  mensajes: Mensaje[]
  valor: string
  onValor: (v: string) => void
  onIr: (mensajeId: number) => void
}) {
  const listaId = useId()
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const resultados = buscarMensajes(mensajes, valor)
  const visible = abierto && valor.trim() !== ""

  const ir = (m: Mensaje) => {
    setAbierto(false)
    onIr(m.id)
  }

  return (
    <div className="relative ml-auto hidden w-full max-w-xs lg:block">
      <label className="flex h-10 items-center gap-2 rounded-lg border bg-card px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <MagnifyingGlassIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        <span className="sr-only">Buscar en la conversación</span>
        <input
          role="combobox"
          aria-expanded={visible}
          aria-controls={listaId}
          aria-activedescendant={visible && resultados[activo] ? `${listaId}-${activo}` : undefined}
          value={valor}
          onChange={(e) => {
            onValor(e.target.value)
            setActivo(0)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (visible) setAbierto(false)
              else onValor("")
            } else if (e.key === "ArrowDown" && resultados.length) {
              e.preventDefault()
              setAbierto(true)
              setActivo((i) => (i + 1) % resultados.length)
            } else if (e.key === "ArrowUp" && resultados.length) {
              e.preventDefault()
              setActivo((i) => (i - 1 + resultados.length) % resultados.length)
            } else if (e.key === "Enter" && visible && resultados[activo]) {
              e.preventDefault()
              ir(resultados[activo])
            }
          }}
          placeholder="Buscar"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {valor && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onValor("")}
            className="grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-5" />
          </button>
        )}
      </label>

      {visible && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
          {resultados.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Ningún mensaje coincide con «{valor.trim()}».
            </p>
          ) : (
            <ul
              id={listaId}
              role="listbox"
              aria-label="Mensajes encontrados"
              className="max-h-[min(24rem,60dvh)] divide-y overflow-y-auto"
            >
              {resultados.map((m, i) => (
                <li
                  key={m.id}
                  id={`${listaId}-${i}`}
                  role="option"
                  aria-selected={i === activo}
                  // Evita que el blur del input cierre la lista antes del clic.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => ir(m)}
                  className={cn("cursor-pointer px-4 py-3", i === activo && "bg-muted/50")}
                >
                  <time dateTime={m.fecha} className="block text-xs text-muted-foreground">
                    {fechaResultado(m.fecha)}
                  </time>
                  <p className="line-clamp-3 text-sm">
                    {!m.esPropio && `${m.autor.nombre}: `}
                    {resaltar(textoPlano(m.texto), valor).map((t, j) =>
                      t.coincide ? (
                        <mark key={j} className="bg-transparent font-semibold text-primary">
                          {t.texto}
                        </mark>
                      ) : (
                        t.texto
                      ),
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
