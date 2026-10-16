import { useState } from "react"

import { urlEmoji } from "@/features/comunicaciones/chat/lib/emojis"
import { cn } from "@/lib/utils"

// Emoji con la imagen del set de Google; si no existe, cae al emoji de texto.
export function ImagenEmoji({ emoji, className }: { emoji: string; className?: string }) {
  const [fallo, setFallo] = useState(false)
  if (fallo) return <span className={cn("inline-grid place-items-center leading-none", className)}>{emoji}</span>
  return (
    <img
      src={urlEmoji(emoji)}
      alt={emoji}
      loading="lazy"
      draggable={false}
      onError={() => setFallo(true)}
      className={cn("inline-block size-5", className)}
    />
  )
}
