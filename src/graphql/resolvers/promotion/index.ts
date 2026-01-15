import { promotionQueries } from './queries'
import { promotionMutations } from './mutations'

export const promotionResolvers = {
  Query: promotionQueries,
  Mutation: promotionMutations
}
