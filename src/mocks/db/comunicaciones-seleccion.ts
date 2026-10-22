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
