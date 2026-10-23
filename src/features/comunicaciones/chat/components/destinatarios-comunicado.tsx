import { useState } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CaretDownIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Audiencia, Conversacion } from "@/features/comunicaciones/chat/api/types"
import { AUDIENCIAS } from "@/features/comunicaciones/chat/api/ui-mappings"
import { usePersonasQuery } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import { useConversacionesQuery } from "@/features/comunicaciones/chat/api/query/use-conversaciones-query"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import { SelectorGrupal } from "@/features/comunicaciones/chat/components/selector-grupal"
import { SelectorPersonas } from "@/features/comunicaciones/chat/components/crear-chat-dialog"
import {
  esGrupoDestino,
  hayDestinos,
  type DestinosLocal,
} from "@/features/comunicaciones/chat/lib/destinos-comunicado"

/**
 * Destinatarios del comunicado (HU "Enviar mensaje institucional"): la audiencia por rol del diseño
 * (4062:67938) y, combinables con ella, personas puntuales, grupos del chat existentes y grados,
 * grupos académicos o cargos (el mismo selector del alta masiva de grupos). comms-service los
 * resuelve en el servidor sin duplicados.
 */
export function DestinatariosComunicado({
  enabled,
  audiencia,
  onAudiencia,
  destinos,
  onDestinos,
  invalido,
}: {
  enabled: boolean
  audiencia: Audiencia[]
  onAudiencia: (v: Audiencia[]) => void
  destinos: DestinosLocal
  onDestinos: (v: DestinosLocal) => void
  invalido: boolean
}) {
  const [abierto, setAbierto] = useState(hayDestinos(destinos))
  const [consulta, setConsulta] = useState("")
  const personas = usePersonasQuery(enabled && abierto, consulta)
  const conversaciones = useConversacionesQuery()
  const grupos = (conversaciones.data ?? []).filter(esGrupoDestino)
  const extra =
    destinos.personas.length +
    destinos.gruposChat.length +
    destinos.grupal.grados.length +
    destinos.grupal.grupos.length +
    destinos.grupal.roles.length

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="absolute -top-2.5 left-3 z-10 bg-popover px-1 text-sm font-medium">
          Audiencia<span className="text-red"> *</span>
        </span>
        <SelectorChips
          items={AUDIENCIAS}
          value={AUDIENCIAS.filter((a) => audiencia.includes(a.value))}
          onChange={(v) => onAudiencia(v.map((a) => a.value))}
          getId={(a) => a.value}
          getLabel={(a) => a.label}
          visibles={3}
          conFlecha
          invalido={invalido}
          ariaLabel="Audiencia"
          placeholder="Elige quién recibe el comunicado"
        />
      </div>

      <Collapsible open={abierto} onOpenChange={setAbierto}>
        <CollapsibleTrigger className="flex items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          <CaretDownIcon aria-hidden className={cn("size-4 transition-transform", !abierto && "-rotate-90")} />
          Enviar también a personas, grupos del chat, grados o grupos
          {extra > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 text-xs tabular-nums">{extra}</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="relative">
            <span className="pointer-events-none absolute -top-2.5 left-3 z-10 bg-popover px-1 text-sm font-medium">
              Personas
            </span>
            <SelectorPersonas
              personas={personas.data ?? []}
              cargando={personas.isPending}
              delServidor={!personas.isPlaceholderData && consulta.trim().length >= 2}
              onConsulta={setConsulta}
              value={destinos.personas.map((p) => ({ ...p }))}
              onChange={(v) => onDestinos({ ...destinos, personas: v })}
              autoFocus={false}
            />
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute -top-2.5 left-3 z-10 bg-popover px-1 text-sm font-medium">
              Grupos del chat
            </span>
            <SelectorChips<Pick<Conversacion, "id" | "nombre">>
              items={grupos}
              value={destinos.gruposChat}
              onChange={(v) => onDestinos({ ...destinos, gruposChat: v.map((g) => ({ id: g.id, nombre: g.nombre })) })}
              getId={(g) => g.id}
              getLabel={(g) => g.nombre}
              cargando={conversaciones.isPending}
              conFlecha
              ariaLabel="Grupos del chat"
              placeholder="P. ej.: Docentes de primaria"
              vacio="No perteneces a ningún grupo o foro."
            />
          </div>
          <SelectorGrupal
            enabled={enabled && abierto}
            value={destinos.grupal}
            onChange={(grupal) => onDestinos({ ...destinos, grupal })}
            leyenda="Por grado, grupo o rol"
            etiquetaPara="De los grados y grupos, enviar a"
            ayuda="Llega a cada persona una sola vez aunque esté en varios de los destinatarios elegidos."
          />
        </CollapsibleContent>
      </Collapsible>

      {invalido && (
        <p role="alert" className="text-xs text-red">
          Elige al menos un destinatario.
        </p>
      )}
    </div>
  )
}
