// Validación de los umbrales del nivel de convivencia (§3.6); replica fn_convivencia_validar_nivel_umbrales (V702).

export interface ValoresNiveles {
  medio: string
  alto: string
}

export type ErroresNiveles = Partial<Record<keyof ValoresNiveles, string>>

const UN_DECIMAL = /^\d+(\.\d)?$/

/** Deja dígitos y un punto (la coma se toma como punto). */
export function limpiarUmbral(valor: string): string {
  const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "")
  const [entero, ...resto] = limpio.split(".")
  return resto.length ? `${entero}.${resto.join("").slice(0, 1)}` : entero
}

export function validarNiveles({ medio, alto }: ValoresNiveles): ErroresNiveles {
  const m = medio.trim()
  const a = alto.trim()
  if (!m && !a) return {}
  if (!m) return { medio: "Indique el Umbral del nivel Medio de convivencia: los dos umbrales van juntos o ninguno." }
  if (!a) return { alto: "Indique el Umbral del nivel Alto de convivencia: es obligatorio si hay Umbral del nivel Medio." }
  const errores: ErroresNiveles = {}
  if (!UN_DECIMAL.test(m)) errores.medio = "Los umbrales de convivencia admiten un decimal."
  else if (Number(m) < 0.1 || Number(m) > 99.9) errores.medio = "El Umbral del nivel Medio de convivencia debe estar entre 0.1 y 99.9."
  if (!UN_DECIMAL.test(a)) errores.alto = "Los umbrales de convivencia admiten un decimal."
  else if (Number(a) < 0.2 || Number(a) > 100) errores.alto = "El Umbral del nivel Alto de convivencia debe estar entre 0.2 y 100."
  else if (!errores.medio && Number(a) <= Number(m))
    errores.alto = "El Umbral del nivel Alto de convivencia debe ser mayor que el Umbral del nivel Medio."
  return errores
}

export const aTexto = (v: number | string | null | undefined) => (v == null ? "" : String(Number(v)))
