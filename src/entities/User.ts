import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userId!: number

  @Column({ length: 100 })
  @Index({ unique: true })
  username!: string

  @Column({ length: 255 })
  @Index({ unique: true })
  email!: string

  @Column()
  passwordHash!: string

  @CreateDateColumn()
  createdAt!: Date

  @Column({ type: 'timestamp', nullable: true })
  lastLogin!: Date

  @Column({ default: true })
  isActive!: boolean
}
