import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { DotsThreeVerticalIcon, FileDownloadOutlinedIcon, PushPinIcon } from "@/components/ui/icons"
import { Textarea } from "@/components/ui/textarea"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { TextoFormateado } from "@/features/comunicaciones/chat/components/texto-formateado"
import { fechaCorta, horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"
import { descargarAdjunto, pesoLegible } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { decodificarMenciones } from "@/features/comunicaciones/chat/lib/menciones"
import {
  useAccionesParticipacion,
  useSilenciar,
} from "@/features/comunicaciones/espacios/api/mutations/use-acciones-espacio"
import type { EspacioDetalle, Participacion } from "@/features/comunicaciones/espacios/api/types"

type TipoDialogo = "editar" | "ocultar" | "silenciar"

/**
 * Una intervención del chat o del foro. Oculta: se ve "Oculta por el moderador" sin texto ni
 * adjuntos. Editar y retirar: el autor, 15 minutos. Fijar, ocultar y silenciar: el docente propietario.
 * `extra` agrega acciones del foro (marcar solución).
 */
export function ParticipacionItem({
  espacio,
  p,
  esDocente,
  etiqueta,
  extra,
}: {
  espacio: EspacioDetalle
  p: Participacion
  esDocente: boolean
  etiqueta?: string
  extra?: { label: string; onClick: () => void }[]
}) {
  const id = espacio.espacio.id
  const { notify } = useNotify()
  const acciones = useAccionesParticipacion(id)
  const { silenciar } = useSilenciar(id)
  const [dialogo, setDialogo] = useState<TipoDialogo | null>(null)
  const [valor, setValor] = useState("")
  const abierto = espacio.espacio.estado === "ABIERTO"
  const moderar = espacio.puedeAdministrar && !p.oculta && !p.retirada
  const fallar = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })

  const abrir = (tipo: TipoDialogo) => {
    setValor(tipo === "editar" ? decodificarMenciones(p.texto ?? "", p.menciones) : "")
    setDialogo(tipo)
  }

  const confirmar = () => {
    const texto = valor.trim()
    if (!texto || !dialogo) return
    const cerrar = { onSuccess: () => setDialogo(null), onError: fallar }
    if (dialogo === "editar") acciones.editar.mutate({ mensaje: p.id, texto }, cerrar)
    if (dialogo === "ocultar") acciones.ocultar.mutate({ mensaje: p.id, motivo: texto }, cerrar)
    if (dialogo === "silenciar") silenciar.mutate({ usuario: p.autorId, motivo: texto }, cerrar)
  }

  const hayMenu = abierto && (moderar || p.editable || (extra?.length ?? 0) > 0)
  // Al docente no se le silencia: el backend solo admite estudiantes de la actividad.
  const puedeSilenciar = moderar && !p.esPropia

  return (
    <article
      id={`participacion-${p.id}`}
      className={cn("rounded-md border p-3", p.meMenciona && "border-yellow-stroke bg-yellow-22/60")}
    >
      <header className="flex items-start justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{p.autor}</span>
          <span className="text-xs text-muted-foreground">
            {fechaCorta(p.fecha)} · {horaMensaje(p.fecha)}
            {p.editada && " · Editado"}
          </span>
          {p.fijada && (
            <Badge variant="soft" color="info">
              <PushPinIcon data-icon="inline-start" aria-hidden />
              Fijado
            </Badge>
          )}
          {etiqueta && (
            <Badge variant="soft" color="success">
              {etiqueta}
            </Badge>
          )}
        </p>
        {hayMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Acciones de la participación de ${p.autor}`}
                >
                  <DotsThreeVerticalIcon />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {p.editable && <DropdownMenuItem onClick={() => abrir("editar")}>Editar</DropdownMenuItem>}
              {p.editable && (
                <DropdownMenuItem onClick={() => acciones.retirar.mutate(p.id, { onError: fallar })}>
                  Retirar
                </DropdownMenuItem>
              )}
              {moderar && (
                <DropdownMenuItem
                  onClick={() => acciones.fijar.mutate({ mensaje: p.id, fijado: !p.fijada }, { onError: fallar })}
                >
                  {p.fijada ? "Desfijar mensaje" : "Fijar mensaje"}
                </DropdownMenuItem>
              )}
              {extra?.map((x) => (
                <DropdownMenuItem key={x.label} onClick={x.onClick}>
                  {x.label}
                </DropdownMenuItem>
              ))}
              {moderar && <DropdownMenuItem onClick={() => abrir("ocultar")}>Ocultar</DropdownMenuItem>}
              {puedeSilenciar && (
                <DropdownMenuItem onClick={() => abrir("silenciar")}>Silenciar en este espacio</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {p.oculta ? (
        <p className="mt-1 text-sm text-muted-foreground italic">
          Oculta por el moderador.{esDocente && p.motivoOculta ? ` Motivo: ${p.motivoOculta}` : ""}
        </p>
      ) : p.retirada ? (
        <p className="mt-1 text-sm text-muted-foreground italic">El autor retiró esta participación.</p>
      ) : (
        <>
          {p.texto && (
            <div className="mt-1">
              <TextoFormateado texto={p.texto} menciones={p.menciones} />
            </div>
          )}
          {p.adjuntos.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {p.adjuntos
                .filter((a) => !a.eliminadoEn && a.archivoId)
                .map((a) => (
                  <li key={a.archivoId}>
                    <Button
                      variant="outline"
                      color="neutral"
                      size="sm"
                      onClick={() => descargarAdjunto(a.archivoId as number, a.nombre).catch(fallar)}
                    >
                      <FileDownloadOutlinedIcon data-icon="inline-start" aria-hidden />
                      {a.nombre} {a.peso ? `(${pesoLegible(a.peso)})` : ""}
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={dialogo !== null} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogo === "editar" && "Editar participación"}
              {dialogo === "ocultar" && "Ocultar participación"}
              {dialogo === "silenciar" && `Silenciar a ${p.autor} en este espacio`}
            </DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`valor-${p.id}`}>{dialogo === "editar" ? "Texto" : "Motivo"}</FieldLabel>
            <Textarea
              id={`valor-${p.id}`}
              value={valor}
              maxLength={dialogo === "editar" ? 4000 : 500}
              onChange={(e) => setValor(e.target.value)}
            />
          </Field>
          {dialogo === "silenciar" && (
            <p className="text-sm text-muted-foreground">
              No podrá escribir ni responder encuestas en este espacio hasta que lo reactive. Puede seguir consultando.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" color="neutral" onClick={() => setDialogo(null)}>
              Cancelar
            </Button>
            <Button disabled={!valor.trim()} onClick={confirmar}>
              {dialogo === "editar" ? "Guardar" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
