import { DataSource } from 'typeorm'

const dbUrl = process.env.DB_URL || 'postgresql://postgres:password@localhost:5432/my_shop'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  entities: [],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development'
})