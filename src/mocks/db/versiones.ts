/**
 * `VERSION` de actividades y unidades en el mock (BE-3B, sso
 * `TACTIVIDAD.VERSION`/`TUNIDAD.VERSION`): arranca en 1 y sube con cada PUT.
 * Un PUT con `BASE_VERSION` distinta responde 409 `OFFLINE_CONFLICT`, igual
 * que el backend real.
 */
const versiones = new Map<string, number>()

const clave = (tipo: "actividad" | "unidad", id: number) => `${tipo}:${id}`

export function versionDe(tipo: "actividad" | "unidad", id: number): number {
  return versiones.get(clave(tipo, id)) ?? 1
}

export function subirVersion(tipo: "actividad" | "unidad", id: number): number {
  const next = versionDe(tipo, id) + 1
  versiones.set(clave(tipo, id), next)
  return next
}

/** `null` si coincide (o no se mandó); si no, el cuerpo del 409 real. */
export function conflictoDeVersion(
  tipo: "actividad" | "unidad",
  id: number,
  baseVersion: unknown,
  current: Record<string, unknown>,
): { code: string; message: string; detail: string } | null {
  if (baseVersion == null) return null
  const actual = versionDe(tipo, id)
  if (Number(baseVersion) === actual) return null
  return {
    code: "OFFLINE_CONFLICT",
    message:
      tipo === "actividad"
        ? "La actividad cambió en el servidor mientras estabas sin conexión."
        : "La unidad cambió en el servidor mientras estabas sin conexión.",
    detail: JSON.stringify({ current, version: actual }),
  }
}
