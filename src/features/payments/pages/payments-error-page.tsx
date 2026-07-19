import { useRouter } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

export function PaymentsErrorPage({ error }: ErrorComponentProps) {
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <h1 className="text-2xl font-semibold">No se pudieron cargar los pagos</h1>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={() => router.invalidate()} className="mt-2">
        Reintentar
      </Button>
    </div>
  )
}
