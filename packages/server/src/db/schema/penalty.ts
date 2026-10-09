import {
    mysqlTable,
    int,
    varchar,
    boolean,
    bigint,
} from 'drizzle-orm/mysql-core';
import { User } from './user';
import { Organization } from './organization';

export const Penalty = mysqlTable('penalty', {
    id: int('id').primaryKey().autoincrement().unique(),
    targetType: int('target_type').notNull(),
    userId: int('user_id').references(() => User.id, { onDelete: 'cascade' }),
    organizationId: int('organization_id').references(() => Organization.id, { onDelete: 'cascade' }),
    spaceType: int('space_type').notNull(),
    notice: int('notice').notNull().default(0),
    warning: int('warning').notNull().default(0),
    noticeTotal: int('notice_total').notNull().default(0),
    warningTotal: int('warning_total').notNull().default(0),
    converted: boolean('converted').notNull().default(false),
    restrictionStage: int('restriction_stage').notNull().default(0),
    restrictionEnd: bigint('restriction_end', { mode: 'number' }).notNull().default(0),
    reason: varchar('reason', { length: 1024 }).notNull(),
    issuerId: int('issuer_id').references(() => User.id, { onDelete: 'set null' }),
    timeImpose: bigint('time_impose', { mode: 'number' }).notNull(),
    // Foreign keys
    // userId references users.userId O (nullable, target_type = USER only)
    // organizationId references organizations.organizationId O (nullable, target_type = ORGANIZATION only)
    // issuerId references users.userId O (nullable, set null on delete)
});
