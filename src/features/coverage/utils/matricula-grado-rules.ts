export const USUARIO_ADMINISTRADO_GRADO_MIN = -3
export const USUARIO_ADMINISTRADO_GRADO_MAX = 5

export function isPreescolarPrimariaGrado(grade: string): boolean {
  const valor = Number(grade)
  return (
    !Number.isNaN(valor) &&
    valor >= USUARIO_ADMINISTRADO_GRADO_MIN &&
    valor <= USUARIO_ADMINISTRADO_GRADO_MAX
  )
}
