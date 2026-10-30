import { useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { CaretDownIcon, CaretRightIcon, UsersThreeIcon } from "@/components/ui/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { GrupoVotantes } from "@/features/comunicaciones/chat/api/types"
import {
  useOpcionesVotantesQuery,
  useVotantesQuery,
} from "@/features/comunicaciones/chat/api/query/use-votantes-query"

const GRUPOS: [GrupoVotantes, string][] = [
  ["GRADO", "Grado"],
  ["FUNCIONARIO", "Funcionario"],
]

// "Docente" → "docentes", "Coordinador" → "coordinadores" (contador de Figma 7162:77631).
function plural(cargo: string, n: number) {
  const base = cargo.toLowerCase()
  if (n === 1) return base
  return /[aeiouáéíóú]$/.test(base) ? `${base}s` : `${base}es`
}

interface Filtro {
  grupo: GrupoVotantes
  valor: string
}

// Paso "Seleccionar estudiantes": se elige un grado o un tipo de funcionario y se marcan
// las personas. La selección se conserva al cambiar de grado para sumar varios.
export function SelectorVotantes({
  seleccion,
  onCambio,
  invalido,
  titulo = "Seleccionar estudiantes",
  mensajeInvalido = "Selecciona al menos una persona habilitada para votar.",
  // "para votar" en elecciones; "para responder" o "para presentarla" en encuestas y evaluaciones.
  accion = "para votar",
  // QA 78: quien crea puede elegirse a sí mismo (opcional, nunca automático) y participa como
  // cualquiera. Solo elecciones: encuestas y evaluaciones aún no guardan si el creador participa,
  // así que ahí su fila sale deshabilitada en lugar de descartarse en silencio al guardar.
  permitirYo = false,
}: {
  seleccion: Set<number>
  onCambio: (s: Set<number>) => void
  invalido: boolean
  titulo?: string
  mensajeInvalido?: string
  accion?: string
  permitirYo?: boolean
}) {
  const [filtro, setFiltro] = useState<Filtro | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [grupoActivo, setGrupoActivo] = useState<GrupoVotantes>("GRADO")
  const opciones = useOpcionesVotantesQuery(true)
  const votantes = useVotantesQuery(filtro?.grupo, filtro?.valor)
  const lista = votantes.data ?? []
  const elegibles = permitirYo ? lista : lista.filter((v) => !v.esYo)
  const marcados = lista.filter((v) => seleccion.has(v.id)).length
  const todos = elegibles.length > 0 && elegibles.every((v) => seleccion.has(v.id))

  // Grupo de origen de cada persona elegida: arma el resumen "Para quién".
  const [grupoDe, setGrupoDe] = useState<Map<number, string>>(() => new Map())

  const cambiar = (ids: number[], marcar: boolean) => {
    const s = new Set(seleccion)
    const g = new Map(grupoDe)
    for (const id of ids) {
      if (marcar) {
        s.add(id)
        if (filtro && !g.has(id)) g.set(id, filtro.valor)
      } else s.delete(id)
    }
    setGrupoDe(g)
    onCambio(s)
  }

  const quitarGrupo = (grupo: string) =>
    cambiar([...seleccion].filter((id) => (grupoDe.get(id) ?? "Otros") === grupo), false)

  const resumen = new Map<string, number>()
  for (const id of seleccion) {
    const g = grupoDe.get(id) ?? "Otros"
    resumen.set(g, (resumen.get(g) ?? 0) + 1)
  }

  const valores = grupoActivo === "GRADO" ? opciones.data?.grados : opciones.data?.funcionarios

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-[15px] leading-snug font-semibold">{titulo}</h3>
        <p className="text-sm text-muted-foreground">
          Elige un grado o un tipo de funcionario para cargar el listado.
        </p>
      </div>

      <Popover open={abierto} onOpenChange={setAbierto}>
        <div className="relative">
          <span className="pointer-events-none absolute -top-2.5 left-3 z-10 bg-popover px-1 text-xs font-medium text-muted-foreground">
            Grado o funcionario
          </span>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "flex h-12 w-full items-center gap-2 rounded-lg border px-4 text-left text-sm focus-visible:border-primary focus-visible:outline-none data-popup-open:border-primary",
                  invalido && "border-red",
                )}
              />
            }
          >
            <span className={cn("flex-1 truncate", !filtro && "text-muted-foreground")}>
              {filtro?.valor ?? "Selecciona grado o funcionario"}
            </span>
            <CaretDownIcon aria-hidden className="size-5 text-muted-foreground transition-transform in-data-popup-open:rotate-180" />
          </PopoverTrigger>
        </div>
        <PopoverContent align="start" className="w-(--anchor-width) p-0">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] divide-x">
            <ul aria-label="Tipo" className="space-y-1 p-2">
              {GRUPOS.map(([grupo, etiqueta]) => (
                <li key={grupo}>
                  <button
                    type="button"
                    onClick={() => setGrupoActivo(grupo)}
                    onMouseEnter={() => setGrupoActivo(grupo)}
                    aria-pressed={grupoActivo === grupo}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50",
                      grupoActivo === grupo && "bg-primary/10",
                    )}
                  >
                    {etiqueta}
                    <CaretRightIcon aria-hidden className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
            <ul aria-label={grupoActivo === "GRADO" ? "Grados" : "Funcionarios"} className="max-h-64 overflow-y-auto p-2">
              {opciones.isPending ? (
                <li className="space-y-2 p-1">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </li>
              ) : (
                valores?.map((valor) => (
                  <li key={valor}>
                    <button
                      type="button"
                      onClick={() => {
                        setFiltro({ grupo: grupoActivo, valor })
                        setAbierto(false)
                      }}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50",
                        filtro?.valor === valor && filtro.grupo === grupoActivo && "font-medium text-primary",
                      )}
                    >
                      {valor}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </PopoverContent>
      </Popover>

      {!filtro && (
        // Estado vacío de Figma 3822:41317.
        <div className="flex flex-col items-center gap-3 rounded-lg bg-muted/40 px-4 py-8 text-center">
          <span aria-hidden className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <UsersThreeIcon className="size-6" />
          </span>
          <p className="text-[15px] font-medium">Selecciona un grado o funcionario para ver el listado</p>
          <p className="text-xs text-muted-foreground">El listado se cargará automáticamente.</p>
        </div>
      )}

      {filtro &&
        (votantes.isPending ? (
          <div className="space-y-2" aria-busy>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : votantes.isError ? (
          <p className="text-sm text-muted-foreground">
            No se pudo cargar el listado.{" "}
            <button type="button" onClick={() => void votantes.refetch()} className="font-medium text-primary underline">
              Reintentar
            </button>
          </p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay personas en {filtro.valor}.</p>
        ) : (
          <>
            <div className="flex items-center justify-between px-3">
              <label className="flex items-center gap-3 font-medium">
                <Checkbox
                  checked={todos}
                  indeterminate={marcados > 0 && !todos}
                  onCheckedChange={(v) => cambiar(elegibles.map((x) => x.id), v === true)}
                />
                Seleccionar todos
              </label>
              {/* Figma 7162:77597 / 77614 / 77631: "32 estudiantes" → "3 de 32 seleccionados". */}
              {marcados > 0 ? (
                <span className="text-xs font-medium text-primary tabular-nums">
                  {marcados} de {lista.length} seleccionados
                </span>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {lista.length} {filtro.grupo === "GRADO" ? "estudiantes" : plural(filtro.valor, lista.length)}
                </span>
              )}
            </div>
            <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
              {lista.map((v) => {
                const marcado = seleccion.has(v.id)
                const bloqueado = !!v.esYo && !permitirYo
                return (
                  <li key={v.id}>
                    <label
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5",
                        bloqueado ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                        marcado ? "bg-primary/10" : !bloqueado && "hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={marcado}
                        disabled={bloqueado}
                        onCheckedChange={(c) => cambiar([v.id], c === true)}
                      />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate">
                          {v.nombre}
                          {v.esYo && <span className="text-muted-foreground"> (Tú)</span>}
                        </span>
                        {/* Solo nombre y rol (QA 57): sin documento. */}
                        <span className="block truncate text-xs text-muted-foreground">
                          {filtro.grupo === "GRADO" ? "Estudiante" : filtro.valor}
                          {bloqueado && " · Quien la crea no participa"}
                        </span>
                      </span>
                      {filtro.grupo === "GRADO" && (
                        <span className="text-sm text-muted-foreground tabular-nums">
                          N.º {String(v.numero).padStart(2, "0")}
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        ))}

      {invalido && (
        <p role="alert" className="text-sm text-red">
          {mensajeInvalido}
        </p>
      )}
      {/* Figma solo muestra un grupo a la vez; el resumen aparece cuando se suman varios. */}
      {resumen.size > 1 && (
        <div aria-label="Para quién" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Para quién:</span>
          {[...resumen].map(([grupo, n]) => (
            <span key={grupo} className="flex items-center gap-1 rounded-full border bg-muted/40 py-0.5 pr-1 pl-3">
              {grupo} ({n})
              <button
                type="button"
                aria-label={`Quitar ${grupo}`}
                onClick={() => quitarGrupo(grupo)}
                className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {resumen.size > 1 && (
        <p className="text-sm text-muted-foreground">
          En total: {seleccion.size} {seleccion.size === 1 ? "persona habilitada" : "personas habilitadas"} {accion}.
        </p>
      )}
    </section>
  )
}
