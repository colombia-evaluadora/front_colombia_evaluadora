import { useState } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Field, FieldLabel } from "@/components/ui/field"
import { CaretDownIcon } from "@/components/ui/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Audiencia, Conversacion, OpcionSeleccion } from "@/features/comunicaciones/chat/api/types"
import { AUDIENCIAS } from "@/features/comunicaciones/chat/api/ui-mappings"
import { usePersonasQuery } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import { useConversacionesQuery } from "@/features/comunicaciones/chat/api/query/use-conversaciones-query"
import { useOpcionesComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-opciones-comunicado-query"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import { SelectorGrupal } from "@/features/comunicaciones/chat/components/selector-grupal"
import { SelectorPersonas } from "@/features/comunicaciones/chat/components/crear-chat-dialog"
import {
  esGrupoDestino,
  FILTROS_VACIOS,
  hayDestinos,
  type DestinosLocal,
  type FiltrosDestino,
} from "@/features/comunicaciones/chat/lib/destinos-comunicado"
import { SELECCION_VACIA } from "@/features/comunicaciones/chat/lib/seleccion-grupal"

const TODOS = "__todos__"

/**
 * Destinatarios del comunicado (HU "Enviar mensaje institucional"): la audiencia por rol del diseño
 * (4062:67938) y, combinables con ella, personas puntuales, grupos del chat existentes y grados,
 * grupos académicos o cargos. Todo lo que se ofrece está dentro del alcance de quien publica
 * (comms-service `/comunicados/destinos/*`: rector, su establecimiento; coordinador, sus sedes y
 * jornadas; docente, sus grupos) y se puede acotar por establecimiento, sede y jornada. El servidor
 * resuelve sin duplicados y rechaza (403) cualquier destinatario fuera del alcance.
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
  const filtros = destinos.filtros ?? FILTROS_VACIOS
  const opciones = useOpcionesComunicadoQuery(enabled, {
    establecimiento: filtros.establecimiento?.valor,
    sede: filtros.sede?.valor,
    jornada: filtros.jornada?.valor,
  })
  const datos = opciones.data
  const personas = usePersonasQuery(enabled && abierto, consulta, { paraComunicado: true })
  const conversaciones = useConversacionesQuery()
  const grupos = (conversaciones.data ?? []).filter(esGrupoDestino)
  // Mientras carga se muestran todas; luego, solo las que su alcance permite (el docente: estudiantes
  // y acudientes). Una ya elegida que no se permite se conserva visible para poder quitarla.
  const audiencias = datos
    ? AUDIENCIAS.filter((a) => datos.audiencias.includes(a.value) || audiencia.includes(a.value))
    : AUDIENCIAS
  const extra =
    destinos.personas.length +
    destinos.gruposChat.length +
    destinos.grupal.grados.length +
    destinos.grupal.grupos.length +
    destinos.grupal.roles.length
  // Más de un establecimiento (o el super administrador): se elige; si no, el suyo va implícito.
  const eligeEstablecimiento = !!datos && (datos.todos || datos.establecimientos.length > 1)

  // Cambiar un filtro acota de nuevo las opciones: lo elegido por grado, grupo o cargo se limpia.
  const cambiarFiltros = (f: FiltrosDestino) =>
    onDestinos({ ...destinos, filtros: f, grupal: { ...SELECCION_VACIA, para: destinos.grupal.para } })

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="absolute -top-2.5 left-3 z-10 bg-popover px-1 text-sm font-medium">
          Audiencia<span className="text-red"> *</span>
        </span>
        <SelectorChips
          items={audiencias}
          value={audiencias.filter((a) => audiencia.includes(a.value))}
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

      <fieldset className="min-w-0 space-y-2">
        <legend className="mb-2 text-sm font-medium">Acotar a</legend>
        <div className={cn("grid gap-3", eligeEstablecimiento ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          {eligeEstablecimiento && (
            <Filtro
              etiqueta="Establecimiento"
              opciones={datos.establecimientos}
              valor={filtros.establecimiento?.valor}
              todos={datos.todos ? "Elige un establecimiento" : "Todos mis establecimientos"}
              onChange={(o) => cambiarFiltros({ establecimiento: o, sede: null, jornada: null })}
            />
          )}
          <Filtro
            etiqueta="Sede"
            opciones={datos?.sedes ?? []}
            valor={filtros.sede?.valor}
            todos="Todas las sedes"
            onChange={(o) => cambiarFiltros({ ...filtros, sede: o, jornada: null })}
          />
          <Filtro
            etiqueta="Jornada"
            opciones={datos?.jornadas ?? []}
            valor={filtros.jornada?.valor}
            todos="Todas las jornadas"
            onChange={(o) => cambiarFiltros({ ...filtros, jornada: o })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Solo ves lo que está a tu cargo. La audiencia, los grados, grupos y roles se envían dentro de lo que
          elijas aquí.
        </p>
      </fieldset>

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
            opciones={opciones}
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

function Filtro({
  etiqueta,
  opciones,
  valor,
  todos,
  onChange,
}: {
  etiqueta: string
  opciones: OpcionSeleccion[]
  valor: string | undefined
  todos: string
  onChange: (o: { valor: string; etiqueta: string } | null) => void
}) {
  const items: Record<string, string> = {
    [TODOS]: todos,
    ...Object.fromEntries(opciones.map((o) => [o.valor, o.etiqueta])),
  }
  return (
    <Field orientation="vertical" variant="outlined" className="min-w-0 gap-2">
      <FieldLabel>{etiqueta}</FieldLabel>
      <Select
        items={items}
        value={valor ?? TODOS}
        onValueChange={(v) => {
          const o = opciones.find((x) => x.valor === v)
          onChange(o ? { valor: o.valor, etiqueta: o.etiqueta } : null)
        }}
      >
        <SelectTrigger variant="outlined" aria-label={etiqueta}>
          <SelectValue placeholder={todos} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>{todos}</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
