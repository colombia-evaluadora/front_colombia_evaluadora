import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useCapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"

/** Anular (Regla 3): Supervisor de sede y Administrador del establecimiento (role_query de V545.7). */
const ANULAR_ROLES = ["CEVAL-COORDINADOR", "CEVAL-RECTOR", "CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO", "CEVAL-SUPER_ADMINISTRADOR"]

/**
 * Qué botones habilitar: permiso del menú OBSERVADOR y capacidades que decide el backend
 * (`/gestion-estudiantil/capacidades`). Mientras cargan, deshabilitado. El backend vuelve a
 * validar cada acción con su gate y alcance.
 */
export function useObservadorAccess() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const permiso = useMenuPermission("OBSERVADOR")
  const { data: cap } = useCapacidadesGe()
  return {
    puedeCrear: permiso.puedeCrear,
    puedeEditar: permiso.puedeEditar,
    puedeAnular: permiso.puedeEditar && ANULAR_ROLES.some((r) => roles.includes(r)),
    puedeRemitir: permiso.puedeVer && Boolean(cap?.observador_puede_remitir),
    puedeReportarSaludMental: permiso.puedeVer && Boolean(cap?.observador_puede_reportar_salud_mental),
    veMisRemisiones: roles.includes("CEVAL-DOCENTE"),
    puedeImprimir: permiso.puedeVer && Boolean(cap?.observador_puede_imprimir),
    puedeCargarFirmado: permiso.puedeCrear && Boolean(cap?.observador_puede_cargar_firmado),
  }
}
