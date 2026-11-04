/** El JSONB llega en una columna con el nombre del objeto; según el motor, como objeto o como texto. */
export function desenvolver<T>(row: Record<string, unknown> | undefined, clave: string, vacio: string): T {
  const valor = row?.[clave]
  if (valor == null) throw new Error(vacio)
  return (typeof valor === "string" ? JSON.parse(valor) : valor) as T
}

/** Query string sin valores vacíos ni `false`. */
export function queryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "" && v !== false) q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ""
}
