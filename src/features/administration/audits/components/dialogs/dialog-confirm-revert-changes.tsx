import { useRef, useState } from "react"

import { ArrowCounterClockwiseIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { useRevertOperationChange } from "@/features/administration/audits/api/mutations/revert-operation-change"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { NoticeProvider } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"

interface DialogConfirmRevertChangesProps {
  tableSlug: string
  operationId: string
  fieldIndexes: number[]
}

/**
 * Tercer dialog del flujo de cambios: pide confirmación antes de mandar el
 * revert. Recibe el `operationId` (y el slug) desde el dialog padre — la
 * acción destructiva nunca se dispara sin paso explícito por acá.
 *
 * El propio dialog monta su `NoticeProvider`: los avisos del revert son del
 * diálogo (no del listado de operaciones que está atrás), y tener un
 * `NoticeBanner` adentro del modal —encima del overlay— evita que el toast
 * global quede escondido por el backdrop.
 */
export function DialogConfirmRevertChanges({
  tableSlug,
  operationId,
  fieldIndexes,
}: DialogConfirmRevertChangesProps) {
  const [open, setOpen] = useState(false)

  return (
    <NoticeProvider>
      <DialogConfirmRevertChangesInner
        open={open}
        onOpenChange={setOpen}
        tableSlug={tableSlug}
        operationId={operationId}
        fieldIndexes={fieldIndexes}
      />
    </NoticeProvider>
  )
}

function DialogConfirmRevertChangesInner({
  open,
  onOpenChange,
  tableSlug,
  operationId,
  fieldIndexes,
}: DialogConfirmRevertChangesProps & {
  open: boolean
  onOpenChange: (next: boolean) => void
}) {
  const { notify } = useNotify()
  const [notice, setNotice] = useState<{
    id: number
    message: string
    variant: NoticeVariant
  } | null>(null)
  const noticeIdRef = useRef(0)

  function notifyInDialog(message: string, options?: { variant?: NoticeVariant }) {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant: options?.variant ?? "error" })
  }

  const revertChange = useRevertOperationChange({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notifyInDialog(result.message)
          return
        }
        setNotice(null)
        notify(result.message)
        onOpenChange(false)
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error))
      },
    },
  })

  const disabled = revertChange.isPending || fieldIndexes.length === 0

  function handleConfirm() {
    setNotice(null)
    revertChange.mutate({ tableSlug, operationId, fieldIndexes })
  }

  function handleOpenChange(next: boolean) {
    // Cerrar el dialog (overlay click, ESC, X) limpia cualquier aviso pendiente
    // para que no reaparezca la próxima vez que se abra.
    if (!next) setNotice(null)
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={disabled}
            aria-label="Revertir todos los cambios mostrados"
          />
        }
      >
        <ArrowCounterClockwiseIcon weight="bold" data-icon="inline-start" />
        Revertir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Revertir los cambios?</AlertDialogTitle>
          <AlertDialogDescription>
            Se van a restaurar {fieldIndexes.length} campo(s) a su valor anterior. Esta acción no se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Mismo patrón que `dialog-create-evaluation-period`: el aviso va
            pegado debajo del header, dentro del modal, no en el toast global
            que queda detrás del overlay. El error no se autocierra — se queda
            hasta que el usuario lo descarte o reintente — y el éxito sí, con
            el mismo `autoCloseMs` de 4s que ya usa academic-period. */}
        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? undefined : 4000}
        />

        <AlertDialogFooter>
          <AlertDialogAction
            disabled={revertChange.isPending}
            aria-busy={revertChange.isPending}
            onClick={handleConfirm}
          >
            {/* El spinner reemplaza al icono en vez de sumarse: así el ancho
                del botón no salta al entrar en loading. */}
            {revertChange.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
            )}
            Revertir
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral">
            <XIcon data-icon="inline-start" />
            Cerrar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
