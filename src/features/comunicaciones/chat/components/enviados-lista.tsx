import { useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Enviado, TipoEnviado } from "@/features/comunicaciones/chat/api/types"
import { useEnviadosQuery } from "@/features/comunicaciones/chat/api/query/use-enviados-query"
import { fechaCorta } from "@/features/comunicaciones/chat/lib/chat-format"
import { textoPlano } from "@/features/comunicaciones/chat/lib/menciones"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import { UserIcon } from "@/components/ui/icons"

const FILTROS: Array<{ tipo: TipoEnviado | undefined; etiqueta: string }> = [
  { tipo: undefined, etiqueta: "Todos" },
  { tipo: "DIRECTO", etiqueta: "Directos" },
  { tipo: "CANAL", etiqueta: "Foros y grupos" },
  { tipo: "COMUNICADO", etiqueta: "Comunicados" },
  { tipo: "ENCUESTA", etiqueta: "Encuestas" },
  { tipo: "ELECCION", etiqueta: "Elecciones" },
  { tipo: "EVALUACION", etiqueta: "Evaluaciones" },
]

const ETIQUETA: Record<TipoEnviado, string> = {
  DIRECTO: "Mensaje directo",
  CANAL: "Mensaje en foro o grupo",
  COMUNICADO: "Comunicado",
  ENCUESTA: "Encuesta",
  ELECCION: "Elección",
  EVALUACION: "Evaluación",
}

const ICONO = {
  DIRECTO: UserIcon,
  CANAL: ICONO_CATEGORIA.GENERAL,
  COMUNICADO: ICONO_CATEGORIA.ANUNCIO,
  ENCUESTA: ICONO_CATEGORIA.ENCUESTA,
  ELECCION: ICONO_CATEGORIA.VOTACION,
  EVALUACION: ICONO_CATEGORIA.EXAMEN,
} as const

// Pestaña "Enviados": todo lo que el usuario mandó o publicó, con filtro por tipo.
export function EnviadosLista({ onAbrir }: { onAbrir: (e: Enviado) => void }) {
  const [tipo, setTipo] = useState<TipoEnviado | undefined>()
  const { data = [], isPending, isError, refetch } = useEnviadosQuery(tipo)

  return (
    <>
      <div role="group" aria-label="Filtrar enviados por tipo" className="mb-3 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.etiqueta}
            type="button"
            aria-pressed={tipo === f.tipo}
            onClick={() => setTipo(f.tipo)}
            className={cn(
              "h-8 rounded-full border px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              tipo === f.tipo ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted/50",
            )}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>
      {isPending ? (
        <div className="space-y-2" aria-busy>
          <Skeleton className="h-17 w-full" />
          <Skeleton className="h-17 w-full" />
        </div>
      ) : isError ? (
        <div className="py-10 text-center text-sm">
          <p className="text-muted-foreground">No se pudieron cargar los enviados.</p>
          <button type="button" onClick={() => void refetch()} className="mt-2 font-medium text-primary underline">
            Reintentar
          </button>
        </div>
      ) : data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Aún no has enviado nada de este tipo.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((e) => {
            const Icono = ICONO[e.tipo]
            return (
              <li key={e.clave}>
                <button
                  type="button"
                  onClick={() => onAbrir(e)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-muted/50">
                    <Icono className="size-5 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {e.tipo === "DIRECTO" ? e.conversacionNombre : `# ${e.conversacionNombre}`}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.texto ? textoPlano(e.texto) : ETIQUETA[e.tipo]}
                    </span>
                  </span>
                  <span className="shrink-0 self-start text-right text-xs text-muted-foreground">
                    <time dateTime={e.fecha}>{fechaCorta(e.fecha)}</time>
                    <span className="block font-medium text-green">{ETIQUETA[e.tipo]}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
