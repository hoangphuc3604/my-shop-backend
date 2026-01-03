import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm'
import { Product } from './Product'

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn()
  productImageId!: number

  @Column({ type: 'int' })
  productId!: number

  @ManyToOne(() => Product, product => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product

  @Column({ length: 1000 })
  url!: string

  @Column({ length: 200, nullable: true })
  altText!: string

  @Column({ type: 'int', default: 0 })
  position!: number

  @Column({ default: false })
  isPrimary!: boolean

  @CreateDateColumn()
  createdAt!: Date
}


