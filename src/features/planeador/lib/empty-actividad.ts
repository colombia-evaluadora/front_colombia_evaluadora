import type { Actividad } from "@/features/planeador/api/types/actividad"

/** Id numérico aleatorio para sub-objetos nuevos que todavía no pasaron por
 *  el backend — que es quien asigna el PK real. */
function draftId(): number {
  return Math.floor(Math.random() * 1_000_000_000)
}

/**
 * Actividad vacía para el form de alta. `EditarActividadForm` reusa el
 * mismo form de edición —`useForm({ defaultValues: actividad })` necesita
 * un objeto completo, no admite `Partial<Actividad>`—, así que crear una
 * actividad arranca de esta ficha en blanco en vez de `undefined`.
 *
 * `tipo`/`modalidad`/`instrumento` no tienen una opción "Seleccione" en sus
 * `<Select>` (a diferencia de `unidad`/`aplicaA`/etc.), así que acá
 * arrancan en el primer valor válido de su lista en vez de `""` — value
 * vacío ahí dejaría el trigger sin ninguna opción resaltada al abrir el
 * desplegable.
 */
export function crearActividadVacia(): Actividad {
  const id = draftId()
  return {
    id,
    nombre: "",
    tipo: "Proyecto",
    esRecuperacion: false,
    // `0` es el sentinel de "sin unidad" — ningún PK real es 0.
    unidad: { id: 0, nombre: "" },
    evidenciasIds: [],
    asignatura: "",
    grado: "",
    grupo: "",
    fechaInicio: "",
    fechaCierre: "",
    status: "pending",
    evaluados: 0,
    totalEstudiantes: 0,
    materiales: "",
    recursos: [],
    duracionEstimada: "",
    semana: "",
    modalidad: "Presencial",
    esEvaluativa: false,
    instrumento: "Rúbrica",
    ponderacion: 0,
    generaEvidencias: false,
    tipoEvidencia: "",
    requiereValidacion: false,
    observaciones: "",
    contenidos: [],
    objetivos: [],
    descripcionUnidad: [],
    rubrica: { id: draftId(), criterios: [] },
    listaCotejo: { id: draftId(), items: [] },
    escalaValoracion: {
      id: draftId(),
      criteriosGenerales: "",
      tipo: "Cualitativa",
      interpretacionRangos: "",
      niveles: [],
    },
    instrumentoPersonalizado: {
      descripcion: "",
      tipoEvidenciaEsperada: "",
      metodoValoracion: "",
      requiereArchivo: false,
      requiereRespuestaTexto: false,
    },
    adaptaciones: [],
  }
}
