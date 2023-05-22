/** Notification types known to Soapbox. */
enum NOTIFICATION_CONTEXTS {
  MENTIONS = 'mention',
  FAVOURITES = 'favourite',
  EMOJI_REACTS = 'pleroma:emoji_reaction',
  REBLOGS = 'reblog',
  POLLS = 'poll',
  STATUSES = 'status',
  FOLLOWS = 'follow',
}

const NOTIFICATION_TYPES = [
  { context: NOTIFICATION_CONTEXTS.FOLLOWS, type: 'follow' },
  { context: NOTIFICATION_CONTEXTS.FOLLOWS, type: 'follow_request' },
  { context: NOTIFICATION_CONTEXTS.MENTIONS, type: 'mention' },
  { context: NOTIFICATION_CONTEXTS.MENTIONS, type: 'group_mention' },
  { context: NOTIFICATION_CONTEXTS.REBLOGS, type: 'reblog' },
  { context: NOTIFICATION_CONTEXTS.REBLOGS, type: 'group_reblog' },
  { context: NOTIFICATION_CONTEXTS.FAVOURITES, type: 'favourite' },
  { context: NOTIFICATION_CONTEXTS.FAVOURITES, type: 'group_favourite' },
  { context: NOTIFICATION_CONTEXTS.POLLS, type: 'poll' },
  { context: NOTIFICATION_CONTEXTS.STATUSES, type: 'status' },
  { context: NOTIFICATION_CONTEXTS.FOLLOWS, type: 'follow' },
  { context: NOTIFICATION_CONTEXTS.EMOJI_REACTS, type: 'pleroma:emoji_reaction' },

  // No context
  { context: null, type: 'move' },
  { context: null, type: 'pleroma:chat_mention' },
  { context: null, type: 'user_approved' },
  { context: null, type: 'update' },
  { context: null, type: 'pleroma:event_reminder' },
  { context: null, type: 'pleroma:participation_request' },
  { context: null, type: 'pleroma:participation_accepted' },
] as const;

/** Notification types to exclude from the "All" filter by default. */
const EXCLUDE_TYPES = [
  'pleroma:chat_mention',
  'chat', // TruthSocial
] as const;

type NotificationType = (typeof NOTIFICATION_TYPES[number])['type']

/** Ensure the Notification is a valid, known type. */
const validType = (type: string): type is NotificationType => NOTIFICATION_TYPES
  .map((notificationType) => notificationType.type)
  .includes(type as any);

export {
  NOTIFICATION_TYPES,
  EXCLUDE_TYPES,
  NotificationType,
  validType,
};
