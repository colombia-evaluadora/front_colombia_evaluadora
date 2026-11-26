import type { SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { SPECIALTY_CATALOG } from "@/mocks/db/campus-details"
import { DISABILITIES, LEGAL_TYPES, SECTORES } from "@/mocks/db/catalogs/establishment"
import { MUNICIPALITIES } from "@/mocks/db/catalogs/municipalities"

/**
 * Listas valor con padre (sso V104.1) tal como las devuelve
 * `GET /eval-col/select/:CATEGORIA`: municipio → departamento, naturaleza
 * jurídica → sector, resguardo → etnia, especialidad → carácter. Salen de los
 * mocks que ya existían para que los ids guardados en las entidades mock sigan
 * coincidiendo.
 */
const fila = (
  pk: number,
  nombre: string,
  valor: string,
  padre: number | null = null,
  etiqueta: string | null = null,
): SelectCategoryRow => ({
  pk_lista_valor: pk,
  nombre,
  valor,
  accion: null,
  etiqueta,
  fk_tlista_valor_padre: padre,
})

const departamentos = new Map(MUNICIPALITIES.map((m) => [m.department.id, m.department]))
const sectorPorNombre = new Map(SECTORES.map((s) => [s.name.toLowerCase(), s.id]))
const caracteres = new Map(SPECIALTY_CATALOG.map((e) => [e.fk_caracter, e.caracter_nombre]))

const ETNIAS = [
  { pk: 701, nombre: "Wayuu" },
  { pk: 702, nombre: "Arhuaco" },
]

const RESGUARDOS = [
  { pk: 711, nombre: "Alta y Media Guajira", etnia: 701 },
  { pk: 712, nombre: "Arhuaco de la Sierra Nevada", etnia: 702 },
]

export const LISTAS_JERARQUICAS: Record<string, SelectCategoryRow[]> = {
  DEPARTAMENTO: [...departamentos.values()].map((d) =>
    fila(d.id, d.name, String(d.id).padStart(2, "0"), null, String(d.id).padStart(2, "0")),
  ),
  MUNICIPIO: MUNICIPALITIES.map((m) => fila(m.id, m.name, m.code ?? String(m.id), m.department.id, m.code ?? null)),
  SECTOR: SECTORES.map((s) => fila(s.id, s.name, s.code)),
  NATURALEZA_JURIDICA: LEGAL_TYPES.map((t) =>
    fila(t.id, t.name, t.code, sectorPorNombre.get(t.sector.toLowerCase()) ?? null),
  ),
  DISCAPACIDAD: DISABILITIES.map((d) => fila(d.id, d.name, d.code)),
  ETNIA: ETNIAS.map((e) => fila(e.pk, e.nombre, String(e.pk))),
  RESGUARDO: RESGUARDOS.map((r) => fila(r.pk, r.nombre, String(r.pk), r.etnia)),
  CARACTER: [...caracteres.entries()].map(([pk, nombre], i) => ({ ...fila(pk, nombre, String(i + 1)), orden: i + 1 })),
  // "Otra" es el VALOR 7 de ESPECIALIDAD (sso fn_sed_esp_es_otra).
  ESPECIALIDAD: SPECIALTY_CATALOG.map((e) => fila(e.id, e.nombre, e.es_otra ? "7" : `E${e.id}`, e.fk_caracter)),
}
