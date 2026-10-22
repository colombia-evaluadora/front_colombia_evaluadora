/**
 * Cierra una frase con punto sin duplicarlo. Las horas en español terminan en "a. m." / "p. m."
 * (date-fns `es` e `Intl` con `es-CO`), así que `${hora}.` mostraba "7:30 a. m.." (QA del chat).
 */
export function cerrarFrase(frase: string): string {
  const t = frase.trimEnd()
  return /[.!?…]$/.test(t) ? t : `${t}.`
}
