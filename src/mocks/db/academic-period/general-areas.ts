import type { GeneralArea } from "@/features/establishment/academic-period/api/types/general-area"

// Catálogo unificado de áreas (`GET /eval-col/areas/general`). `especialidadId`
// es un valor de relleno (el catálogo real no lo usa el front todavía).
export const generalAreasDb: GeneralArea[] = [
  { id: 1, nombre: "Preescolar", especialidadId: 1 },
  { id: 2, nombre: "Primaria", especialidadId: 1 },
  { id: 3, nombre: "Ciencias Naturales y Educación Ambiental", especialidadId: 1 },
  { id: 4, nombre: "Ciencias Sociales", especialidadId: 1 },
  { id: 5, nombre: "Educ. Artistica - Artes plásticas", especialidadId: 4 },
  { id: 6, nombre: "Educ. Artistica - Música", especialidadId: 4 },
  { id: 7, nombre: "Educ. Artistica - Artes Escenica", especialidadId: 4 },
  { id: 8, nombre: "Educ. Artistica - Danzas", especialidadId: 4 },
  { id: 9, nombre: "Educ. Física, Recreación y Deporte", especialidadId: 5 },
  { id: 10, nombre: "Educ. Etica y en Valores", especialidadId: 1 },
  { id: 11, nombre: "Educ. Religiosa", especialidadId: 1 },
  { id: 12, nombre: "Humanidades y Lengua Castellana", especialidadId: 1 },
  { id: 13, nombre: "Idioma Extranjero Francés", especialidadId: 1 },
  { id: 14, nombre: "Idioma Extranjero Inglés", especialidadId: 1 },
  { id: 15, nombre: "Matemáticas", especialidadId: 1 },
  { id: 16, nombre: "Tecnología e Informática", especialidadId: 2 },
  { id: 17, nombre: "Ciencias Naturales Química", especialidadId: 1 },
  { id: 18, nombre: "Ciencias Naturales Física", especialidadId: 1 },
  { id: 19, nombre: "Filosofía", especialidadId: 1 },
  { id: 20, nombre: "Ciencias Económicas y Políticas", especialidadId: 1 },
  { id: 21, nombre: "Areas de Apoyo Para educación Especial", especialidadId: 1 },
  { id: 22, nombre: "No aplica", especialidadId: 1 },

  // Áreas técnicas
  { id: 23, nombre: "Finanzas - Administración y Seguros", especialidadId: 2 },
  { id: 24, nombre: "Ventas y Servicios", especialidadId: 2 },
  { id: 25, nombre: "Ciencias Naturales y Aplicadas", especialidadId: 2 },
  {
    id: 27,
    nombre: "Ciencias Sociales, Educación, Servicios Gubernamentales y Religión",
    especialidadId: 2,
  },
  { id: 28, nombre: "Cultura, Arte, Esparcimiento y Deporte", especialidadId: 2 },
  { id: 29, nombre: "Explotación Primaria y Extractiva", especialidadId: 2 },
  {
    id: 30,
    nombre: "Operadores del Equipo y Transporte Instalación y Mantenimiento",
    especialidadId: 2,
  },
  { id: 31, nombre: "Procesamiento, Fabricación y Ensamble", especialidadId: 2 },
  { id: 32, nombre: "Otras", especialidadId: 2 },
]
