import {
  BellIcon,
  BuildingsIcon,
  CalendarDotsIcon,
  ChatCircleTextIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  GearIcon,
  VideoCameraIcon,
} from "@/components/ui/icons"

import type { CategoriaNotificacion, EstadoLectura } from "@/features/notificaciones/api/types"

export const CATEGORIA_LABELS: Record<CategoriaNotificacion, string> = {
  CHAT: "Chat",
  LLAMADAS: "Llamadas",
  PLANEADOR: "Planeador",
  ASISTENCIA: "Asistencia",
  INFORMES: "Informes",
  ESTABLECIMIENTO: "Establecimiento",
  SISTEMA: "Sistema",
}

export const CATEGORIA_ICONS: Record<CategoriaNotificacion, typeof BellIcon> = {
  CHAT: ChatCircleTextIcon,
  LLAMADAS: VideoCameraIcon,
  PLANEADOR: CalendarDotsIcon,
  ASISTENCIA: ClipboardCheckIcon,
  INFORMES: FileTextIcon,
  ESTABLECIMIENTO: BuildingsIcon,
  SISTEMA: GearIcon,
}

export const ESTADO_LECTURA_LABELS: Record<EstadoLectura, string> = {
  "no-leidas": "No leídas",
  leidas: "Leídas",
}

/** Días 1-7 del backend (domingo = 1) en el orden en que se muestran (lunes primero). */
export const DIAS_SEMANA: { value: number; label: string; corto: string }[] = [
  { value: 2, label: "Lunes", corto: "L" },
  { value: 3, label: "Martes", corto: "M" },
  { value: 4, label: "Miércoles", corto: "X" },
  { value: 5, label: "Jueves", corto: "J" },
  { value: 6, label: "Viernes", corto: "V" },
  { value: 7, label: "Sábado", corto: "S" },
  { value: 1, label: "Domingo", corto: "D" },
]
