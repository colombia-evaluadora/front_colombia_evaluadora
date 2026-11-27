import { useParams } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api-client"

import { useConvocatoriaQuery } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import {
  DESEMPATE_LABEL,
  ESTADO_CONVOCATORIA,
  Marca,
  MODO_LABEL,
  fecha,
} from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { CampoLectura, Rejilla, Seccion, Secciones } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const num = "text-center tabular-nums"

/** Ver detalle: la convocatoria y sus cupos en solo lectura (Sección 2.16.2), con el estilo de Ver inscripción. */
export function ConvocatoriaDetallePage() {
  const { convocatoriaId } = useParams({ strict: false }) as { convocatoriaId?: string }
  const { data: c, isPending, isError, error } = useConvocatoriaQuery(Number(convocatoriaId))

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
        <TableScreenTitle description={<Marca {...ESTADO_CONVOCATORIA[c.estado]} />}>
          Convocatoria {c.anio} · {c.establecimiento}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <Secciones abiertas={["datos", "fechas", "seleccion", "cupos"]}>
          <Seccion value="datos" titulo="Datos de la convocatoria">
            <Rejilla>
              <CampoLectura id="conv-establecimiento" label="Establecimiento que recibe" value={c.establecimiento} />
              <CampoLectura id="conv-anio" label="Año" value={c.anio} />
              <CampoLectura id="conv-estado" label="Estado" value={ESTADO_CONVOCATORIA[c.estado].label} />
              <div className="md:col-span-3">
                <CampoLectura
                  id="conv-origenes"
                  label="Establecimientos de origen"
                  value={c.origenes.map((o) => o.nombre).join(", ")}
                />
              </div>
            </Rejilla>
          </Seccion>
          <Seccion value="fechas" titulo="Fechas">
            <Rejilla>
              <CampoLectura id="conv-inicio" label="Fecha de inicio de postulación" value={fecha(c.inicioPostulacion)} />
              <CampoLectura id="conv-cierre" label="Fecha de cierre de postulación" value={fecha(c.cierrePostulacion)} />
              <CampoLectura id="conv-publicacion" label="Publicación de resultados" value={fecha(c.publicacion)} />
              <CampoLectura id="conv-limite" label="Fecha límite para matricular" value={fecha(c.limiteMatricula)} />
            </Rejilla>
          </Seccion>
          <Seccion value="seleccion" titulo="Postulación y selección">
            <Rejilla>
              <CampoLectura id="conv-modo" label="Modo de selección" value={MODO_LABEL[c.modo]} />
              <CampoLectura id="conv-desempate" label="Desempate" value={DESEMPATE_LABEL[c.desempate]} />
            </Rejilla>
          </Seccion>
          <Seccion value="cupos" titulo="Cupos por especialidad" tabla>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Sede</TableHead>
                  <TableHead>Jornada</TableHead>
                  <TableHead>Grado</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead className={num}>Cupo</TableHead>
                  <TableHead className={num}>Seleccionados</TableHead>
                  <TableHead className={num}>En lista de espera</TableHead>
                  <TableHead className={num}>Continúan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.cupos.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>{x.sede}</TableCell>
                    <TableCell>{x.jornada}</TableCell>
                    <TableCell>{x.grado}</TableCell>
                    <TableCell>{x.especialidad}</TableCell>
                    <TableCell className={num}>{x.cupo}</TableCell>
                    <TableCell className={num}>{x.seleccionados}</TableCell>
                    <TableCell className={num}>{x.enListaEspera}</TableCell>
                    <TableCell className={num}>{x.continuan ?? 0}</TableCell>
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
