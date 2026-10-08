import type { GrupoVotantes, Votante } from "@/features/comunicaciones/chat/api/types"

export const GRADOS = ["6°A", "6°B", "7°A", "7°B", "8°A", "9°A", "10°A", "11°A"]
export const FUNCIONARIOS = ["Rector", "Coordinador", "Docente", "Orientador"]

const NOMBRES = [
  "Ana Sofía Martínez Rojas",
  "Juan David Gómez Pérez",
  "Valentina Herrera Castro",
  "Samuel Rodríguez López",
  "Mariana Torres Díaz",
  "Santiago Ramírez Mejía",
  "Isabella Moreno Vargas",
  "Mateo Castillo Ruiz",
  "Luciana Ortiz Cárdenas",
  "Emilio Suárez Patiño",
  "Gabriela Rincón Salazar",
  "Tomás Acosta Molina",
]

// Listado determinista por grupo: mismos ids cada vez que se consulta el mismo grado.
export function votantesDe(grupo: GrupoVotantes, valor: string): Votante[] {
  const lista = grupo === "GRADO" ? GRADOS : FUNCIONARIOS
  const indice = lista.indexOf(valor)
  if (indice < 0) return []
  const total = grupo === "GRADO" ? 32 : valor === "Docente" ? 18 : valor === "Rector" ? 1 : 3
  const base = (grupo === "GRADO" ? 1000 : 5000) + indice * 100
  return Array.from({ length: total }, (_, i) => {
    const doc = String(1_028_000_000 + (base + i) * 7919).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    return {
      id: base + i,
      nombre: NOMBRES[(i + indice) % NOMBRES.length],
      documento: grupo === "GRADO" ? `TI ${doc}` : `CC ${doc}`,
      numero: i + 1,
    }
  })
}
