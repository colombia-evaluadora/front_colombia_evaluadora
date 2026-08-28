/**
 * Descripción de un nivel de desempeño de la rúbrica.
 *
 * Las celdas de `DataTable` van `whitespace-nowrap` —bien para valores cortos,
 * no para prosa: las cuatro descripciones en una sola línea daban una tabla
 * mucho más ancha que el panel, que solo se leía scrolleando en horizontal—,
 * así que acá se reactiva el salto de línea.
 *
 * `max-w` y no `w`: es un techo, no un ancho fijo. Con `table-layout: auto` el
 * navegador reparte el sobrante hasta ese límite y, si el panel es más
 * angosto, encoge las columnas en vez de desbordar.
 *
 * En archivo propio para que `columns-unidad-criterios.tsx` solo exporte la
 * factoría y Vite/React Refresh puedan recargar los cambios sin perder el
 * estado de la tabla.
 */
export function NivelTexto({ children }: { children: React.ReactNode }) {
  return <span className="block max-w-[16rem] whitespace-normal">{children}</span>
}
