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
