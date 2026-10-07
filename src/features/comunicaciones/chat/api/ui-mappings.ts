import type { IconType } from "react-icons"

import { FilePdfIcon, FileTextIcon, ImageIcon, VideoCameraIcon, type Icon } from "@/components/ui/icons"
import type { Audiencia, CategoriaCanal, FormatoArchivo } from "@/features/comunicaciones/chat/api/types"
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
export const TIPOS_CANAL: Array<{ categoria: CategoriaCanal; etiqueta: string }> = [
  { categoria: "GENERAL", etiqueta: "Chat" },
  { categoria: "VOTACION", etiqueta: "Elección" },
  { categoria: "ENCUESTA", etiqueta: "Encuesta" },
  { categoria: "EXAMEN", etiqueta: "Evaluación en línea" },
  { categoria: "ANUNCIO", etiqueta: "Comunicado" },
]

export const AUDIENCIAS: Array<{ value: Audiencia; label: string }> = [
  { value: "ESTUDIANTES", label: "Estudiantes" },
  { value: "DOCENTES", label: "Docentes" },
  { value: "PADRES", label: "Padres de familia" },
  { value: "DIRECTIVOS", label: "Directivos" },
  { value: "ADMINISTRATIVOS", label: "Administrativos" },
]
