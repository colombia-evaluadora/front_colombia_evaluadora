import { useState } from "react"
import { Link, useParams } from "@tanstack/react-router"

import { BloqueBuscable, DetalleConBusqueda } from "@/components/busqueda-detalle"
import { FichaDatos } from "@/components/ficha-datos"
import { Button } from "@/components/ui/button"
import { PencilIcon, XIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { accionesDe, MENU_COMPLEMENTARIA } from "@/features/coverage/matricula-complementaria/components/convocatorias-tab"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api-client"

import { useConvocatoriaQuery } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import {
  DESEMPATE_LABEL,
  ESTADO_CONVOCATORIA,
  FORMA_LABEL,
  Marca,
  MODO_LABEL,
  fecha,
} from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { Seccion, Secciones } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const num = "text-center tabular-nums"

/** Ver detalle: la convocatoria y sus cupos en solo lectura (Sección 2.16.2), con el estilo de Ver inscripción. */
export function ConvocatoriaDetallePage() {
  const { convocatoriaId } = useParams({ strict: false }) as { convocatoriaId?: string }
  const { data: c, isPending, isError, error } = useConvocatoriaQuery(Number(convocatoriaId))
  const { puedeEditar } = useMenuPermission(MENU_COMPLEMENTARIA)
  // Secciones que abrió la persona; mientras busca, todas abiertas (las cerradas no muestran sus datos).
  const [abiertas, setAbiertas] = useState(["datos", "fechas", "seleccion", "cupos"])
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

  const abierta = c.forma === "ABIERTA"

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          // Miga y Cerrar; las acciones del detalle (Modificar) van en la línea del buscador (CLAUDE.md §13).
          ruta="Matrícula complementaria"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                render={<Link to={paths.app.coberturaComplementaria.getHref()} />}
                nativeButton={false}
                variant="outline"
                color="neutral"
                size="sm"
              >
                <XIcon data-icon="inline-start" />
                Cerrar
              </Button>
            </div>
          }
        >
          Convocatoria {c.anio} · {c.establecimiento}
          {/* Estado junto al título, en su misma línea (hay espacio a la derecha). */}
          <span className="ml-3 inline-flex align-middle text-sm font-normal"><Marca {...ESTADO_CONVOCATORIA[c.estado]} /></span>
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        {/* Ver detalle largo: buscador y cada sección como ficha (CLAUDE.md §13). */}
        <DetalleConBusqueda
          onBuscandoChange={setBuscando}
          // Modificar (secundario) en la línea del buscador, a la derecha, como Matrícula › Detalle.
          acciones={
            accionesDe(c).editar && puedeEditar ? (
              <Button
                render={<Link to={paths.app.coberturaConvocatoriaEditar.getHref(c.id)} />}
                nativeButton={false}
                variant="outline"
                color="neutral"
                size="sm"
              >
                <PencilIcon data-icon="inline-start" />
                Modificar
              </Button>
            ) : undefined
          }
        >
        <Secciones
          abiertas={buscando ? ["datos", "fechas", "seleccion", "cupos"] : abiertas}
          onAbiertasChange={(v) => !buscando && setAbiertas(v)}
        >
          <BloqueBuscable contar>
          <Seccion value="datos" titulo="Datos de la convocatoria">
            <FichaDatos
              datos={[
                { etiqueta: "Establecimiento que recibe", valor: c.establecimiento },
                { etiqueta: "Año", valor: String(c.anio) },
                { etiqueta: "Estado", valor: ESTADO_CONVOCATORIA[c.estado].label },
                { etiqueta: "Establecimientos de origen", valor: c.origenes.map((o) => o.nombre).join(", "), ancho: true },
              ]}
            />
          </Seccion>
          </BloqueBuscable>
          <BloqueBuscable contar>
          <Seccion value="fechas" titulo="Fechas">
            <FichaDatos
              datos={[
                { etiqueta: "Fecha de inicio de postulación", valor: fecha(c.inicioPostulacion) },
                { etiqueta: "Fecha de cierre de postulación", valor: fecha(c.cierrePostulacion) },
                ...(c.publicacion ? [{ etiqueta: "Publicación de resultados", valor: fecha(c.publicacion) }] : []),
                { etiqueta: "Fecha límite para matricular", valor: fecha(c.limiteMatricula) },
              ]}
            />
          </Seccion>
          </BloqueBuscable>
          <BloqueBuscable contar>
          <Seccion value="seleccion" titulo="Postulación y selección">
            <FichaDatos
              datos={[
                { etiqueta: "Forma de postulación", valor: FORMA_LABEL[c.forma] },
                { etiqueta: "Continuidad automática", valor: c.continuidadAutomatica ? "Sí" : "No" },
                ...(abierta
                  ? [
                      { etiqueta: "Modo de selección", valor: MODO_LABEL[c.modo] },
                      { etiqueta: "Desempate", valor: DESEMPATE_LABEL[c.desempate] },
                    ]
                  : [{ etiqueta: "Lista de espera", valor: c.listaEspera ? "Sí" : "No" }]),
              ]}
            />
          </Seccion>
          </BloqueBuscable>
          {/* La tabla de cupos no se filtra: mientras se busca queda oculta. */}
          {buscando ? null : (
          <Seccion value="cupos" titulo="Cupos por especialidad">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Seccion>
          )}
        </Secciones>
        </DetalleConBusqueda>
      </TableScreenBody>
    </TableScreen>
  )
}
