import { useParams } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"

import { usePostulacionQuery } from "@/features/coverage/matricula-complementaria/api/postulaciones"
import { ESTADO_OPCION, FORMA_LABEL, Marca, fechaHora } from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { CampoLectura, Rejilla, Seccion, Secciones } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

/** Ver detalle: la postulación y su opción en solo lectura, con el estilo de Ver inscripción. */
export function PostulacionDetallePage() {
  const { postulacionId } = useParams({ strict: false }) as { postulacionId?: string }
  const { data: p, isPending, isError, error } = usePostulacionQuery(Number(postulacionId))

  if (isPending) {
    return (
      <TableScreen>
        <TableScreenBody>
          <Skeleton className="h-96 w-full" />
        </TableScreenBody>
      </TableScreen>
    )
  }
  if (isError) {
    return (
      <TableScreen>
        <TableScreenBody>
          <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p>
        </TableScreenBody>
      </TableScreen>
    )
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description={<Marca {...ESTADO_OPCION[p.estado]} />}>
          Postulación {p.numero} · {p.estudiante}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <Secciones abiertas={["datos", "opcion"]}>
          <Seccion value="datos" titulo="Datos de la postulación">
            <Rejilla>
              <CampoLectura id="post-numero" label="Número de postulación" value={p.numero} />
              <CampoLectura id="post-registro" label="Registro" value={fechaHora(p.registro)} />
              <CampoLectura id="post-estado" label="Estado" value={ESTADO_OPCION[p.estado].label} />
              <CampoLectura id="post-estudiante" label="Estudiante" value={p.estudiante} />
              <CampoLectura id="post-documento" label="Documento" value={p.documento} />
              <CampoLectura id="post-principal" label="Matrícula principal" value={p.principal} />
            </Rejilla>
          </Seccion>
          <Seccion value="opcion" titulo="Opción de especialidad" extra={<Marca {...ESTADO_OPCION[p.estadoOpcion]} />}>
            <Rejilla>
              <CampoLectura id="post-receptor" label="Establecimiento que recibe" value={p.receptor} />
              <CampoLectura id="post-sede" label="Sede" value={p.sede} />
              <CampoLectura id="post-jornada" label="Jornada" value={p.jornada} />
              <CampoLectura id="post-grado" label="Grado" value={p.grado} />
              <CampoLectura id="post-especialidad" label="Especialidad" value={p.especialidad} />
              <CampoLectura
                id="post-forma"
                label="Forma de postulación"
                value={`${FORMA_LABEL[p.forma]}, convocatoria ${p.convocatoriaAnio}`}
              />
              {p.sorteo ? <CampoLectura id="post-sorteo" label="Número de sorteo" value={p.sorteo} /> : null}
              {p.posicion ? <CampoLectura id="post-posicion" label="Posición en la lista de espera" value={p.posicion} /> : null}
              {p.motivoDescarte ? <CampoLectura id="post-descarte" label="Motivo de descarte" value={p.motivoDescarte} /> : null}
              {p.motivoAnulacion ? <CampoLectura id="post-anulacion" label="Motivo de anulación" value={p.motivoAnulacion} /> : null}
              <CampoLectura id="post-autorizacion" label="Autorización de tratamiento de datos" value={p.autorizacion ? "Sí" : "No"} />
            </Rejilla>
          </Seccion>
        </Secciones>
      </TableScreenBody>
    </TableScreen>
  )
}
