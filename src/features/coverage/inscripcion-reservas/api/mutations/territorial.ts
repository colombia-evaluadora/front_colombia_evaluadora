import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"

import {
  TERRITORIAL_BASE,
  territorialKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type {
  AmpliarLimiteInput,
  GuardarCalendarioInput,
  InscripcionEnLineaInput,
  OrientarInput,
  ResultadoInscripcionEnLinea,
  ResultadoUbicar,
  UbicarInput,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"

const CALENDARIOS = `/eval-col${TERRITORIAL_BASE}/calendarios`

/** Nuevo calendario o Editar: multipart por el soporte (PDF, JPG o PNG). */
function guardarCalendario({ id, soporte, ...c }: GuardarCalendarioInput) {
  return postMultipart(
    id == null ? CALENDARIOS : `${CALENDARIOS}/${id}`,
    {
      ANIO: c.anio,
      MODALIDAD: c.modalidad,
      CICLO: c.ciclo,
      INICIO_INSCRIPCION: c.inicioInscripcion,
      FECHA_CIERRE_INSCRIPCION: c.fechaCierreInscripcion,
      FECHA_LIBERACION_RESERVAS: c.fechaLiberacionReservas,
      FECHA_LIMITE_MATRICULA: c.fechaLimiteMatricula,
      CORTE_REPORTE: c.corteReporte,
      PLAZO_SOLICITUD_RETIRO: c.plazoSolicitudRetiro,
      ESTADO: c.estado,
    },
    { SOPORTE: soporte },
  )
}

export function useGuardarCalendario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: guardarCalendario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.calendarios }),
  })
}

/** Publicar un calendario en Borrador: grupos y períodos que aún no definieron esas fechas las toman. */
export function usePublicarCalendario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/calendarios/${id}/publicar`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.calendarios }),
  })
}

/** Aprobar la proyección de cupos (Supervisor territorial). */
export function useAprobarProyeccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.postRow(`${TERRITORIAL_BASE}/proyeccion/${id}/aprobar`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.proyeccion }),
  })
}

/** Devolver la proyección con una observación (10 a 500): queda Proyectada y se avisa al establecimiento. */
export function useDevolverProyeccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, observacion }: { id: number; observacion: string }) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/proyeccion/${id}/devolver`, {
        OBSERVACION: observacion,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.proyeccion }),
  })
}

/** Ampliar una fecha de un calendario publicado: general, o la Fecha límite en algunos establecimientos. */
export function useAmpliarLimiteMatricula() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ calendarioId, soporte, ...a }: AmpliarLimiteInput) =>
      postMultipart(
        `${CALENDARIOS}/${calendarioId}/ampliar`,
        {
          CAMPO: a.campo,
          FECHA: a.fecha,
          ESTABLECIMIENTOS: JSON.stringify(a.establecimientos),
          MOTIVO: a.motivo,
        },
        { SOPORTE: soporte },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.all }),
  })
}

/** Orientar desde Seguimiento: queda en Orientaciones y le llega al establecimiento. */
export function useOrientar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (o: OrientarInput) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/orientaciones`, {
        FK_ESTABLECIMIENTO: o.establecimientoId,
        MOTIVO:
          o.motivo == null
            ? null
            : o.motivo === "continuidad"
              ? "FALTA_CONTINUIDAD"
              : "TRASLADOS_PENDIENTES",
        TEMA: o.tema,
        ORIENTACION: o.orientacion,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.all }),
  })
}

/** Ubicar: reserva el cupo en la sede elegida (o en la más cercana con cupo, si son varios). */
export function useUbicar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (u: UbicarInput) =>
      (
        await evalCol.postRow<{ datos: ResultadoUbicar }>(
          `${TERRITORIAL_BASE}/redistribucion/ubicar`,
          {
            INSCRIPCIONES: JSON.stringify(u.inscripciones),
            FK_OPCION: u.opcionId,
            TIPO_CUPO: u.tipoCupo,
            REQUIERE_CONFIRMACION: u.requiereConfirmacion ? "S" : "N",
          },
        )
      ).datos,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.all }),
  })
}

/** Liberar ubicación: anula la reserva y la inscripción vuelve a En redistribución. */
export function useLiberarUbicacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/ubicados/${id}/liberar`, { MOTIVO: motivo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.all }),
  })
}

/** Fija el cupo contratado de un grupo: entre los ocupados y retenidos contratados y el cupo menos las propias. */
export function useGuardarCupoContratado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ grupoId, cupoContratado }: { grupoId: number; cupoContratado: number }) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/cupos-contratados/${grupoId}`, {
        CUPO_CONTRATADO: cupoContratado,
      }),
    // También cambia el cupo contratado libre de Redistribución.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.all }),
  })
}

/** Registrar retiro: la matrícula del origen pasa a Retirado; se avisa a los dos establecimientos. */
export function useRegistrarRetiro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/solicitudes-retiro/${id}/registrar-retiro`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.all }),
  })
}

/** Cerrar sin retiro: el destino debe anular su matrícula; queda Por anular en el destino. */
export function useCerrarSinRetiro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/solicitudes-retiro/${id}/cerrar`, { MOTIVO: motivo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.all }),
  })
}

/** Habilitar o suspender la inscripción y la prematrícula en línea en los establecimientos elegidos. */
export function useInscripcionEnLinea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (i: InscripcionEnLineaInput) =>
      (
        await evalCol.postRow<{ datos: ResultadoInscripcionEnLinea }>(
          `${TERRITORIAL_BASE}/calendarios/${i.calendarioId}/inscripcion-en-linea`,
          {
            ACCION: i.accion,
            ESTABLECIMIENTOS: JSON.stringify(i.establecimientos),
            MOTIVO: i.motivo,
          },
        )
      ).datos,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.calendarios }),
  })
}

/** Deja como oferentes de cupo contratado exactamente los establecimientos dados (Regla 76). */
export function useGuardarOferentes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (establecimientos: number[]) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/oferentes`, {
        ESTABLECIMIENTOS: JSON.stringify(establecimientos),
      }),
    // Cambia el contexto (quién es oferente) y la lista de cupos contratados.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: territorialKeys.all }),
  })
}
