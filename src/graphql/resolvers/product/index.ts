import { productQueries } from './queries'
import { productMutations } from './mutations'

export const productResolvers = {
  Query: {
    ...productQueries
  },
  Mutation: {
    ...productMutations
  }
}

