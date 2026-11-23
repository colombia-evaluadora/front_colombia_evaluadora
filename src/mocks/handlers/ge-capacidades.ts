import { delay, http, HttpResponse } from "msw"

import type { CapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"

const CAPACIDADES: CapacidadesGe = {
  observador_puede_imprimir: true,
  observador_puede_cargar_firmado: true,
  observador_puede_reportar_salud_mental: true,
  observador_puede_remitir: true,
  observador_puede_anular: true,
  observador_puede_ver_mis_reportes: true,
  observaciones_puede_registrar: true,
  actividades_puede_crear: true,
  citaciones_puede_citar: true,
  citaciones_puede_crear_compromiso: true,
}

/** Capacidades de página de Gestión Estudiantil: una fila con todo habilitado. */
export const geCapacidadesHandlers = [
  http.get("/api/eval-col/gestion-estudiantil/capacidades", async () => {
    await delay(80)
    return HttpResponse.json({ rows: [CAPACIDADES] })
  }),
]
