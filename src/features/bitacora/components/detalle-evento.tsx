import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { ArrowCounterClockwiseIcon, InfoIcon, LockIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { FichaDatos } from "@/components/ficha-datos"

import {
  BITACORA_ACCIONES,
  type BitacoraEstado,
  type BitacoraEvento,
  type BitacoraModulo,
} from "@/features/bitacora/api/types/bitacora"
import { TablaCambios } from "@/features/bitacora/components/tabla-cambios"

/** «28/09/2026 16:05 · Martha López (Administrador del establecimiento) · Sede 2 · Modificar» (B.1.DET.2). */
function textoEventoOriginal(o: NonNullable<BitacoraEvento["eventoOriginal"]>) {
  const fecha = new Date(o.fecha)
  return [
    Number.isNaN(fecha.getTime()) ? o.fecha : format(fecha, "dd/MM/yyyy HH:mm"),
    o.rol ? `${o.usuario} (${o.rol})` : o.usuario,
    o.sede,
    BITACORA_ACCIONES[o.accion],
  ]
    .filter(Boolean)
    .join(" · ")
}

const fechaHora = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : format(d, "dd/MM/yyyy")
}

const vacio = (v: string | null | undefined) => v ?? <span className="text-muted-foreground">Sin valor</span>

/** Restaurar se ofrece si el evento lo admite y el usuario tiene Guardar en la vista dueña. */
function puedeRestaurar(evento: BitacoraEvento, estado: BitacoraEstado | undefined) {
  return Boolean(evento.tipoRestauracion && !evento.motivoBloqueoEvento && estado?.puede)
}

/** Subfila de Ver detalle: todos los campos del evento y, a la derecha, Restaurar o el porqué no. */
/** Por qué un evento reservado no muestra valores (B.4.LIS.1 y B.1.EVA.2). */
function textoReservado(modulo: BitacoraModulo) {
  return modulo === "EVALUACION_DESEMPENO"
    ? "La bitácora registra que la valoración se hizo, con su fecha y quién la hizo; no guarda las calificaciones ni los textos. No se puede restaurar desde aquí."
    : "Los valores y el estudiante de este evento solo los ve quien tiene acceso a esa información. No se puede restaurar desde aquí."
}

export function DetalleEvento({
  evento,
  estado,
  modulo,
  onRestaurar,
}: {
  evento: BitacoraEvento
  estado: BitacoraEstado | undefined
  modulo: BitacoraModulo
  onRestaurar: (evento: BitacoraEvento) => void
}) {
  // Sin permiso (Guardar) no hay motivo que mostrar: simplemente no se ofrece.
  const bloqueo = evento.motivoBloqueoEvento ?? estado?.motivoBloqueo
  const esEliminar = evento.accion === "ELIMINAR"
  const esRestauracion = evento.accion === "RESTAURACION"

  return (
    <section aria-label="Detalle del evento" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        Detalle del evento: {evento.entidad} «{evento.registro}», {BITACORA_ACCIONES[evento.accion]?.toLowerCase()}
      </h3>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Restauración (B.1.DET.2): qué evento deshizo, antes de la tabla. */}
          {esRestauracion && (evento.eventoOriginal || evento.motivo) && (
            <FichaDatos
              datos={[
                ...(evento.eventoOriginal
                  ? [{ etiqueta: "Evento original", valor: textoEventoOriginal(evento.eventoOriginal), ancho: true }]
                  : []),
                ...(evento.motivo ? [{ etiqueta: "Motivo", valor: evento.motivo, ancho: true }] : []),
              ]}
            />
          )}
          {estado && esEliminar ? (
            // Eliminar (B.1.DET.1): la copia completa que guardó la bitácora, que es la que se recupera.
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Copia completa del registro eliminado</p>
              <FichaDatos datos={estado.cambios.map((c) => ({ etiqueta: c.campo, valor: vacio(c.anterior) }))} />
              {estado.creado && (
                <p className="text-xs text-muted-foreground">
                  Creada {fechaHora(estado.creado.fecha)} · {estado.creado.por}
                </p>
              )}
            </div>
          ) : evento.reservado ? (
            // Información reservada: sin tabla de valores, con el porqué.
            <p className="flex items-start gap-2 rounded-lg border border-border bg-table-screen-title px-4 py-3 text-sm">
              <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">Información reservada. </span>
                {textoReservado(modulo)}
              </span>
            </p>
          ) : estado ? (
            <TablaCambios
              columnas={["Valor anterior", esRestauracion ? "Valor restaurado" : "Valor nuevo"]}
              filas={estado.cambios.map((c) => ({ campo: c.campo, valores: [vacio(c.anterior), vacio(c.nuevo)] }))}
            />
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
          {evento.descripcion && (
            <p className="text-sm">
              <span className="text-muted-foreground">Descripción: </span>
              {evento.descripcion}
            </p>
          )}
          {evento.motivo && !esRestauracion && (
            <p className="text-sm">
              <span className="text-muted-foreground">Motivo: </span>
              {evento.motivo}
            </p>
          )}
        </div>

        <div className="lg:w-72">
          {puedeRestaurar(evento, estado) ? (
            <Button color="primary" size="sm" onClick={() => onRestaurar(evento)}>
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
              {evento.tipoRestauracion === "RECUPERAR_REGISTRO" ? "Recuperar registro" : "Restaurar"}
            </Button>
          ) : bloqueo && !esRestauracion && !evento.reservado ? (
            // Una Restauración no se deshace desde aquí y el diseño (B.1.DET.2) no lo explica: sin aviso.
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
              <span>
                No se puede restaurar. {bloqueo}
                {estado?.vista && ` Para corregirlo use la acción del módulo ${estado.vista}.`}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
