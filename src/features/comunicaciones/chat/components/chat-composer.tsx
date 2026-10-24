import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react"

import {
  CheckIcon,
  ClockIcon,
  FileIcon,
  ImagesIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  StopIcon,
  PlusIcon,
  XIcon,
} from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { iconoArchivo } from "@/features/comunicaciones/chat/api/ui-mappings"
import { SelectorEmoji } from "@/features/comunicaciones/chat/components/selector-emoji"
import {
  ACEPTA_DOCUMENTOS,
  ACEPTA_MULTIMEDIA,
  MAX_ADJUNTOS,
  agregarAdjuntos,
  esAudio,
  formatoDeArchivo,
  pesoLegible,
} from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { useGrabadorNota } from "@/features/comunicaciones/chat/hooks/use-grabador-nota"
import { MAX_NOTA_SEGUNDOS, duracionLegible } from "@/features/comunicaciones/chat/lib/nota-de-voz"
import { ReproductorLocal } from "@/features/comunicaciones/chat/components/reproductor-audio"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/api-client"
import { ProgramarMensajeDialog } from "@/features/comunicaciones/chat/components/programar-mensaje-dialog"
import {
  consultaAtajo,
  filtrarAtajos,
  type AtajoComposer,
  type IdAtajo,
} from "@/features/comunicaciones/chat/lib/atajos-composer"
import { MenuAtajos } from "@/features/comunicaciones/chat/components/menu-atajos"
import {
  SmileyIcon,
  TextAaIcon,
  AtIcon,
  CodeBlockIcon,
  QuotesIcon,
  CodeIcon,
  TextItalicIcon,
  LinkIcon,
  ListNumbersIcon,
  ListBulletsIcon,
  TextBIcon,
  TextStrikethroughIcon,
} from "@/components/ui/icons"
import {
  alternarBloque,
  alternarBloqueCodigo,
  alternarMarca,
  insertarEnlace,
  type Edicion,
} from "@/features/comunicaciones/chat/lib/formato-texto"
import {
  codificarMenciones,
  consultaMencion,
  sugerenciasMencion,
  type Mencionable,
  type Sugerencia,
} from "@/features/comunicaciones/chat/lib/menciones"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

const MAX_CARACTERES = 4000

// Items del menú en oración (el base los pone en mayúsculas).
const ITEM_MENU = "gap-3 py-2.5 text-sm font-normal tracking-normal normal-case [&_svg]:size-5!"

interface ChatComposerProps {
  textoInicial?: string
  destino: string
  enviando: boolean
  // `archivos`: los adjuntos elegidos (hasta `MAX_ADJUNTOS`), en orden.
  onEnviar: (texto: string, archivos: File[]) => Promise<unknown>
  // "edicion": guarda con un check y no permite adjuntar.
  variante?: "nuevo" | "edicion"
  className?: string
  autoFocus?: boolean
  // Autocompletado de menciones: miembros del canal (sin el usuario actual).
  miembros?: readonly (Mencionable & { cargo?: string; perfil?: PerfilChat })[]
  // `@canal` / `@todos` según la política de la institución.
  permitirMasivas?: boolean
  // Personas ya mencionadas en `textoInicial` (al editar), para volver a codificarlas.
  mencionesIniciales?: Mencionable[]
  // Barra "Respondiendo a …" sobre el editor.
  respondiendoA?: { autor: string; texto: string } | null
  onCancelarRespuesta?: () => void
  // Señal "escribiendo" (con throttle en quien la recibe).
  onEscribiendo?: () => void
  // Al desmontar (cambiar de canal o de vista) recibe lo que quedó escrito si
  // cambió respecto de `textoInicial`: el borrador del canal. Vacío lo descarta.
  onGuardarBorrador?: (texto: string) => void
  // "Programar envío": manda el texto a la hora elegida (`yyyy-MM-ddTHH:mm`, hora de Bogotá).
  // Solo texto: un adjunto se envía en el momento.
  onProgramar?: (texto: string, programadoPara: string) => Promise<unknown>
  // Atajos "/" que abre la página (crear actividades, votación rápida); los que faltan no se
  // ofrecen. "Adjuntar" y "Programar envío" los resuelve el propio compositor.
  onAtajo?: AccionesAtajo
}

export type AccionesAtajo = Partial<Record<Exclude<IdAtajo, "adjuntar" | "programar">, () => void>>

export function ChatComposer({
  destino,
  enviando,
  onEnviar,
  textoInicial = "",
  variante = "nuevo",
  className,
  autoFocus,
  miembros = [],
  permitirMasivas = false,
  mencionesIniciales = [],
  respondiendoA,
  onCancelarRespuesta,
  onEscribiendo,
  onGuardarBorrador,
  onProgramar,
  onAtajo,
}: ChatComposerProps) {
  const id = useId()
  const edicion = variante === "edicion"
  const [texto, setTexto] = useState(textoInicial)
  const [archivos, setArchivos] = useState<File[]>([])
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const elegirArchivos = (nuevos: File[]) => {
    const { archivos: siguientes, error } = agregarAdjuntos(archivos, nuevos)
    setErrorArchivo(error)
    setArchivos(siguientes)
  }
  const quitarArchivo = (indice: number) => {
    setErrorArchivo(null)
    setArchivos((prev) => prev.filter((_, i) => i !== indice))
  }
  const hayArchivos = archivos.length > 0
  // Nota de voz: al detener queda como un archivo pendiente más (se escucha y se quita ahí).
  const grabador = useGrabadorNota({
    onGrabada: (archivo) => elegirArchivos([archivo]),
    onError: setErrorArchivo,
  })
  const grabando = grabador.estado !== "inactivo"
  // Último texto y callback, para guardarlos como borrador al desmontar.
  const borradorRef = useRef({ texto, onGuardarBorrador })
  useEffect(() => {
    borradorRef.current = { texto, onGuardarBorrador }
  })
  useEffect(
    () => () => {
      const { texto: final, onGuardarBorrador: guardar } = borradorRef.current
      if (guardar && final.trim() !== textoInicial.trim()) guardar(final.trim())
    },
    [textoInicial],
  )
  const docRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  // Aa abre/cierra la barra de formato (antes salía sola con el foco y Aa no hacía nada visible).
  const [formatoAbierto, setFormatoAbierto] = useState(false)
  const listo = (texto.trim().length > 0 || hayArchivos) && !enviando && !grabando
  // `conTexto`: el atajo "/programar" con el compositor vacío pide el texto en el diálogo.
  const [programar, setProgramar] = useState<{ guardando: boolean; error: string | null; conTexto?: boolean } | null>(
    null,
  )
  const programable = !edicion && !!onProgramar && texto.trim().length > 0 && !hayArchivos && !enviando
  const confirmarProgramacion = async ({ programadoPara, texto: delDialogo }: { texto?: string; programadoPara: string }) => {
    if (!onProgramar) return
    setProgramar((p) => ({ guardando: true, error: null, conTexto: p?.conTexto }))
    try {
      await onProgramar(delDialogo ?? codificarMenciones(texto.trim(), elegidos), programadoPara)
      if (delDialogo === undefined) {
        setTexto("")
        setElegidos([])
        setConsulta(null)
      }
      setProgramar(null)
    } catch (error) {
      setProgramar((p) => ({ guardando: false, error: getErrorMessage(error), conTexto: p?.conTexto }))
    }
  }

  // Atajos "/": con el botón se listan todos; escribiendo "/…" al inicio se filtran.
  const disponibles = new Set<IdAtajo>(
    edicion
      ? []
      : [
          ...(Object.keys(onAtajo ?? {}) as IdAtajo[]),
          "adjuntar",
          ...(onProgramar ? (["programar"] as const) : []),
        ],
  )
  const [menuAtajos, setMenuAtajos] = useState(false)
  const [atajoActivo, setAtajoActivo] = useState(0)
  const consultaEscrita = disponibles.size > 0 ? consultaAtajo(texto) : null
  const atajos = menuAtajos
    ? filtrarAtajos("", disponibles)
    : consultaEscrita !== null
      ? filtrarAtajos(consultaEscrita, disponibles)
      : []
  const atajosAbiertos = atajos.length > 0
  const atajosId = useId()

  const elegirAtajo = (a: AtajoComposer) => {
    // El comando escrito ("/encuesta") no queda en el mensaje.
    const escrito = consultaEscrita !== null
    const restante = escrito ? "" : texto
    if (escrito) setTexto("")
    setMenuAtajos(false)
    setAtajoActivo(0)
    if (a.id === "adjuntar") docRef.current?.click()
    else if (a.id === "programar") {
      setProgramar({ guardando: false, error: null, conTexto: !restante.trim() || hayArchivos })
    } else onAtajo?.[a.id]?.()
  }

  const navegarAtajos = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!atajosAbiertos) return false
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const paso = e.key === "ArrowDown" ? 1 : -1
      setAtajoActivo((i) => (i + paso + atajos.length) % atajos.length)
    } else if (e.key === "Enter" || e.key === "Tab") {
      elegirAtajo(atajos[atajoActivo] ?? atajos[0])
    } else if (e.key === "Escape") {
      setMenuAtajos(false)
      if (consultaEscrita !== null) setTexto("")
    } else return false
    e.preventDefault()
    return true
  }
  const listaId = useId()
  // Personas elegidas en el autocompletado: al enviar `@Nombre` pasa a `<@id>`.
  const [elegidos, setElegidos] = useState<Mencionable[]>(mencionesIniciales)
  const [consulta, setConsulta] = useState<{ inicio: number; consulta: string } | null>(null)
  const [activa, setActiva] = useState(0)
  const sugerencias =
    CHAT_FUNCIONES.menciones && consulta ? sugerenciasMencion(consulta.consulta, miembros, permitirMasivas) : []
  const abiertas = sugerencias.length > 0

  const actualizarConsulta = (valor: string, cursor: number) => {
    setConsulta(consultaMencion(valor, cursor))
    setActiva(0)
  }

  const elegir = (s: Sugerencia) => {
    const area = areaRef.current
    if (!consulta || !area) return
    const fin = area.selectionStart
    const valor = `@${s.nombre} `
    setTexto(texto.slice(0, consulta.inicio) + valor + texto.slice(fin))
    if (s.tipo === "USUARIO") setElegidos((prev) => [...prev, { id: s.id, nombre: s.nombre }])
    setConsulta(null)
    const pos = consulta.inicio + valor.length
    requestAnimationFrame(() => {
      area.focus()
      area.setSelectionRange(pos, pos)
    })
  }

  // Teclas del autocompletado; devuelve true si las consumió.
  const navegarSugerencias = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!abiertas) return false
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const paso = e.key === "ArrowDown" ? 1 : -1
      setActiva((i) => (i + paso + sugerencias.length) % sugerencias.length)
    } else if (e.key === "Enter" || e.key === "Tab") {
      elegir(sugerencias[activa] ?? sugerencias[0])
    } else if (e.key === "Escape") {
      setConsulta(null)
    } else return false
    e.preventDefault()
    return true
  }

  const enviar = async () => {
    if (!listo) return
    try {
      await onEnviar(codificarMenciones(texto.trim(), elegidos), archivos)
      setTexto("")
      setArchivos([])
      setErrorArchivo(null)
      setElegidos([])
      setConsulta(null)
    } catch {
      // El error lo muestra la página; se conserva el texto para reintentar.
    } finally {
      areaRef.current?.focus()
    }
  }

  // Inserta en el cursor (menciones y emojis).
  const insertar = (valor: string) => {
    const area = areaRef.current
    const inicio = area?.selectionStart ?? texto.length
    const fin = area?.selectionEnd ?? texto.length
    const nuevo = texto.slice(0, inicio) + valor + texto.slice(fin)
    setTexto(nuevo)
    actualizarConsulta(nuevo, inicio + valor.length)
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
    <>
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void enviar()
      }}
      className={cn("relative shrink-0 border-t p-3 md:p-4", className)}
    >
      {abiertas && (
        <ul
          id={listaId}
          role="listbox"
          aria-label="Personas para mencionar"
          className="absolute inset-x-3 bottom-full z-20 mb-1 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md md:inset-x-4"
        >
          {sugerencias.map((s, i) => (
            <li
              key={s.tipo === "USUARIO" ? `u-${s.id}` : s.tipo}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={i === activa}
              // mousedown: elegir antes de que el textarea pierda el foco.
              onMouseDown={(e) => {
                e.preventDefault()
                elegir(s)
              }}
              onMouseEnter={() => setActiva(i)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-muted"
            >
              <span className="font-medium">@{s.nombre}</span>
              {s.detalle && <span className="truncate text-xs text-muted-foreground">{s.detalle}</span>}
            </li>
          ))}
        </ul>
      )}
      {atajosAbiertos && (
        <MenuAtajos
          id={atajosId}
          atajos={atajos}
          activo={atajoActivo}
          onActivar={setAtajoActivo}
          onElegir={elegirAtajo}
          sinTexto={consultaEscrita !== null || !texto.trim()}
        />
      )}
      {respondiendoA && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
          <span className="min-w-0 flex-1 truncate">
            Respondiendo a <span className="font-semibold">{respondiendoA.autor}</span>
            {respondiendoA.texto && <span className="text-muted-foreground">: {respondiendoA.texto}</span>}
          </span>
          <button
            type="button"
            aria-label="Cancelar respuesta"
            onClick={onCancelarRespuesta}
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}
      <div
        className="rounded-xl border bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
      >
        {formatoAbierto && (
          <div
            id={`${id}-formato`}
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
        {hayArchivos && (
          <ul aria-label={`Archivos para enviar (${archivos.length} de ${MAX_ADJUNTOS})`} className="mx-3 mt-3 flex flex-wrap gap-2">
            {archivos.map((a, i) => (
              <li key={`${a.name}-${a.size}-${a.lastModified}`} className="max-w-full">
                <ArchivoPendiente archivo={a} onQuitar={() => quitarArchivo(i)} />
              </li>
            ))}
          </ul>
        )}
        {grabador.estado === "grabando" && (
          <div
            role="status"
            className="mx-3 mt-3 flex items-center gap-3 rounded-lg border border-red-stroke bg-red-22 px-3 py-2 text-sm"
          >
            <span aria-hidden className="size-2.5 shrink-0 animate-pulse rounded-full bg-red motion-reduce:animate-none" />
            <span className="font-medium text-red">Grabando nota de voz</span>
            <span className="text-xs tabular-nums text-muted-foreground" aria-label={`${duracionLegible(grabador.segundos)} de ${duracionLegible(MAX_NOTA_SEGUNDOS)}`}>
              {duracionLegible(grabador.segundos)} / {duracionLegible(MAX_NOTA_SEGUNDOS)}
            </span>
            <button
              type="button"
              onClick={grabador.cancelar}
              aria-label="Cancelar grabación"
              title="Cancelar"
              className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <XIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={grabador.detener}
              aria-label="Detener grabación"
              title="Detener"
              className="grid size-8 place-items-center rounded-full bg-red text-red-foreground hover:bg-red/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <StopIcon className="size-5" />
            </button>
          </div>
        )}
        {errorArchivo && (
          <p role="alert" className="mx-3 mt-2 text-xs text-red">
            {errorArchivo}
          </p>
        )}
        <textarea
          id={id}
          autoFocus={autoFocus}
          ref={areaRef}
          rows={1}
          value={texto}
          maxLength={MAX_CARACTERES}
          role="combobox"
          aria-expanded={abiertas || atajosAbiertos}
          aria-controls={abiertas ? listaId : atajosAbiertos ? atajosId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            abiertas ? `${listaId}-${activa}` : atajosAbiertos ? `${atajosId}-${atajoActivo}` : undefined
          }
          onChange={(e) => {
            setTexto(e.target.value)
            setAtajoActivo(0)
            actualizarConsulta(e.target.value, e.target.selectionStart)
            if (e.target.value) onEscribiendo?.()
          }}
          onBlur={() => {
            setConsulta(null)
            setMenuAtajos(false)
          }}
          onKeyDown={(e) => {
            if (navegarAtajos(e)) return
            if (navegarSugerencias(e)) return
            if (e.key === "Escape" && respondiendoA) {
              onCancelarRespuesta?.()
              return
            }
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
          {/* En "Edita el mensaje" no se adjunta (era un + deshabilitado sin función): los adjuntos
              del mensaje se listan y quitan en la sección "Adjuntos" del diálogo. */}
          {!edicion && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Adjuntar archivos"
                disabled={archivos.length >= MAX_ADJUNTOS}
                title={archivos.length >= MAX_ADJUNTOS ? `Máximo ${MAX_ADJUNTOS} archivos por mensaje` : undefined}
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
          <SelectorArchivo ref={docRef} accept={ACEPTA_DOCUMENTOS} onArchivos={elegirArchivos} />
          <SelectorArchivo ref={mediaRef} accept={ACEPTA_MULTIMEDIA} onArchivos={elegirArchivos} />
          {/* Aa abre/cierra la barra de formato (diseño 3729:38181), en el compositor y en "Edita el mensaje". */}
          <button
            type="button"
            aria-label="Formato"
            title="Formato"
            aria-pressed={formatoAbierto}
            aria-controls={formatoAbierto ? `${id}-formato` : undefined}
            onClick={() => {
              setFormatoAbierto((v) => !v)
              areaRef.current?.focus()
            }}
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-pressed:bg-muted/50 aria-pressed:text-primary"
          >
            <TextAaIcon className="size-5" />
          </button>
          <SelectorEmoji
            etiqueta="Insertar emoji"
            onElegir={insertar}
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:bg-muted/50 data-popup-open:text-foreground"
          >
            <SmileyIcon className="size-5" />
          </SelectorEmoji>
          {CHAT_FUNCIONES.menciones && (
            <Herramienta etiqueta="Mencionar a alguien" onClick={() => insertar("@")}>
              <AtIcon className="size-5" />
            </Herramienta>
          )}
          {/* Nota de voz (micrófono del diseño): se graba y se adjunta como un archivo más. Sin
              videollamadas ni grabación de video: quedaron fuera del alcance. */}
          {!edicion && (
            <Herramienta
              etiqueta={grabador.estado === "pidiendo" ? "Esperando permiso del micrófono" : "Grabar nota de voz"}
              onClick={() => {
                setErrorArchivo(null)
                void grabador.iniciar()
              }}
              deshabilitado={grabando || archivos.length >= MAX_ADJUNTOS || enviando}
            >
              <MicrophoneIcon className="size-5" />
            </Herramienta>
          )}
          {disponibles.size > 0 && (
            <>
              <Separador />
              {/* Botón «/» de atajos (diseños 3846:66590 y 4485:66928); también se abre escribiendo "/". */}
              <button
                type="button"
                aria-label="Atajos"
                title="Atajos (escribe / al inicio del mensaje)"
                aria-haspopup="listbox"
                aria-expanded={atajosAbiertos}
                aria-controls={atajosAbiertos ? atajosId : undefined}
                // mousedown: no quitar el foco al editor (el menú se maneja con el teclado desde ahí).
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setMenuAtajos((v) => !v)
                  setAtajoActivo(0)
                  areaRef.current?.focus()
                }}
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-expanded:bg-muted/50 aria-expanded:text-foreground"
              >
                <span
                  aria-hidden
                  className="grid size-5 place-items-center rounded-[5px] border-[1.5px] border-current text-xs leading-none font-semibold"
                >
                  /
                </span>
              </button>
            </>
          )}

          {!edicion && onProgramar && (
            <Herramienta
              etiqueta="Programar envío"
              onClick={() => setProgramar({ guardando: false, error: null })}
              deshabilitado={!programable}
              className="ml-auto"
            >
              <ClockIcon className="size-5" />
            </Herramienta>
          )}
          <button
            type="submit"
            disabled={!listo}
            aria-label={edicion ? "Guardar cambios" : "Enviar mensaje"}
            className={cn(
              !(!edicion && onProgramar) && "ml-auto",
              "grid size-9 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
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
      {programar && (
        <ProgramarMensajeDialog
          open
          onOpenChange={(o) => !o && setProgramar(null)}
          destino={destino}
          guardando={programar.guardando}
          error={programar.error}
          // Desde "/programar" sin texto: el mensaje se escribe en el diálogo.
          textoInicial={programar.conTexto ? "" : undefined}
          titulo={programar.conTexto ? "Programar un mensaje" : undefined}
          onConfirmar={(v) => void confirmarProgramacion(v)}
        />
      )}
    </>
  )
}

function Herramienta({
  etiqueta,
  onClick,
  pendiente = false,
  deshabilitado = false,
  circular = false,
  className,
  children,
}: {
  etiqueta: string
  onClick?: () => void
  pendiente?: boolean
  deshabilitado?: boolean
  circular?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pendiente || deshabilitado}
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
  onArchivos,
}: {
  ref: Ref<HTMLInputElement>
  accept: string
  onArchivos: (archivos: File[]) => void
}) {
  return (
    <input
      ref={ref}
      type="file"
      accept={accept}
      multiple
      hidden
      onChange={(e) => {
        const elegidos = Array.from(e.target.files ?? [])
        if (elegidos.length > 0) onArchivos(elegidos)
        // Permite volver a elegir el mismo archivo.
        e.target.value = ""
      }}
    />
  )
}

function ArchivoPendiente({ archivo, onQuitar }: { archivo: File; onQuitar: () => void }) {
  if (esAudio(archivo.name)) return <AudioPendiente archivo={archivo} onQuitar={onQuitar} />
  const { Icono, color } = iconoArchivo(formatoDeArchivo(archivo), archivo.name)
  return (
    <div className="flex w-fit max-w-full items-center gap-2 rounded-lg border bg-card py-1.5 pr-1 pl-2">
      <Icono aria-hidden className={cn("size-6 shrink-0", color)} />
      <span className="min-w-0 truncate text-sm font-medium">{archivo.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{pesoLegible(archivo.size)}</span>
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

// Audio por enviar (nota de voz recién grabada o archivo de audio): se escucha antes de
// mandarlo y se puede quitar.
function AudioPendiente({ archivo, onQuitar }: { archivo: File; onQuitar: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(archivo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [archivo])
  return (
    <div className="flex w-full max-w-sm items-center gap-2 rounded-lg border bg-card py-1.5 pr-1 pl-2">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate font-medium text-foreground">{archivo.name}</span>
          <span className="shrink-0">{pesoLegible(archivo.size)}</span>
        </span>
        {url && <ReproductorLocal src={url} nombre={archivo.name} className="mt-1 h-9" />}
      </span>
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
