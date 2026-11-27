
import { useParams } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api-client"

import { usePostulacionQuery } from "@/features/coverage/matricula-complementaria/api/postulaciones"
import {
  ESTADO_OPCION,
  ESTADO_POSTULACION,
  Marca,
  fechaHora,
  nombreCupo,
} from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { CampoLectura, Rejilla, Seccion, Secciones } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

/** Ver detalle: cabecera de la postulación y sus opciones en orden de preferencia. */
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

  const num = "text-center tabular-nums"
  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description={<Marca {...ESTADO_POSTULACION[p.estado]} />}>
          Postulación {p.numero} · {p.estudiante}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <Secciones abiertas={["datos", "opciones"]}>
          <Seccion value="datos" titulo="Datos de la postulación">
            <Rejilla>
              <CampoLectura id="post-numero" label="Número de postulación" value={p.numero} />
              <CampoLectura id="post-registro" label="Registro" value={fechaHora(p.registro)} />
              <CampoLectura id="post-estado" label="Estado" value={ESTADO_POSTULACION[p.estado].label} />
              <CampoLectura id="post-estudiante" label="Estudiante" value={p.estudiante} />
              <CampoLectura id="post-documento" label="Documento" value={p.documento} />
              <CampoLectura id="post-principal" label="Matrícula principal" value={p.principal} />
              <CampoLectura id="post-origen" label="Establecimiento de origen" value={p.origen} />
              <CampoLectura id="post-autorizacion" label="Autorización de tratamiento de datos" value={p.autorizacion ? "Sí" : "No"} />
              {p.motivoAnulacion ? <CampoLectura id="post-anulacion" label="Motivo de anulación" value={p.motivoAnulacion} /> : null}
            </Rejilla>
          </Seccion>
          <Seccion value="opciones" titulo="Opciones de especialidad" tabla>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={num}>Preferencia</TableHead>
                  <TableHead>Establecimiento que recibe</TableHead>
                  <TableHead>Cupo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Continuidad</TableHead>
                  <TableHead className={num}>Sorteo</TableHead>
                  <TableHead className={num}>Posición en lista</TableHead>
                  <TableHead>Motivo de descarte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.opciones.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className={num}>{o.orden}</TableCell>
                    <TableCell>{o.receptor}</TableCell>
                    <TableCell>{nombreCupo(o)}</TableCell>
                    <TableCell>
                      <span className="inline-flex flex-wrap gap-1">
                        <Marca {...ESTADO_OPCION[o.estado]} />
                        {o.autorizacionPendiente ? <Marca label="Autorización pendiente" color="warning" /> : null}
                      </span>
                    </TableCell>
                    <TableCell>{o.continuidad ? <Marca label="Continuidad" color="secondary" /> : "—"}</TableCell>
                    <TableCell className={num}>{o.sorteo ?? "—"}</TableCell>
                    <TableCell className={num}>{o.posicion ?? "—"}</TableCell>
                    <TableCell>{o.motivoDescarte ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Seccion>
        </Secciones>
      </TableScreenBody>
    </TableScreen>
  )
}
