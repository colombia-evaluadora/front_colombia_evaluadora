import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { toNavItemDtos } from "@/features/navigation/api/menu-mapper"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import type { NavItem, RouteResponseDto } from "@/features/navigation/api/types/nav-item"

async function fetchNavItemsDto() {
  const routes: RouteResponseDto[] = await api.get("/sso-admin/myMenu", {
    params: { app: env.NAME },
  })
  return toNavItemDtos(routes)
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
