import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { findCatalogId } from "@/features/establishment/academic-period/api/query/resolve-catalog-id"
import type { Actividad } from "@/features/planeador/api/types/actividad"

type RecuperacionCampos = Pick<
  Actividad,
  | "recuperacionDestino"
  | "recuperacionActividadId"
  | "recuperacionTipoAplicacion"
  | "recuperacionTipoCalculo"
  | "recuperacionValorPonderacion"
>

/**
 * Arma `BODY.RECUPERACION` de `POST`/`PUT /planeador/actividades` como STRING
 * JSON, igual que `MATERIALES`/`ADAPTACIONES`/`DEFINICION`.
 *
 * Bug de QA 54/55: se mandaba como objeto, y el motor de queries APLANA los
 * objetos del body (`BODY.RECUPERACION.DESTINO`, …), así que el
 * `CAST(:BODY.RECUPERACION AS JSONB)` llegaba `NULL` y la actividad se
 * guardaba como NORMAL (`ES_RECUPERACION = 'N'`, sin fila en
 * `TACTIVIDAD_RECUPERACION`). De ahí que al editarla "Es una recuperación"
 * apareciera apagado y que esa falsa recuperación se pudiera elegir como
 * origen de otra (la regla 64 del backend nunca la veía como recuperación).
 *
 * Además `fn_actividad_validar_recuperacion_config` (sso V496.1) castea
 * `destino`/`tipoAplicacion`/`tipoCalculo` a BIGINT: son `pk_lista_valor`,
 * no el código `valor` que maneja el form ("ACTIVIDAD", "REEMPLAZAR"…). Se
 * resuelven acá, justo antes de guardar (los pk difieren entre entornos).
 */
export async function toRecuperacionBody(data: RecuperacionCampos): Promise<string> {
  const [destinos, aplicaciones, calculos] = await Promise.all([
    fetchSelectCategory("DESTINO_RECUPERACION"),
    fetchSelectCategory("TIPO_APLICACION_RECUPERACION"),
    fetchSelectCategory("TIPO_CALCULO_RECUPERACION"),
  ])
  const destino = findCatalogId(destinos, data.recuperacionDestino, { match: "valor" })
  const tipoAplicacion = findCatalogId(aplicaciones, data.recuperacionTipoAplicacion, { match: "valor" })
  if (destino == null || tipoAplicacion == null) {
    throw new Error("No se pudo resolver la configuración de la recuperación. Recargue la página e intente de nuevo.")
  }
  // Regla `tipoCalculoOcultoSi` de `campos_disponibles.recuperacion.reglas`:
  // con REEMPLAZAR el campo se omite del todo (el backend guarda PROMEDIADO).
  const tipoCalculo =
    data.recuperacionTipoAplicacion === "REEMPLAZAR"
      ? undefined
      : findCatalogId(calculos, data.recuperacionTipoCalculo, { match: "valor" })
  return JSON.stringify({
    destino,
    fkActividadRecuperar: data.recuperacionDestino === "ACTIVIDAD" ? data.recuperacionActividadId : undefined,
    tipoAplicacion,
    tipoCalculo,
    valorPonderacion: data.recuperacionValorPonderacion,
  })
}

/**
 * Inverso para el detalle: `fn_actividad_buscar_por_pk` devuelve en
 * `recuperacion` los `pk_lista_valor` guardados, y el form trabaja con el
 * código `valor`. Acepta también un `valor` ya resuelto (mock / respuestas
 * que algún día lo traigan) y lo deja igual.
 */
export function recuperacionValorDesdePk(
  catalogo: readonly { pk: number; valor: string }[],
  raw: number | string | null | undefined,
): string {
  if (raw == null || raw === "") return ""
  const pk = Number(raw)
  if (Number.isNaN(pk)) return String(raw)
  return catalogo.find((opcion) => opcion.pk === pk)?.valor ?? ""
}
