import { requireAuth } from '../../../middleware/authorization'

export const authQueries = {
  me: requireAuth()(async (_: any, __: any, context: any) => {
    return context.user
  })
}

