import 'dotenv/config'
import { ApolloServer } from 'apollo-server'
import { typeDefs, resolvers } from './graphql'
import { logger } from './config/logger'
import { AppDataSource } from './config/database'

const PORT = process.env.PORT || 4000

async function startServer() {
  try {
    await AppDataSource.initialize()
    logger.info('Database connection established')

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req }) => ({
        logger
      })
    })

    const { url } = await server.listen(PORT)
    logger.info(`Server ready at ${url}`)
  } catch (error) {
    logger.error('Failed to start server', error)
    process.exit(1)
  }
}

startServer().catch((error) => {
  logger.error('Failed to start server', error)
  process.exit(1)
})
