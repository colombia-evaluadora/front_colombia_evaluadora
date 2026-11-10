import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import {
  CheckSquareIcon,
  EyeIcon,
  FileUploadOutlinedIcon,
  PencilIcon,
  PlusCircleIcon,
  XCircleIcon,
} from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInscripcionDetalleRoute } from "@/router"

import { useInscripcionDetalleQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type { InscripcionDetalle } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import {
  ESTADO_INSCRIPCION_UI,
  ESTADO_OPCION_UI,
  REVISION_SOPORTE_UI,
} from "@/features/coverage/inscripcion-reservas/api/ui-mappings-inscripcion"
import { AnularInscripcionDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-acciones-inscripcion"
import {
  AmpliarInscripcionDialog,
  ElegirOpcionDialog,
  type InscripcionObjetivo,
} from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-ampliar-elegir"
import { Marca } from "@/features/coverage/inscripcion-reservas/components/table/columns-inscripciones"
import {
  CampoLectura,
  Rejilla,
  Seccion,
  Secciones,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const proximamente = (accion: string) => toast.info(`${accion}: próximamente.`)

/** Ver detalle de una inscripción (Cobertura, Sección 3.3). */
export function InscripcionDetallePage() {
  const { inscripcionId } = coberturaInscripcionDetalleRoute.useParams()
  const { data, isPending, isError, error } = useInscripcionDetalleQuery(inscripcionId)

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

  const e = data.estudiante
  const nombre = [e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido]
    .filter(Boolean)
    .join(" ")
  // Una inscripción anulada o ya admitida no se edita ni se anula.
  const editable = data.estado !== "ANULADA" && data.estado !== "ADMITIDA"
  const vivas = data.opciones.filter((o) => o.estado !== "DESCARTADA")
  // Regla 27: Inscrita o En lista de espera y menos de tres opciones (el back valida cierre y sorteo).
  const ampliable =
    (data.estado === "INSCRITA" || data.estado === "EN_LISTA_ESPERA") && vivas.length < 3
  // Regla 38: elegir con dos o más Admitidas, o quedarse con la única y descartar las demás.
  const elegible =
    data.estado === "POR_ELEGIR" ||
    (vivas.some((o) => o.estado === "ADMITIDA") &&
      vivas.some((o) => o.estado !== "ADMITIDA" && o.estado !== "NO_ADMITIDA"))
  const objetivo = { inscripcionId: data.id, aspirante: nombre, grado: data.grado }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description={<Marca {...ESTADO_INSCRIPCION_UI[data.estado]} />}
          action={
            editable || elegible ? (
              <div className="flex flex-wrap justify-end gap-2">
                {elegible && <AccionBoton accion="elegir" objetivo={objetivo} />}
                {ampliable && <AccionBoton accion="ampliar" objetivo={objetivo} />}
                {editable && (
                  <AnularBoton id={data.id} numeroInscripcion={data.numeroInscripcion} />
                )}
                {editable && (
                  <Button
                    nativeButton={false}
                    render={<Link to={paths.app.coberturaInscripcionEditar.getHref(data.id)} />}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Editar
                  </Button>
                )}
              </div>
            ) : null
          }
        >
          Inscripción {data.numeroInscripcion} · {nombre}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <Secciones abiertas={["opciones", "datos", "personas", "soportes"]}>
          <Seccion value="opciones" titulo="Opciones de cupo" tabla>
            <Opciones d={data} />
          </Seccion>
          <Seccion value="datos" titulo="Datos de la inscripción">
            <Rejilla>
              <CampoLectura
                id="numero"
                label="Número de inscripción"
                value={data.numeroInscripcion}
              />
              <CampoLectura id="grado" label="Grado" value={data.grado} />
              <CampoLectura
                id="estado"
                label="Estado"
                value={ESTADO_INSCRIPCION_UI[data.estado].label}
              />
              <CampoLectura
                id="doc-hermano"
                label="Documento del hermano"
                value={data.documentoHermano}
              />
            </Rejilla>
          </Seccion>
          <Seccion value="personas" titulo="Información del estudiante y del acudiente">
            <Personas d={data} />
          </Seccion>
          <Seccion value="soportes" titulo="Archivo de soporte" tabla>
            <Soportes d={data} />
          </Seccion>
        </Secciones>
      </TableScreenBody>
    </TableScreen>
  )
}

// Con su propio estado: la página retorna antes de tiempo mientras carga.
function AnularBoton(inscripcion: { id: string; numeroInscripcion: string }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Button variant="outline" color="destructive" onClick={() => setAbierto(true)}>
        <XCircleIcon data-icon="inline-start" />
        Anular inscripción
      </Button>
      <AnularInscripcionDialog
        inscripcion={abierto ? inscripcion : null}
        onOpenChange={setAbierto}
      />
    </>
  )
}

function AccionBoton({
  accion,
  objetivo,
}: {
  accion: "ampliar" | "elegir"
  objetivo: InscripcionObjetivo
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Button variant="outline" color="neutral" onClick={() => setAbierto(true)}>
        {accion === "ampliar" ? (
          <PlusCircleIcon data-icon="inline-start" />
        ) : (
          <CheckSquareIcon data-icon="inline-start" />
        )}
        {accion === "ampliar" ? "Ampliar inscripción" : "Elegir opción"}
      </Button>
      {accion === "ampliar" ? (
        <AmpliarInscripcionDialog objetivo={abierto ? objetivo : null} onOpenChange={setAbierto} />
      ) : (
        <ElegirOpcionDialog objetivo={abierto ? objetivo : null} onOpenChange={setAbierto} />
      )}
    </>
  )
}

function Opciones({ d }: { d: InscripcionDetalle }) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>#</TableHead>
            <TableHead>Establecimiento</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead>Jornada</TableHead>
            <TableHead>Sorteo</TableHead>
            <TableHead>Estado de la opción</TableHead>
            <TableHead>Hermano verificado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {d.opciones.map((o) => (
            <TableRow key={o.preferencia}>
              <TableCell className="tabular-nums">{o.preferencia}</TableCell>
              <TableCell>{o.establecimiento}</TableCell>
              <TableCell>{o.sede}</TableCell>
              <TableCell>{o.jornada}</TableCell>
              <TableCell className="tabular-nums">{o.numeroSorteo ?? "—"}</TableCell>
              <TableCell>
                <Marca {...ESTADO_OPCION_UI[o.estado]} />
              </TableCell>
              <TableCell>
                <Marca label={o.hermanoVerificado ? "Sí" : "No"} color="neutral" punto={false} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

function Personas({ d }: { d: InscripcionDetalle }) {
  const e = d.estudiante
  const a = d.acudiente
  return (
    <Rejilla>
      <CampoLectura
        id="est-tipo-doc"
        label="Tipo de documento del estudiante"
        value={e.tipoDocumento}
      />
      <CampoLectura id="est-doc" label="Documento estudiante" value={e.documento} />
      <CampoLectura id="est-genero" label="Género del estudiante" value={e.genero} />
      <CampoLectura id="est-nombre" label="Nombre del estudiante" value={e.primerNombre} />
      <CampoLectura
        id="est-nombre2"
        label="Segundo nombre del estudiante"
        value={e.segundoNombre}
      />
      <CampoLectura id="est-ap1" label="Primer apellido del estudiante" value={e.primerApellido} />
      <CampoLectura
        id="est-ap2"
        label="Segundo apellido del estudiante"
        value={e.segundoApellido}
      />
      <CampoLectura
        id="est-nac"
        label="Fecha de nacimiento"
        value={format(parseISO(e.fechaNacimiento), "dd/MM/yyyy")}
      />
      <CampoLectura id="est-pais" label="País de origen" value={e.paisOrigen} />
      <div className="md:col-span-2">
        <CampoLectura
          id="est-exp"
          label="Lugar expedición documento estudiante (municipio)"
          value={e.lugarExpedicion}
        />
      </div>
      <CampoLectura
        id="est-lugar-nac"
        label="Lugar de nacimiento (municipio)"
        value={e.lugarNacimiento}
      />
      <CampoLectura id="est-etnia" label="Etnia/Resguardo" value={e.etnia} />
      <CampoLectura id="est-lengua" label="Lengua materna" value={e.lenguaMaterna} />
      <CampoLectura
        id="est-migratoria"
        label="Condición migratoria"
        value={e.condicionMigratoria}
      />
      <CampoLectura id="acu-parentesco" label="Parentesco" value={a.parentesco} />
      <CampoLectura
        id="acu-tipo-doc"
        label="Tipo de documento del acudiente"
        value={a.tipoDocumento}
      />
      <CampoLectura id="acu-doc" label="Documento acudiente" value={a.documento} />
      <CampoLectura id="acu-nombre" label="Nombre del acudiente" value={a.nombre} />
      <CampoLectura id="acu-ap1" label="Primer apellido del acudiente" value={a.primerApellido} />
      <CampoLectura id="acu-ap2" label="Segundo apellido del acudiente" value={a.segundoApellido} />
      <CampoLectura id="acu-tel" label="Teléfono de acudiente" value={a.telefono} />
      <CampoLectura id="acu-email" label="Email acudiente" value={a.email} />
    </Rejilla>
  )
}

function Soportes({ d }: { d: InscripcionDetalle }) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Soporte</TableHead>
            <TableHead>Archivo</TableHead>
            <TableHead>Revisión</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {d.soportes.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="whitespace-normal">{s.nombre}</TableCell>
              <TableCell>{s.archivo ?? "—"}</TableCell>
              <TableCell>
                <Marca {...REVISION_SOPORTE_UI[s.revision]} />
              </TableCell>
              <TableCell>
                {s.archivo ? (
                  <Button variant="link" size="sm" onClick={() => proximamente("Revisar soporte")}>
                    <EyeIcon data-icon="inline-start" />
                    Revisar soporte
                  </Button>
                ) : (
                  <Button variant="link" size="sm" onClick={() => proximamente("Cargar soporte")}>
                    <FileUploadOutlinedIcon data-icon="inline-start" />
                    Cargar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
