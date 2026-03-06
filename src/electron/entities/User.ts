import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Location } from './Location';
import { Title } from './Title';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Title)
  @JoinColumn({ name: 'title_id' })
  title?: Title;

  @Column()
  first_name!: string;

  @Column()
  last_name!: string;

  @Column({ nullable: true })
  barcode?: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  mobile?: string;

  @Column({ nullable: true })
  location_id?: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location?: Location;

  @Column({ nullable: true })
  image_path?: string;
}
