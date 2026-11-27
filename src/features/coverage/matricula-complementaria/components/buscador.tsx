import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { toSelectItemsMap } from "@/lib/catalog-options"

export interface FiltroBuscador {
  key: string
  label: string
  /** Primera opción: "Todos"/"Todas" con value "". */
  items: { value: string; label: string }[]
  value: string
  /** Clave del término dentro del buscador (`estado:(…)`). Por defecto, el label en minúsculas sin espacios. */
  termino?: string
  /** Solo se escribe en el buscador, no se elige en el panel (p. ej. la convocatoria de «Ver postulaciones»). */
  soloTexto?: boolean
}

interface BuscadorProps {
  id: string
  placeholder: string
  /** Texto aplicado (de la URL). */
  texto: string
  filtros: FiltroBuscador[]
  /** Filtros y texto de una vez (una sola navegación). */
  onBuscar: (valores: Record<string, string>, texto: string) => void
  onLimpiar: () => void
}

const TEXTO = "__texto"
const claveDe = (f: FiltroBuscador) => f.termino ?? f.label.toLowerCase().replace(/\s+/g, "-")

/**
 * Buscador de las pestañas, con el patrón del Observador (CLAUDE.md §13): el embudo abre «Filtros avanzados»
 * con «Limpiar filtros» y «Aplicar filtros», y los filtros aplicados se escriben dentro del mismo buscador
 * (`estado:(Aceptado) especialidad:(Sistemas) texto`), sin una fila de chips aparte.
 */
export function Buscador({ id, placeholder, texto, filtros, onBuscar, onLimpiar }: BuscadorProps) {
  const [open, setOpen] = useState(false)
  const aplicados = () => Object.fromEntries(filtros.map((f) => [f.key, f.value]))
  const [draft, setDraft] = useState<Record<string, string>>(aplicados)

  useEffect(() => {
    if (open) setDraft(aplicados())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open])

  const vacio = { [TEXTO]: "", ...Object.fromEntries(filtros.map((f) => [f.key, ""])) }
  const syntax: QuerySyntax<Record<string, string>> = {
    empty: vacio,
    freeText: { key: "texto", field: TEXTO },
    terms: filtros.map((f) => optionTerm(claveDe(f), f.key, f.items.filter((i) => i.value !== ""))),
  }
  const { search, setSearch, freeText } = useQuerySearch({
    syntax,
    filters: { [TEXTO]: texto, ...aplicados() },
    applyFilters: (next) => {
      const { [TEXTO]: nuevoTexto = "", ...valores } = next
      onBuscar(valores, nuevoTexto)
    },
  })

  const activos = filtros.filter((f) => f.value).length
  const enPanel = filtros.filter((f) => !f.soloTexto)

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={id}
        label={null}
        className="sm:w-full sm:max-w-2xl"
        placeholder={placeholder}
        value={search}
        onValueChange={setSearch}
        onClearAll={() => {
          setSearch("")
          onLimpiar()
          setOpen(false)
        }}
        // «Limpiar filtros» del panel: quita los filtros y deja el texto buscado (como el Observador).
        onClearFilters={() => {
          const sinFiltros = Object.fromEntries(filtros.map((f) => [f.key, ""]))
          setDraft(sinFiltros)
          onBuscar(sinFiltros, freeText)
        }}
        activeFilterCount={activos + (texto ? 1 : 0)}
        badgeCount={activos}
        open={enPanel.length ? open : false}
        onOpenChange={setOpen}
        onApply={() => {
          onBuscar({ ...aplicados(), ...draft }, freeText)
          setOpen(false)
        }}
        size={enPanel.length > 1 ? "lg" : "sm"}
      >
        {enPanel.length ? (
          <div className={enPanel.length > 1 ? "grid grid-cols-1 gap-3 px-4 sm:grid-cols-2" : "grid gap-3 px-4"}>
            {enPanel.map((f) => (
              <Field key={f.key} orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={`${id}-${f.key}`}>{f.label}</FieldLabel>
                <ComboboxField
                  items={toSelectItemsMap(f.items)}
                  value={draft[f.key] ?? ""}
                  onValueChange={(v) => setDraft((prev) => ({ ...prev, [f.key]: v ?? "" }))}
                >
                  <ComboboxFieldTrigger id={`${id}-${f.key}`} size="sm" className="w-full">
                    <ComboboxFieldValue placeholder={f.items[0]?.label} />
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    {f.items.map((item) => (
                      <ComboboxFieldItem key={item.value} value={item.value}>
                        {item.label}
                      </ComboboxFieldItem>
                    ))}
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            ))}
          </div>
        ) : null}
      </SearchQueryBar>
    </div>
  )
}
