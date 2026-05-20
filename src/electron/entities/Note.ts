import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Asset } from './Asset';
import { Batch } from './Batch';
import { Location } from './Location';
import { Title } from './Title';
import { User } from './User';
import { Withdrawal } from './Withdrawal';

@Entity()
export class Note {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  content!: string;

  @CreateDateColumn()
  created_at!: Date;

  @Index()
  @Column({ nullable: true })
  asset_id?: number;

  @ManyToOne(() => Asset, (asset) => asset.notes)
  @JoinColumn({ name: 'asset_id' })
  asset?: Asset;

  @Index()
  @Column({ nullable: true })
  batch_id?: number;

  @ManyToOne(() => Batch, (batch) => batch.notes)
  @JoinColumn({ name: 'batch_id' })
  batch?: Batch;

  @Index()
  @Column({ nullable: true })
  location_id?: number;

  @ManyToOne(() => Location, (location) => location.notes)
  @JoinColumn({ name: 'location_id' })
  location?: Location;

  @Index()
  @Column({ nullable: true })
  title_id?: number;

  @ManyToOne(() => Title, (title) => title.notes)
  @JoinColumn({ name: 'title_id' })
  title?: Title;

  @Index()
  @Column({ nullable: true })
  user_id?: number;

  @ManyToOne(() => User, (user) => user.notes)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Index()
  @Column({ nullable: true })
  withdrawal_id?: number;

  @ManyToOne(() => Withdrawal, (withdrawal) => withdrawal.notes)
  @JoinColumn({ name: 'withdrawal_id' })
  withdrawal?: Withdrawal;
}
