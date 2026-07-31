import type { Sede } from "@/features/establishment/academic-period/api/types/sede"

// Catálogo de sedes. Simula lo que en producción entrega el backend, para que
// el front no hardcodee las opciones del select.
export const sedesDb: Sede[] = [
  { id: 1, name: "I.E. JORGE GARCÍA LA SALLE BICENTENARIO" },
  { id: 2, name: "I.E. NUESTRA SEÑORA DE FÁTIMA" },
  { id: 3, name: "I.E. CLEMENTE MANUEL ZABALA" },
]
