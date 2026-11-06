import { Button } from "@/components/ui/button"
import { FileUploadOutlinedIcon, PencilIcon } from "@/components/ui/icons"

import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { descargarActa } from "@/features/gestion-estudiantil/inclusion/piar/api/piar-api"
import type { VersionActual } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { BotonQuitar, BotonSeccion, EnlaceArchivo } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import type { FichaPiar } from "@/features/gestion-estudiantil/inclusion/piar/hooks/use-ficha-piar"

function TablaParticipantes({ version, quitable, onQuitar }: { version: VersionActual; quitable: boolean; onQuitar: (id: number) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/60 text-left">
          <tr>
            <th className="px-2 py-2 font-medium">Persona</th>
            <th className="px-2 py-2 font-medium">Calidad en que participa</th>
            <th className="px-2 py-2 font-medium">Debe firmar</th>
            <th className="px-2 py-2 font-medium">Estado de firma</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {version.participantes.map((p) => (
            <tr key={p.id} className="border-b border-border">
              <td className="px-2 py-2">{p.nombre}</td>
              <td className="px-2 py-2">{p.otra_calidad ?? p.calidad.nombre}</td>
              <td className="px-2 py-2">{p.debe_firmar ? "Sí" : "No"}</td>
              <td className="px-2 py-2">{p.estado_firma === "FIRMO" ? "Firmó" : p.debe_firmar ? "Pendiente" : "—"}</td>
              <td className="px-2 py-2 text-right">{quitable && <BotonQuitar onClick={() => onQuitar(p.id)} />}</td>
            </tr>
          ))}
          {!version.participantes.length && <tr><td colSpan={5} className="px-2 py-3 text-muted-foreground">Sin participantes.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export function SeccionActa({ ficha }: { ficha: FichaPiar }) {
  const { piar, version, estado, gestiona, acta, setDialogo, documento, abrirActivacion, quitar } = ficha
  if (!version) return null
  const borrador = estado === "BORRADOR"
  const bloqueado = !borrador || !gestiona
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
          {gestiona && borrador && <BotonSeccion onClick={() => setDialogo({ tipo: "participante" })}>Agregar participante</BotonSeccion>}
        </div>
        <TablaParticipantes version={version} quitable={gestiona && borrador} onQuitar={(id) => quitar(`/participantes/${id}/eliminar`)} />
      </div>
      {version.acta && <p>Acta firmada: <EnlaceArchivo archivo={version.acta} /></p>}
      {version.copia && <p className="text-muted-foreground">Copia entregada a la familia el {formatFecha(version.copia.fecha)} ({version.copia.medio}).</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" color="muted" type="button" onClick={() => documento(descargarActa(piar.id, version.id))}>Generar borrador del acta</Button>
        {gestiona && borrador && (
          <>
            <Button size="sm" variant="outline" color="muted" type="button" onClick={abrirActivacion}>
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
