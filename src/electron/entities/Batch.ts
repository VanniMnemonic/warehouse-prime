import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Asset } from './Asset';
import { Location } from './Location';

@Entity()
export class Batch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  denomination!: string;

  @Column()
  asset_id!: number;

  @ManyToOne(() => Asset, (asset) => asset.batches)
  @JoinColumn({ name: 'asset_id' })
  asset!: Asset;

  @Column({ nullable: true })
  location_id?: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location?: Location;

  @Column({ nullable: true })
  serial_number?: string;

  @Column({ nullable: true })
  expiration_date?: Date;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ type: 'int', default: 0 })
  inefficient_quantity!: number;
}
