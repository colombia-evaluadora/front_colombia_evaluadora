import { Button } from "@/components/ui/button"
import { FileUploadOutlinedIcon, PencilIcon } from "@/components/ui/icons"

import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { descargarActa } from "@/features/gestion-estudiantil/inclusion/piar/api/descargas"
import type { Participante, VersionActual } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { TablaDatos } from "@/features/gestion-estudiantil/inclusion/piar/components/tabla-datos"
import { BotonQuitar, BotonSeccion, EnlaceArchivo } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import type { FichaPiar } from "@/features/gestion-estudiantil/inclusion/piar/hooks/use-ficha-piar"

function TablaParticipantes({ version, quitable, onQuitar, onEditar }: { version: VersionActual; quitable: boolean; onQuitar: (id: number) => void; onEditar: (p: Participante) => void }) {
  return (
    <TablaDatos
      id="piar-participantes"
      rows={version.participantes}
      rowId={(p) => String(p.id)}
      growColumnId="persona"
      emptyMessage="Sin participantes."
      columns={[
        { id: "persona", header: "Persona", cell: ({ row }) => row.original.nombre },
        { id: "calidad", header: "Calidad en que participa", cell: ({ row }) => row.original.otra_calidad ?? row.original.calidad.nombre },
        { id: "firmar", header: "Debe firmar", cell: ({ row }) => (row.original.debe_firmar ? "Sí" : "No") },
        { id: "firma", header: "Estado de firma", cell: ({ row }) => (row.original.estado_firma === "FIRMO" ? "Firmó" : row.original.debe_firmar ? "Pendiente" : "—") },
        {
          id: "actions",
          enableHiding: false,
          header: () => null,
          cell: ({ row }) =>
            quitable && (
              <span className="inline-flex items-center gap-1">
                <Button size="xs" variant="outline" color="neutral" type="button" onClick={() => onEditar(row.original)}>Modificar</Button>
                <BotonQuitar onClick={() => onQuitar(row.original.id)} />
              </span>
            ),
        },
      ]}
    />
  )
}

export function SeccionActa({ ficha }: { ficha: FichaPiar }) {
  const { piar, version, estado, gestiona, acta, setDialogo, documento, abrirActivacion, quitar } = ficha
  if (!version) return null
  const borrador = estado === "BORRADOR"
  const bloqueado = !borrador || !gestiona
  // Un cambio sustancial abre una versión Pendiente de acuerdo que también recoge sus firmas (fn_piar_validar_version_preparable).
  const preparable = gestiona && ["VERSION_TRABAJO", "PENDIENTE_ACUERDO"].includes(version.estado.codigo)
  return (
    <SeccionPlegable
      defaultAbierta={borrador}
      titulo={<span className="font-normal">Acta de acuerdo</span>}
      accion={
        estado === "VIGENTE" && gestiona && (
          <span className="flex flex-wrap gap-2">
            <BotonSeccion icono={<PencilIcon data-icon="inline-start" />} onClick={() => setDialogo({ tipo: "actualizar" })}>Actualizar acuerdo</BotonSeccion>
            {!version.copia && <BotonSeccion onClick={() => setDialogo({ tipo: "copia" })}>Registrar copia a la familia</BotonSeccion>}
          </span>
        )
      }
      contentClassName="grid gap-5 p-4 text-sm"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <acta.AppField name="fecha_acuerdo">{(f) => <f.DateField label="Fecha del acuerdo" disabled={bloqueado} />}</acta.AppField>
        <p className="self-center">Versión del plan: <strong>{version.numero}</strong> · {version.estado.nombre}</p>
        <div className="sm:col-span-2">
          <acta.AppField name="compromisos_establecimiento">{(f) => <f.TextareaField label="Compromisos del establecimiento" maxLength={3000} disabled={bloqueado} />}</acta.AppField>
        </div>
        <div className="sm:col-span-2">
          <acta.AppField name="compromisos_familia">{(f) => <f.TextareaField label="Compromisos de la familia" maxLength={3000} disabled={bloqueado} />}</acta.AppField>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <strong className="font-medium">Participantes y firmantes</strong>
          {preparable && <BotonSeccion onClick={() => setDialogo({ tipo: "participante" })}>Agregar participante</BotonSeccion>}
        </div>
        <TablaParticipantes version={version} quitable={preparable} onQuitar={(id) => quitar(`/participantes/${id}/eliminar`)} onEditar={(fila) => setDialogo({ tipo: "participante", fila })} />
      </div>
      {version.acta && <p>Acta firmada: <EnlaceArchivo archivo={version.acta} /></p>}
      {version.copia && <p className="text-muted-foreground">Copia entregada a la familia el {formatFecha(version.copia.fecha)} ({version.copia.medio}).</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" color="neutral" type="button" onClick={() => documento(descargarActa(piar.id, version.id))}>Generar borrador del acta</Button>
        {gestiona && borrador && (
          <>
            <Button size="sm" variant="outline" color="neutral" type="button" onClick={abrirActivacion}>
              <FileUploadOutlinedIcon data-icon="inline-start" />
              Cargar acta
            </Button>
            <span className="text-xs text-muted-foreground">PDF o imagen, máximo 10 MB. Al cargarla, el PIAR se activa.</span>
          </>
        )}
      </div>
    </SeccionPlegable>
  )
}
