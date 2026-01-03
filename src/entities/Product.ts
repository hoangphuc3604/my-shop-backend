import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm'
import { Category } from './Category'
import { OrderItem } from './OrderItem'
import { ProductImage } from './ProductImage'

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  productId!: number

  @Column({ length: 50 })
  @Index({ unique: true })
  sku!: string

  @Column({ length: 200 })
  name!: string

  @Column({ type: 'int', default: 0 })
  importPrice!: number

  @Column({ type: 'int', default: 0 })
  count!: number

  @Column({ length: 1000 })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  description?: string | null
  @OneToMany(() => ProductImage, image => image.product, { cascade: true })
  images!: ProductImage[]

  @Column({ type: 'int' })
  categoryId!: number

  @ManyToOne(() => Category, category => category.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category!: Category

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems!: OrderItem[]
}
