
import { AudioIcon, FilePdfIcon, FileTextIcon, FileZipIcon, type Icon, ImageIcon, VideoCameraIcon } from "@/components/ui/icons"
import { esAudio, esComprimido } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import type { Audiencia, CategoriaCanal, FormatoArchivo } from "@/features/comunicaciones/chat/api/types"
import {
  MegaphoneIcon,
  ChatTextIcon,
  ClipboardIcon,
  ListChecksIcon,
  BallotIcon,
} from "@/components/ui/icons"

export const ICONO_CATEGORIA: Record<CategoriaCanal, Icon> = {
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

const ICONO_COMPRIMIDO = { Icono: FileZipIcon, color: "text-orange", tipo: "Archivo comprimido" }
const ICONO_AUDIO = { Icono: AudioIcon, color: "text-green", tipo: "Audio" }

/**
 * Ícono de un adjunto. Los .zip/.rar llegan con formato OTRO (el CHECK de
 * `adjunto_formato` no tiene un valor propio), así que se distinguen por nombre.
 */
export function iconoArchivo(formato: FormatoArchivo, nombre: string | null | undefined) {
  if (formato === "OTRO" && esComprimido(nombre)) return ICONO_COMPRIMIDO
  // Las notas de voz también llegan como OTRO (no hay formato AUDIO en el CHECK).
  if (formato === "OTRO" && esAudio(nombre)) return ICONO_AUDIO
  return ICONO_ARCHIVO[formato]
}

// Orden y nombres del menú "Agregar canales".
export const TIPOS_CANAL: Array<{ categoria: CategoriaCanal; etiqueta: string }> = [
  { categoria: "GENERAL", etiqueta: "Foro" },
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
