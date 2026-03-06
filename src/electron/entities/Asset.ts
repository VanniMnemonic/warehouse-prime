import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Batch } from './Batch';

@Entity()
export class Asset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  denomination!: string;

  @OneToMany(() => Batch, (batch) => batch.asset)
  batches!: Batch[];

  @Column({ nullable: true })
  part_number?: string;

  @Column({ nullable: true })
  barcode?: string;

  @Column({ type: 'int', default: 0 })
  min_stock!: number;

  @Column({ nullable: true })
  image_path?: string;
}
