import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { subirAdjuntos } from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"
import { comunicadosGestionKey } from "@/features/comunicaciones/comunicados/api/comunicados-gestion"
import { ASPIRANTES } from "@/features/comunicaciones/comunicados/api/listas-valor"
import type { Comunicado, Conversacion, OpcionSeleccion } from "@/features/comunicaciones/chat/api/types"

/**
 * Formulario de comunicados del informe de Comunicaciones (Sección 3.1; Guía M.1.AGR.1, M.1.AGR.2 y
 * M.1.AGR.5). comms-service resuelve la cascada, valida cada nivel y vuelve a resolver los
 * destinatarios al publicar.
 */

export type TipoDestinatario = "ESTUDIANTES" | "ACUDIENTES" | "FUNCIONARIOS"

export const TIPOS: { valor: TipoDestinatario; etiqueta: string }[] = [
  { valor: "ESTUDIANTES", etiqueta: "Estudiantes" },
  { valor: "ACUDIENTES", etiqueta: "Acudientes" },
  { valor: "FUNCIONARIOS", etiqueta: "Funcionarios" },
]

/** Valor de Grado o Grupo cuando abarca todo el nivel superior. Vacío nunca significa Todos. */
export const TODOS = "TODOS"

/** Conjunto de destinatarios tal como lo edita el formulario (todo en texto: son valores de selectores). */
export interface Conjunto {
  establecimiento: string
  sede: string
  jornada: string
  tipos: TipoDestinatario[]
  // Valor de la lista POBLACION_ACADEMICA_COMUNICADO; solo con Estudiantes o Acudientes.
  poblacion: string
  anio: string
  modalidad: string
  ciclo: string
  grado: string
  grupo: string
  todosEstudiantes: boolean
  estudiantes: string[]
  todosRoles: boolean
  roles: string[]
  // Valor de la lista SELECCION_FUNCIONARIOS ("" sin elegir).
  seleccionFuncionarios: string
  funcionarios: string[]
}

/** Códigos ES_SISTEMA de SELECCION_FUNCIONARIOS que cambian el formulario. */
export const SELECCION_ESPECIFICOS = "ESPECIFICOS"
export const FORMA_PROGRAMADA = "PROGRAMADA"

export const CONJUNTO_VACIO: Conjunto = {
  establecimiento: "",
  sede: "",
  jornada: "",
  tipos: [],
  poblacion: "",
  anio: "",
  modalidad: "",
  ciclo: "",
  grado: "",
  grupo: "",
  todosEstudiantes: false,
  estudiantes: [],
  todosRoles: false,
  roles: [],
  seleccionFuncionarios: "",
  funcionarios: [],
}

export interface PeriodoResuelto {
  id: number
  anio: number
  modalidad: string
  nombreModalidad: string
  ciclo: number
  fechaInicio: string
  nombre: string | null
}

export interface Cascada {
  establecimientos: OpcionSeleccion[]
  sedes: OpcionSeleccion[]
  jornadas: OpcionSeleccion[]
  anios: OpcionSeleccion[]
  modalidades: OpcionSeleccion[]
  ciclos: OpcionSeleccion[]
  periodo: PeriodoResuelto | null
  grados: OpcionSeleccion[]
  grupos: OpcionSeleccion[]
  estudiantes: OpcionSeleccion[]
  roles: OpcionSeleccion[]
  funcionarios: OpcionSeleccion[]
}

export const esAcademico = (c: Conjunto) => c.tipos.includes("ESTUDIANTES") || c.tipos.includes("ACUDIENTES")

/**
 * Población Aspirantes (Guía M.1.AGR.4): la cascada usa los períodos en Inscripciones, el Grado es el
 * solicitado y no hay Grupo ni Estudiantes de referencia.
 */
export const esAspirantes = (c: Conjunto) => esAcademico(c) && c.poblacion === ASPIRANTES

/** Parámetros de la cascada (van en la query key). */
export function toCascadaParams(c: Conjunto) {
  if (esAspirantes(c)) {
    return {
      establecimiento: c.establecimiento,
      sede: c.sede,
      jornada: c.jornada === "TODAS" ? "" : c.jornada,
      anio: c.anio,
      modalidad: c.modalidad,
      ciclo: c.ciclo,
      grado: "",
      grupo: "",
      poblacion: ASPIRANTES,
    }
  }
  return {
    poblacion: "",
    establecimiento: c.establecimiento,
    sede: c.sede,
    // "Todas las jornadas" (conjunto solo de funcionarios) no acota por jornada.
    jornada: c.jornada === "TODAS" ? "" : c.jornada,
    anio: c.anio,
    modalidad: c.modalidad,
    ciclo: c.ciclo,
    // Un nivel en Todos no acota el siguiente.
    grado: c.grado === TODOS ? "" : c.grado,
    grupo: c.grupo === TODOS ? "" : c.grupo,
  }
}

export const cascadaKey = (params: ReturnType<typeof toCascadaParams>) => ["comunicado-cascada", params] as const

export async function fetchCascada(params: ReturnType<typeof toCascadaParams>) {
  const qs = new URLSearchParams()
  for (const [clave, valor] of Object.entries(params)) if (valor) qs.set(clave, valor)
  const [fila] = await evalCol.getRows<Cascada>(`/comunicaciones/comunicados/destinos/cascada?${qs.toString()}`)
  return fila
}

/** Opciones de cada nivel según lo ya elegido en el conjunto. */
export function useCascadaQuery(c: Conjunto) {
  const params = toCascadaParams(c)
  return useQuery({
    queryKey: cascadaKey(params),
    queryFn: () => fetchCascada(params),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

export interface PersonaSinCanal {
  nombre: string
  tipo: string
  motivo: string
  grupo: string | null
}

export interface PrevisualizacionDocumento {
  unicos: number
  estudiantes: number
  acudientes: number
  funcionarios: number
  conAviso: number
  soloCorreo: number
  // Estudiantes de las matrículas de referencia, se les envíe o no ("Acudientes 112 (de 102 estudiantes)").
  estudiantesReferencia: number
  sinCanal: PersonaSinCanal[]
  // Tipos elegidos que no resuelven a nadie ("Conjunto 1: Funcionarios no resuelve a ninguna persona.").
  avisos: string[]
}

export interface ComunicadoDocumentoInput {
  titulo: string
  mensaje: string
  conjuntos: { conjunto: Conjunto; resumen: string }[]
  // Valor de la lista FORMA_PUBLICACION.
  publicacion: string
  // ISO; solo con publicación programada.
  publicarEn: string | null
  // yyyy-MM-dd o null.
  visibleHasta: string | null
  archivos: File[]
  // Lo que el emisor confirmó al previsualizar: si cambió, comms-service responde 409.
  unicosConfirmados?: number
}

const numeros = (l: string[]) => l.map(Number)

const cuerpoConjunto = ({ conjunto: c, resumen }: { conjunto: Conjunto; resumen: string }) => ({
  ESTABLECIMIENTO: Number(c.establecimiento),
  SEDE: Number(c.sede),
  JORNADA: c.jornada && c.jornada !== "TODAS" ? Number(c.jornada) : null,
  TIPOS: c.tipos,
  POBLACION: esAcademico(c) ? c.poblacion || null : null,
  ANIO: c.anio ? Number(c.anio) : null,
  MODALIDAD: c.modalidad || null,
  CICLO: c.ciclo ? Number(c.ciclo) : null,
  GRADO: c.grado || null,
  // Aspirantes: sin Grupo ni Estudiantes de referencia (el aspirante aún no tiene matrícula).
  GRUPO: esAspirantes(c) ? null : c.grupo || null,
  TODOS_ESTUDIANTES: !esAspirantes(c) && c.todosEstudiantes ? "S" : "N",
  ESTUDIANTES: esAspirantes(c) ? [] : numeros(c.estudiantes),
  TODOS_ROLES: c.todosRoles ? "S" : "N",
  ROLES: c.roles,
  SELECCION_FUNCIONARIOS: c.seleccionFuncionarios || null,
  FUNCIONARIOS: numeros(c.funcionarios),
  RESUMEN: resumen,
})

const cuerpo = (v: ComunicadoDocumentoInput) => ({
  TITULO: v.titulo,
  MENSAJE: v.mensaje,
  CONJUNTOS: v.conjuntos.map(cuerpoConjunto),
  PUBLICACION: v.publicacion,
  PUBLICAR_EN: v.publicarEn,
  VISIBLE_HASTA: v.visibleHasta,
})

/** No crea nada: resuelve los destinatarios con las mismas reglas que la publicación. */
export function usePrevisualizarDocumento() {
  return useMutation({
    mutationFn: (v: ComunicadoDocumentoInput) =>
      evalCol.postRow<PrevisualizacionDocumento>("/comunicaciones/comunicados/destinos/previsualizar", cuerpo(v)),
  })
}

export function usePublicarDocumento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (v: ComunicadoDocumentoInput) => {
      const conAdjuntos = v.archivos.length > 0
      const canal = await evalCol.postRow<Conversacion>("/comunicaciones/comunicados", {
        ...cuerpo(v),
        UNICOS_CONFIRMADOS: v.unicosConfirmados ?? null,
        // Con archivos, el aviso espera a que se suban (`/avisar`).
        ESPERA_ADJUNTOS: conAdjuntos ? "S" : "N",
      })
      if (!conAdjuntos) return { canal, fallidos: [] as { nombre: string; error: string }[] }
      const fallidos = await subirAdjuntos(canal.id, v.archivos)
      await evalCol
        .postRow<Comunicado>(`/comunicaciones/conversaciones/${canal.id}/comunicado/avisar`, {})
        .catch(() => undefined)
      return { canal, fallidos }
    },
    // Además del chat, el listado "Comunicados institucionales": sin esto el nuevo no aparecía hasta
    // recargar (staleTime de 60 s), como sí lo hacen Anular y Cancelar.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
        queryClient.invalidateQueries({ queryKey: comunicadosGestionKey }),
      ]),
  })
}
