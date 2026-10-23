import { useId, useState, type ReactNode } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, FieldLabel } from "@/components/ui/field"
import { DatePicker } from "@/components/date-picker"
import { FunnelIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { useOpcionesFiltroQuery } from "@/features/comunicaciones/chat/api/query/use-busqueda-chat-query"
import {
  ESTADOS_FILTRO,
  FILTROS_VACIOS,
  PERFILES_FILTRO,
  TIPOS_FILTRO,
  contarFiltrosAvanzados,
  type FiltrosChat,
} from "@/features/comunicaciones/chat/lib/filtros-chat"

/**
 * Panel de filtros del chat: tipo de conversación, fechas, estado, persona (nombre o documento),
 * rol y grupo académico, combinables con las palabras del buscador. Los grupos y roles que se
 * ofrecen son los de las personas con las que el usuario conversa (los resuelve el servidor), así
 * que nadie filtra fuera de lo que ya puede ver. Cada cambio se aplica al momento (y queda en la URL).
 */
export function FiltrosChatPopover({
  filtros,
  onFiltros,
}: {
  filtros: FiltrosChat
  onFiltros: (f: FiltrosChat) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const opciones = useOpcionesFiltroQuery(abierto)
  const [busquedaGrupo, setBusquedaGrupo] = useState("")
  const ids = useId()
  const total = contarFiltrosAvanzados(filtros)
  const grupos = opciones.data?.grupos ?? []
  // Roles presentes entre sus personas (y los ya elegidos, aunque hoy no haya nadie).
  const perfiles = PERFILES_FILTRO.filter(
    (p) => opciones.data?.perfiles.includes(p.valor) || filtros.perfiles.includes(p.valor),
  )
  const t = busquedaGrupo.trim().toLowerCase()
  const gruposVisibles = t ? grupos.filter((g) => `${g.etiqueta} ${g.detalle ?? ""}`.toLowerCase().includes(t)) : grupos

  const alternar = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v])

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={total > 0 ? `Filtros (${total} activos)` : "Filtros"}
            title="Filtrar por tipo, fecha, estado, grupo, rol o persona"
            className={cn(
              "relative grid size-10 shrink-0 place-items-center rounded-lg border bg-card text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:border-primary",
              total > 0 && "border-primary text-primary",
            )}
          />
        }
      >
        <FunnelIcon aria-hidden className="size-5" />
        {total > 0 && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
          >
            {total}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label="Filtros del chat"
        className="max-h-[min(40rem,var(--available-height))] w-80 gap-4 overflow-y-auto"
      >
        <Grupo titulo="Tipo de conversación" id={`${ids}-tipo`}>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {TIPOS_FILTRO.map((x) => (
              <Opcion
                key={x.valor}
                etiqueta={x.etiqueta}
                marcada={filtros.tipos.includes(x.valor)}
                onCambio={() => onFiltros({ ...filtros, tipos: alternar(filtros.tipos, x.valor) })}
              />
            ))}
          </div>
        </Grupo>

        <Grupo titulo="Fecha" id={`${ids}-fecha`}>
          <div className="grid grid-cols-2 gap-2">
            <Field orientation="vertical" variant="outlined" className="gap-1">
              <FieldLabel htmlFor={`${ids}-desde`} className="text-xs">
                Desde
              </FieldLabel>
              <DatePicker
                id={`${ids}-desde`}
                size="sm"
                maxDate={parseDateValue(filtros.hasta) ?? new Date()}
                value={parseDateValue(filtros.desde)}
                onChange={(d) => onFiltros({ ...filtros, desde: formatDateValue(d) })}
              />
            </Field>
            <Field orientation="vertical" variant="outlined" className="gap-1">
              <FieldLabel htmlFor={`${ids}-hasta`} className="text-xs">
                Hasta
              </FieldLabel>
              <DatePicker
                id={`${ids}-hasta`}
                size="sm"
                minDate={parseDateValue(filtros.desde)}
                maxDate={new Date()}
                value={parseDateValue(filtros.hasta)}
                onChange={(d) => onFiltros({ ...filtros, hasta: formatDateValue(d) })}
              />
            </Field>
          </div>
        </Grupo>

        <Grupo titulo="Estado del mensaje" id={`${ids}-estado`}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {ESTADOS_FILTRO.map((x) => (
              <Opcion
                key={x.valor}
                etiqueta={x.etiqueta}
                marcada={filtros.estados.includes(x.valor)}
                onCambio={() => onFiltros({ ...filtros, estados: alternar(filtros.estados, x.valor) })}
              />
            ))}
          </div>
        </Grupo>

        <Field orientation="vertical" variant="outlined" className="gap-1">
          <FieldLabel htmlFor={`${ids}-persona`} className="text-xs text-muted-foreground">
            Persona (nombre o documento)
          </FieldLabel>
          <Input
            id={`${ids}-persona`}
            type="search"
            size="sm"
            maxLength={120}
            value={filtros.persona}
            onChange={(e) => onFiltros({ ...filtros, persona: e.target.value })}
            placeholder="Ej.: Ana Ríos o 1012345678"
          />
        </Field>

        <Grupo titulo="Rol" id={`${ids}-rol`}>
          {opciones.isPending ? (
            <Skeleton className="h-6 w-full" />
          ) : perfiles.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin roles para filtrar.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {perfiles.map((p) => (
                <Opcion
                  key={p.valor}
                  etiqueta={p.etiqueta}
                  marcada={filtros.perfiles.includes(p.valor)}
                  onCambio={() => onFiltros({ ...filtros, perfiles: alternar(filtros.perfiles, p.valor) })}
                />
              ))}
            </div>
          )}
        </Grupo>

        <Grupo titulo="Grupo" id={`${ids}-grupo`}>
          {opciones.isPending ? (
            <Skeleton className="h-16 w-full" />
          ) : opciones.isError ? (
            <p className="text-xs text-muted-foreground">
              No se pudieron cargar los grupos.{" "}
              <button type="button" onClick={() => void opciones.refetch()} className="font-medium text-primary underline">
                Reintentar
              </button>
            </p>
          ) : grupos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Las personas de tus conversaciones no tienen grupo.</p>
          ) : (
            <>
              {grupos.length > 6 && (
                <Input
                  type="search"
                  size="sm"
                  variant="outlined"
                  aria-label="Buscar grupo"
                  value={busquedaGrupo}
                  onChange={(e) => setBusquedaGrupo(e.target.value)}
                  placeholder="Buscar grupo (601, Sexto…)"
                  className="mb-1"
                />
              )}
              <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                {gruposVisibles.map((g) => {
                  const id = Number(g.valor)
                  return (
                    <li key={g.valor}>
                      <Opcion
                        etiqueta={
                          <>
                            {g.etiqueta}
                            {g.detalle && <span className="text-muted-foreground"> · {g.detalle}</span>}
                          </>
                        }
                        marcada={filtros.grupos.includes(id)}
                        onCambio={() => onFiltros({ ...filtros, grupos: alternar(filtros.grupos, id) })}
                      />
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Grupo>

        {total > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            color="neutral"
            className="w-full"
            onClick={() => onFiltros({ ...FILTROS_VACIOS, q: filtros.q })}
          >
            Limpiar filtros
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Grupo({ titulo, id, children }: { titulo: string; id: string; children: ReactNode }) {
  return (
    <section role="group" aria-labelledby={id} className="space-y-1.5">
      <h3 id={id} className="text-xs font-medium text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </section>
  )
}

function Opcion({ etiqueta, marcada, onCambio }: { etiqueta: ReactNode; marcada: boolean; onCambio: () => void }) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <Checkbox checked={marcada} onCheckedChange={onCambio} />
      <span className="min-w-0 flex-1 truncate">{etiqueta}</span>
    </label>
  )
}
