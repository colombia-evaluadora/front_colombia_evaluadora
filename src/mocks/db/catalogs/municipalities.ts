import type { Municipality } from "@/features/establishment/institution/api/types/location"

export const MUNICIPALITIES: Municipality[] = [
  {
    id: "13001",
    name: "Cartagena",
    department: {
      id: "13",
      name: "Bolívar",
    },
  },
  {
    id: "08001",
    name: "Barranquilla",
    department: {
      id: "08",
      name: "Atlántico",
    },
  },
  {
    id: "11001",
    name: "Bogotá",
    department: {
      id: "11",
      name: "Bogotá D.C.",
    },
  },
]