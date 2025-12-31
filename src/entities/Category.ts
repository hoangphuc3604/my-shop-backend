import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'
import { Product } from './Product'

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  categoryId!: number

  @Column({ length: 200 })
  name!: string

  @Column({ length: 500, nullable: true })
  description!: string

  @OneToMany(() => Product, product => product.category)
  products!: Product[]
}
