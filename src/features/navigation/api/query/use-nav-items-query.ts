import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { getNavIcon } from "../ui-mappings"
import type { NavItem, NavItemDto } from "../types/nav-item"

function fetchNavItemsDto(): Promise<NavItemDto[]> {
  return api.get("/navigation/menu")
}

async function fetchNavItems(): Promise<NavItem[]> {
  const items = await fetchNavItemsDto()
  return items.map((item) => ({
    ...item,
    icon: getNavIcon(item.icon),
  }))
}

export function useNavItemsQuery() {
  return useQuery({
    queryKey: ["navigation", "menu"],
    queryFn: fetchNavItems,
    staleTime: Infinity,
  })
}
