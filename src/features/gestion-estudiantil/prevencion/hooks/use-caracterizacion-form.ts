"use no memo"

import { useMemo, useState } from "react"

import { queueNotice } from "@/components/notice/notice-context"

import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useGuardarCaracterizacion } from "@/features/gestion-estudiantil/prevencion/api/mutations/caracterizacion"
import { useOpcionesCaracterizacionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-caracterizacion-query"
import type { CaracterizacionDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import {
  agruparListas,
  armarDatos,
  codigoDeOpcion,
  CODIGO,
  formDesdeDetalle,
  integranteVacio,
  seccionDeError,
  validarCaracterizacion,
  type ContextoCaracterizacion,
  type FormCaracterizacion,
  type IntegranteForm,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

/** Sección plegable a la que pertenece cada prefijo de error. */
const SECCION: Record<string, string> = {
  hogar: "nucleo",
  integrante: "nucleo",
  vivienda: "vivienda",
  internet: "internet",
  socio: "socio",
  situacion: "situacion",
  trayectoria: "trayectoria",
}

type Limpieza = { campo: "servicios" | "programas"; valor: string } | null

/**
 * Estado, validación y guardado del formulario de la caracterización (§9.8). `vista` muestra los mismos campos sin
 * edición (Ver detalle). Guardar = confirmar: el backend deja la caracterización Confirmada con fecha y autor.
 */
export function useCaracterizacionForm(detalle: CaracterizacionDetalle, vista: boolean) {
  // Sin `puede_modificar` (p. ej. trabajo social) el formulario se ve, pero no se edita.
  const lectura = vista || !detalle.puede_modificar
  const { volver, irCaracterizacionEditar } = useNavegacionPrevencion()
  const s = useEstadoDialogo()
  const opciones = useOpcionesCaracterizacionQuery()
  const listas = useMemo(() => agruparListas(opciones.data ?? []), [opciones.data])

  const [v, setV] = useState<FormCaracterizacion>(() => formDesdeDetalle(detalle))
  const [pendiente, setPendiente] = useState<Limpieza>(null)
  // Al cancelar el cambio, el combo ya mostró la opción nueva: se vuelve a montar para que muestre la vigente.
  const [reinicios, setReinicios] = useState(0)
  const set = (parche: Partial<FormCaracterizacion>) => setV((actual) => ({ ...actual, ...parche }))

  const calculada = detalle.trayectoria.calculada
  const contexto: ContextoCaracterizacion = {
    listas,
    repitente: calculada.repitente === true,
    anioAnteriorEnPlataforma: calculada.matricula_anio_anterior,
  }
  const errores = validarCaracterizacion(v, contexto)
  const error = (clave: string) => (s.intento ? errores[clave] : undefined)
  const seccionConError = (seccion: string) =>
    s.intento && Object.keys(errores).some((k) => SECCION[seccionDeError(k)] === seccion)

  // Integrantes: una persona = una fila.
  const agregarIntegrante = () => set({ integrantes: [...v.integrantes, integranteVacio()] })
  const quitarIntegrante = (clave: string) => set({ integrantes: v.integrantes.filter((i) => i.clave !== clave) })
  const cambiarIntegrante = (clave: string, parche: Partial<IntegranteForm>) =>
    set({ integrantes: v.integrantes.map((i) => (i.clave === clave ? { ...i, ...parche } : i)) })

  // Cambiar la respuesta principal avisa antes de limpiar las selecciones previas.
  const cambiarInfoServicios = (valor: string) => {
    const dejaServicios = codigoDeOpcion(listas.INFO_SERVICIOS_VIVIENDA, valor) !== CODIGO.serviciosIdentificados
    if (dejaServicios && v.servicios.length > 0) setPendiente({ campo: "servicios", valor })
    else set({ infoServicios: valor })
  }
  const cambiarInfoProgramas = (valor: string) => {
    const dejaProgramas = codigoDeOpcion(listas.INFO_PROGRAMAS_SOCIALES, valor) !== CODIGO.recibeProgramas
    if (dejaProgramas && v.programas.length > 0) setPendiente({ campo: "programas", valor })
    else set({ infoProgramas: valor })
  }
  const confirmarLimpieza = () => {
    if (pendiente?.campo === "servicios") set({ infoServicios: pendiente.valor, servicios: [] })
    if (pendiente?.campo === "programas") set({ infoProgramas: pendiente.valor, programas: [] })
    setPendiente(null)
  }

  const guardarMutation = useGuardarCaracterizacion({
    mutationConfig: {
      onSuccess: () => {
        queueNotice("Caracterización guardada.", { variant: "success" })
        volver()
      },
      onError: (e: Error) => {
        s.setError(e)
        window.scrollTo({ top: 0, behavior: "smooth" })
      },
    },
  })

  const guardar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) {
      enfocarPrimerError()
      return
    }
    guardarMutation.mutate({ matricula: detalle.fk_tmatricula, DATOS: armarDatos(v, contexto) })
  }

  const convivientes = v.integrantes.filter((i) => i.vive === true).length
  const personas = Number(v.personas)
  // Como el backend: el estudiante cuenta uno y cada integrante conviviente identificado suma otro.
  const identificados = 1 + convivientes
  const diferenciaHogar = Number.isInteger(personas) && personas > 0 ? personas - identificados : null

  return {
    lectura,
    vista,
    detalle,
    v,
    set,
    listas,
    cargandoListas: opciones.isPending,
    errorListas: opciones.isError ? opciones.error : null,
    contexto,
    error,
    seccionConError,
    integrantes: { agregar: agregarIntegrante, quitar: quitarIntegrante, cambiar: cambiarIntegrante },
    identificados,
    diferenciaHogar,
    cambiarInfoServicios,
    cambiarInfoProgramas,
    pendienteLimpieza: pendiente,
    confirmarLimpieza,
    reinicios,
    cancelarLimpieza: () => {
      setPendiente(null)
      setReinicios((n) => n + 1)
    },
    errorBackend: s.error,
    pending: guardarMutation.isPending,
    guardar,
    volver,
    modificar: () => irCaracterizacionEditar(detalle.fk_tmatricula, true),
  }
}

export type FormularioCaracterizacion = ReturnType<typeof useCaracterizacionForm>
