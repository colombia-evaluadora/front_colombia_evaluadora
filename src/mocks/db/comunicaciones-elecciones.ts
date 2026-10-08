import type { Eleccion } from "@/features/comunicaciones/chat/api/types"

// La elección de ejemplo cierra 30 minutos después de cargar la app, para ver
// la cuenta regresiva y, al llegar a cero, los resultados finales.
const cierre = new Date(Date.now() + 30 * 60_000).toISOString()

export const elecciones: Eleccion[] = [
  {
    conversacionId: 5,
    nombre: "Elección Personero 2026",
    descripcion: "Elección del personero estudiantil para el año 2026.",
    fechaInicio: null,
    fechaCierre: cierre,
    jornadaId: 1,
    verResultadosEnVivo: true,
    permitirComentarios: true,
    candidatos: [
      { id: 1, nombre: "Fernney Antonio Jaramillo Gomez", numero: "41", lema: "Más ideas para crecer", fotoUrl: null, votos: 74 },
      { id: 2, nombre: "Laura Martínez Gómez", numero: "20", lema: "Tu voz impulsa el cambio", fotoUrl: null, votos: 53 },
      { id: 3, nombre: "Sebastián Rodríguez Pérez", numero: "98", lema: "Juntos logramos avanzar", fotoUrl: null, votos: 83 },
    ],
    votosEnBlanco: 21,
    cerradaManualmente: false,
    yaVoto: false,
    totalHabilitados: 300,
    vieronCanal: 260,
    creadoPor: "Andrés Gómez",
    esCreador: true,
  },
]

// Simula votos nuevos mientras la elección sigue abierta.
export function simularVotos(e: Eleccion) {
  if (e.cerradaManualmente || (e.fechaCierre && Date.parse(e.fechaCierre) <= Date.now())) return
  const emitidos = e.candidatos.reduce((s, c) => s + c.votos, 0) + e.votosEnBlanco
  if (emitidos >= e.totalHabilitados) return
  const i = Math.floor(Math.random() * (e.candidatos.length + 1))
  if (i === e.candidatos.length) e.votosEnBlanco += 1
  else e.candidatos[i].votos += 1
  e.vieronCanal = Math.min(e.totalHabilitados, Math.max(e.vieronCanal, emitidos + 30))
}

// Quién votó en cada elección (por correo): el voto es único por persona.
export const votantes = new Map<number, Set<string>>()

export const yaVoto = (conversacionId: number, correo: string | undefined) =>
  !!correo && (votantes.get(conversacionId)?.has(correo) ?? false)

export const eleccionCerrada = (e: Eleccion) =>
  e.cerradaManualmente || (!!e.fechaCierre && Date.parse(e.fechaCierre) <= Date.now())
