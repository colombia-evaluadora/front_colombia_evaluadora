import {
  ArrowsDownUpIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  ClipboardAddIcon,
  EyeIcon,
  GavelIcon,
  PencilIcon,
  ProhibitIcon,
  UserSwitchIcon,
} from "@/components/ui/icons"

import { AccionesFila, type AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { esFinal } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { EstadoCasoCodigo } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { BanderasCaso } from "@/features/gestion-estudiantil/convivencia/utils/access"

export type AccionCaso =
  | "ver"
  | "modificar"
  | "fechas"
  | "accion"
  | "gestor"
  | "tipo"
  | "cerrar"
  | "anular"
  | "proceso"
  | "citar"
  | "compromiso"

/** Las once acciones de la fila: 4 como iconos y el resto en ⋮. */
export const ACCIONES_CASO = 11

export interface CasoMenuInfo {
  numero: string | number
  estado_codigo: EstadoCasoCodigo
  sinGestor: boolean
  /** Banderas `puede_*` de la fila o del detalle: las decide el backend. */
  banderas: BanderasCaso
}

interface MenuAccionesCasoProps {
  caso: CasoMenuInfo
  onAccion: (accion: AccionCaso) => void
  /** En el detalle no se repite «Ver detalle» y todo va en un ⋮ del encabezado. */
  conVer?: boolean
  /** Crear en CITACIONES_COMPROMISOS: sin él, «Citar» y «Crear compromiso» quedan deshabilitadas. */
  puedeCitar?: boolean
  /** Capacidad `citaciones_puede_crear_compromiso`: «Crear compromiso» tiene su propio gate (el Administrador cita pero no crea compromisos). */
  puedeCrearCompromiso?: boolean
}

/**
 * Acciones del caso (G.2.CAS.LIS.3): todas visibles y las que no aplican, deshabilitadas según las banderas del
 * backend. Un caso Cerrado o Anulado no muestra acciones: en la fila solo queda «Ver detalle».
 */
export function MenuAccionesCaso({ caso, onAccion, conVer = true, puedeCitar = false, puedeCrearCompromiso = false }: MenuAccionesCasoProps) {
  const b = caso.banderas
  const lista: AccionFila[] = [
    { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
    { id: "modificar", label: "Modificar", icon: <PencilIcon />, disabled: !b.puede_modificar, onSelect: () => onAccion("modificar") },
    { id: "fechas", label: "Corregir fechas", icon: <CalendarBlankIcon />, disabled: !b.puede_corregir_fechas, onSelect: () => onAccion("fechas") },
    { id: "accion", label: "Registrar acción", icon: <ClipboardAddIcon />, disabled: !b.puede_registrar_accion, onSelect: () => onAccion("accion") },
    {
      id: "gestor",
      label: caso.sinGestor ? "Asignar gestor" : "Reasignar gestor",
      icon: <UserSwitchIcon />,
      disabled: !(caso.sinGestor ? b.puede_asignar_gestor : b.puede_reasignar),
      onSelect: () => onAccion("gestor"),
    },
    { id: "tipo", label: "Cambiar tipo", icon: <ArrowsDownUpIcon />, disabled: !b.puede_cambiar_tipo, onSelect: () => onAccion("tipo") },
    { id: "proceso", label: "Abrir proceso disciplinario", icon: <GavelIcon />, disabled: !b.puede_abrir_proceso, onSelect: () => onAccion("proceso") },
    { id: "cerrar", label: "Cerrar", icon: <CheckCircleIcon />, disabled: !b.puede_cerrar, onSelect: () => onAccion("cerrar") },
    { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: !b.puede_anular, onSelect: () => onAccion("anular") },
    // Citaciones y compromisos §4: el Responsable de enseñanza no cita desde un caso; el backend lo rechaza.
    { id: "citar", label: "Citar al acudiente", icon: <CalendarBlankIcon />, disabled: !puedeCitar, onSelect: () => onAccion("citar") },
    { id: "compromiso", label: "Crear compromiso", icon: <ClipboardAddIcon />, disabled: !puedeCrearCompromiso, onSelect: () => onAccion("compromiso") },
  ]

  const visibles = esFinal(caso.estado_codigo) ? lista.filter((a) => a.id === "ver") : lista
  const acciones = conVer ? visibles : visibles.filter((a) => a.id !== "ver")
  if (acciones.length === 0) return null

  return <AccionesFila etiqueta={`Acciones del caso ${caso.numero}`} acciones={acciones} modo={conVer ? "fila" : "menu"} />
}
