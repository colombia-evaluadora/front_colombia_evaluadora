import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"

import {
  ciclosDe,
  useReservasCupoCatalogosQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import {
  ESTADO_RESERVA_UI,
  ESTADO_TRASLADO_LABELS,
} from "@/features/coverage/inscripcion-reservas/api/ui-mappings"
import {
  ESTADOS_RESERVA,
  ESTADOS_TRASLADO,
  type ReservasCupoFilters,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

const CAMPOS = ["ciclo", "sede", "jornada", "grado", "estado", "estadoTraslado"] as const
type Avanzados = Pick<ReservasCupoFilters, (typeof CAMPOS)[number]>

interface SearchReservasCupoProps {
  filters: ReservasCupoFilters
  onSearch: (q: string) => void
  onApply: (values: Avanzados) => void
  onClearAll: () => void
}

/** Sin repetir valores: varias filas de períodos comparten sede o jornada. */
function unicos(items: { value: string; label: string }[]) {
  return [...new Map(items.map((i) => [i.value, i])).values()].sort((a, b) =>
    a.label.localeCompare(b.label, "es"),
  )
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

  const periodos = catalogos?.periodos ?? []
  const opciones: Record<
    (typeof CAMPOS)[number],
    { label: string; items: { value: string; label: string }[] }
  > = {
    ciclo: {
      label: "Período",
      items: ciclosDe(periodos).map((c) => ({ value: c.id, label: c.nombre })),
    },
    sede: {
      label: "Sede",
      items: unicos(periodos.map((p) => ({ value: String(p.fkTsede), label: p.sede }))),
    },
    jornada: {
      label: "Jornada",
      items: unicos(periodos.map((p) => ({ value: String(p.fkTlvJornada), label: p.jornada }))),
    },
    grado: {
      label: "Grado",
      items: (catalogos?.grados ?? []).map((g) => ({ value: g.codigo, label: g.nombre })),
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
      label={null}
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
