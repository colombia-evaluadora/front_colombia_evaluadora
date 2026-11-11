import {
  ArrowsDownUpIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  ClipboardAddIcon,
  EyeIcon,
  PencilIcon,
  ProhibitIcon,
  UserSwitchIcon,
} from "@/components/ui/icons"

import { AccionesFila, type AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { ConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { esFinal } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { EstadoCasoCodigo } from "@/features/gestion-estudiantil/convivencia/api/types"

export type AccionCaso = "ver" | "modificar" | "fechas" | "accion" | "gestor" | "tipo" | "cerrar" | "anular" | "citar" | "compromiso"

/** Las diez acciones de la fila: 4 como iconos y el resto en ⋮. */
export const ACCIONES_CASO = 10

export interface CasoMenuInfo {
  numero: string | number
  estado_codigo: EstadoCasoCodigo
  sinGestor: boolean
}

interface MenuAccionesCasoProps {
  caso: CasoMenuInfo
  access: ConvivenciaAccess
  onAccion: (accion: AccionCaso) => void
  /** En el detalle no se repite «Ver detalle» y todo va en un ⋮ del encabezado. */
  conVer?: boolean
  /** Crear en CITACIONES_COMPROMISOS: sin él, «Citar» y «Crear compromiso» quedan deshabilitadas. */
  puedeCitar?: boolean
}

/** Acciones del caso (G.2.CAS.LIS.3): todas visibles; las que no aplican, deshabilitadas. */
export function MenuAccionesCaso({ caso, access, onAccion, conVer = true, puedeCitar = false }: MenuAccionesCasoProps) {
  const abierto = !esFinal(caso.estado_codigo)
  const gestiona = !(abierto && access.puedeGestionar)
  const supervisa = !(abierto && access.puedeSupervisar)
  const lista: AccionFila[] = [
    { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
    { id: "modificar", label: "Modificar", icon: <PencilIcon />, disabled: gestiona, onSelect: () => onAccion("modificar") },
    { id: "fechas", label: "Corregir fechas", icon: <CalendarBlankIcon />, disabled: gestiona, onSelect: () => onAccion("fechas") },
    { id: "accion", label: "Registrar acción", icon: <ClipboardAddIcon />, disabled: gestiona, onSelect: () => onAccion("accion") },
    {
      id: "gestor",
      label: caso.sinGestor ? "Asignar gestor" : "Reasignar gestor",
      icon: <UserSwitchIcon />,
      disabled: supervisa,
      onSelect: () => onAccion("gestor"),
    },
    { id: "tipo", label: "Cambiar tipo", icon: <ArrowsDownUpIcon />, disabled: supervisa, onSelect: () => onAccion("tipo") },
    { id: "cerrar", label: "Cerrar", icon: <CheckCircleIcon />, disabled: supervisa, onSelect: () => onAccion("cerrar") },
    { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: supervisa, onSelect: () => onAccion("anular") },
    // Citaciones y compromisos §4: el Responsable de enseñanza no cita desde un caso; el backend lo rechaza.
    { id: "citar", label: "Citar al acudiente", icon: <CalendarBlankIcon />, disabled: !puedeCitar, onSelect: () => onAccion("citar") },
    { id: "compromiso", label: "Crear compromiso", icon: <ClipboardAddIcon />, disabled: !puedeCitar, onSelect: () => onAccion("compromiso") },
  ]

  return (
    <AccionesFila
      etiqueta={`Acciones del caso ${caso.numero}`}
      acciones={conVer ? lista : lista.filter((a) => a.id !== "ver")}
      modo={conVer ? "fila" : "menu"}
    />
  )
}
