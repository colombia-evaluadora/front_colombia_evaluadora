import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { AdjuntoComunicado } from "@/features/comunicaciones/chat/api/types"
import { validarAdjunto } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { Etiqueta } from "@/features/comunicaciones/comunicados/components/conjunto-destinatarios"

export const MAX_ADJUNTOS = 5
export const MAX_ADJUNTO_MB = 10

/**
 * Adjuntos de Nuevo y Modificar comunicado (M.1.AGR.1 / M.1.EDI.1): "Cargar archivos", un chip con ×
 * por archivo y "N de 5 · 10 MB cada uno". En Modificar, los ya guardados aparecen como chips que se
 * pueden quitar (`quitados`); los nuevos y los guardados vigentes comparten el cupo de 5.
 */
export function AdjuntosCarga({
  archivos,
  onArchivos,
  guardados = [],
  quitados = [],
  onQuitados,
  deshabilitado = false,
}: {
  archivos: File[]
  onArchivos: (v: File[]) => void
  guardados?: AdjuntoComunicado[]
  quitados?: number[]
  onQuitados?: (v: number[]) => void
  deshabilitado?: boolean
}) {
  const selector = useRef<HTMLInputElement>(null)
  const [rechazo, setRechazo] = useState<string | null>(null)
  const vigentes = guardados.filter((g) => !quitados.includes(g.id))
  const total = vigentes.length + archivos.length

  const agregar = (nuevos: File[]) => {
    setRechazo(null)
    const aceptados = [...archivos]
    for (const f of nuevos) {
      const error = validarAdjunto(f, MAX_ADJUNTO_MB)
      if (error) setRechazo(`${f.name}: ${error}`)
      else if (vigentes.length + aceptados.length >= MAX_ADJUNTOS) {
        setRechazo(`Puede adjuntar máximo ${MAX_ADJUNTOS} archivos.`)
      } else if (!aceptados.some((x) => x.name === f.name && x.size === f.size)) aceptados.push(f)
    }
    onArchivos(aceptados)
  }

  const chip = (clave: string, nombre: string, onQuitar: () => void) => (
    <span
      key={clave}
      className={cn("inline-flex max-w-full items-center gap-1 rounded border px-2 py-0.5 text-xs")}
    >
      <span className="min-w-0 truncate">{nombre}</span>
      <button
        type="button"
        aria-label={`Quitar ${nombre}`}
        className="rounded hover:bg-muted disabled:opacity-50"
        disabled={deshabilitado}
        onClick={onQuitar}
      >
        <XIcon className="size-3.5" />
      </button>
    </span>
  )

  return (
    <div className="space-y-2">
      <Etiqueta>Adjuntos</Etiqueta>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={selector}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            agregar(Array.from(e.target.files ?? []))
            e.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="outline"
          color="neutral"
          disabled={total >= MAX_ADJUNTOS || deshabilitado}
          onClick={() => selector.current?.click()}
        >
          Cargar archivos
        </Button>
        {vigentes.map((g) => chip(`g-${g.id}`, g.nombre, () => onQuitados?.([...quitados, g.id])))}
        {archivos.map((f) =>
          chip(`${f.name}-${f.size}`, f.name, () => onArchivos(archivos.filter((x) => x !== f))),
        )}
        <span className="text-sm text-muted-foreground">
          {total} de {MAX_ADJUNTOS} · {MAX_ADJUNTO_MB} MB cada uno
        </span>
      </div>
      {rechazo && (
        <p role="alert" className="text-xs text-red">
          {rechazo}
        </p>
      )}
    </div>
  )
}
