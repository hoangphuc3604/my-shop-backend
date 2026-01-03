import { orderQueries } from './queries'
import { orderMutations } from './mutations'
import { orderTypes } from './types'

export const orderResolvers = {
  Query: {
    ...orderQueries
  },
  Mutation: {
    ...orderMutations
  },
  ...orderTypes
}

