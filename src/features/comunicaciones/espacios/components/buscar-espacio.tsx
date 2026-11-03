import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { MagnifyingGlassIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { textoPlano } from "@/features/comunicaciones/chat/lib/menciones"
import {
  useBusquedaEspacio,
  type FiltrosBusqueda,
} from "@/features/comunicaciones/espacios/api/query/use-foro-equipos-query"

const VACIO: FiltrosBusqueda = { texto: "", autor: "", desde: "", hasta: "" }

/** Búsqueda por texto o archivo, autor y fecha. El backend solo devuelve lo que la persona puede consultar. */
export function BuscarEspacio({ espacioId }: { espacioId: number }) {
  const [form, setForm] = useState(VACIO)
  const [filtros, setFiltros] = useState<FiltrosBusqueda | null>(null)
  const { data: hallazgos = [], isFetching, isError } = useBusquedaEspacio(espacioId, filtros)
  const hayFiltro = Object.values(form).some(Boolean)
  const set = (k: keyof FiltrosBusqueda, v: string) => setForm({ ...form, [k]: v })

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    setFiltros(hayFiltro ? { ...form } : null)
  }

  return (
    <section aria-label="Buscar en el espacio" className="space-y-2">
      <form onSubmit={buscar} className="flex flex-wrap items-end gap-2">
        <Input
          className="min-w-40 flex-1"
          aria-label="Texto o nombre de archivo"
          placeholder="Buscar texto o archivo"
          value={form.texto}
          onChange={(e) => set("texto", e.target.value)}
        />
        <Input
          className="w-40"
          aria-label="Autor"
          placeholder="Autor"
          value={form.autor}
          onChange={(e) => set("autor", e.target.value)}
        />
        <Input className="w-40" type="date" aria-label="Desde" value={form.desde} onChange={(e) => set("desde", e.target.value)} />
        <Input className="w-40" type="date" aria-label="Hasta" value={form.hasta} onChange={(e) => set("hasta", e.target.value)} />
        <Button type="submit" variant="outline" color="neutral" size="sm" disabled={!hayFiltro}>
          <MagnifyingGlassIcon data-icon="inline-start" aria-hidden />
          Buscar
        </Button>
        {filtros && (
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="sm"
            onClick={() => {
              setForm(VACIO)
              setFiltros(null)
            }}
          >
            Limpiar
          </Button>
        )}
      </form>
      {filtros && (
        <div className="rounded-md border p-2 text-sm">
          {isFetching ? (
            <p className="text-muted-foreground">Buscando…</p>
          ) : isError ? (
            <p className="text-red">No se pudo buscar.</p>
          ) : hallazgos.length === 0 ? (
            <p className="text-muted-foreground">Sin resultados.</p>
          ) : (
            <ul className="space-y-1">
              {hallazgos.map((h) => (
                <li key={h.participacion.id}>
                  <span className="font-medium">{h.participacion.autor}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {h.donde === "FORO" ? "Foro" : "Chat"}
                    {h.equipoId ? " de equipo" : ""}
                  </span>
                  : {textoPlano(h.participacion.texto ?? "", h.participacion.menciones) || "Adjunto"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
