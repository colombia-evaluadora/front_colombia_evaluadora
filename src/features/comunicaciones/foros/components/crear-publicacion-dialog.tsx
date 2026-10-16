import { useRef, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/api-client"
import type { Miembro } from "@/features/comunicaciones/chat/api/types"
import { ChatComposer } from "@/features/comunicaciones/chat/components/chat-composer"
import { usePublicar } from "@/features/comunicaciones/foros/api/mutations/use-acciones-foro"
import { MAX_ETIQUETAS, MAX_TITULO, publicacionSchema } from "@/features/comunicaciones/foros/api/schema"
import type { Foro, Publicacion } from "@/features/comunicaciones/foros/api/types"
import { SelectorEtiquetas } from "@/features/comunicaciones/foros/components/etiqueta-chip"
import { etiquetasDisponibles } from "@/features/comunicaciones/foros/lib/foros"

/**
 * Nueva publicación: título y etiquetas aquí; el cuerpo con el compositor del
 * chat (formato, menciones `<@id>` y adjunto), que es quien dispara el envío.
 */
export function CrearPublicacionDialog({
  foro,
  miembros,
  permitirMasivas,
  open,
  onClose,
  onCreada,
}: {
  foro: Foro
  miembros: readonly Miembro[]
  permitirMasivas: boolean
  open: boolean
  onClose: () => void
  onCreada: (p: Publicacion) => void
}) {
  const [titulo, setTitulo] = useState("")
  const [etiquetas, setEtiquetas] = useState<number[]>([])
  const [intento, setIntento] = useState(false)
  const publicar = usePublicar()
  // Mismo CLIENT_MESSAGE_ID mientras se reintenta: el servidor no duplica la publicación.
  const clientId = useRef<string>(crypto.randomUUID())

  const validacion = publicacionSchema.safeParse({ titulo, etiquetas })
  const errorTitulo = intento && !validacion.success
    ? validacion.error.issues.find((i) => i.path[0] === "titulo")?.message
    : undefined

  const cerrar = () => {
    if (publicar.isPending) return
    setTitulo("")
    setEtiquetas([])
    setIntento(false)
    publicar.reset()
    clientId.current = crypto.randomUUID()
    onClose()
  }

  const enviar = async (texto: string, archivo: File | null) => {
    setIntento(true)
    if (!validacion.success) throw new Error("invalido")
    const p = await publicar.mutateAsync({
      foroId: foro.id,
      titulo: validacion.data.titulo,
      texto,
      etiquetas,
      archivo,
      clientMessageId: clientId.current,
    })
    clientId.current = crypto.randomUUID()
    setTitulo("")
    setEtiquetas([])
    setIntento(false)
    onCreada(p)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva publicación</DialogTitle>
          <DialogDescription>
            Cada publicación es un hilo propio en {foro.nombre}. Quien publica la sigue y recibe aviso de las respuestas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field data-invalid={Boolean(errorTitulo)}>
            <FieldLabel htmlFor="foro-titulo">Título</FieldLabel>
            <Input
              id="foro-titulo"
              autoFocus
              value={titulo}
              maxLength={MAX_TITULO}
              aria-invalid={Boolean(errorTitulo)}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="P. ej.: ¿Cómo se entrega la tarea de ciencias?"
            />
            {errorTitulo && <FieldError>{errorTitulo}</FieldError>}
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Etiquetas <span className="font-normal text-muted-foreground">(hasta {MAX_ETIQUETAS})</span>
            </p>
            <SelectorEtiquetas
              etiquetas={etiquetasDisponibles(foro.etiquetas, foro.puedeModerar)}
              value={etiquetas}
              onChange={setEtiquetas}
              max={MAX_ETIQUETAS}
            />
          </div>

          <ChatComposer
            destino={titulo.trim() || "la publicación"}
            enviando={publicar.isPending}
            onEnviar={enviar}
            miembros={miembros}
            permitirMasivas={permitirMasivas}
            className="rounded-lg border"
          />

          {publicar.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(publicar.error)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
