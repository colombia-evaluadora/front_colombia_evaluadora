import type { Jornada } from "@/features/establishment/academic-period/api/types/jornada"

// Catálogo de jornadas. Simula lo que en producción entrega el backend, para
// que el front no hardcodee las opciones del select.
export const jornadasDb: Jornada[] = [
  { id: 1, name: "Mañana" },
  { id: 2, name: "Tarde" },
  { id: 3, name: "Noche" },
]
