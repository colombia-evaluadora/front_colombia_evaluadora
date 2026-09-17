/**
 * Los nombres de columna de `/informes/*` se mapearon desde la documentación,
 * que no trae un ejemplo de respuesta para varios endpoints, y el módulo
 * alterna entre `periodo` y `periodo_nombre` según la función. Probar los dos
 * cuesta menos que dejar viajar un `undefined` hasta el render: ya pasó dos
 * veces —los checkboxes de período salían todos marcados, y la tabla de
 * observaciones reventaba en `.match()`— y en los dos casos el síntoma no
 * señalaba al mapper.
 */
export function texto(...candidatos: unknown[]): string {
  for (const valor of candidatos) {
    if (typeof valor === "string" && valor !== "") return valor
    if (typeof valor === "number") return String(valor)
  }
  return ""
}
