import type { GeneralArea } from "@/features/establishment/academic-period/api/types/general-area"

// Catálogo unificado de áreas (`GET /eval-col/areas/general`). `especialidadId`
// es un valor de relleno (el catálogo real no lo usa el front todavía).
export const generalAreasDb: GeneralArea[] = [
  { id: 1, nombre: "Preescolar", especialidadId: 1 },
  { id: 2, nombre: "Primaria", especialidadId: 1 },
  { id: 3, nombre: "Ciencias naturales y educación ambiental", especialidadId: 1 },
  { id: 4, nombre: "Ciencias sociales", especialidadId: 1 },
  { id: 5, nombre: "Educ. artistica - Artes plásticas", especialidadId: 4 },
  { id: 6, nombre: "Educ. artistica - Música", especialidadId: 4 },
  { id: 7, nombre: "Educ. artistica - Artes escenica", especialidadId: 4 },
  { id: 8, nombre: "Educ. artistica - Danzas", especialidadId: 4 },
  { id: 9, nombre: "Educ. física, recreación y deporte", especialidadId: 5 },
  { id: 10, nombre: "Educ. etica y en valores", especialidadId: 1 },
  { id: 11, nombre: "Educ. religiosa", especialidadId: 1 },
  { id: 12, nombre: "Humanidades y lengua castellana", especialidadId: 1 },
  { id: 13, nombre: "Idioma extranjero francés", especialidadId: 1 },
  { id: 14, nombre: "Idioma extranjero inglés", especialidadId: 1 },
  { id: 15, nombre: "Matemáticas", especialidadId: 1 },
  { id: 16, nombre: "Tecnología e informática", especialidadId: 2 },
  { id: 17, nombre: "Ciencias naturales química", especialidadId: 1 },
  { id: 18, nombre: "Ciencias naturales física", especialidadId: 1 },
  { id: 19, nombre: "Filosofía", especialidadId: 1 },
  { id: 20, nombre: "Ciencias económicas y políticas", especialidadId: 1 },
  { id: 21, nombre: "Areas de apoyo para educación especial", especialidadId: 1 },
  { id: 22, nombre: "No aplica", especialidadId: 1 },

  // Áreas técnicas
  { id: 23, nombre: "Finanzas - Administración y seguros", especialidadId: 2 },
  { id: 24, nombre: "Ventas y servicios", especialidadId: 2 },
  { id: 25, nombre: "Ciencias naturales y aplicadas", especialidadId: 2 },
  {
    id: 27,
    nombre: "Ciencias sociales, educación, servicios gubernamentales y religión",
    especialidadId: 2,
  },
  { id: 28, nombre: "Cultura, arte, esparcimiento y deporte", especialidadId: 2 },
  { id: 29, nombre: "Explotación primaria y extractiva", especialidadId: 2 },
  {
    id: 30,
    nombre: "Operadores del equipo y transporte instalación y mantenimiento",
    especialidadId: 2,
  },
  { id: 31, nombre: "Procesamiento, fabricación y ensamble", especialidadId: 2 },
  { id: 32, nombre: "Otras", especialidadId: 2 },
]
