import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"

import { useReservasCupoCatalogosQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import {
  ESTADO_RESERVA_UI,
  ESTADO_TRASLADO_LABELS,
} from "@/features/coverage/inscripcion-reservas/api/ui-mappings"
import {
  ESTADOS_RESERVA,
  ESTADOS_TRASLADO,
  type ReservasCupoFilters,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

type Avanzados = Pick<
  ReservasCupoFilters,
  "sede" | "jornada" | "grado" | "estado" | "estadoTraslado"
>

const CAMPOS = ["sede", "jornada", "grado", "estado", "estadoTraslado"] as const

interface SearchReservasCupoProps {
  filters: ReservasCupoFilters
  onSearch: (q: string) => void
  onApply: (values: Avanzados) => void
  onClearAll: () => void
}

/** Buscador por nombre o documento + panel con los filtros de la Sección 3.2. */
export function SearchReservasCupo({
  filters,
  onSearch,
  onApply,
  onClearAll,
}: SearchReservasCupoProps) {
  const [open, setOpen] = useState(false)
  const [texto, setTexto] = useState(filters.q ?? "")
  const [draft, setDraft] = useState<Avanzados>({})
  const { data: catalogos } = useReservasCupoCatalogosQuery()

  // Debounce corto para no consultar por cada tecla.
  useEffect(() => {
    if (texto === (filters.q ?? "")) return
    const t = setTimeout(() => onSearch(texto), 300)
    return () => clearTimeout(t)
  }, [texto, filters.q, onSearch])

  const avanzados = CAMPOS.filter((c) => filters[c]).length

  function handleOpenChange(next: boolean) {
    if (next) setDraft(Object.fromEntries(CAMPOS.map((c) => [c, filters[c]])))
    setOpen(next)
  }

  const opciones: Record<
    (typeof CAMPOS)[number],
    { label: string; items: { value: string; label: string }[] }
  > = {
    sede: { label: "Sede", items: (catalogos?.sedes ?? []).map((v) => ({ value: v, label: v })) },
    jornada: {
      label: "Jornada",
      items: (catalogos?.jornadas ?? []).map((v) => ({ value: v, label: v })),
    },
    grado: {
      label: "Grado",
      items: (catalogos?.grados ?? []).map((v) => ({ value: v, label: v })),
    },
    estado: {
      label: "Estado",
      items: ESTADOS_RESERVA.map((v) => ({ value: v, label: ESTADO_RESERVA_UI[v].label })),
    },
    estadoTraslado: {
      label: "Estado del traslado",
      items: ESTADOS_TRASLADO.map((v) => ({ value: v, label: ESTADO_TRASLADO_LABELS[v] })),
    },
  }

  return (
    <SearchQueryBar
      id="reservas-cupo-search"
      placeholder="Buscar por nombre o documento"
      value={texto}
      onValueChange={setTexto}
      onClearAll={() => {
        setTexto("")
        onClearAll()
        setOpen(false)
      }}
      onClearFilters={() => setDraft({})}
      activeFilterCount={avanzados + (filters.q ? 1 : 0)}
      badgeCount={avanzados}
      open={open}
      onOpenChange={handleOpenChange}
      onApply={() => {
        onApply(draft)
        setOpen(false)
      }}
    >
      <div className="grid grid-cols-2 gap-3 px-4">
        {CAMPOS.map((campo) => {
          const labels = new Map(opciones[campo].items.map((o) => [o.value, o.label]))
          return (
            <MatriculaSelectField
              key={campo}
              id={`filtro-${campo}`}
              label={opciones[campo].label}
              placeholder="Todos"
              value={draft[campo] ?? ""}
              options={opciones[campo].items.map((o) => o.value)}
              labelFor={(v) => labels.get(v) ?? v}
              onChange={(v) => setDraft({ ...draft, [campo]: v || undefined })}
            />
          )
        })}
      </div>
    </SearchQueryBar>
  )
}
