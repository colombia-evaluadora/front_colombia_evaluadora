import { useState } from "react"
import { Link, useParams } from "@tanstack/react-router"

import { BloqueBuscable, DetalleConBusqueda } from "@/components/busqueda-detalle"
import { FichaDatos } from "@/components/ficha-datos"
import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"

import { usePostulacionQuery } from "@/features/coverage/matricula-complementaria/api/postulaciones"
import { ESTADO_OPCION, FORMA_LABEL, Marca, fechaHora } from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { Seccion, Secciones } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

/** Ver detalle: la postulación y su opción en solo lectura, con el estilo de Ver inscripción. */
export function PostulacionDetallePage() {
  const { postulacionId } = useParams({ strict: false }) as { postulacionId?: string }
  const { data: p, isPending, isError, error } = usePostulacionQuery(Number(postulacionId))
  const [abiertas, setAbiertas] = useState(["datos", "opcion"])
  const [buscando, setBuscando] = useState(false)

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
        <TableScreenTitle
          // Miga y Cerrar del modo ver (CLAUDE.md §13), como el detalle de Matrícula.
          ruta="Matrícula complementaria"
          action={
            <Button
              render={<Link to={paths.app.coberturaComplementaria.getHref()} search={{ tab: "postulaciones" }} />}
              nativeButton={false}
              variant="outline"
              color="neutral"
              size="sm"
            >
              <XIcon data-icon="inline-start" />
              Cerrar
            </Button>
          }
        >
          Postulación {p.numero} · {p.estudiante}
          {/* Estado junto al título, en su misma línea (hay espacio a la derecha). */}
          <span className="ml-3 inline-flex align-middle text-sm font-normal"><Marca {...ESTADO_OPCION[p.estado]} /></span>
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        {/* Ver detalle con buscador; cada sección como ficha (CLAUDE.md §13). */}
        <DetalleConBusqueda onBuscandoChange={setBuscando}>
        <Secciones abiertas={buscando ? ["datos", "opcion"] : abiertas} onAbiertasChange={(v) => !buscando && setAbiertas(v)}>
          <BloqueBuscable contar>
          <Seccion value="datos" titulo="Datos de la postulación">
            <FichaDatos
              datos={[
                { etiqueta: "Número de postulación", valor: p.numero },
                { etiqueta: "Registro", valor: fechaHora(p.registro) },
                { etiqueta: "Estado", valor: ESTADO_OPCION[p.estado].label },
                { etiqueta: "Estudiante", valor: p.estudiante },
                { etiqueta: "Documento", valor: p.documento },
                { etiqueta: "Matrícula principal", valor: p.principal },
              ]}
            />
          </Seccion>
          </BloqueBuscable>
          <BloqueBuscable contar>
          <Seccion value="opcion" titulo="Opción de especialidad" extra={<Marca {...ESTADO_OPCION[p.estadoOpcion]} />}>
            <FichaDatos
              datos={[
                { etiqueta: "Establecimiento que recibe", valor: p.receptor },
                { etiqueta: "Sede", valor: p.sede },
                { etiqueta: "Jornada", valor: p.jornada },
                { etiqueta: "Grado", valor: p.grado },
                { etiqueta: "Especialidad", valor: p.especialidad },
                { etiqueta: "Forma de postulación", valor: `${FORMA_LABEL[p.forma]}, convocatoria ${p.convocatoriaAnio}` },
                ...(p.sorteo ? [{ etiqueta: "Número de sorteo", valor: String(p.sorteo) }] : []),
                ...(p.posicion ? [{ etiqueta: "Posición en la lista de espera", valor: String(p.posicion) }] : []),
                ...(p.motivoDescarte ? [{ etiqueta: "Motivo de descarte", valor: p.motivoDescarte, ancho: true }] : []),
                ...(p.motivoAnulacion ? [{ etiqueta: "Motivo de anulación", valor: p.motivoAnulacion, ancho: true }] : []),
                { etiqueta: "Autorización de tratamiento de datos", valor: p.autorizacion ? "Sí" : "No" },
              ]}
            />
          </Seccion>
          </BloqueBuscable>
        </Secciones>
        </DetalleConBusqueda>
      </TableScreenBody>
    </TableScreen>
  )
}
