import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { PaperclipIcon, XIcon } from "@/components/ui/icons"
import { Textarea } from "@/components/ui/textarea"
import { useNotify } from "@/components/notice/notice-context"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  codificarMenciones,
  consultaMencion,
  type Mencionable,
} from "@/features/comunicaciones/chat/lib/menciones"
import { useParticipantesQuery } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"

const MAX_ARCHIVOS = 3
const MAX_BYTES = 10 * 1024 * 1024
const ACEPTA = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"

/** Redacción del espacio: texto, `@nombre` de participantes y hasta 3 archivos de 10 MB (Sección 5.3). */
export function ComposerEspacio({
  espacioId,
  equipo,
  etiqueta,
  textoBoton,
  pendiente,
  onEnviar,
}: {
  espacioId: number
  equipo: number | null
  etiqueta: string
  textoBoton: string
  pendiente: boolean
  onEnviar: (datos: { texto: string; archivos: File[] }, listo: () => void) => void
}) {
  const { notify } = useNotify()
  const { user } = useAuth()
  const { data: participantes = [] } = useParticipantesQuery(espacioId, equipo)
  const [texto, setTexto] = useState("")
  const [archivos, setArchivos] = useState<File[]>([])
  const [elegidos, setElegidos] = useState<Mencionable[]>([])
  const [cursor, setCursor] = useState(0)
  const area = useRef<HTMLTextAreaElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)

  const consulta = consultaMencion(texto, cursor)
  const sugerencias = consulta
    ? participantes
        .filter((p) => p.usuarioId !== user?.userId && p.nombre.toLowerCase().includes(consulta.consulta.toLowerCase()))
        .slice(0, 6)
    : []

  const mencionar = (usuarioId: number, nombre: string) => {
    if (!consulta) return
    setTexto(`${texto.slice(0, consulta.inicio)}@${nombre} ${texto.slice(cursor)}`)
    setElegidos((prev) => [...prev.filter((e) => e.id !== usuarioId), { id: usuarioId, nombre }])
    setCursor(consulta.inicio + nombre.length + 2)
    area.current?.focus()
  }

  const agregar = (lista: FileList | null) => {
    const nuevos = [...archivos, ...Array.from(lista ?? [])]
    if (nuevos.length > MAX_ARCHIVOS) {
      notify(`Puede adjuntar hasta ${MAX_ARCHIVOS} archivos.`, { variant: "error" })
      return
    }
    if (nuevos.some((f) => f.size > MAX_BYTES)) {
      notify("Cada archivo admite hasta 10 MB.", { variant: "error" })
      return
    }
    setArchivos(nuevos)
  }

  const enviar = () => {
    if (!texto.trim() && archivos.length === 0) return
    onEnviar({ texto: codificarMenciones(texto.trim(), elegidos), archivos }, () => {
      setTexto("")
      setArchivos([])
      setElegidos([])
    })
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {sugerencias.length > 0 && (
          <ul className="absolute bottom-full z-10 mb-1 w-64 rounded-md border bg-popover p-1 shadow-md">
            {sugerencias.map((s) => (
              <li key={s.usuarioId}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted focus-visible:bg-muted"
                  onClick={() => mencionar(s.usuarioId, s.nombre)}
                >
                  {s.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Textarea
          ref={area}
          aria-label={etiqueta}
          placeholder={etiqueta}
          value={texto}
          maxLength={4000}
          onChange={(e) => {
            setTexto(e.target.value)
            setCursor(e.target.selectionStart)
          }}
          onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
        />
      </div>
      {archivos.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {archivos.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded border px-2 py-1">
              {f.name}
              <button
                type="button"
                aria-label={`Quitar ${f.name}`}
                onClick={() => setArchivos(archivos.filter((_, x) => x !== i))}
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2">
        <input
          ref={archivoRef}
          type="file"
          multiple
          hidden
          accept={ACEPTA}
          onChange={(e) => {
            agregar(e.target.files)
            e.target.value = ""
          }}
        />
        <Button variant="ghost" color="neutral" size="sm" onClick={() => archivoRef.current?.click()}>
          <PaperclipIcon data-icon="inline-start" aria-hidden />
          Adjuntar
        </Button>
        <Button size="sm" disabled={pendiente || (!texto.trim() && archivos.length === 0)} onClick={enviar}>
          {textoBoton}
        </Button>
      </div>
    </div>
  )
}
