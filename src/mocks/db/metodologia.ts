// Catálogo METODOLOGIA (SIMAT) y metodología de cada matrícula del mock.
export const METODOLOGIAS = [
  { pk_lista_valor: 1, nombre: "Tradicional" },
  { pk_lista_valor: 2, nombre: "Escuela Nueva" },
  { pk_lista_valor: 3, nombre: "Aceleración del aprendizaje" },
  { pk_lista_valor: 4, nombre: "Postprimaria" },
  { pk_lista_valor: 5, nombre: "Telesecundaria" },
  { pk_lista_valor: 6, nombre: "Media rural" },
]

/** La mayoría Tradicional; una de cada diez, alguna de las demás. */
export function metodologiaDe(pk: number): number {
  return pk % 10 === 0 ? 2 + ((pk / 10) % 5) : 1
}

// Listas nuevas de los bloques 2.1, 2.2, 2.5 y 2.8 (pendientes en el back).
const lista = (nombres: string[]) => nombres.map((nombre, i) => ({ pk_lista_valor: i + 1, nombre }))

export const CATALOGOS_MATRICULA_NUEVOS: Record<string, { pk_lista_valor: number; nombre: string }[]> = {
  INTERNADO: lista(["No", "Semi interno", "Residente"]),
  PAIS: lista(["Colombia", "Venezuela", "Ecuador", "Perú", "Panamá", "Brasil", "Estados Unidos", "España"]),
  LENGUA_MATERNA: lista(["Español", "Wayuunaiki", "Nasa yuwe", "Emberá", "Lengua de señas colombiana", "Inglés", "Otra"]),
  CONDICION_MIGRATORIA: lista(["Regular", "Irregular", "En trámite de regularización", "Solicitante de refugio"]),
  APOYO_ACADEMICO_ESPECIAL: lista(["No aplica", "Aula hospitalaria", "Aula de apoyo", "Docente de apoyo pedagógico"]),
  TRASTORNO_ESPECIFICO: lista(["No aplica", "Trastorno del aprendizaje", "TDAH", "Trastorno del lenguaje"]),
  SITUACION_SRPA: lista(["No aplica", "Con medida privativa de la libertad", "Con medida no privativa de la libertad"]),
  INSTITUCION_BIENESTAR: lista(["Ninguna", "Hogar comunitario ICBF", "CDI", "Jardín infantil privado"]),
}
