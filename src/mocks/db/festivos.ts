import type { Festivo, TipoFecha } from "@/features/administration/festivos/api/types"

// Réplica en memoria de TFESTIVO con los datos iniciales de V337. `fechaAnioEnCurso`
// y `enUso` no se guardan: los arma el handler, como el back.
export type FestivoRecord = Omit<Festivo, "fechaAnioEnCurso" | "enUso">

const fija = (pk: number, nombre: string, mes: number, dia: number, tipo: TipoFecha = "FIJA"): FestivoRecord => ({
  pkFestivo: pk,
  nombre,
  tipoFecha: tipo,
  mes,
  dia,
  diasPascua: null,
  trasladoLunes: false,
  habilitado: true,
})

const emiliani = (pk: number, nombre: string, mes: number, dia: number) =>
  fija(pk, nombre, mes, dia, "LEY_EMILIANI")

const pascua = (pk: number, nombre: string, dias: number, traslado: boolean): FestivoRecord => ({
  pkFestivo: pk,
  nombre,
  tipoFecha: "PASCUA",
  mes: null,
  dia: null,
  diasPascua: dias,
  trasladoLunes: traslado,
  habilitado: true,
})

export const festivosDb: FestivoRecord[] = [
  fija(1, "Año Nuevo", 1, 1),
  emiliani(2, "Día de los Reyes Magos", 1, 6),
  emiliani(3, "Día de San José", 3, 19),
  pascua(4, "Jueves Santo", -3, false),
  pascua(5, "Viernes Santo", -2, false),
  fija(6, "Día del Trabajo", 5, 1),
  pascua(7, "Ascensión del Señor", 39, true),
  pascua(8, "Corpus Christi", 60, true),
  pascua(9, "Sagrado Corazón de Jesús", 68, true),
  emiliani(10, "San Pedro y San Pablo", 6, 29),
  fija(11, "Día de la Independencia", 7, 20),
  fija(12, "Batalla de Boyacá", 8, 7),
  emiliani(13, "Asunción de la Virgen", 8, 15),
  emiliani(14, "Día de la Raza", 10, 12),
  emiliani(15, "Todos los Santos", 11, 1),
  emiliani(16, "Independencia de Cartagena", 11, 11),
  fija(17, "Inmaculada Concepción", 12, 8),
  fija(18, "Navidad", 12, 25),
]
