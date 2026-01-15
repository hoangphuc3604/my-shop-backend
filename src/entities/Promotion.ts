import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export enum PromotionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED'
}

export enum AppliesTo {
  ALL = 'ALL',
  PRODUCTS = 'PRODUCTS',
  CATEGORIES = 'CATEGORIES'
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  promotionId!: number

  @Column({ length: 50, unique: true })
  code!: string

  @Column({ type: 'text' })
  description!: string

  @Column({
    type: 'enum',
    enum: PromotionType,
    default: PromotionType.PERCENTAGE
  })
  discountType!: PromotionType

  @Column({ type: 'int' })
  discountValue!: number

  @Column({
    type: 'enum',
    enum: AppliesTo,
    default: AppliesTo.ALL
  })
  appliesTo!: AppliesTo

  @Column({ type: 'jsonb', nullable: true })
  appliesToIds!: number[] | null

  @Column({ type: 'timestamp', nullable: true })
  startAt!: Date | null

  @Column({ type: 'timestamp', nullable: true })
  endAt!: Date | null

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'int', nullable: true })
  usageLimit!: number | null

  @Column({ type: 'int', default: 0 })
  usedCount!: number

  @Column({ type: 'int', nullable: true })
  perUserLimit!: number | null

  @CreateDateColumn()
  createdAt!: Date
}
