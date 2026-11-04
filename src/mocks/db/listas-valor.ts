import type { Icono } from "@/features/administration/listas-valor/api/types/icono"
import type { Categoria, ListaValor } from "@/features/administration/listas-valor/api/types/lista-valor"
import { calendariosDb, gradosDb } from "@/mocks/db/parametros-edad"

// Réplica en memoria de TLISTA_CATEGORIA / TLISTA_VALOR (V101), con la lista ICONOGRAFIA (V106).
// GRADOS y CALENDARIO reusan los arrays de parametros-edad para que ambas vistas vean lo mismo.

export type CategoriaDb = Omit<Categoria, "totalValores" | "predeterminado">

const cat = (
  categoria: string,
  nombre: string,
  extra: Partial<CategoriaDb> = {},
): CategoriaDb => ({
  categoria,
  nombre,
  descripcion: null,
  categoriaPadre: null,
  esOrdinal: false,
  habilitada: true,
  esSistema: false,
  ...extra,
})

export const categoriasDb: CategoriaDb[] = [
  cat("TIPO_DOCUMENTO", "Tipo de documento", { esSistema: true }),
  cat("JORNADA", "Jornada", { esSistema: true }),
  cat("GRADOS", "Grados", { esSistema: true, esOrdinal: true }),
  cat("CALENDARIO", "Calendario", { esSistema: true }),
  cat("DEPARTAMENTO", "Departamento"),
  cat("MUNICIPIO", "Municipio", { categoriaPadre: "DEPARTAMENTO" }),
  cat("NIVEL_DESEMPENO", "Nivel de desempeño", {
    esOrdinal: true,
    descripcion: "Niveles de la escala nacional (Decreto 1290).",
  }),
]

let pk = 5000
const valor = (
  categoria: string,
  nombre: string,
  valorCodigo: string,
  orden: number,
  extra: Partial<ListaValor> = {},
): ListaValor => ({
  pkListaValor: pk++,
  categoria,
  nombre,
  valor: valorCodigo,
  etiqueta: null,
  accion: null,
  orden,
  predeterminado: false,
  habilitado: true,
  esSistema: false,
  active: true,
  padre: null,
  ...extra,
})

const tipos = [
  ["Registro civil", "RC"],
  ["Tarjeta de identidad", "TI"],
  ["Cédula de ciudadanía", "CC"],
  ["Cédula de extranjería", "CE"],
  ["Permiso por protección temporal", "PPT"],
].map(([n, v], i) => valor("TIPO_DOCUMENTO", n, v, i + 1, { esSistema: true, predeterminado: v === "TI" }))

const jornadas = ["Mañana", "Tarde", "Nocturna", "Única", "Fin de semana"].map((n, i) =>
  valor("JORNADA", n, n.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, "_"), i + 1, {
    esSistema: true,
  }),
)

const antioquia = valor("DEPARTAMENTO", "Antioquia", "ANTIOQUIA", 1)
const cundinamarca = valor("DEPARTAMENTO", "Cundinamarca", "CUNDINAMARCA", 2)
const aPadre = (v: ListaValor) => ({
  pkListaValor: v.pkListaValor,
  categoria: v.categoria,
  nombre: v.nombre,
  valor: v.valor,
})
const municipios = [
  ["Medellín", "MEDELLIN", antioquia],
  ["Envigado", "ENVIGADO", antioquia],
  ["Soacha", "SOACHA", cundinamarca],
  ["Zipaquirá", "ZIPAQUIRA", cundinamarca],
].map(([n, v, p], i) => valor("MUNICIPIO", n as string, v as string, i + 1, { padre: aPadre(p as ListaValor) }))

const niveles = [
  ["Superior", "SUPERIOR", "S"],
  ["Alto", "ALTO", "A"],
  ["Básico", "BASICO", "B"],
  ["Bajo", "BAJO", "BJ"],
].map(([n, v, e], i) => valor("NIVEL_DESEMPENO", n, v, i + 1, { etiqueta: e }))

export const valoresDb: ListaValor[] = [
  ...tipos,
  ...jornadas,
  ...gradosDb,
  ...calendariosDb,
  antioquia,
  cundinamarca,
  ...municipios,
  ...niveles,
]

export const nextValorPk = () => Math.max(...valoresDb.map((v) => v.pkListaValor)) + 1

// ---- Iconografía ----
// La real arranca vacía (V106); el mock trae algunos para probar. Los binarios
// viven en memoria y los sirve el handler de /files/public (se reinician al recargar).
export const archivosIconoDb = new Map<string, File>()

const svg = (cuerpo: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${cuerpo}</svg>`

const cara = (boca: string, color: string) =>
  svg(
    `<circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="2"/>` +
      `<circle cx="8.5" cy="9.5" r="1.3" fill="${color}"/><circle cx="15.5" cy="9.5" r="1.3" fill="${color}"/>` +
      `<path d="${boca}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`,
  )

const SEMILLA_SVG: [string, string][] = [
  ["Muy feliz", cara("M7 13.5c1.2 3 8.8 3 10 0", "#E0A100")],
  ["Feliz", cara("M8 14.5c1.5 2 6.5 2 8 0", "#2E9B57")],
  ["Neutral", cara("M8 15h8", "#1B8FC2")],
  ["Triste", cara("M8 16.5c1.5-2 6.5-2 8 0", "#E07020")],
  ["Estrella", svg('<path fill="#F2B705" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>')],
  ["Corazón", svg('<path fill="#D93B3B" d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 5 6.6 5c2 0 3.6 1.1 5.4 3 1.8-1.9 3.4-3 5.4-3 3.4 0 5.6 3.3 4.1 6.8C19.5 16.4 12 21 12 21z"/>')],
  ["Visto bueno", svg('<circle cx="12" cy="12" r="10" fill="#2E9B57"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>')],
]

// PNG 16x16 morado: para ver que un PNG conserva sus colores.
const PNG_MORADO =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAG0lEQVR4nGOotj/ynxLMMGrAqAGjBvwfJgYAAC9TfR8km+2EAAAAAElFTkSuQmCC"

function semillaArchivo(clave: string, contenido: BlobPart, tipo: string) {
  archivosIconoDb.set(clave, new File([contenido], clave.split("/").pop() ?? clave, { type: tipo }))
  return clave
}

const base = (nombre: string, valor: string, orden: number, habilitado = true): Icono => ({
  pkIcono: 9000 + orden,
  nombre,
  valor,
  orden,
  habilitado,
  active: true,
  enUso: false,
})

export const iconosDb: Icono[] = [
  ...SEMILLA_SVG.map(([nombre, contenido], i) =>
    base(nombre, semillaArchivo(`mock/iconografia/semilla-${i + 1}.svg`, contenido, "image/svg+xml"), i + 1),
  ),
  base(
    "Sello morado",
    semillaArchivo(
      "mock/iconografia/semilla-png.png",
      Uint8Array.from(atob(PNG_MORADO), (c) => c.charCodeAt(0)),
      "image/png",
    ),
    SEMILLA_SVG.length + 1,
    false,
  ),
]
