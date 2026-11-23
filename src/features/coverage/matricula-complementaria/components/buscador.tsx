import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
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
}

interface BuscadorProps {
  id: string
  placeholder: string
  /** Texto aplicado (de la URL). */
  texto: string
  onTexto: (texto: string) => void
  filtros: FiltroBuscador[]
  onAplicar: (valores: Record<string, string>) => void
  onLimpiar: () => void
}

/** Buscador de las pestañas: texto con debounce y filtros en el panel del embudo, como Matrícula. */
export function Buscador({ id, placeholder, texto, onTexto, filtros, onAplicar, onLimpiar }: BuscadorProps) {
  const [open, setOpen] = useState(false)
  const [valor, setValor] = useState(texto)
  const aplicados = () => Object.fromEntries(filtros.map((f) => [f.key, f.value]))
  const [draft, setDraft] = useState<Record<string, string>>(aplicados)

  useEffect(() => setValor(texto), [texto])
  useEffect(() => {
    if (valor === texto) return
    const t = setTimeout(() => onTexto(valor), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onTexto cambia en cada render
  }, [valor, texto])
  useEffect(() => {
    if (open) setDraft(aplicados())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open])

  const activos = filtros.filter((f) => f.value).length

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={id}
        label={null}
        className="sm:w-full sm:max-w-2xl"
        placeholder={placeholder}
        value={valor}
        onValueChange={setValor}
        onClearAll={() => {
          setValor("")
          onLimpiar()
          setOpen(false)
        }}
        activeFilterCount={activos + (texto ? 1 : 0)}
        badgeCount={activos}
        open={open}
        onOpenChange={setOpen}
        onApply={() => {
          onAplicar(draft)
          setOpen(false)
        }}
        size={filtros.length > 1 ? "lg" : "sm"}
      >
        <div className={filtros.length > 1 ? "grid grid-cols-1 gap-3 px-4 sm:grid-cols-2" : "grid gap-3 px-4"}>
          {filtros.map((f) => (
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
      </SearchQueryBar>
    </div>
  )
}
