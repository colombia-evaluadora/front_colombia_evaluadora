import { paymentsHandlers } from "./payments"
import { navigationHandlers } from "./navigation"
import { authHandlers } from "./auth"
import { auditsHandlers } from "./audits"
import { auditTablesHandlers } from "./audit-tables"
import { establishmentHandlers } from "./establishments"

export const handlers = [
  ...authHandlers,
  ...paymentsHandlers,
  ...navigationHandlers,
  ...auditsHandlers,
  ...auditTablesHandlers,
  ...establishmentHandlers
]
