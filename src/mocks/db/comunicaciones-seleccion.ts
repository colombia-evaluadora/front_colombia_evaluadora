import type { OpcionesSeleccion, Persona } from "@/features/comunicaciones/chat/api/types"
import type { CuerpoSeleccion } from "@/features/comunicaciones/chat/lib/seleccion-grupal"
import { personas, USUARIO_ACTUAL } from "@/mocks/db/comunicaciones"

/**
 * Alta masiva en grupos (comms-service `/comunicaciones/grupos/seleccion/*`): grados, grupos
 * académicos y cargos de un colegio de mentira. Los estudiantes viven aquí (no en `personas`) para
 * no cambiar el buscador de los demás mocks; Sofía (10) está en Sexto 601 y su acudiente es Luis (9).
 * Los acudientes entran por invitación (aceptan o rechazan): ver `esAcudienteMock`.
 */
interface EstudianteMock extends Persona {
  grado: string
  grupo: number
}

const NOMBRES = [
  "Ana Lucía Gómez",
  "Bruno Castaño",
  "Camila Ríos",
  "Daniel Henao",
  "Elena Mejía",
  "Felipe Ortiz",
  "Gabriela Suárez",
  "Hugo Patiño",
  "Isabel Rincón",
  "Julián Acosta",
  "Karen Molina",
  "Luis Ángel Vélez",
]

// pk_tgrupo de mentira: 601 / 602 (Sexto) y 701 (Séptimo).
const CURSOS = [
  { grupo: 601, grado: "Sexto", etiqueta: "Sexto 601", cupo: 5 },
  { grupo: 602, grado: "Sexto", etiqueta: "Sexto 602", cupo: 4 },
  { grupo: 701, grado: "Séptimo", etiqueta: "Séptimo 701", cupo: 3 },
]

let n = 0
export const estudiantesSeleccion: EstudianteMock[] = CURSOS.flatMap((c) =>
  Array.from({ length: c.cupo }, () => {
    const i = n++
    return {
      id: 3001 + i,
      nombre: NOMBRES[i % NOMBRES.length],
      correo: `estudiante${i + 1}@iesimonbolivar.edu.co`,
      perfil: "ESTUDIANTE" as const,
      grado: c.grado,
      grupo: c.grupo,
    }
  }),
)

const sofia = personas.find((p) => p.id === 10)

const enCurso = (grupo: number) => [
  ...estudiantesSeleccion.filter((e) => e.grupo === grupo).map((e) => e.id),
  ...(grupo === 601 && sofia ? [sofia.id] : []),
]

// Cargos: Docente = las personas DOCENTE del mock; Coordinador = la cuenta admin (Andrés).
const ROLES: Record<string, number[]> = {
  Docente: personas.filter((p) => p.perfil === "DOCENTE").map((p) => p.id),
  Coordinador: [USUARIO_ACTUAL.id],
}

export const opcionesSeleccion: OpcionesSeleccion = {
  grados: [...new Set(CURSOS.map((c) => c.grado))].map((g) => ({
    valor: g,
    etiqueta: g,
    total: CURSOS.filter((c) => c.grado === g).reduce((t, c) => t + enCurso(c.grupo).length, 0),
  })),
  grupos: CURSOS.map((c) => ({
    valor: String(c.grupo),
    etiqueta: c.etiqueta,
    detalle: "Sede principal",
    total: enCurso(c.grupo).length,
  })),
  roles: Object.entries(ROLES).map(([valor, ids]) => ({ valor, etiqueta: valor, total: ids.length })),
}

/** Acudientes de las matrículas de cada curso (pk_tgrupo → personas). */
const ACUDIENTES_CURSO: Record<number, number[]> = { 601: [9] }

/**
 * Clave de localStorage para que un e2e trate a una cuenta del mock (p. ej. la docente, 2) como
 * acudiente: no hay usuario acudiente con login en el mock ni en testv2.
 */
export const CLAVE_ACUDIENTES_MOCK = "ce-mock-acudientes"

let forzados: number[] | null = null

/** Para tests unitarios (sin localStorage en Node): `null` vuelve a leer localStorage. */
export function forzarAcudientesMock(ids: number[] | null) {
  forzados = ids
}

function acudientesForzados(): number[] {
  if (forzados) return forzados
  try {
    return (globalThis.localStorage?.getItem(CLAVE_ACUDIENTES_MOCK) ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0)
  } catch {
    return []
  }
}

/** Entra a un grupo por invitación (perfil ACUDIENTE, o forzado por el e2e). */
export function esAcudienteMock(id: number): boolean {
  return acudientesForzados().includes(id) || personaChat(id)?.perfil === "ACUDIENTE"
}

/** Persona del chat por id: el directorio del mock o un estudiante de la selección. */
export function personaChat(id: number): Persona | undefined {
  return personas.find((p) => p.id === id) ?? estudiantesSeleccion.find((e) => e.id === id)
}

/**
 * Quiénes entran por la selección (sin duplicados ni `yo`), como `ChatService.miembrosDeSeleccion`:
 * personas sueltas + grados y grupos (sus estudiantes y/o acudientes según `PARA`) + cargos. Los
 * acudientes de la salida se invitan (ver `esAcudienteMock`).
 */
export function resolverSeleccion(cuerpo: Partial<CuerpoSeleccion>, yo: number): number[] {
  const ids = new Set<number>(cuerpo.USUARIOS ?? [])
  const para = cuerpo.PARA ?? "ESTUDIANTES"
  for (const c of CURSOS) {
    if (!(cuerpo.GRADOS?.includes(c.grado) || cuerpo.GRUPOS?.includes(c.grupo))) continue
    if (para !== "ACUDIENTES") enCurso(c.grupo).forEach((i) => ids.add(i))
    if (para !== "ESTUDIANTES") (ACUDIENTES_CURSO[c.grupo] ?? []).forEach((i) => ids.add(i))
  }
  for (const r of cuerpo.ROLES ?? []) (ROLES[r] ?? []).forEach((i) => ids.add(i))
  ids.delete(yo)
  return [...ids].filter((i) => !!personaChat(i))
}

// ── Alcance de los comunicados (comms-service `/comunicaciones/comunicados/destinos/*`) ──────────

/**
 * Roles con el permiso COMUNICADOS (menú de Roles y menús, sembrado en SSO V562): los que ya
 * publicaban. Mutable para que un test le dé el permiso al rol Docente.
 */
export const rolesConComunicados = new Set<string>([
  "CEVAL-SUPER_ADMINISTRADOR",
  "CEVAL-RECTOR",
  "CEVAL-COORDINADOR",
])

export function puedeCrearComunicadosMock(roles: readonly string[]): boolean {
  return roles.some((r) => rolesConComunicados.has(r))
}

const ESTABLECIMIENTOS = [
  { valor: "1", etiqueta: "IE Simón Bolívar", total: 0 },
  { valor: "2", etiqueta: "Colegio Demo Norte", total: 0 },
]
const SEDE = { valor: "10", etiqueta: "Sede principal", total: 0 }
const JORNADAS: Record<number, { valor: string; etiqueta: string; total: number }> = {
  601: { valor: "3", etiqueta: "Mañana", total: 0 },
  602: { valor: "3", etiqueta: "Mañana", total: 0 },
  701: { valor: "4", etiqueta: "Tarde", total: 0 },
}

export interface AlcanceComunicadoMock {
  todos: boolean
  grupos: number[]
  funcionarios: number[]
}

/**
 * Mismo reparto que comms-service (fn_comunicado_alcance_*): el super administrador todo; el
 * coordinador la jornada Mañana (601, 602) y sus docentes; el docente (Darlene, 2) solo el 601 que
 * dicta, sin funcionarios.
 */
export function alcanceComunicadoMock(roles: readonly string[]): AlcanceComunicadoMock {
  if (roles.includes("CEVAL-SUPER_ADMINISTRADOR")) {
    return { todos: true, grupos: CURSOS.map((c) => c.grupo), funcionarios: ROLES.Docente }
  }
  if (roles.includes("CEVAL-RECTOR")) return { todos: false, grupos: CURSOS.map((c) => c.grupo), funcionarios: ROLES.Docente }
  if (roles.includes("CEVAL-COORDINADOR")) return { todos: false, grupos: [601, 602], funcionarios: ROLES.Docente }
  return { todos: false, grupos: [601], funcionarios: [] }
}

/** Personas al alcance: estudiantes y acudientes de sus grupos más sus funcionarios. */
export function personasAlcanceMock(a: AlcanceComunicadoMock, yo: number): number[] {
  const ids = new Set<number>(a.funcionarios)
  for (const g of a.grupos) {
    enCurso(g).forEach((i) => ids.add(i))
    ;(ACUDIENTES_CURSO[g] ?? []).forEach((i) => ids.add(i))
  }
  ids.delete(yo)
  return [...ids]
}

/** Opciones del selector, acotadas en cascada (establecimiento → sede → jornada). */
export function opcionesComunicadoMock(a: AlcanceComunicadoMock, f: { establecimiento?: string; jornada?: string }) {
  const establecimientos = a.todos ? ESTABLECIMIENTOS : ESTABLECIMIENTOS.slice(0, 1)
  const audiencias = a.funcionarios.length
    ? ["ESTUDIANTES", "PADRES", "DOCENTES", "DIRECTIVOS", "ADMINISTRATIVOS"]
    : ["ESTUDIANTES", "PADRES"]
  const vacio = { establecimientos, sedes: [], jornadas: [], grados: [], grupos: [], roles: [], audiencias, todos: a.todos }
  // El super administrador elige; el colegio 2 del mock no tiene grupos.
  if ((a.todos && !f.establecimiento) || f.establecimiento === "2") return vacio
  const enAmbito = CURSOS.filter((c) => a.grupos.includes(c.grupo))
  const cursos = enAmbito.filter((c) => !f.jornada || JORNADAS[c.grupo].valor === f.jornada)
  return {
    ...vacio,
    sedes: [SEDE],
    jornadas: [...new Map(enAmbito.map((c) => [JORNADAS[c.grupo].valor, JORNADAS[c.grupo]])).values()],
    grados: [...new Set(cursos.map((c) => c.grado))].map((g) => ({
      valor: g,
      etiqueta: g,
      total: cursos.filter((c) => c.grado === g).reduce((t, c) => t + enCurso(c.grupo).length, 0),
    })),
    grupos: cursos.map((c) => ({ valor: String(c.grupo), etiqueta: c.etiqueta, detalle: SEDE.etiqueta, total: enCurso(c.grupo).length })),
    roles: a.funcionarios.length ? [{ valor: "Docente", etiqueta: "Docente", total: a.funcionarios.length }] : [],
  }
}
