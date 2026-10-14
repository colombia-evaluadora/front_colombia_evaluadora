import type { Actividad } from "@/features/planeador/api/types/actividad"

type RecuperacionValores = Pick<
  Actividad,
  | "esRecuperacion"
  | "recuperacionDestino"
  | "recuperacionActividadId"
  | "recuperacionTipoAplicacion"
  | "recuperacionTipoCalculo"
  | "recuperacionValorPonderacion"
>

export type CampoRecuperacion =
  | "recuperacionDestino"
  | "recuperacionActividadId"
  | "recuperacionTipoAplicacion"
  | "recuperacionTipoCalculo"
  | "recuperacionValorPonderacion"

/** Nombre visible de cada campo, en el orden del form (para el aviso de
 *  "Complete los campos obligatorios"). */
export const ETIQUETA_CAMPO_RECUPERACION: Record<CampoRecuperacion, string> = {
  recuperacionDestino: "¿Esta recuperación aplica para?",
  recuperacionActividadId: "¿Qué actividad deseas recuperar?",
  recuperacionTipoAplicacion: "¿Cómo se aplicará la nota de recuperación?",
  recuperacionTipoCalculo: "¿Cómo deseas calcular la nota?",
  recuperacionValorPonderacion: "Valor de ponderación (%)",
}

/**
 * Espejo de `fn_actividad_validar_recuperacion_config` (sso V496.1), que
 * corre al crear y al actualizar una recuperación. Una recuperación se tiene
 * que completar entera, así que con "Es una recuperación" encendido:
 *
 * - destino siempre;
 * - actividad a recuperar solo con destino ACTIVIDAD (con NOTA_FINAL no va);
 * - tipo de aplicación siempre;
 * - tipo de cálculo salvo con REEMPLAZAR (ahí el backend lo ignora);
 * - % de ponderación (0-100) solo con PONDERADO.
 *
 * Los mensajes son los del backend. Lo que depende de datos del servidor
 * (que el origen sea sumativa, de la misma asignatura, con resultados) ya lo
 * filtra la cascada de "¿Qué actividad deseas recuperar?" y lo revalida el
 * backend al guardar.
 */
export function erroresRecuperacion(
  values: RecuperacionValores,
  rotuloLower = "actividad",
): Partial<Record<CampoRecuperacion, string>> {
  if (!values.esRecuperacion) return {}
  const errores: Partial<Record<CampoRecuperacion, string>> = {}
  const destino = values.recuperacionDestino
  const aplicacion = values.recuperacionTipoAplicacion
  const calculo = values.recuperacionTipoCalculo
  const valor = values.recuperacionValorPonderacion

  if (!destino) {
    errores.recuperacionDestino = `Indique qué desea recuperar (${rotuloLower} o nota final).`
  } else if (destino === "ACTIVIDAD" && values.recuperacionActividadId == null) {
    errores.recuperacionActividadId = `Seleccione qué ${rotuloLower} se va a recuperar.`
  }
  if (!aplicacion) {
    errores.recuperacionTipoAplicacion = "Indique cómo se aplicará la nota de la recuperación."
  } else if (aplicacion !== "REEMPLAZAR") {
    if (!calculo) {
      errores.recuperacionTipoCalculo = "Indique si la nota de la recuperación se promedia o se pondera con la original."
    } else if (calculo === "PONDERADO") {
      if (valor == null || Number.isNaN(valor)) {
        errores.recuperacionValorPonderacion = "Indique el porcentaje (0 a 100) con que pondera la nota de la recuperación."
      } else if (valor < 0 || valor > 100) {
        errores.recuperacionValorPonderacion = "El porcentaje de la recuperación debe estar entre 0 y 100."
      }
    }
  }
  return errores
}

/** Nombres visibles de los campos de recuperación con error, en orden. */
export function recuperacionFaltantes(values: RecuperacionValores, rotuloLower = "actividad"): string[] {
  const errores = erroresRecuperacion(values, rotuloLower)
  return (Object.keys(ETIQUETA_CAMPO_RECUPERACION) as CampoRecuperacion[])
    .filter((campo) => errores[campo])
    .map((campo) =>
      campo === "recuperacionActividadId"
        ? `¿Qué ${rotuloLower} deseas recuperar?`
        : ETIQUETA_CAMPO_RECUPERACION[campo],
    )
}
