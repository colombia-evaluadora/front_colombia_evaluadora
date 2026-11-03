import { useState } from "react"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useQueryClient } from "@tanstack/react-query"

import { AvatarBadge } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { CaretDownIcon, GearIcon, XIcon } from "@/components/ui/icons"
import { Textarea } from "@/components/ui/textarea"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { useActualizarDisponibilidad } from "@/features/comunicaciones/chat/api/mutations/use-actualizar-disponibilidad"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import {
  useMiDisponibilidadQuery,
  useRespuestasAutomaticas,
} from "@/features/comunicaciones/chat/api/query/use-disponibilidad-query"
import type { EstadoDisponibilidad, MiDisponibilidad, RespuestaAutomatica } from "@/features/comunicaciones/chat/api/types"
import {
  CLASE_DISPONIBILIDAD,
  DESCRIPCION_DISPONIBILIDAD,
  ESTADOS_ELEGIBLES,
  ETIQUETA_DISPONIBILIDAD,
  MAX_RESPUESTA_AUTOMATICA,
  PERFILES_VISIBILIDAD,
  conPunto,
} from "@/features/comunicaciones/chat/lib/disponibilidad"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

/** Punto de color sobre el avatar (desconectado: sin punto, como antes). */
export function PuntoDisponibilidad({ estado, className }: { estado: EstadoDisponibilidad | undefined; className?: string }) {
  if (!conPunto(estado)) return null
  const etiqueta = ETIQUETA_DISPONIBILIDAD[estado]
  return (
    <AvatarBadge className={cn(CLASE_DISPONIBILIDAD[estado], className)} title={etiqueta} data-estado={estado}>
      <span className="sr-only">{etiqueta}</span>
    </AvatarBadge>
  )
}

/** Punto suelto (fuera de un `Avatar`), p. ej. las iniciales de la lista de conversaciones. */
export function PuntoSuelto({ estado, className }: { estado: EstadoDisponibilidad | undefined; className?: string }) {
  if (!conPunto(estado)) return null
  const etiqueta = ETIQUETA_DISPONIBILIDAD[estado]
  return (
    <span
      title={etiqueta}
      data-estado={estado}
      className={cn(
        "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-chat-panel",
        CLASE_DISPONIBILIDAD[estado],
        className,
      )}
    >
      <span className="sr-only">{etiqueta}</span>
    </span>
  )
}

/**
 * Selector del propio estado (encabezado del chat): En línea, Ausente, Ocupado, Invisible y
 * "Configurar disponibilidad" (respuesta automática y quién lo ve).
 */
export function SelectorDisponibilidad({ className }: { className?: string }) {
  const { data: mia } = useMiDisponibilidadQuery()
  const actualizar = useActualizarDisponibilidad()
  const { notify } = useNotify()
  const [configurar, setConfigurar] = useState(false)
  // Los radio items de Base UI no cierran el menú solos.
  const [abierto, setAbierto] = useState(false)
  const estado = mia?.estado
  if (!mia) return null

  const elegir = (nuevo: string) => {
    setAbierto(false)
    if (nuevo === estado && mia.origen === "MANUAL") return
    actualizar.mutate(
      { estado: nuevo as MiDisponibilidad["estado"] },
      {
        onSuccess: (d) => notify(`Tu estado ahora es ${ETIQUETA_DISPONIBILIDAD[d.estado]}.`),
        onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
      },
    )
  }

  return (
    <>
      <DropdownMenu open={abierto} onOpenChange={setAbierto}>
        <DropdownMenuTrigger
          aria-label={`Tu estado: ${ETIQUETA_DISPONIBILIDAD[mia.estado]}. Cambiar disponibilidad`}
          className={cn(
            "flex h-9 items-center gap-2 rounded-full border bg-card px-3 text-sm hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:bg-muted/60",
            className,
          )}
        >
          <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", CLASE_DISPONIBILIDAD[mia.estado])} />
          <span className="max-sm:sr-only">
            {ETIQUETA_DISPONIBILIDAD[mia.estado]}
            {mia.estado === "AUSENTE" && mia.origen === "AUTO" && (
              <span className="text-muted-foreground"> · por inactividad</span>
            )}
          </span>
          <CaretDownIcon aria-hidden className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuRadioGroup value={mia.origen === "MANUAL" ? mia.estado : "EN_LINEA"} onValueChange={elegir}>
            {ESTADOS_ELEGIBLES.map((e) => (
              <DropdownMenuRadioItem key={e} value={e} className="items-start normal-case tracking-normal">
                <span aria-hidden className={cn("mt-1 size-2.5 shrink-0 rounded-full", CLASE_DISPONIBILIDAD[e])} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm">{ETIQUETA_DISPONIBILIDAD[e]}</span>
                  <span className="text-xs font-normal text-muted-foreground">{DESCRIPCION_DISPONIBILIDAD[e]}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfigurar(true)}>
            <GearIcon />
            Configurar disponibilidad
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {configurar && (
        <ConfigurarDisponibilidadDialog
          disponibilidad={mia}
          onOpenChange={setConfigurar}
        />
      )}
    </>
  )
}

/** Respuesta automática de Ausente y perfiles que ven el estado. Se monta al abrir. */
function ConfigurarDisponibilidadDialog({
  disponibilidad,
  onOpenChange,
}: {
  disponibilidad: MiDisponibilidad
  onOpenChange: (open: boolean) => void
}) {
  const [respuesta, setRespuesta] = useState(disponibilidad.respuestaAutomatica ?? "")
  const [visibles, setVisibles] = useState<PerfilChat[]>(disponibilidad.visiblePara)
  const [error, setError] = useState<string | null>(null)
  const actualizar = useActualizarDisponibilidad()
  const { notify } = useNotify()
  const largo = respuesta.trim().length > MAX_RESPUESTA_AUTOMATICA

  const guardar = () => {
    if (largo) return
    setError(null)
    actualizar.mutate(
      { respuestaAutomatica: respuesta.trim(), visiblePara: visibles },
      {
        onSuccess: () => {
          notify("Disponibilidad guardada.")
          onOpenChange(false)
        },
        onError: (e) => setError(getErrorMessage(e)),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !actualizar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar disponibilidad</DialogTitle>
          <DialogDescription>
            Elige quién ve tu estado en el chat y qué responder cuando estás ausente.
          </DialogDescription>
        </DialogHeader>
        <form
          id="configurar-disponibilidad"
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            guardar()
          }}
        >
          <Field data-invalid={largo || undefined}>
            <FieldLabel htmlFor="respuesta-automatica">Respuesta automática (Ausente)</FieldLabel>
            <Textarea
              id="respuesta-automatica"
              value={respuesta}
              rows={3}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Ej.: Estoy en clase, respondo después de las 2:00 p. m."
              aria-invalid={largo || undefined}
            />
            <CharacterCounter value={respuesta} max={MAX_RESPUESTA_AUTOMATICA} />
            <FieldDescription>
              Se muestra a quien te escribe por mensaje directo mientras estás Ausente (una vez por
              conversación cada cierto tiempo). Déjala vacía para no enviarla.
            </FieldDescription>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Quién ve tu estado</legend>
            {PERFILES_VISIBILIDAD.map((p) => (
              <label key={p.valor} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={visibles.includes(p.valor)}
                  onCheckedChange={(v) =>
                    setVisibles((prev) => (v ? [...prev, p.valor] : prev.filter((x) => x !== p.valor)))
                  }
                />
                {p.etiqueta}
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              Para los demás apareces desconectado. Con Invisible nadie ve tu estado.
            </p>
          </fieldset>
          <NoticeBanner notice={error ? { id: 0, message: error } : null} onClose={() => setError(null)} variant="error" />
        </form>
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={actualizar.isPending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="configurar-disponibilidad" disabled={actualizar.isPending || largo}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Respuesta automática de la otra persona del directo (está Ausente). Solo la ve quien escribió y
 * solo en esta sesión; se puede cerrar.
 */
export function RespuestaAutomaticaAviso({ conversacionId }: { conversacionId: number }) {
  const queryClient = useQueryClient()
  const r = useRespuestasAutomaticas().find((x) => x.conversacionId === conversacionId)
  if (!r) return null
  const cerrar = () =>
    queryClient.setQueryData<RespuestaAutomatica[]>(chatKeys.respuestasAutomaticas, (prev = []) =>
      prev.filter((x) => x !== r),
    )
  return (
    <div
      role="status"
      className="mx-3 mb-2 flex items-start gap-3 rounded-lg border border-yellow-stroke bg-yellow-22 px-4 py-3 text-sm md:mx-5"
    >
      <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", CLASE_DISPONIBILIDAD.AUSENTE)} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {r.nombre} está ausente · Respuesta automática
        </p>
        <p className="break-words whitespace-pre-line text-foreground/90">{r.texto}</p>
      </div>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar respuesta automática"
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}
