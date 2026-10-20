// El backend manda `LocalDateTime` sin zona pero en UTC: sin la `Z` el
// navegador la toma como hora local y queda corrida 5 horas.
const CON_ZONA = /(Z|[+-]\d{2}:?\d{2})$/i

export function fechaServidor(valor: string | null | undefined): Date {
  if (!valor) return new Date(NaN)
  return new Date(CON_ZONA.test(valor) ? valor : `${valor}Z`)
}
