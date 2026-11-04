import { Badge } from "@/components/ui/badge"

/** Con quórum (éxito) o Sin quórum (advertencia). */
export function BadgeQuorum({ conQuorum }: { conQuorum: boolean }) {
  return (
    <Badge variant="soft" color={conQuorum ? "success" : "warning"}>
      {conQuorum ? "Con quórum" : "Sin quórum"}
    </Badge>
  )
}
