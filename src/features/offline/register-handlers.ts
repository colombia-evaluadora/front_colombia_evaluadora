/**
 * Registra los handlers de la outbox al arrancar (import por efecto). Sin
 * esto, una op guardada de una sesión anterior no se podría enviar hasta
 * abrir su pantalla (las rutas cargan lazy).
 */
import { toast } from "sonner"

import { configureOutbox } from "@/lib/offline/outbox/engine"

import "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import "@/features/academic-management/asistencia/api/mutations/use-asistencia-editar-mutation"
import "@/features/planeador/api/mutations/use-calificar-celda"
import "@/features/planeador/api/mutations/use-calificar-bulk"
import "@/features/planeador/api/mutations/use-observar-estudiante"
import "@/features/planeador/api/mutations/use-estado-resultado"
import "@/features/planeador/api/mutations/use-asistencia-actividad"
import "@/features/planeador/api/mutations/use-observacion-soporte"
// Fase 3: pasos de las sagas de actividad/unidad (se reanudan tras recargar).
import "@/features/planeador/offline/saga-handlers"
// Fase 4 (`add-offline-rest`): referentes curriculares y observaciones de informes.
import "@/features/academic-management/curricular-references/api/mutations/use-statement-mutations"
import "@/features/academic-management/curricular-references/api/mutations/use-toggle-status"
import "@/features/academic-management/reports/api/mutations/use-observacion"

const SYNC_TOAST_ID = "outbox-sync"

/** Un solo toast por lote (§7.4); los problemas quedan persistentes hasta revisarlos. */
configureOutbox({
  onBatchEnd({ done, failed, conflicts, notes }) {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return
    const problemas = failed + conflicts
    const action = { label: "Revisar", onClick: () => window.location.assign("/app/pendientes") }
    if (problemas > 0) {
      toast.warning(`Se sincronizaron ${done} cambios; ${problemas} necesitan tu revisión.`, {
        id: SYNC_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        action,
      })
      return
    }
    const nota = [...new Set(notes)].join(" ")
    toast.success(`Se sincronizaron ${done} cambios.`, { id: SYNC_TOAST_ID, description: nota || undefined })
  },
})
