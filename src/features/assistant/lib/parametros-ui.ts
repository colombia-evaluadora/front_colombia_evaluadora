// `contextoUi.parametros` (SSO #696): objeto plano clave → escalar con lo que
// identifica la pantalla. El backend descarta en silencio lo que no cumpla
// (clave `[A-Za-z][A-Za-z0-9_.-]{0,59}`, valor escalar de hasta 200
// caracteres, máx. 30), pero se filtra acá para no gastar el tope de 30 con
// basura y para no mandar listas ni objetos.

const CLAVE_VALIDA = /^[A-Za-z][A-Za-z0-9_.-]{0,59}$/
const MAX_PARAMETROS = 30
const MAX_VALOR = 200

/** Paginación y orden no identifican la pantalla: no se mandan. */
const CLAVES_IGNORADAS = new Set(["page", "pageSize", "sortBy", "sortDir"])

function aEscalar(valor: unknown): string | number | boolean | null {
  if (valor == null || valor === "") return null
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null
  if (typeof valor === "boolean") return valor
  if (typeof valor === "string") return valor.slice(0, MAX_VALOR)
  // Filtros multi-valor (estados, roles…): se aplanan como texto separado por coma.
  if (Array.isArray(valor)) {
    const planos = valor.filter((v) => ["string", "number", "boolean"].includes(typeof v))
    return planos.length > 0 ? planos.join(",").slice(0, MAX_VALOR) : null
  }
  return null
}

/**
 * Une las fuentes en orden (la primera gana ante claves repetidas: la URL va
 * antes que los filtros del formulario) y respeta los límites del contrato.
 */
export function construirParametros(
  ...fuentes: (Record<string, unknown> | null | undefined)[]
): Record<string, string | number | boolean> {
  const resultado: Record<string, string | number | boolean> = {}
  for (const fuente of fuentes) {
    for (const [clave, valor] of Object.entries(fuente ?? {})) {
      if (Object.keys(resultado).length >= MAX_PARAMETROS) return resultado
      if (clave in resultado || CLAVES_IGNORADAS.has(clave) || !CLAVE_VALIDA.test(clave)) continue
      const escalar = aEscalar(valor)
      if (escalar !== null) resultado[clave] = escalar
    }
  }
  return resultado
}
