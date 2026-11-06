import type { RelacionAlumnoGrupo } from "@/features/administration/relaciones-alumno-grupo/api/types"

// Réplica en memoria de V285–V338: niveles de TNIVEL_ENSENANZA y zonas
// Urbana/Rural de la lista ZONA, con pk propios del mock.

export const nivelesDb = [
  { pkNivel: 1, nivel: "Preescolar" },
  { pkNivel: 2, nivel: "Básica primaria" },
  { pkNivel: 3, nivel: "Básica secundaria" },
  { pkNivel: 4, nivel: "Media" },
]

export const zonasDb = [
  { pkZona: 101, zona: "Urbana" },
  { pkZona: 102, zona: "Rural" },
]

// El back arranca vacío; el mock trae las cifras del ejemplo del informe
// (Resolución 5657 de Cartagena) y deja Media libre para probar el alta.
const SEMILLA: [pkNivel: number, pkZona: number, maximo: number][] = [
  [1, 101, 25],
  [1, 102, 20],
  [2, 101, 35],
  [2, 102, 25],
  [3, 101, 40],
  [3, 102, 28],
]

export const relacionesDb: RelacionAlumnoGrupo[] = SEMILLA.map(([pkNivel, pkZona, maximo], i) => ({
  pkRelacion: i + 1,
  pkNivel,
  nivel: nivelesDb.find((n) => n.pkNivel === pkNivel)?.nivel ?? "",
  pkZona,
  zona: zonasDb.find((z) => z.pkZona === pkZona)?.zona ?? "",
  maximo,
}))
