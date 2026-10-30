import type { ListaValor } from "@/features/administration/listas-valor/api/types/lista-valor"
import type { Cortes, CortesGrado } from "@/features/administration/parametros-edad/api/types"

// Réplica en memoria de V308–V313: valores de las listas GRADOS y CALENDARIO
// (con pk propios del mock) y los parámetros guardados por pk de la lista.

const valor = (pk: number, categoria: string, nombre: string, orden: number): ListaValor => ({
  pkListaValor: pk,
  categoria,
  nombre,
  valor: nombre.toUpperCase().replace(/\s+/g, "_"),
  etiqueta: null,
  accion: null,
  orden,
  predeterminado: false,
  habilitado: true,
  esSistema: true,
  active: true,
  padre: null,
})

const GRADOS = [
  "Prejardín",
  "Jardín",
  "Transición",
  "Primero",
  "Segundo",
  "Tercero",
  "Cuarto",
  "Quinto",
  "Sexto",
  "Séptimo",
  "Octavo",
  "Noveno",
  "Décimo",
  "Undécimo",
]

export const gradosDb: ListaValor[] = GRADOS.map((n, i) => valor(2000 + i, "GRADOS", n, i + 1))
export const calendariosDb: ListaValor[] = [
  valor(2100, "CALENDARIO", "A", 1),
  valor(2101, "CALENDARIO", "B", 2),
]

/** pk del grado → edad recomendada y cortes propios (null = rige el por defecto). Prejardín 3 años … Undécimo 16. */
export const edadesDb = new Map<number, { edad: number } & CortesGrado>(
  gradosDb.map((g, i) => [
    g.pkListaValor,
    { edad: i + 3, bajaEdadHasta: null, preextraedadDesde: null, extraedadDesde: null },
  ]),
)

/** Registro único de cortes por defecto, con los valores que siembra V308. */
export const cortesDefectoDb: Cortes = { bajaEdadHasta: -2, preextraedadDesde: 1, extraedadDesde: 2 }

/** pk del calendario → fecha de corte. */
export const cortesDb = new Map<number, { mes: number; dia: number }>([
  [2100, { mes: 3, dia: 31 }],
  [2101, { mes: 9, dia: 30 }],
])
