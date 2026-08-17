type BadgeColor =
  | "primary"
  | "secondary"
  | "destructive"
  | "info"
  | "warning"
  | "success"

interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

/**
 * El catálogo real `ESTADO_ESTABLECIMIENTO` tiene 5 valores (ver
 * `EstablishmentStatus`), así que ya no hay un `Record` fijo por id: el
 * color se decide leyendo `statusLabel` (el nombre, ya viene resuelto en la
 * fila — no hace falta ninguna consulta a catálogo para esto). Queda
 * binario a propósito — "Activo" en verde, cualquier otro estado en rojo —
 * mismo lenguaje visual que ya tenía la tabla; si se necesita distinguir
 * Suspendido de "Suspendido por mora" con colores propios, hay que
 * extender esto.
 */
export function establishmentStatusBadge(statusLabel: string): BadgeProps {
  const isActive = statusLabel.toLowerCase().startsWith("activ")
  return {
    variant: "soft",
    color: isActive ? "success" : "destructive",
  }
}

/** "Activo" (masculino, tal como sale de `TLISTA_VALOR.NOMBRE`) se muestra
 * "Activa" acá: el establecimiento se refiere en femenino en el resto de la
 * pantalla. El resto de los nombres del catálogo se muestran tal cual. */
export function establishmentStatusDisplayLabel(statusLabel: string): string {
  return statusLabel === "Activo" ? "Activa" : statusLabel
}
