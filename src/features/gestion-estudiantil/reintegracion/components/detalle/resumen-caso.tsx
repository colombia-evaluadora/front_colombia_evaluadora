import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"

interface Props {
  caso: CasoDetalle
  onCasoAnterior: (id: number) => void
  onCasoConvivencia: (id: number) => void
}

/** Resumen del caso (G.9.CAS.1): origen, apertura, profesional, retiro, razones, acta, SIMPADE y vínculos. */
export function ResumenCaso({ caso: c, onCasoAnterior, onCasoConvivencia }: Props) {
  const causa = c.causa_principal?.id
  return (
    <section className="flex flex-col gap-3 text-sm" aria-label="Resumen del caso">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
        <Dato label="Origen">{c.origen.nombre}</Dato>
        <Dato label="Apertura">{formatFecha(c.fecha_apertura)}</Dato>
        <Dato label="Profesional de trabajo social">
          {c.profesional ? abreviarPersona(c.profesional.nombre) : "Sin asignar"}
        </Dato>
        {c.motivo_apertura && (
          <div className="sm:col-span-3">
            <Dato label="Motivo de apertura">{c.motivo_apertura}</Dato>
          </div>
        )}
      </dl>

      {c.retiro && (
        <p>
          <strong className="font-semibold">Retiro de la matrícula:</strong> {formatFecha(c.retiro.fecha_retiro)}
          {c.retiro.motivo_retiro ? ` · ${c.retiro.motivo_retiro}` : ""}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <strong className="font-semibold">Razones del abandono</strong>
        {c.razones.length === 0 && !c.otra_razon ? (
          <span className="text-muted-foreground">Sin razones registradas.</span>
        ) : (
          c.razones.map((g) => (
            <p key={g.dimension_valor} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground">{g.dimension_nombre}:</span>
              {g.razones.map((r) =>
                r.id === causa ? (
                  <Badge key={r.id} variant="soft" color="primary">
                    <span>{r.nombre} · Causa principal</span>
                  </Badge>
                ) : (
                  <span key={r.id}>{r.nombre}</span>
                ),
              )}
            </p>
          ))
        )}
        {c.otra_razon && <p className="text-muted-foreground">Otra razón: {c.otra_razon}</p>}
      </div>

      {(c.acta || c.simpade) && (
        <p className="flex flex-wrap gap-x-6 gap-y-1">
          {c.acta && (
            <span>
              <strong className="font-semibold">Acta de retiro:</strong> N.º {c.acta.numero}
            </span>
          )}
          {c.simpade && <span>Ingresado al SIMPADE el {formatFecha(c.simpade.fecha_ingreso)}</span>}
        </p>
      )}

      {(c.caso_anterior || c.caso_convivencia) && (
        <p className="flex flex-wrap items-center gap-x-6">
          {c.caso_anterior && (
            <span className="flex items-center">
              Caso anterior:
              <Button variant="link" size="sm" onClick={() => onCasoAnterior(c.caso_anterior!.id)}>
                {c.caso_anterior.estado_etiqueta} · abierto el {formatFecha(c.caso_anterior.fecha_apertura)}
              </Button>
            </span>
          )}
          {c.caso_convivencia && (
            <span className="flex items-center">
              Caso de convivencia:
              <Button variant="link" size="sm" onClick={() => onCasoConvivencia(c.caso_convivencia!.id)}>
                {c.caso_convivencia.numero}
              </Button>
            </span>
          )}
        </p>
      )}
    </section>
  )
}
