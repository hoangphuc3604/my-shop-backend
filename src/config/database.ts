import { DataSource } from 'typeorm'
import { User, Category, Product, Order, OrderItem, ProductImage, Promotion } from '../entities'

const dbUrl = process.env.DB_URL || 'postgresql://postgres:password@localhost:5432/my_shop'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  entities: [User, Category, Product, Order, OrderItem, ProductImage, Promotion],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development'
})