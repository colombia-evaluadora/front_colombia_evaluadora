/**
 * El front modela `sorting` como `SortingState` de TanStack (array, soporta
 * multi-sort) porque así lo espera `useDataTable`/`useTablePagination` — en
 * la práctica esta app nunca ordena por más de una columna a la vez, así
 * que siempre es `[]` o `[{id, desc}]`.
 *
 * El binding SQL del backend real resuelve `:BODY.SORTING.ID` /
 * `:BODY.SORTING.DESC` como propiedades de un objeto único, no de un array
 * — mandarle `[{...}]` rompe ese cast. Esto traduce solo en el borde de
 * salida (no toca `SortingState` ni la paginación de las tablas); el mock
 * sigue esperando el array tal cual.
 */
export function toSingleSort<T extends { id: string; desc: boolean }>(
  sorting: T[],
): T | null {
  return sorting[0] ?? null
}
