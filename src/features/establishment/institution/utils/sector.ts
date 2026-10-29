/**
 * Sector del establecimiento, derivado de la naturaleza jurídica
 * (`TPROPIEDAD_JURIDICA.FK_TLV_ZECTOR`, Regla 90). El catálogo SECTOR lo
 * nombra "Oficial" / "No Oficial".
 */
export const esSectorNoOficial = (sector: string | null | undefined) =>
  (sector ?? "").trim().toLowerCase() === "no oficial"
