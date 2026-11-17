import { useCallback, useState } from "react"

import { TableScreenBody } from "@/components/layout/table-screen"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"

import {
  TIPO_SERVICIO_SOCIAL,
  type ActividadDetalle,
  type ParticipanteRow,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { DialogoEstadoActividad } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/dialogos/dialogo-estado-actividad"
import { DialogoInscribir } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/dialogos/dialogo-inscribir"
import { DialogoNuevaSesion } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/dialogos/dialogo-nueva-sesion"
import { DialogoRetirar } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/dialogos/dialogo-retirar"
import { DialogoVerSesion } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/dialogos/dialogo-ver-sesion"
import {
  EncabezadoActividad,
  type PestanaActividad,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/components/detalle/encabezado-actividad"
import { ResumenActividad } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/detalle/resumen-actividad"
import { TabParticipantes } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/detalle/tab-participantes"
import { TabSesiones } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/detalle/tab-sesiones"
import { useNavegacionActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-navegacion-actividades"

type Dialogo =
  | { tipo: "inscribir" | "sesion" | "estado" }
  | { tipo: "retirar"; participante: ParticipanteRow }
  | { tipo: "ver-sesion"; id: number }

/** Detalle de la actividad (G.5.ACT.DET.1): cabecera, resumen y las pestañas Participantes y Sesiones. */
export function ActividadDetalleContenido({ actividad }: { actividad: ActividadDetalle }) {
  const [pestana, setPestana] = useState<PestanaActividad>("participantes")
  const { irListado, irEditar } = useNavegacionActividades()
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)
  const cerrar = useCallback(() => setDialogo(null), [])
  const onRetirar = useCallback((participante: ParticipanteRow) => setDialogo({ tipo: "retirar", participante }), [])
  const onVerSesion = useCallback((id: number) => setDialogo({ tipo: "ver-sesion", id }), [])
  // Sesiones solo existe si la actividad registra asistencia.
  const activa: PestanaActividad = pestana === "sesiones" && actividad.registra_asistencia ? "sesiones" : "participantes"

  return (
    <>
      <EncabezadoActividad
        actividad={actividad}
        pestana={activa}
        onVolver={() => irListado()}
        onModificar={() => irEditar(actividad.id)}
        onInscribir={() => setDialogo({ tipo: "inscribir" })}
        onNuevaSesion={() => setDialogo({ tipo: "sesion" })}
        onEstado={() => setDialogo({ tipo: "estado" })}
      />
      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ResumenActividad actividad={actividad} />
          <Tabs value={activa} onValueChange={(v) => setPestana(v as PestanaActividad)}>
            <TabsList aria-label="Secciones de la actividad">
              <TabsTrigger value="participantes">Participantes</TabsTrigger>
              {actividad.registra_asistencia && <TabsTrigger value="sesiones">Sesiones</TabsTrigger>}
            </TabsList>
          </Tabs>
          {/* Una paginación por pestaña. */}
          <TablePaginationProvider key={activa}>
            {activa === "participantes" ? (
              <TabParticipantes
                actividadId={actividad.id}
                puedeRetirar={actividad.puede_inscribir}
                onRetirar={onRetirar}
              />
            ) : (
              <TabSesiones actividadId={actividad.id} conSoporte={Boolean(actividad.entidad_externa)} onVer={onVerSesion} />
            )}
          </TablePaginationProvider>
        </div>
      </TableScreenBody>
      {dialogo?.tipo === "inscribir" && <DialogoInscribir actividad={actividad} onClose={cerrar} />}
      {dialogo?.tipo === "sesion" && (
        <DialogoNuevaSesion
          actividad={actividad}
          servicioSocial={actividad.tipo_valor === TIPO_SERVICIO_SOCIAL}
          onClose={cerrar}
        />
      )}
      {dialogo?.tipo === "estado" && (
        <DialogoEstadoActividad
          actividad={{ ...actividad, grados_texto: actividad.grados.map((g) => g.nombre).join(", ") }}
          onClose={cerrar}
        />
      )}
      {dialogo?.tipo === "retirar" && (
        <DialogoRetirar actividadNombre={actividad.nombre} participante={dialogo.participante} onClose={cerrar} />
      )}
      {dialogo?.tipo === "ver-sesion" && <DialogoVerSesion sesionId={dialogo.id} onClose={cerrar} />}
    </>
  )
}
