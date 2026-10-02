import * as React from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger } from "@/components/ui/popover"

import { Banner, ListaAlerta } from "@/features/academic-management/reports/components/pending-changes-banners"
import {
  agruparPorSesion,
  useAprobacionesAsistenciaQuery,
} from "@/features/academic-management/asistencia/api/query/use-aprobaciones-asistencia-query"
import { RevisionCambiosAsistenciaSheet } from "@/features/academic-management/asistencia/components/revision-cambios-asistencia-sheet"

function formatFechaCorta(fecha: string | null): string {
  if (!fecha) return "Sin fecha"
  const [anio, mes, dia] = fecha.slice(0, 10).split("-")
  return `${dia}/${mes}/${anio}`
}

/** Regla 75: alerta naranja del coordinador, igual a la de Informes. */
export function AsistenciaCambiosPendientesBanner() {
  const { data: solicitudes = [] } = useAprobacionesAsistenciaQuery(true)
  const sesiones = React.useMemo(() => agruparPorSesion(solicitudes), [solicitudes])
  // Se guarda la clave y no la sesión: al resolver, la lista se refresca y el panel la sigue.
  const [clave, setClave] = React.useState<string | null>(null)
  const sesion = sesiones.find((s) => s.clave === clave) ?? null

  if (sesiones.length === 0) return null

  const estudiantes = sesiones.reduce((t, s) => t + new Set(s.solicitudes.map((x) => x.fk_tmatricula ?? x.estudiante)).size, 0)

  return (
    <>
      <div className="mb-4">
        <Banner
          color="orange"
          titulo="Docentes con cambios de asistencia pendientes de aprobación"
          descripcion="Se corrigió asistencia de sesiones de un período que ya no es calificable. Estos cambios requieren su aprobación."
        >
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  color="warning"
                  size="sm"
                  className="border-orange-stroke text-orange hover:bg-orange/10 focus-visible:ring-orange/20"
                />
              }
            >
              Ver cambios pendientes ({estudiantes})
            </PopoverTrigger>
            <ListaAlerta
              titulo={`Sesiones con cambios (${sesiones.length})`}
              descripcion="Docentes que corrigieron asistencia después del cierre del período."
              filas={sesiones.map((s) => {
                const n = new Set(s.solicitudes.map((x) => x.fk_tmatricula ?? x.estudiante)).size
                return {
                  key: s.clave,
                  docente: s.solicitante ?? "Sin docente",
                  asignatura: s.materia,
                  grupo: s.grupo,
                  detalle: `${formatFechaCorta(s.fecha)} · ${n} estudiante${n === 1 ? "" : "s"}`,
                  destino: s.clave,
                }
              })}
              onIr={setClave}
            />
          </Popover>
        </Banner>
      </div>
      <RevisionCambiosAsistenciaSheet sesion={sesion} onOpenChange={(open) => !open && setClave(null)} />
    </>
  )
}
