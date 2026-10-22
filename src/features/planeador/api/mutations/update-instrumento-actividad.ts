import { useMutation, useQueryClient } from "@tanstack/react-query"
import { writeConfig, type WriteRequest } from "@/lib/offline/outbox/write-request"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { resolveInstrumentoEvaluacionId } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import { resolveTipoEscalaId, resolveTipoEvidenciaOtroId } from "@/features/planeador/api/query/catalogos-lista-valor"
import type {
  Actividad,
  Criterio,
  EscalaValoracion,
  InstrumentoPermitido,
  ListaCotejo,
  Nivel,
  Rubrica,
} from "@/features/planeador/api/types/actividad"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { invalidarInformes } from "@/features/academic-management/reports/api/query/invalidar-informes"

// El `pk` sale primero de `instrumentosPermitidos` (comparando por `valor`): un pk de
// otro catálogo da 409. Solo si falta se cae al catálogo genérico.
function pkPorNombre(catalogo: { pk: number; nombre: string }[] | undefined, nombre: string): number | undefined {
  return catalogo?.find((o) => o.nombre === nombre)?.pk
}

function pkDeVarianteEscala(
  instrumentosPermitidos: InstrumentoPermitido[] | undefined,
  tipo: EscalaValoracion["tipo"],
): number | undefined {
  const valorEsperado = tipo === "Numérica" ? "NUMERICA" : "CUALITATIVA"
  const escala = instrumentosPermitidos?.find((i) => i.valor === "ESCALA_VALORACION")
  return escala?.variantes.find((v) => v.valor === valorEsperado)?.pk
}

// Requiere que el PUT de actividad ya haya fijado FK_TLV_INSTRUMENTO_EVALUACION (si no, 400/22023).
// Sin puntaje se omite `ponderacion` (no mandar 0): el backend aplica su default.
type NivelBody = { etiqueta: string; descripcion?: string; ponderacion?: number }

function nivelABody(nivel: Nivel): NivelBody {
  return { etiqueta: nivel.nombre, descripcion: nivel.descripcion || undefined, ponderacion: nivel.ponderacion }
}

/** "Excelente" vive aparte en el form; se reinserta como primer nivel si tiene contenido. */
function criterioABody(criterio: Criterio) {
  const niveles: NivelBody[] = []
  if (criterio.excelente.trim() || criterio.excelentePonderacion != null) {
    niveles.push({
      etiqueta: "Excelente",
      descripcion: criterio.excelente || undefined,
      ponderacion: criterio.excelentePonderacion,
    })
  }
  niveles.push(...criterio.niveles.map(nivelABody))
  return { nombre: criterio.nombre, descripcion: criterio.descripcion || undefined, niveles }
}

function rubricaVacia(rubrica: Rubrica): boolean {
  return rubrica.criterios.length === 0
}

function buildRubricaDefinicion(rubrica: Rubrica) {
  return rubrica.criterios.map(criterioABody)
}

function listaCotejoVacia(listaCotejo: ListaCotejo): boolean {
  return listaCotejo.items.length === 0
}

function buildListaCotejoDefinicion(listaCotejo: ListaCotejo) {
  return listaCotejo.items.map((item) => ({ descripcion: item.descripcion, ponderacion: item.ponderacion }))
}

function escalaVacia(escala: EscalaValoracion): boolean {
  if (escala.criteriosGenerales.trim()) return false
  return escala.tipo === "Numérica"
    ? escala.valorMinimo == null && escala.valorMaximo == null
    : escala.niveles.length === 0
}

async function buildEscalaDefinicion(escala: EscalaValoracion, instrumentosPermitidos?: InstrumentoPermitido[]) {
  const tipoEscala = pkDeVarianteEscala(instrumentosPermitidos, escala.tipo) ?? (await resolveTipoEscalaId(escala.tipo))
  if (escala.tipo === "Numérica") {
    return {
      tipoEscala,
      criteriosGenerales: escala.criteriosGenerales,
      valorMin: escala.valorMinimo,
      valorMax: escala.valorMaximo,
      interpretacionRangos: escala.interpretacionRangos,
    }
  }
  return {
    tipoEscala,
    criteriosGenerales: escala.criteriosGenerales,
    niveles: escala.niveles.map(nivelABody),
  }
}

/** "Otro" reusa los mismos datos del instrumento directo según el método elegido. */
function metodoVacio(metodo: string, actividad: Actividad): boolean {
  if (metodo === "Lista de cotejo") return listaCotejoVacia(actividad.listaCotejo)
  if (metodo === "Escala de valoración") return escalaVacia(actividad.escalaValoracion)
  return rubricaVacia(actividad.rubrica)
}

async function buildDefinicionPorMetodo(
  metodo: string,
  actividad: Actividad,
  instrumentosPermitidos?: InstrumentoPermitido[],
) {
  if (metodo === "Lista de cotejo") return buildListaCotejoDefinicion(actividad.listaCotejo)
  if (metodo === "Escala de valoración") return buildEscalaDefinicion(actividad.escalaValoracion, instrumentosPermitidos)
  return buildRubricaDefinicion(actividad.rubrica)
}

/** Evita un PUT con `DEFINICION` vacía, que pisaría el instrumento guardado. */
export function tieneDefinicionInstrumento(actividad: Actividad): boolean {
  if (actividad.instrumento === "Lista de cotejo") return !listaCotejoVacia(actividad.listaCotejo)
  if (actividad.instrumento === "Escala de valoración") return !escalaVacia(actividad.escalaValoracion)
  if (actividad.instrumento === "Otro") {
    const metodo = actividad.instrumentoPersonalizado.metodoValoracion
    return metodo !== "" && !metodoVacio(metodo, actividad)
  }
  return !rubricaVacia(actividad.rubrica)
}

interface UpdateInstrumentoInput {
  actividadId: number
  actividad: Actividad
  /** Fuente de los `pk` correctos; `undefined` cae al catálogo genérico. */
  instrumentosPermitidos?: InstrumentoPermitido[]
}

export async function updateInstrumentoActividad(
  { actividadId, actividad, instrumentosPermitidos }: UpdateInstrumentoInput,
  req?: WriteRequest,
): Promise<void> {
  let definicion: unknown

  if (actividad.instrumento === "Lista de cotejo") {
    definicion = buildListaCotejoDefinicion(actividad.listaCotejo)
  } else if (actividad.instrumento === "Escala de valoración") {
    definicion = await buildEscalaDefinicion(actividad.escalaValoracion, instrumentosPermitidos)
  } else if (actividad.instrumento === "Otro") {
    const { instrumentoPersonalizado } = actividad
    const metodo = instrumentoPersonalizado.metodoValoracion
    if (!metodo) throw new Error("Elegí un método de valoración para el instrumento personalizado.")
    const camposOtro = instrumentosPermitidos?.find((i) => i.valor === "OTRO")?.campos
    const [tipoEvidencia, metodoValoracion, innerDefinicion] = await Promise.all([
      Promise.resolve(pkPorNombre(camposOtro?.tipoEvidencia.catalogo, instrumentoPersonalizado.tipoEvidenciaEsperada)).then(
        (pk) => pk ?? resolveTipoEvidenciaOtroId(instrumentoPersonalizado.tipoEvidenciaEsperada),
      ),
      // El select nunca ofrece "Otro" como método; el backend igual lo rechaza.
      Promise.resolve(pkPorNombre(camposOtro?.metodoValoracion.catalogo, metodo)).then(
        (pk) => pk ?? resolveInstrumentoEvaluacionId(metodo),
      ),
      buildDefinicionPorMetodo(metodo, actividad, instrumentosPermitidos),
    ])
    definicion = { tipoEvidencia, metodoValoracion, definicion: innerDefinicion }
  } else {
    definicion = buildRubricaDefinicion(actividad.rubrica)
  }

  await api.put(`/eval-col/planeador/actividades/${actividadId}/instrumento`, {
    DEFINICION: JSON.stringify(definicion),
  }, writeConfig(req))
}

interface UseUpdateInstrumentoActividadOptions {
  mutationConfig?: MutationConfig<typeof updateInstrumentoActividad>
}

export function useUpdateInstrumentoActividad({ mutationConfig }: UseUpdateInstrumentoActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    // Del detalle cacheado: así el `pk` guardado es el mismo que ofreció el form.
    mutationFn: (input: Omit<UpdateInstrumentoInput, "instrumentosPermitidos">) =>
      updateInstrumentoActividad({
        ...input,
        instrumentosPermitidos: queryClient.getQueryData<Actividad>(planeadorKeys.actividad.detalle(input.actividadId))
          ?.camposDisponibles?.evaluacion.instrumentosPermitidos,
      }),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.detalle(variables.actividadId) })
      // Calificar con el instrumento viejo hace que el backend rechace el guardado.
      queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.instrumento(variables.actividadId) })
      // La nota de la asignatura puede cambiar: tabla y alertas de Informes.
      invalidarInformes(queryClient)
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
