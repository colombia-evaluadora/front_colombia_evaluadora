// Mismos caracteres que los referentes curriculares: letras (con tildes,
// diéresis y ñ), espacio, guion y apóstrofo (' y ’).
export const toPeriodoTextInput = (value: string) =>
  value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÜüÑñ '’-]/g, "")

// Abreviaciones, grupos, motivos y requisitos admiten además números (p. ej. "PE1", "01").
export const toPeriodoLongTextInput = (value: string) =>
  value.replace(/[^A-Za-z0-9ÁÉÍÓÚáéíóúÜüÑñ '’-]/g, "")
