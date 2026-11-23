import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"

/**
 * Datos del caso sin los que el backend no deja registrar acciones del protocolo
 * («Complete la manifestación, el lugar y la descripción…»). Pasa en los casos
 * que se crean solos (p. ej. desde una anotación Tipo II o III).
 */
export function datosPendientesCaso(caso: CasoDetalle): string[] {
  return [
    !caso.fk_tlv_manifestacion && "la manifestación",
    !caso.fk_tlv_lugar && "el lugar",
    !caso.descripcion?.trim() && "la descripción",
  ].filter((x): x is string => Boolean(x))
}
