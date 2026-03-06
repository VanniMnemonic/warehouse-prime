import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { Batch } from './Batch';

@Entity()
export class Location {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  denomination!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  parent_id?: number;

  @ManyToOne(() => Location, (location) => location.children)
  @JoinColumn({ name: 'parent_id' })
  parent?: Location;

  @OneToMany(() => Location, (location) => location.parent)
  children?: Location[];

  @OneToMany(() => User, (user) => user.location)
  users?: User[];

  @OneToMany(() => Batch, (batch) => batch.location)
  batches?: Batch[];
}
