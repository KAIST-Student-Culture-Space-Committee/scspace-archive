import {
  mysqlTable,
  varchar,
  int,
  boolean,
  bigint,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

import { User } from './user';
import { Organization } from './organization';
import { Space } from './space';

// Reservations Table
export const Reservation = mysqlTable('reservation', {
  id: int('id').primaryKey().autoincrement().unique(),
  userId: int('user_id')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade' }),
  organizationId: int('organization_id')
    .notNull()
    .references(() => Organization.id, { onDelete: 'cascade' }),
  spaceId: int('space_id')
    .notNull()
    .references(() => Space.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  timeFrom: bigint('time_from', { mode: 'number' }).notNull(),
  timeTo: bigint('time_to', { mode: 'number' }).notNull(),
  timePost: bigint('time_post', { mode: 'number' }).notNull(),
  timeUpdate: bigint('time_update', { mode: 'number' }).notNull(),
  state: int('state').notNull().default(1), // ['grant', 'wait', 'received', 'rejected']
});

export const ReservationContent = mysqlTable('reservation_content', {
  id: int('id')
    .primaryKey()
    .references(() => Reservation.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 1024 }).notNull().default(''),
  innerParticipantNumber: int('inner_participant_number').notNull().default(0),
  outerParticipantNumber: int('outer_participant_number').notNull().default(0),
  food: varchar('food', { length: 255 }).notNull().default('X'), // For Mirae & Sumi
  busking: boolean('busking').notNull().default(false),
  workerNeed: boolean('worker_need').notNull().default(false),
  workerId: int('worker_id').notNull().default(0),
  performance: boolean('performance').notNull().default(false),
});

export const ReservationRelations = relations(Reservation, ({ one }) => ({
  content: one(ReservationContent, {
    fields: [Reservation.id],
    references: [ReservationContent.id],
  }),
}));
