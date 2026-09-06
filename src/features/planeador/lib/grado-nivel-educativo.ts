/**
 * Mapea el `valor` del catálogo `GRADOS` (`useGradosCatalogQuery`, un número
 * 0-11 como string — "0" es Preescolar/Transición, "1"-"11" el grado real)
 * al código de nivel educativo de `EDUCATION_LEVELS`
 * (`@/features/academic-management/curricular-references/api/catalogs`).
 *
 * No hay ningún vínculo real en el backend entre un grado y su nivel
 * educativo —`GradoCatalogOption` no lo trae— así que esto es una
 * aproximación local: el rango de grados por nivel es el estándar
 * colombiano (Preescolar / 1°-5° Primaria / 6°-9° Secundaria / 10°-11°
 * Media), igual que en `teachingLevelsDb` (mock de Establecimiento).
 *
 * Se usa para derivar "¿es formativa?" desde el GRADO elegido en
 * "Grado / Grupo" cuando la actividad NO tiene una unidad temática
 * seleccionada (`EvaluacionSection` en `form-editar-actividad.tsx`) — con
 * unidad elegida, el enfoque sale directo de `unidad.enfoquePedagogico`,
 * sin pasar por acá.
 */
export type NivelEducativoCode = "PREESCOLAR" | "PRIMARIA" | "SECUNDARIA" | "MEDIA"

export function nivelEducativoCodeForGrado(gradoValor: string): NivelEducativoCode | null {
  const grado = Number(gradoValor)
  if (!Number.isFinite(grado)) return null
  if (grado === 0) return "PREESCOLAR"
  if (grado >= 1 && grado <= 5) return "PRIMARIA"
  if (grado >= 6 && grado <= 9) return "SECUNDARIA"
  if (grado >= 10 && grado <= 11) return "MEDIA"
  return null
}

const GRADO_NUMERO_A_PALABRA: Record<number, string> = {
  0: "Preescolar",
  1: "Primero",
  2: "Segundo",
  3: "Tercero",
  4: "Cuarto",
  5: "Quinto",
  6: "Sexto",
  7: "Séptimo",
  8: "Octavo",
  9: "Noveno",
  10: "Décimo",
  11: "Once",
}

/**
 * "6°" (el `nombre` del catálogo GRADOS, ver `use-grados-catalog.ts`) →
 * "Sexto" (como `UnidadTematica.grado` guarda el grado, en palabras). Los
 * dos modelos representan "grado" en formatos distintos y no hay ninguna
 * tabla que los vincule en el backend, así que esto es la misma
 * aproximación local que `nivelEducativoCodeForGrado`: se usa para filtrar
 * "Unidad temática asociada" por el grado elegido en "Grado / Grupo".
 */
export function palabraGradoDesdeNombreCatalogo(gradoNombre: string): string | null {
  const match = gradoNombre.match(/\d+/)
  if (!match) return null
  const numero = Number(match[0])
  return GRADO_NUMERO_A_PALABRA[numero] ?? null
}

const PALABRA_A_GRADO_NUMERO: Record<string, number> = Object.fromEntries(
  Object.entries(GRADO_NUMERO_A_PALABRA).map(([numero, palabra]) => [palabra.toLowerCase(), Number(numero)]),
)

/**
 * Inverso de `palabraGradoDesdeNombreCatalogo`: "Sexto" (como
 * `UnidadTematica.grado` lo guarda) → nivel educativo. Se usa para derivar
 * `enfoquePedagogico` de una unidad a partir de su grado (buscando si algún
 * Referente Curricular de ese nivel es Formativo) en vez de que sea un
 * campo elegido a mano — mismo criterio que ya usa `EvaluacionSection` para
 * actividades sin unidad, ver el comentario de `nivelEducativoCodeForGrado`.
 */
export function nivelEducativoCodeForGradoPalabra(gradoPalabra: string): NivelEducativoCode | null {
  const numero = PALABRA_A_GRADO_NUMERO[gradoPalabra.trim().toLowerCase()]
  if (numero === undefined) return null
  return nivelEducativoCodeForGrado(String(numero))
}
