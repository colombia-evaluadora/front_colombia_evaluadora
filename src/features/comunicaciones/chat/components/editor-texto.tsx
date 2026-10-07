import { useState, type ReactNode } from "react"
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"
import { TextStyleKit } from "@tiptap/extension-text-style"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  CaretDownFillIcon,
  ImageIcon,
  LineSpacingIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftFillIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextClearIcon,
  TextColorIcon,
  TextIndentIcon,
  TextItalicIcon,
  TextOutdentIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CLASES_HTML } from "@/features/comunicaciones/chat/lib/html-seguro"

const FUENTES = ["Arial", "Georgia", "Times New Roman", "Verdana", "Courier New"]
const COLORES = ["#1f2937", "#2563eb", "#16a34a", "#dc2626", "#ea580c", "#9333ea", "#6b7280"]
const INTERLINEADOS = ["1", "1.15", "1.5", "2"]
const TAMANO_BASE = 14

// Editor de texto enriquecido (Tiptap) del comunicado y de los documentos de
// Archivos. Devuelve HTML; quien lo guarde o muestre debe pasarlo por `htmlSeguro`.
export function EditorTexto({
  valor,
  onCambio,
  invalido,
  etiqueta,
  onImprimir,
  documento,
}: {
  valor: string
  onCambio: (html: string) => void
  invalido?: boolean
  etiqueta: string
  onImprimir?: () => void
  // Sin marco y con márgenes de página, para editar un documento a pantalla completa.
  documento?: boolean
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
    ],
    content: valor,
    onUpdate: ({ editor }) => onCambio(editor.getHTML()),
    editorProps: {
      attributes: {
        "aria-label": etiqueta,
        "aria-multiline": "true",
        role: "textbox",
        class: cn(
          "outline-none",
          documento ? "mx-auto min-h-full max-w-3xl px-6 py-8 md:px-10" : "min-h-48 px-4 py-3",
          CLASES_HTML,
        ),
      },
    },
  })

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        !documento && "rounded-xl border focus-within:border-primary",
        invalido && "border-red",
      )}
    >
      <BarraFormato editor={editor} onImprimir={onImprimir} />
      <EditorContent editor={editor} className="min-h-0 flex-1 overflow-y-auto" />
    </div>
  )
}

function BarraFormato({ editor, onImprimir }: { editor: Editor; onImprimir?: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      enLista: e.isActive("listItem"),
      align: (["left", "center", "right", "justify"] as const).find((a) =>
        e.isActive({ textAlign: a }),
      ),
      fuente: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "Arial",
      tamano: parseInt(e.getAttributes("textStyle").fontSize as string, 10) || TAMANO_BASE,
      color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
      deshacer: e.can().undo(),
      rehacer: e.can().redo(),
    }),
  })
  const c = () => editor.chain().focus()
  const tamano = (n: number) => c().setFontSize(`${Math.min(72, Math.max(8, n))}px`).run()

  return (
    <div
      role="toolbar"
      aria-label="Formato del texto"
      className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5 border-b px-2 py-2"
    >
      <Grupo>
        <Boton etiqueta="Deshacer" onClick={() => c().undo().run()} disabled={!s.deshacer}>
          <ArrowUUpLeftIcon />
        </Boton>
        <Boton etiqueta="Rehacer" onClick={() => c().redo().run()} disabled={!s.rehacer}>
          <ArrowUUpRightIcon />
        </Boton>
        {onImprimir && (
          <Boton etiqueta="Imprimir" onClick={onImprimir}>
            <PrinterIcon />
          </Boton>
        )}
      </Grupo>
      <Grupo>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Fuente"
            className="flex h-8 items-center gap-1 rounded-md bg-muted/40 px-2 text-sm hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <span className="max-w-24 truncate" style={{ fontFamily: s.fuente }}>
              {s.fuente}
            </span>
            <CaretDownFillIcon aria-hidden className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {FUENTES.map((f) => (
              <DropdownMenuItem key={f} style={{ fontFamily: f }} onClick={() => c().setFontFamily(f).run()}>
                {f}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex h-8 items-center rounded-full border">
          <Boton etiqueta="Reducir tamaño" onClick={() => tamano(s.tamano - 1)} redondo>
            <MinusIcon />
          </Boton>
          <span className="w-7 text-center text-sm tabular-nums" aria-label={`Tamaño ${s.tamano}`}>
            {s.tamano}
          </span>
          <Boton etiqueta="Aumentar tamaño" onClick={() => tamano(s.tamano + 1)} redondo>
            <PlusIcon />
          </Boton>
        </div>
      </Grupo>
      <Grupo>
        <Boton etiqueta="Negrita (Ctrl+B)" activo={s.bold} onClick={() => c().toggleBold().run()}>
          <TextBIcon />
        </Boton>
        <Boton etiqueta="Cursiva (Ctrl+I)" activo={s.italic} onClick={() => c().toggleItalic().run()}>
          <TextItalicIcon />
        </Boton>
        <Boton etiqueta="Subrayado (Ctrl+U)" activo={s.underline} onClick={() => c().toggleUnderline().run()}>
          <TextUnderlineIcon />
        </Boton>
        <Boton etiqueta="Tachado" activo={s.strike} onClick={() => c().toggleStrike().run()}>
          <TextStrikethroughIcon />
        </Boton>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Color del texto"
            className="flex h-8 items-center gap-0.5 rounded-md px-1.5 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <TextColorIcon aria-hidden className="size-5" style={{ color: s.color ?? undefined }} />
            <CaretDownFillIcon aria-hidden className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1.5">
              <DropdownMenuItem
                aria-label="Color por defecto"
                onClick={() => c().unsetColor().run()}
                className="size-7 justify-center rounded-full border p-0 text-xs"
              >
                A
              </DropdownMenuItem>
              {COLORES.map((col) => (
                <DropdownMenuItem
                  key={col}
                  aria-label={`Color ${col}`}
                  onClick={() => c().setColor(col).run()}
                  className={cn("size-7 rounded-full p-0", s.color === col && "ring-2 ring-primary ring-offset-1")}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <PopoverUrl
          etiqueta="Enlace"
          activo={s.link}
          placeholder="https://…"
          inicial={(editor.getAttributes("link").href as string | undefined) ?? ""}
          onAplicar={(url) =>
            url
              ? c().extendMarkRange("link").setLink({ href: url }).run()
              : c().extendMarkRange("link").unsetLink().run()
          }
        >
          <LinkIcon />
        </PopoverUrl>
        {/* TODO: subir la imagen al file-service cuando exista el backend; hoy solo por URL. */}
        <PopoverUrl
          etiqueta="Imagen"
          placeholder="URL de la imagen"
          onAplicar={(url) => url && c().setImage({ src: url }).run()}
        >
          <ImageIcon />
        </PopoverUrl>
      </Grupo>
      <Grupo>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Listas"
            className={cn(
              "flex h-8 items-center gap-0.5 rounded-md px-1.5 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              (s.bullet || s.ordered) && "bg-primary/10 text-primary",
            )}
          >
            {s.ordered ? <ListNumbersIcon className="size-5" /> : <ListBulletsIcon className="size-5" />}
            <CaretDownFillIcon aria-hidden className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44">
            <DropdownMenuItem onClick={() => c().toggleBulletList().run()}>
              <ListBulletsIcon /> Viñetas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => c().toggleOrderedList().run()}>
              <ListNumbersIcon /> Numerada
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {(
          [
            ["left", "Alinear a la izquierda", TextAlignLeftFillIcon],
            ["center", "Centrar", TextAlignCenterIcon],
            ["right", "Alinear a la derecha", TextAlignRightIcon],
            ["justify", "Justificar", TextAlignJustifyIcon],
          ] as const
        ).map(([a, etiqueta, Icono]) => (
          <Boton key={a} etiqueta={etiqueta} activo={s.align === a} onClick={() => c().setTextAlign(a).run()}>
            <Icono />
          </Boton>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Interlineado"
            title="Interlineado"
            className="grid size-8 place-items-center rounded-md hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <LineSpacingIcon className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-32">
            {INTERLINEADOS.map((l) => (
              <DropdownMenuItem key={l} onClick={() => c().setLineHeight(l).run()}>
                {l}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* La sangría aplica a listas: sube o baja un nivel el ítem. */}
        <Boton
          etiqueta="Disminuir sangría"
          disabled={!s.enLista}
          onClick={() => c().liftListItem("listItem").run()}
        >
          <TextOutdentIcon />
        </Boton>
        <Boton
          etiqueta="Aumentar sangría"
          disabled={!s.enLista}
          onClick={() => c().sinkListItem("listItem").run()}
        >
          <TextIndentIcon />
        </Boton>
        <Boton etiqueta="Quitar formato" onClick={() => c().unsetAllMarks().clearNodes().run()}>
          <TextClearIcon />
        </Boton>
      </Grupo>
    </div>
  )
}

function Grupo({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-0.5 px-1">{children}</div>
}

function Boton({
  etiqueta,
  onClick,
  activo,
  disabled,
  redondo,
  children,
}: {
  etiqueta: string
  onClick: () => void
  activo?: boolean
  disabled?: boolean
  redondo?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={activo}
      disabled={disabled}
      // Evita que el editor pierda la selección al pulsar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid place-items-center hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-5",
        redondo ? "size-7 rounded-full [&_svg]:size-4" : "size-8 rounded-md",
        activo && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  )
}

function PopoverUrl({
  etiqueta,
  placeholder,
  inicial = "",
  activo,
  onAplicar,
  children,
}: {
  etiqueta: string
  placeholder: string
  inicial?: string
  activo?: boolean
  onAplicar: (url: string) => void
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  const [url, setUrl] = useState("")
  const valida = !url.trim() || /^https?:\/\/\S+$/i.test(url.trim())

  return (
    <Popover
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o)
        if (o) setUrl(inicial)
      }}
    >
      <PopoverTrigger
        aria-label={etiqueta}
        title={etiqueta}
        className={cn(
          "grid size-8 place-items-center rounded-md hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none [&_svg]:size-5",
          activo && "bg-primary/10 text-primary",
        )}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 gap-2 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!valida) return
            onAplicar(url.trim())
            setAbierto(false)
          }}
          className="flex gap-2"
        >
          <Input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder}
            aria-label={`URL de ${etiqueta.toLowerCase()}`}
            aria-invalid={!valida || undefined}
          />
          <Button type="submit" disabled={!valida}>
            Aplicar
          </Button>
        </form>
        {!valida && <p className="text-xs text-red">Escribe una dirección que empiece por https://</p>}
      </PopoverContent>
    </Popover>
  )
}
