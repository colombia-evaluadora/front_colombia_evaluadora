import { http, HttpResponse, delay } from "msw"

import { GRADES, GROUPS } from "@/mocks/db/reservations"
import { formatGrade } from "@/features/coverage/api/ui-mappings"
import { palabraGradoDesdeNombreCatalogo } from "@/features/planeador/lib/grado-nivel-educativo"
import { ASIGNATURA_OPTIONS } from "@/features/planeador/components/forms/form-editar-actividad"

/**
 * Mocks de `GET /planeador/docentes/grupos` y
 * `GET /planeador/docentes/grado-asignatura` (V242, ver colección Postman
 * `planeador-planilla`) — sin esto, con el mock activo, el "Filtro" de la
 * Planilla de calificación pega contra estas rutas, MSW no tiene handler,
 * la petición cae al backend real con el JWT falso del mock (`alg: none`) y
 * responde 401 — el interceptor global lo toma como sesión vencida y
 * redirige a /login en loop. Determinístico (mismo hash que
 * `grade-groups.ts`) para que grado/grupo/asignatura salgan siempre
 * poblados y estables entre recargas.
 */
function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function nivelParaGrado(grade: number): { id: number; nombre: string } {
  if (grade === 0) return { id: 1, nombre: "Preescolar" }
  if (grade <= 5) return { id: 2, nombre: "Primaria" }
  if (grade <= 9) return { id: 3, nombre: "Secundaria" }
  return { id: 4, nombre: "Media" }
}

// Mismo criterio que `generateFallbackGroups` de `grade-groups.ts`: un
// subconjunto determinístico de `GROUPS` por grado, no todos los grados
// tienen la misma cantidad de grupos.
function gruposDeGrado(grade: number): string[] {
  const seed = hashString(`docente-grupos-${grade}`)
  const count = 1 + (seed % GROUPS.length)
  const offset = seed % GROUPS.length
  return Array.from({ length: count }, (_, i) => GROUPS[(offset + i) % GROUPS.length]).sort()
}

export const planeadorDocentesHandlers = [
  http.get("/api/eval-col/planeador/docentes/grupos", async () => {
    await delay(200)
    const rows = GRADES.flatMap((grade) => {
      const nivel = nivelParaGrado(grade)
      const gradoNombre = palabraGradoDesdeNombreCatalogo(formatGrade(grade)) ?? formatGrade(grade)
      return gruposDeGrado(grade).map((codigo) => ({
        grupo_id: hashString(`grupo-${grade}-${codigo}`) % 1000000,
        // "601" — grado + código del grupo, mismo formato que el mockup.
        grupo_codigo: `${grade}${codigo}`,
        grupo_nombre: `${grade}-${codigo}`,
        grado_id: grade + 1,
        grado_codigo: String(grade),
        grado_nombre: gradoNombre,
        nivel_ensenanza_id: nivel.id,
        nivel_ensenanza_nombre: nivel.nombre,
      }))
    })
    return HttpResponse.json({ rows })
  }),

  http.get("/api/eval-col/planeador/docentes/grado-asignatura", async () => {
    await delay(200)
    const rows = GRADES.flatMap((grade) => {
      const gradoNombre = palabraGradoDesdeNombreCatalogo(formatGrade(grade)) ?? formatGrade(grade)
      return ASIGNATURA_OPTIONS.map((asignatura, index) => ({
        grado_id: grade + 1,
        grado_codigo: String(grade),
        grado_nombre: gradoNombre,
        asignatura_id: index + 1,
        asignatura_codigo: asignatura.slice(0, 3).toUpperCase(),
        asignatura_nombre: asignatura,
      }))
    })
    return HttpResponse.json({ rows })
  }),
]
