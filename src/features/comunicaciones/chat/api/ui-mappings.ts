import type { IconType } from "react-icons"

import { FilePdfIcon, FileTextIcon, ImageIcon, VideoCameraIcon, type Icon } from "@/components/ui/icons"
import type { CategoriaCanal, FormatoArchivo } from "@/features/comunicaciones/chat/api/types"
import {
  MegaphoneIcon,
  ChatTextIcon,
  ClipboardIcon,
  ListChecksIcon,
  BallotIcon,
} from "@/components/ui/icons"

export const ICONO_CATEGORIA: Record<CategoriaCanal, IconType> = {
  GENERAL: ChatTextIcon,
  VOTACION: BallotIcon,
  ENCUESTA: ClipboardIcon,
  EXAMEN: ListChecksIcon,
  ANUNCIO: MegaphoneIcon,
}

export const ICONO_ARCHIVO: Record<FormatoArchivo, { Icono: Icon; color: string; tipo: string }> = {
  WORD: { Icono: FileTextIcon, color: "text-blue", tipo: "Documento de Word" },
  PDF: { Icono: FilePdfIcon, color: "text-red", tipo: "PDF" },
  IMAGEN: { Icono: ImageIcon, color: "text-purple", tipo: "Imagen" },
  VIDEO: { Icono: VideoCameraIcon, color: "text-purple", tipo: "Video" },
  OTRO: { Icono: FileTextIcon, color: "text-muted-foreground", tipo: "Otro" },
}

// Orden y nombres del menú "Agregar canales".
export const TIPOS_CANAL: Array<{ categoria: CategoriaCanal; etiqueta: string; titulo: string }> = [
  { categoria: "GENERAL", etiqueta: "Chat", titulo: "Nuevo canal de chat" },
  { categoria: "VOTACION", etiqueta: "Elección", titulo: "Nueva elección" },
  { categoria: "ENCUESTA", etiqueta: "Encuesta", titulo: "Nueva encuesta" },
  { categoria: "EXAMEN", etiqueta: "Evaluación en línea", titulo: "Nueva evaluación en línea" },
  { categoria: "ANUNCIO", etiqueta: "Comunicado", titulo: "Nuevo comunicado" },
]
