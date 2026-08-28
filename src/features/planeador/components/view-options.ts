/**
 * Opciones del Select "Ver por" del listado del Planeador. Vive aparte del
 * componente para que el wrapper no rompa el fast-refresh de Vite (la regla
 * `react/only-export-components` rechaza archivos que exportan componentes
 * y constantes a la vez).
 */
export const VIEW_OPTIONS = [
  { value: "actividad", label: "Actividad" },
  { value: "unidad", label: "Unidad" },
  { value: "instrumento", label: "Instrumento" },
] as const

export type ViewOption = (typeof VIEW_OPTIONS)[number]["value"]
/**
 * Opciones del filtro "Instrumento" del panel de filtros avanzados. Todavía
 * no filtra nada: el catálogo real de instrumentos llega en otra iteración,
 * pero el valor ya viaja en la URL.
 */
export const INSTRUMENTO_OPTIONS = [
  { value: "rubrica", label: "Rúbrica" },
  { value: "autoevaluacion", label: "Autoevaluación" },
  { value: "prueba", label: "Prueba escrita" },
] as const
