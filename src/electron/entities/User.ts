import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Location } from './Location';
import { Title } from './Title';
import { Note } from './Note';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ nullable: true })
  title_id?: number;

  @ManyToOne(() => Title)
  @JoinColumn({ name: 'title_id' })
  title?: Title;

  @OneToMany(() => Note, (note) => note.user)
  notes!: Note[];

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

  @Index()
  @Column({ nullable: true })
  location_id?: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location?: Location;

  @Column({ nullable: true })
  image_path?: string;
}
