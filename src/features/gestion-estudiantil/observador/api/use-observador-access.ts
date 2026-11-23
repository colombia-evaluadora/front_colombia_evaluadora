import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useCapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"

/**
 * Qué botones habilitar: permiso del menú OBSERVADOR y capacidades que decide el backend
 * (`/gestion-estudiantil/capacidades`). Mientras cargan, deshabilitado. Las acciones por fila
 * (modificar, anular, abrir proceso) las trae cada fila con su `puede_*`. El backend vuelve a
 * validar cada acción con su gate y alcance.
 */
export function useObservadorAccess(establecimientoId?: number | null) {
  const permiso = useMenuPermission("OBSERVADOR")
  const { data: cap } = useCapacidadesGe(establecimientoId)
  return {
    puedeCrear: permiso.puedeCrear,
    puedeAnular: permiso.puedeVer && Boolean(cap?.observador_puede_anular),
    puedeRemitir: permiso.puedeVer && Boolean(cap?.observador_puede_remitir),
    puedeReportarSaludMental: permiso.puedeVer && Boolean(cap?.observador_puede_reportar_salud_mental),
    veMisRemisiones: Boolean(cap?.observador_puede_ver_mis_reportes),
    puedeImprimir: permiso.puedeVer && Boolean(cap?.observador_puede_imprimir),
    puedeCargarFirmado: permiso.puedeCrear && Boolean(cap?.observador_puede_cargar_firmado),
  }
}
