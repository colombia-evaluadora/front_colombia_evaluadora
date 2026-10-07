import { useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react"

import {
  CheckIcon,
  FileIcon,
  ImagesIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  XIcon,
} from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ICONO_ARCHIVO } from "@/features/comunicaciones/chat/api/ui-mappings"
import {
  ACEPTA_DOCUMENTOS,
  ACEPTA_MULTIMEDIA,
  formatoDeArchivo,
} from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { cn } from "@/lib/utils"
import {
  SmileyIcon,
  TextAaIcon,
  AtIcon,
  MicrophoneIcon,
  CodeBlockIcon,
  QuotesIcon,
  CodeIcon,
  TextItalicIcon,
  LinkIcon,
  ListNumbersIcon,
  ListBulletsIcon,
  TextBIcon,
  TextStrikethroughIcon,
  VideoCameraIcon,
} from "@/components/ui/icons"
import {
  alternarBloque,
  alternarBloqueCodigo,
  alternarMarca,
  insertarEnlace,
  type Edicion,
} from "@/features/comunicaciones/chat/lib/formato-texto"

const MAX_CARACTERES = 4000

// Items del menú en oración (el base los pone en mayúsculas).
const ITEM_MENU = "gap-3 py-2.5 text-sm font-normal tracking-normal normal-case [&_svg]:size-5!"

interface ChatComposerProps {
  textoInicial?: string
  destino: string
  enviando: boolean
  onEnviar: (texto: string, archivo: File | null) => Promise<unknown>
  // "edicion": guarda con un check y no permite adjuntar.
  variante?: "nuevo" | "edicion"
  className?: string
  autoFocus?: boolean
}

export function ChatComposer({
  destino,
  enviando,
  onEnviar,
  textoInicial = "",
  variante = "nuevo",
  className,
  autoFocus,
}: ChatComposerProps) {
  const id = useId()
  const edicion = variante === "edicion"
  const [texto, setTexto] = useState(textoInicial)
  const [archivo, setArchivo] = useState<File | null>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  // La barra de formato se ve mientras el editor (o la propia barra) tiene el foco.
  const [enfocado, setEnfocado] = useState(false)
  const listo = (texto.trim().length > 0 || !!archivo) && !enviando

  const enviar = async () => {
    if (!listo) return
    try {
      await onEnviar(texto.trim(), archivo)
      setTexto("")
      setArchivo(null)
    } catch {
      // El error lo muestra la página; se conserva el texto para reintentar.
    } finally {
      areaRef.current?.focus()
    }
  }

  // Inserta en el cursor (menciones).
  const insertar = (valor: string) => {
    const area = areaRef.current
    const inicio = area?.selectionStart ?? texto.length
    const fin = area?.selectionEnd ?? texto.length
    setTexto(texto.slice(0, inicio) + valor + texto.slice(fin))
    requestAnimationFrame(() => {
      area?.focus()
      area?.setSelectionRange(inicio + valor.length, inicio + valor.length)
    })
  }

  // Aplica una transformación sobre la selección y la restaura.
  const aplicar = (fn: (e: Edicion) => Edicion) => {
    const area = areaRef.current
    if (!area) return
    const r = fn({ texto, inicio: area.selectionStart, fin: area.selectionEnd })
    setTexto(r.texto)
    requestAnimationFrame(() => {
      area.focus()
      area.setSelectionRange(r.inicio, r.fin)
    })
  }

  const atajo = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return false
    const k = e.key.toLowerCase()
    if (k === "b") aplicar((x) => alternarMarca(x, "**"))
    else if (k === "i") aplicar((x) => alternarMarca(x, "_"))
    else if (k === "x" && e.shiftKey) aplicar((x) => alternarMarca(x, "~"))
    else if (k === "k") aplicar(insertarEnlace)
    else return false
    e.preventDefault()
    return true
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void enviar()
      }}
      className={cn("shrink-0 border-t p-3 md:p-4", className)}
    >
      <div
        onFocus={() => setEnfocado(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setEnfocado(false)
        }}
        className="rounded-xl border bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
      >
        {enfocado && (
          <div
            role="toolbar"
            aria-label="Formato de texto"
            className="flex flex-wrap items-center gap-0.5 rounded-t-xl border-b bg-chat-panel px-2 py-1"
          >
            <Herramienta etiqueta="Negrita (Ctrl+B)" onClick={() => aplicar((x) => alternarMarca(x, "**"))}>
              <TextBIcon className="size-5" />
            </Herramienta>
            <Herramienta etiqueta="Cursiva (Ctrl+I)" onClick={() => aplicar((x) => alternarMarca(x, "_"))}>
              <TextItalicIcon className="size-5" />
            </Herramienta>
            <Herramienta etiqueta="Tachado (Ctrl+Shift+X)" onClick={() => aplicar((x) => alternarMarca(x, "~"))}>
              <TextStrikethroughIcon className="size-5" />
            </Herramienta>
            <Separador />
            <Herramienta etiqueta="Enlace (Ctrl+K)" onClick={() => aplicar(insertarEnlace)}>
              <LinkIcon className="size-5" />
            </Herramienta>
            <Separador />
            <Herramienta etiqueta="Lista numerada" onClick={() => aplicar((x) => alternarBloque(x, "numerada"))}>
              <ListNumbersIcon className="size-5" />
            </Herramienta>
            <Herramienta etiqueta="Lista con viñetas" onClick={() => aplicar((x) => alternarBloque(x, "vinetas"))}>
              <ListBulletsIcon className="size-5" />
            </Herramienta>
            <Separador />
            <Herramienta etiqueta="Cita" onClick={() => aplicar((x) => alternarBloque(x, "cita"))}>
              <QuotesIcon className="size-5" />
            </Herramienta>
            <Separador />
            <Herramienta etiqueta="Código" onClick={() => aplicar((x) => alternarMarca(x, "`"))}>
              <CodeIcon className="size-5" />
            </Herramienta>
            <Herramienta etiqueta="Bloque de código" onClick={() => aplicar(alternarBloqueCodigo)}>
              <CodeBlockIcon className="size-5" />
            </Herramienta>
          </div>
        )}
        <label htmlFor={id} className="sr-only">
          {edicion ? "Editar mensaje" : `Mensaje para ${destino}`}
        </label>
        {archivo && <ArchivoPendiente archivo={archivo} onQuitar={() => setArchivo(null)} />}
        <textarea
          id={id}
          autoFocus={autoFocus}
          ref={areaRef}
          rows={1}
          value={texto}
          maxLength={MAX_CARACTERES}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (atajo(e)) return
            // Enter envía; Shift+Enter hace salto de línea.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void enviar()
            }
          }}
          placeholder={`Enviar un mensaje a ${destino}`}
          className="field-sizing-content max-h-40 min-h-11 w-full resize-none bg-transparent px-3 pt-3 pb-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-0.5 px-2 pb-2">
          {edicion ? (
            <Herramienta etiqueta="Adjuntar archivo" pendiente circular>
              <PlusIcon className="size-4" />
            </Herramienta>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Adjuntar archivo"
                className="grid size-8 place-items-center rounded-full bg-muted/50 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:text-foreground"
              >
                <PlusIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-52">
                <DropdownMenuItem className={ITEM_MENU} onClick={() => docRef.current?.click()}>
                  <FileIcon />
                  Documentos
                </DropdownMenuItem>
                <DropdownMenuItem className={ITEM_MENU} onClick={() => mediaRef.current?.click()}>
                  <ImagesIcon />
                  Fotos y videos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <SelectorArchivo ref={docRef} accept={ACEPTA_DOCUMENTOS} onArchivo={setArchivo} />
          <SelectorArchivo ref={mediaRef} accept={ACEPTA_MULTIMEDIA} onArchivo={setArchivo} />
          <Herramienta etiqueta="Formato de texto" pendiente>
            <TextAaIcon className="size-5" />
          </Herramienta>
          <Herramienta etiqueta="Emoji" pendiente>
            <SmileyIcon className="size-5" />
          </Herramienta>
          <Herramienta etiqueta="Mencionar a alguien" onClick={() => insertar("@")}>
            <AtIcon className="size-5" />
          </Herramienta>
          <Separador className="max-sm:hidden" />
          <Herramienta etiqueta="Grabar video" pendiente className="max-sm:hidden">
            <VideoCameraIcon className="size-5" />
          </Herramienta>
          <Herramienta etiqueta="Grabar audio" pendiente className="max-sm:hidden">
            <MicrophoneIcon className="size-5" />
          </Herramienta>

          <button
            type="submit"
            disabled={!listo}
            aria-label={edicion ? "Guardar cambios" : "Enviar mensaje"}
            className={cn(
              "ml-auto grid size-9 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              edicion
                ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                : "text-primary hover:bg-primary/10 disabled:text-muted-foreground disabled:hover:bg-transparent",
            )}
          >
            {edicion ? <CheckIcon className="size-5" /> : <PaperPlaneTiltIcon className="size-5" />}
          </button>
        </div>
      </div>
    </form>
  )
}

function Herramienta({
  etiqueta,
  onClick,
  pendiente = false,
  circular = false,
  className,
  children,
}: {
  etiqueta: string
  onClick?: () => void
  pendiente?: boolean
  circular?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pendiente}
      aria-label={etiqueta}
      title={pendiente ? `${etiqueta}: disponible próximamente` : etiqueta}
      className={cn(
        "grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
        circular && "rounded-full bg-muted/50",
        className,
      )}
    >
      {children}
    </button>
  )
}

function Separador({ className }: { className?: string }) {
  return <span aria-hidden className={cn("mx-1 h-5 w-px bg-border", className)} />
}

function SelectorArchivo({
  ref,
  accept,
  onArchivo,
}: {
  ref: Ref<HTMLInputElement>
  accept: string
  onArchivo: (archivo: File) => void
}) {
  return (
    <input
      ref={ref}
      type="file"
      accept={accept}
      hidden
      onChange={(e) => {
        const archivo = e.target.files?.[0]
        if (archivo) onArchivo(archivo)
        // Permite volver a elegir el mismo archivo.
        e.target.value = ""
      }}
    />
  )
}

function ArchivoPendiente({ archivo, onQuitar }: { archivo: File; onQuitar: () => void }) {
  const { Icono, color } = ICONO_ARCHIVO[formatoDeArchivo(archivo)]
  return (
    <div className="mx-3 mt-3 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border bg-card py-1.5 pr-1 pl-2">
      <Icono aria-hidden className={cn("size-6 shrink-0", color)} />
      <span className="min-w-0 truncate text-sm font-medium">{archivo.name}</span>
      <button
        type="button"
        aria-label={`Quitar ${archivo.name}`}
        onClick={onQuitar}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}
