export interface CampusOption {
  id: string
  name: string
  address: string
  shift: string
  gender: string
}

// El catálogo real de sedes (`use-reservation-catalogs-query`) solo trae el
// nombre — todavía no hay endpoint que devuelva dirección/jornada/género por
// sede, así que se mockea acá, igual que otros catálogos pendientes del
// módulo (ver `MOCK_ORIGIN_PERIODS` en `add-matricula-page.tsx`).
export const MOCK_CAMPUS_OPTIONS: CampusOption[] = [
  {
    id: "sede-1",
    name: "Aspaen Gimnasio Cartagena",
    address: "Carrera 91 # 40 190 - Getsemaní",
    shift: "Mañana",
    gender: "Masculino",
  },
  {
    id: "sede-2",
    name: "Colegio Británico de Cartagena",
    address: "Carrera 21 # 56 190 - La Matuna",
    shift: "Tarde",
    gender: "Femenino",
  },
  {
    id: "sede-3",
    name: "Gimnasio Altair",
    address: "Carrera 68 # 56 60 - El Laguito",
    shift: "Mañana",
    gender: "Mixto",
  },
  {
    id: "sede-4",
    name: "Colegio Jorge Washington",
    address: "Carrera 51 # 56 190 - Bocagrande",
    shift: "Jornada continua",
    gender: "Mixto",
  },
  {
    id: "sede-5",
    name: "Colegio Washington",
    address: "Carrera 71 # 98 50 - Manga",
    shift: "Jornada continua",
    gender: "Mixto",
  },
]
