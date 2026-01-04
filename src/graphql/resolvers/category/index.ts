import { categoryQueries } from './queries'
import { categoryMutations } from './mutations'

export const categoryResolvers = {
  Query: {
    ...categoryQueries
  },
  Mutation: {
    ...categoryMutations
  }
}

