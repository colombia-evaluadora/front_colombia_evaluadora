import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { rolVisible } from "@/features/comunicaciones/chat/lib/estado-mensaje"
import type { ResolucionSeleccion } from "@/features/comunicaciones/chat/api/types"
import { textoConfirmacion, textoYaEnElGrupo } from "@/features/comunicaciones/chat/lib/seleccion-grupal"

const MUESTRA = 8

// Confirmación de un alta masiva en un grupo con el conteo que resolvió comms-service
// ("Se agregarán 32 personas") y una muestra de los nombres.
export function ConfirmarAltaDialog({
  resolucion,
  resumen,
  grupo,
  pendiente,
  onConfirmar,
  onCancelar,
}: {
  resolucion: ResolucionSeleccion | null
  resumen: string
  grupo: string
  pendiente: boolean
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const total = resolucion?.total ?? 0
  const invitaciones = resolucion?.invitaciones ?? 0
  const ya = textoYaEnElGrupo(resolucion?.yaEnElGrupo ?? 0)
  const muestra = resolucion?.personas.slice(0, MUESTRA) ?? []
  const resto = total - muestra.length

  return (
    <AlertDialog open={resolucion !== null} onOpenChange={(o) => !o && !pendiente && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{textoConfirmacion(total, invitaciones)}</AlertDialogTitle>
          <AlertDialogDescription>
            {resumen ? `${resumen}. ` : ""}
            {total > invitaciones && `Verán todo el historial de ${grupo} y recibirán un aviso.`}
            {invitaciones > 0 &&
              ` ${invitaciones === 1 ? "El acudiente recibe" : "Los acudientes reciben"} una invitación y ${
                invitaciones === 1 ? "entra" : "entran"
              } al grupo solo si la aceptan.`}
            {total === 0 && "Todas las personas elegidas ya están en el grupo o no se pueden agregar."}
            {ya && ` ${ya}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {muestra.length > 0 && (
          <ul aria-label="Personas que se agregarán" className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-3 text-sm">
            {muestra.map((p) => (
              <li key={p.id} className="truncate">
                {p.nombre}
                <span className="text-muted-foreground">
                  {[rolVisible(p), p.perfil === "ACUDIENTE" && "invitación"].filter(Boolean).map((t) => ` · ${t}`)}
                </span>
              </li>
            ))}
            {resto > 0 && <li className="text-muted-foreground">y {resto === 1 ? "1 persona más" : `${resto} personas más`}</li>}
          </ul>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel variant="fill" color="neutral" disabled={pendiente}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction disabled={pendiente || total === 0} aria-busy={pendiente} onClick={onConfirmar}>
            {total > 0 && total === invitaciones ? "Invitar" : "Agregar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
