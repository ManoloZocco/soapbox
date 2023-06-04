import {
  AdminAccountRecord,
  AdminReportRecord,
  AccountRecord,
  AnnouncementRecord,
  AnnouncementReactionRecord,
  AttachmentRecord,
  ChatRecord,
  ChatMessageRecord,
  EmojiRecord,
  FieldRecord,
  FilterRecord,
  FilterKeywordRecord,
  FilterStatusRecord,
  HistoryRecord,
  InstanceRecord,
  ListRecord,
  LocationRecord,
  MentionRecord,
  NotificationRecord,
  StatusEditRecord,
  StatusRecord,
  TagRecord,
} from 'soapbox/normalizers';
import { LogEntryRecord } from 'soapbox/reducers/admin-log';

import type { Record as ImmutableRecord } from 'immutable';

type AdminAccount = ReturnType<typeof AdminAccountRecord>;
type AdminLog = ReturnType<typeof LogEntryRecord>;
type AdminReport = ReturnType<typeof AdminReportRecord>;
type Announcement = ReturnType<typeof AnnouncementRecord>;
type AnnouncementReaction = ReturnType<typeof AnnouncementReactionRecord>;
type Attachment = ReturnType<typeof AttachmentRecord>;
type Chat = ReturnType<typeof ChatRecord>;
type ChatMessage = ReturnType<typeof ChatMessageRecord>;
type Emoji = ReturnType<typeof EmojiRecord>;
type Field = ReturnType<typeof FieldRecord>;
type Filter = ReturnType<typeof FilterRecord>;
type FilterKeyword = ReturnType<typeof FilterKeywordRecord>;
type FilterStatus = ReturnType<typeof FilterStatusRecord>;
type History = ReturnType<typeof HistoryRecord>;
type Instance = ReturnType<typeof InstanceRecord>;
type List = ReturnType<typeof ListRecord>;
type Location = ReturnType<typeof LocationRecord>;
type Mention = ReturnType<typeof MentionRecord>;
type Notification = ReturnType<typeof NotificationRecord>;
type StatusEdit = ReturnType<typeof StatusEditRecord>;
type Tag = ReturnType<typeof TagRecord>;

interface Account extends ReturnType<typeof AccountRecord> {
  // HACK: we can't do a circular reference in the Record definition itself,
  // so do it here.
  moved: EmbeddedEntity<Account>
}

interface Status extends ReturnType<typeof StatusRecord> {
  // HACK: same as above
  quote: EmbeddedEntity<Status>
  reblog: EmbeddedEntity<Status>
}

// Utility types
type APIEntity = Record<string, any>;
type EmbeddedEntity<T extends object> = null | string | ReturnType<ImmutableRecord.Factory<T>>;

export {
  AdminAccount,
  AdminLog,
  AdminReport,
  Account,
  Announcement,
  AnnouncementReaction,
  Attachment,
  Chat,
  ChatMessage,
  Emoji,
  Field,
  Filter,
  FilterKeyword,
  FilterStatus,
  History,
  Instance,
  List,
  Location,
  Mention,
  Notification,
  Status,
  StatusEdit,
  Tag,

  // Utility types
  APIEntity,
  EmbeddedEntity,
};

export type {
  Card,
  EmojiReaction,
  Group,
  GroupMember,
  GroupRelationship,
  Poll,
  PollOption,
  Relationship,
} from 'soapbox/schemas';