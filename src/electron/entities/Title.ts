import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Title {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;
}
