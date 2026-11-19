/** dd/mm/aaaa desde yyyy-MM-dd. */
export const formatoFecha = (iso: string) => iso.split("-").reverse().join("/")

/** Nota con un decimal y coma: 5,2. */
export const formatoNota = (n: number) => n.toFixed(1).replace(".", ",")
