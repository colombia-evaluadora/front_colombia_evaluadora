// Validación de G.10.SOC.1; replica fn_servicio_social_parametros_guardar (V623).

export interface ValoresServicioSocial {
  horas: string
  grados: number[]
  anticipacion: string
}

export type ErroresServicioSocial = Partial<Record<keyof ValoresServicioSocial, string>>

function entero(valor: string, min: number, max: number): boolean {
  const n = Number(valor)
  return valor.trim() !== "" && Number.isInteger(n) && n >= min && n <= max
}

export function validarServicioSocial(v: ValoresServicioSocial): ErroresServicioSocial {
  const e: ErroresServicioSocial = {}
  if (!entero(v.horas, 1, 500)) e.horas = "Las horas requeridas deben ser un número entero entre 1 y 500."
  if (v.grados.length === 0) e.grados = "Elija al menos un grado."
  if (!entero(v.anticipacion, 1, 6)) e.anticipacion = "La anticipación debe ser un número entero entre 1 y 6 meses."
  return e
}
