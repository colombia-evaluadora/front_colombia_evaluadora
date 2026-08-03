import { ArrowDownIcon, ArrowUpIcon, CaretUpDownIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

interface SortableHeaderProps<K extends string> {
  title: string
  sortKey: K
  sort: { key: K; dir: "asc" | "desc" } | null
  onToggle: (key: K) => void
}

export function SortableHeader<K extends string>({
  title,
  sortKey,
  sort,
  onToggle,
}: SortableHeaderProps<K>) {
  const active = sort?.key === sortKey
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => onToggle(sortKey)}
    >
      <span>{title}</span>
      {active ? (
        sort?.dir === "desc" ? (
          <ArrowDownIcon data-icon="inline-end" />
        ) : (
          <ArrowUpIcon data-icon="inline-end" />
        )
      ) : (
        <CaretUpDownIcon data-icon="inline-end" />
      )}
    </Button>
  )
}
