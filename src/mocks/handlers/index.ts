import { paymentsHandlers } from "./payments"
import { navigationHandlers } from "./navigation"
import { authHandlers } from "./auth"
import { auditsHandlers } from "./audits"

export const handlers = [
  ...authHandlers,
  ...paymentsHandlers,
  ...navigationHandlers,
  ...auditsHandlers,
]
