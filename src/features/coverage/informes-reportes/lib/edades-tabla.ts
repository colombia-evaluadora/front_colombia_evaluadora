// Estadística de edades (C.4.EDA; Sección 3.9): columnas, desglose y resumen a partir de los
// conteos de estudiantes únicos que da el backend por cada nivel de la agrupación (ROLLUP).

export type Medida = "T" | "E" | "S" | "G"
export type ModoColumnas = "AUTOMATICO" | "EDAD" | "RANGO" | "SITUACION"

/** Fila de `/informes-reportes/edades/query`, ya en camelCase. */
export interface ConteoEdad {
  nivel: number
  k1: string | null
  k2: string | null
  k3: string | null
  k4: string | null
  k5: string | null
  k6: string | null
  orden: number | null
  medida: Medida
  /** Edad (E), situación (S) o género (G); null en T, y en E es «Sin calcular». */
  clave: string | null
  cantidad: number
  edadPromedio: number | null
  edadMin: number | null
  edadMax: number | null
  mediana: number | null
  edadRecomendada: number | null
  edadBaja: number | null
  edadExtra: number | null
}

export interface Columna {
  key: string
  label: string
}

export interface NodoEdad {
  id: string
  ruta: string[]
  nivel: number
  label: string
  orden: number | null
  total: ConteoEdad
  hijos: NodoEdad[]
}

export const SITUACIONES = ["BAJA_EDAD", "EN_EDAD", "PREEXTRAEDAD", "EXTRAEDAD"] as const
export const SIN_CALCULAR = "SIN_CALCULAR"

const ruta = (c: ConteoEdad) => [c.k1, c.k2, c.k3, c.k4, c.k5, c.k6].slice(0, c.nivel).map((k) => k ?? "Sin dato")
const idDe = (r: string[]) => r.join("\u0001")

/** Árbol del desglose: la raíz (nivel 0) es el total y cada nivel cuelga de su padre. */
export function armarArbol(conteos: ConteoEdad[]): NodoEdad | null {
  const nodos = new Map<string, NodoEdad>()
  for (const c of conteos) {
    if (c.medida !== "T") continue
    const r = ruta(c)
    nodos.set(idDe(r), { id: idDe(r), ruta: r, nivel: c.nivel, label: r.at(-1) ?? "Total", orden: c.orden, total: c, hijos: [] })
  }
  const raiz = nodos.get("")
  if (!raiz) return null
  for (const n of nodos.values()) {
    if (n.nivel === 0) continue
    nodos.get(idDe(n.ruta.slice(0, -1)))?.hijos.push(n)
  }
  const ordenar = (n: NodoEdad) => {
    n.hijos.sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || a.label.localeCompare(b.label, "es"))
    n.hijos.forEach(ordenar)
  }
  ordenar(raiz)
  return raiz
}

/** Edad mínima y máxima de las columnas: Edad recomendada + Baja edad hasta y + Extraedad desde de los grados elegidos. */
export function rangoEdades(raiz: NodoEdad, conteos: ConteoEdad[]): { desde: number; hasta: number } | null {
  const { edadBaja, edadExtra } = raiz.total
  if (edadBaja != null && edadExtra != null) return { desde: edadBaja, hasta: edadExtra }
  const edades = conteos.filter((c) => c.medida === "E" && c.nivel === 0 && c.clave != null).map((c) => Number(c.clave))
  return edades.length ? { desde: Math.min(...edades), hasta: Math.max(...edades) } : null
}

const edadLabel = (e: number, desde: number, hasta: number) =>
  e === desde && desde !== hasta ? `${e} años o menos` : e === hasta && desde !== hasta ? `${e} años o más` : `${e} años`

/**
 * Columnas de la tabla. Automático: por edad con 6 columnas o menos, si no por rango. El rango
 * agrupa de a dos años entre los extremos abiertos y la edad que sobra queda sola.
 */
export function columnasEdades(modo: ModoColumnas, rango: { desde: number; hasta: number } | null): Columna[] {
  const sin: Columna = { key: SIN_CALCULAR, label: "Sin calcular" }
  if (modo === "SITUACION") {
    const etiquetas: Record<string, string> = { BAJA_EDAD: "Baja edad", EN_EDAD: "En edad", PREEXTRAEDAD: "Preextraedad", EXTRAEDAD: "Extraedad" }
    return [...SITUACIONES.map((s) => ({ key: s, label: etiquetas[s] })), sin]
  }
  if (!rango) return [sin]
  const { desde, hasta } = rango
  const n = hasta - desde + 1
  const porRango = modo === "RANGO" || (modo === "AUTOMATICO" && n > 6)
  if (!porRango) {
    return [...Array.from({ length: n }, (_, i) => ({ key: `E${desde + i}`, label: edadLabel(desde + i, desde, hasta) })), sin]
  }
  const cols: Columna[] = [{ key: `E${desde}`, label: edadLabel(desde, desde, hasta) }]
  for (let e = desde + 1; e < hasta; e += 2) {
    const fin = Math.min(e + 1, hasta - 1)
    cols.push({ key: `R${e}-${fin}`, label: fin === e ? `${e} años` : `${e} a ${fin}` })
  }
  if (hasta > desde) cols.push({ key: `E${hasta}`, label: edadLabel(hasta, desde, hasta) })
  return [...cols, sin]
}

/** Columna a la que va una edad: los extremos son abiertos. */
export function columnaDeEdad(edad: number | null, cols: Columna[], rango: { desde: number; hasta: number } | null): string {
  if (edad == null || !rango) return SIN_CALCULAR
  const e = Math.min(Math.max(edad, rango.desde), rango.hasta)
  for (const c of cols) {
    if (c.key === `E${e}`) return c.key
    const m = /^R(\d+)-(\d+)$/.exec(c.key)
    if (m && e >= Number(m[1]) && e <= Number(m[2])) return c.key
  }
  return SIN_CALCULAR
}

/** Conteos de un nodo por medida, indexados por su ruta. */
export function indexar(conteos: ConteoEdad[]) {
  const idx = new Map<string, ConteoEdad[]>()
  for (const c of conteos) {
    const k = `${c.medida}|${idDe(ruta(c))}`
    const lista = idx.get(k)
    if (lista) lista.push(c)
    else idx.set(k, [c])
  }
  return (medida: Medida, nodo: NodoEdad) => idx.get(`${medida}|${nodo.id}`) ?? []
}

/** Cantidad por columna de un nodo (estudiantes únicos). */
export function celdasNodo(
  nodo: NodoEdad,
  modo: ModoColumnas,
  cols: Columna[],
  rango: { desde: number; hasta: number } | null,
  de: ReturnType<typeof indexar>,
): Record<string, number> {
  const r: Record<string, number> = Object.fromEntries(cols.map((c) => [c.key, 0]))
  if (modo === "SITUACION") {
    for (const c of de("S", nodo)) r[c.clave ?? SIN_CALCULAR] = (r[c.clave ?? SIN_CALCULAR] ?? 0) + c.cantidad
    return r
  }
  for (const c of de("E", nodo)) {
    const k = columnaDeEdad(c.clave == null ? null : Number(c.clave), cols, rango)
    r[k] = (r[k] ?? 0) + c.cantidad
  }
  return r
}

/** Filas visibles del desglose: cada nodo abierto muestra a sus hijos, hasta `niveles` bajo la agrupación. */
export function filasVisibles(raiz: NodoEdad, abiertos: Set<string>, desglosar: boolean): NodoEdad[] {
  const filas: NodoEdad[] = []
  const recorrer = (n: NodoEdad) => {
    filas.push(n)
    if (desglosar && abiertos.has(n.id)) n.hijos.forEach(recorrer)
  }
  raiz.hijos.forEach(recorrer)
  return filas
}

/** Ids de los nodos que quedan abiertos con «Niveles de detalle» = n (1 abre la agrupación). */
export function abiertosHasta(raiz: NodoEdad, niveles: number): Set<string> {
  const s = new Set<string>()
  const recorrer = (n: NodoEdad) => {
    if (n.nivel >= 1 && n.nivel <= niveles) s.add(n.id)
    n.hijos.forEach(recorrer)
  }
  recorrer(raiz)
  return s
}

/** Profundidad máxima del desglose (niveles bajo la agrupación). */
export const nivelesMaximos = (raiz: NodoEdad): number => {
  const prof = (n: NodoEdad): number => (n.hijos.length ? 1 + Math.max(...n.hijos.map(prof)) : 0)
  return Math.max(prof(raiz) - 1, 0)
}
