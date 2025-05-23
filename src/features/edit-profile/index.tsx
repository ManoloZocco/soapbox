import { useState, useEffect } from 'react';
import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { updateNotificationSettings } from 'soapbox/actions/accounts.ts';
import { patchMe } from 'soapbox/actions/me.ts';
import BirthdayInput from 'soapbox/components/birthday-input.tsx';
import List, { ListItem } from 'soapbox/components/list.tsx';
import { Button } from 'soapbox/components/ui/button.tsx';
import { Column } from 'soapbox/components/ui/column.tsx';
import FormActions from 'soapbox/components/ui/form-actions.tsx';
import FormGroup from 'soapbox/components/ui/form-group.tsx';
import Form from 'soapbox/components/ui/form.tsx';
import HStack from 'soapbox/components/ui/hstack.tsx';
import Input from 'soapbox/components/ui/input.tsx';
import Streamfield from 'soapbox/components/ui/streamfield.tsx';
import Textarea from 'soapbox/components/ui/textarea.tsx';
import Toggle from 'soapbox/components/ui/toggle.tsx';
import { useImageField } from 'soapbox/hooks/forms/index.ts';
import { useAppDispatch } from 'soapbox/hooks/useAppDispatch.ts';
import { useAppSelector } from 'soapbox/hooks/useAppSelector.ts';
import { useFeatures } from 'soapbox/hooks/useFeatures.ts';
import { useInstance } from 'soapbox/hooks/useInstance.ts';
import { useOwnAccount } from 'soapbox/hooks/useOwnAccount.ts';
import toast from 'soapbox/toast.tsx';
import { isDefaultAvatar, isDefaultHeader } from 'soapbox/utils/accounts.ts';

import AvatarPicker from './components/avatar-picker.tsx';
import HeaderPicker from './components/header-picker.tsx';

import type { StreamfieldComponent } from 'soapbox/components/ui/streamfield.tsx';
import type { Account } from 'soapbox/schemas/index.ts';

const nonDefaultAvatar = (url: string | undefined) => url && isDefaultAvatar(url) ? undefined : url;
const nonDefaultHeader = (url: string | undefined) => url && isDefaultHeader(url) ? undefined : url;

/**
 * Whether the user is hiding their follows and/or followers.
 * Pleroma's config is granular, but we simplify it into one setting.
 */
const hidesNetwork = ({ pleroma }: Account): boolean => {
  return Boolean(
    pleroma?.hide_followers &&
    pleroma?.hide_follows &&
    pleroma?.hide_followers_count &&
    pleroma?.hide_follows_count,
  );
};

const messages = defineMessages({
  heading: { id: 'column.edit_profile', defaultMessage: 'Edit profile' },
  header: { id: 'edit_profile.header', defaultMessage: 'Edit Profile' },
  metaFieldLabel: { id: 'edit_profile.fields.meta_fields.label_placeholder', defaultMessage: 'Label' },
  metaFieldContent: { id: 'edit_profile.fields.meta_fields.content_placeholder', defaultMessage: 'Content' },
  success: { id: 'edit_profile.success', defaultMessage: 'Your profile has been successfully saved!' },
  error: { id: 'edit_profile.error', defaultMessage: 'Profile update failed' },
  bioPlaceholder: { id: 'edit_profile.fields.bio_placeholder', defaultMessage: 'Tell us about yourself.' },
  displayNamePlaceholder: { id: 'edit_profile.fields.display_name_placeholder', defaultMessage: 'Name' },
  websitePlaceholder: { id: 'edit_profile.fields.website_placeholder', defaultMessage: 'Display a Link' },
  locationPlaceholder: { id: 'edit_profile.fields.location_placeholder', defaultMessage: 'Location' },
  nip05Placeholder: { id: 'edit_profile.fields.nip05_placeholder', defaultMessage: 'user@{domain}' },
  lud16Placeholder: { id: 'edit_profile.fields.lud16_placeholder', defaultMessage: 'user@example.com' },
  cancel: { id: 'common.cancel', defaultMessage: 'Cancel' },
});

/**
 * Profile metadata `name` and `value`.
 * (By default, max 4 fields and 255 characters per property/value)
 */
interface AccountCredentialsField {
  name: string;
  value: string;
}

/** Private information (settings) for the account. */
interface AccountCredentialsSource {
  /** Default post privacy for authored statuses. */
  privacy?: string;
  /** Whether to mark authored statuses as sensitive by default. */
  sensitive?: boolean;
  /** Default language to use for authored statuses. (ISO 6391) */
  language?: string;
}

/**
 * Params to submit when updating an account.
 * @see PATCH /api/v1/accounts/update_credentials
 */
interface AccountCredentials {
  /** Whether the account should be shown in the profile directory. */
  discoverable?: boolean;
  /** Whether the account has a bot flag. */
  bot?: boolean;
  /** The display name to use for the profile. */
  display_name?: string;
  /** The account bio. */
  note?: string;
  /** Avatar image encoded using multipart/form-data */
  avatar?: File | '';
  /** Header image encoded using multipart/form-data */
  header?: File | '';
  /** Whether manual approval of follow requests is required. */
  locked?: boolean;
  /** Private information (settings) about the account. */
  source?: AccountCredentialsSource;
  /** Custom profile fields. */
  fields_attributes?: AccountCredentialsField[];

  // Non-Mastodon fields
  /** Pleroma: whether to accept notifications from people you don't follow. */
  stranger_notifications?: boolean;
  /** Soapbox BE: whether the user opts-in to email communications. */
  accepts_email_list?: boolean;
  /** Pleroma: whether to publicly display followers. */
  hide_followers?: boolean;
  /** Pleroma: whether to publicly display follows. */
  hide_follows?: boolean;
  /** Pleroma: whether to publicly display follower count. */
  hide_followers_count?: boolean;
  /** Pleroma: whether to publicly display follows count. */
  hide_follows_count?: boolean;
  /** User's website URL. */
  website?: string;
  /** User's location. */
  location?: string;
  /** User's birthday. */
  birthday?: string;
  /** Nostr NIP-05 identifier. */
  nip05?: string;
  /**
   * Lightning address.
   * https://github.com/lnurl/luds/blob/luds/16.md
   */
  lud16?: string;
}

/** Convert an account into an update_credentials request object. */
const accountToCredentials = (account: Account): AccountCredentials => {
  const hideNetwork = hidesNetwork(account);

  return {
    discoverable: account.discoverable,
    bot: account.bot,
    display_name: account.display_name,
    note: account.source?.note ?? '',
    locked: account.locked,
    fields_attributes: [...account.source?.fields ?? []],
    stranger_notifications: account.pleroma?.notification_settings?.block_from_strangers === true,
    accepts_email_list: account.pleroma?.accepts_email_list === true,
    hide_followers: hideNetwork,
    hide_follows: hideNetwork,
    hide_followers_count: hideNetwork,
    hide_follows_count: hideNetwork,
    website: account.website,
    location: account.location,
    birthday: account.pleroma?.birthday ?? undefined,
    nip05: account.source?.nostr?.nip05 ?? '',
    lud16: account?.nostr?.lud16 ?? '',
  };
};

const ProfileField: StreamfieldComponent<AccountCredentialsField> = ({ value, onChange }) => {
  const intl = useIntl();

  const handleChange = (key: string): React.ChangeEventHandler<HTMLInputElement> => {
    return e => {
      onChange({ ...value, [key]: e.currentTarget.value });
    };
  };

  return (
    <HStack space={2} grow>
      <Input
        type='text'
        outerClassName='w-2/5 grow'
        value={value.name}
        onChange={handleChange('name')}
        placeholder={intl.formatMessage(messages.metaFieldLabel)}
      />
      <Input
        type='text'
        outerClassName='w-3/5 grow'
        value={value.value}
        onChange={handleChange('value')}
        placeholder={intl.formatMessage(messages.metaFieldContent)}
      />
    </HStack>
  );
};

/** Edit profile page. */
const EditProfile: React.FC = () => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { instance } = useInstance();

  const { account } = useOwnAccount();
  const features = useFeatures();
  const maxFields = instance.pleroma.metadata.fields_limits.max_fields;

  const attachmentTypes = useAppSelector(
    state => state.instance.configuration.media_attachments.supported_mime_types)
    ?.filter(type => type.startsWith('image/'))
    .join(',');

  const [isLoading, setLoading] = useState(false);
  const [data, setData] = useState<AccountCredentials>({});
  const [muteStrangers, setMuteStrangers] = useState(false);

  const avatar = useImageField({ maxPixels: 400 * 400, preview: nonDefaultAvatar(account?.avatar) });
  const header = useImageField({ maxPixels: 1920 * 1080, preview: nonDefaultHeader(account?.header) });

  // `null` means the file was explicitly cleared. `undefined` means unchanged.
  useEffect(() => updateData('avatar', avatar.file === null ? '' : avatar.file), [avatar.file]);
  useEffect(() => updateData('header', header.file === null ? '' : header.file), [header.file]);

  useEffect(() => {
    if (account) {
      const credentials = accountToCredentials(account);
      const strangerNotifications = account.pleroma?.notification_settings?.block_from_strangers === true;
      setData(credentials);
      setMuteStrangers(strangerNotifications);
    }
  }, [account?.id]);

  /** Set a single key in the request data. */
  const updateData = (key: string, value: any) => {
    setData(prevData => {
      return { ...prevData, [key]: value };
    });
  };

  const handleSubmit: React.FormEventHandler = (event) => {
    const formdata = new FormData();

    for (const [key, value] of Object.entries(data) as [string, unknown][]) {
      if (key === 'fields_attributes') {
        const fields = data.fields_attributes || [];
        fields.forEach((field, i) => {
          formdata.set(`fields_attributes[${i}][name]`, field.name);
          formdata.set(`fields_attributes[${i}][value]`, field.value);
        });
      } else if (key === 'source') {
        for (const [k, v] of Object.entries(data.source || {})) {
          formdata.set(`source[${k}]`, String(v));
        }
      } else if (value instanceof Blob) {
        formdata.set(key, value);
      } else if (['string', 'number', 'boolean'].includes(typeof value)) {
        formdata.set(key, String(value));
      } else if (value) {
        throw new Error('Could not encode profile data into a FormData object.');
      }
    }

    // Having zero profile fields should remove them from the account.
    // On Mastodon, it's only possible to do this by sending one field with empty values.
    if (data.fields_attributes?.length === 0) {
      formdata.set('fields_attributes[0][name]', '');
      formdata.set('fields_attributes[0][value]', '');
    }

    const promises = [
      dispatch(patchMe(formdata)),
    ];

    if (features.muteStrangers) {
      promises.push(
        dispatch(updateNotificationSettings({
          block_from_strangers: muteStrangers,
        })).catch(console.error),
      );
    }

    setLoading(true);

    Promise.all(promises).then(() => {
      setLoading(false);
      toast.success(intl.formatMessage(messages.success));
    }).catch(() => {
      setLoading(false);
      toast.error(intl.formatMessage(messages.error));
    });

    event.preventDefault();
  };

  const handleCheckboxChange = (key: keyof AccountCredentials): React.ChangeEventHandler<HTMLInputElement> => {
    return e => {
      updateData(key, e.target.checked);
    };
  };

  const handleTextChange = (key: keyof AccountCredentials): React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> => {
    return e => {
      updateData(key, e.target.value);
    };
  };

  const handleBirthdayChange = (date: string) => {
    updateData('birthday', date);
  };

  const handleHideNetworkChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    const hide = e.target.checked;
    setData(prevData => {
      return {
        ...prevData,
        hide_followers: hide,
        hide_follows: hide,
        hide_followers_count: hide,
        hide_follows_count: hide,
      };
    });
  };

  const handleFieldsChange = (fields: AccountCredentialsField[]) => {
    updateData('fields_attributes', fields);
  };

  const handleAddField = () => {
    const oldFields = data.fields_attributes || [];
    const fields = [...oldFields, { name: '', value: '' }];
    updateData('fields_attributes', fields);
  };

  const handleRemoveField = (i: number) => {
    const oldFields = data.fields_attributes || [];
    const fields = [...oldFields];
    fields.splice(i, 1);
    updateData('fields_attributes', fields);
  };

  return (
    <Column label={intl.formatMessage(messages.header)}>
      <Form onSubmit={handleSubmit}>
        <div className='relative mb-12 flex'>
          <HeaderPicker accept={attachmentTypes} disabled={isLoading} {...header} />
          <AvatarPicker className='!sm:left-6 !left-4 !translate-x-0' accept={attachmentTypes} disabled={isLoading} {...avatar} />
        </div>

        <FormGroup
          labelText={<FormattedMessage id='edit_profile.fields.display_name_label' defaultMessage='Display name' />}
        >
          <Input
            type='text'
            value={data.display_name}
            onChange={handleTextChange('display_name')}
            placeholder={intl.formatMessage(messages.displayNamePlaceholder)}
          />
        </FormGroup>

        {features.nip05 && (
          <FormGroup
            labelText={<FormattedMessage id='edit_profile.fields.nip05_label' defaultMessage='Username' />}
          >
            <Input
              type='text'
              value={data.nip05}
              onChange={handleTextChange('nip05')}
              placeholder={intl.formatMessage(messages.nip05Placeholder, { domain: instance.domain })}
            />
          </FormGroup>
        )}

        {features.birthdays && (
          <FormGroup
            labelText={<FormattedMessage id='edit_profile.fields.birthday_label' defaultMessage='Birthday' />}
          >
            <BirthdayInput
              value={data.birthday}
              onChange={handleBirthdayChange}
            />
          </FormGroup>
        )}

        {features.accountLocation && (
          <FormGroup
            labelText={<FormattedMessage id='edit_profile.fields.location_label' defaultMessage='Location' />}
          >
            <Input
              type='text'
              value={data.location}
              onChange={handleTextChange('location')}
              placeholder={intl.formatMessage(messages.locationPlaceholder)}
            />
          </FormGroup>
        )}

        {features.lightning && (
          <FormGroup
            labelText={<FormattedMessage id='edit_profile.fields.lud16_label' defaultMessage='Lightning Address' />}
          >
            <Input
              type='email'
              value={data.lud16}
              onChange={handleTextChange('lud16')}
              placeholder={intl.formatMessage(messages.lud16Placeholder)}
            />
          </FormGroup>
        )}

        {features.accountWebsite && (
          <FormGroup
            labelText={<FormattedMessage id='edit_profile.fields.website_label' defaultMessage='Website' />}
          >
            <Input
              type='url'
              value={data.website}
              onChange={handleTextChange('website')}
              placeholder={intl.formatMessage(messages.websitePlaceholder)}
            />
          </FormGroup>
        )}

        <FormGroup
          labelText={<FormattedMessage id='edit_profile.fields.bio_label' defaultMessage='Bio' />}
        >
          <Textarea
            value={data.note}
            onChange={handleTextChange('note')}
            autoComplete='off'
            placeholder={intl.formatMessage(messages.bioPlaceholder)}
          />
        </FormGroup>

        <List>
          {features.followRequests && (
            <ListItem
              label={<FormattedMessage id='edit_profile.fields.locked_label' defaultMessage='Lock account' />}
              hint={<FormattedMessage id='edit_profile.hints.locked' defaultMessage='Requires you to manually approve followers' />}
            >
              <Toggle
                checked={data.locked}
                onChange={handleCheckboxChange('locked')}
              />
            </ListItem>
          )}

          {features.hideNetwork && (
            <ListItem
              label={<FormattedMessage id='edit_profile.fields.hide_network_label' defaultMessage='Hide network' />}
              hint={<FormattedMessage id='edit_profile.hints.hide_network' defaultMessage='Who you follow and who follows you will not be shown on your profile' />}
            >
              <Toggle
                checked={account ? (data.hide_followers && data.hide_follows && data.hide_followers_count && data.hide_follows_count) : false}
                onChange={handleHideNetworkChange}
              />
            </ListItem>
          )}

          {features.bots && (
            <ListItem
              label={<FormattedMessage id='edit_profile.fields.bot_label' defaultMessage='This is a bot account' />}
              hint={<FormattedMessage id='edit_profile.hints.bot' defaultMessage='This account mainly performs automated actions and might not be monitored' />}
            >
              <Toggle
                checked={data.bot}
                onChange={handleCheckboxChange('bot')}
              />
            </ListItem>
          )}

          {features.muteStrangers && (
            <ListItem
              label={<FormattedMessage id='edit_profile.fields.stranger_notifications_label' defaultMessage='Block notifications from strangers' />}
              hint={<FormattedMessage id='edit_profile.hints.stranger_notifications' defaultMessage='Only show notifications from people you follow' />}
            >
              <Toggle
                checked={muteStrangers}
                onChange={(e) => setMuteStrangers(e.target.checked)}
              />
            </ListItem>
          )}

          {features.profileDirectory && (
            <ListItem
              label={<FormattedMessage id='edit_profile.fields.discoverable_label' defaultMessage='Allow account discovery' />}
              hint={<FormattedMessage id='edit_profile.hints.discoverable' defaultMessage='Display account in profile directory and allow indexing by external services' />}
            >
              <Toggle
                checked={data.discoverable}
                onChange={handleCheckboxChange('discoverable')}
              />
            </ListItem>
          )}

          {features.emailList && (
            <ListItem
              label={<FormattedMessage id='edit_profile.fields.accepts_email_list_label' defaultMessage='Subscribe to newsletter' />}
              hint={<FormattedMessage id='edit_profile.hints.accepts_email_list' defaultMessage='Opt-in to news and marketing updates.' />}
            >
              <Toggle
                checked={data.accepts_email_list}
                onChange={handleCheckboxChange('accepts_email_list')}
              />
            </ListItem>
          )}
        </List>

        {features.profileFields && (
          <Streamfield
            label={<FormattedMessage id='edit_profile.fields.meta_fields_label' defaultMessage='Profile fields' />}
            hint={<FormattedMessage id='edit_profile.hints.meta_fields' defaultMessage='You can have up to {count, plural, one {# custom field} other {# custom fields}} displayed on your profile.' values={{ count: maxFields }} />}
            values={data.fields_attributes || []}
            onChange={handleFieldsChange}
            onAddItem={handleAddField}
            onRemoveItem={handleRemoveField}
            component={ProfileField}
            maxItems={maxFields}
          />
        )}

        <FormActions>
          <Button to='/settings' theme='tertiary'>
            {intl.formatMessage(messages.cancel)}
          </Button>

          <Button theme='primary' type='submit' disabled={isLoading}>
            <FormattedMessage id='edit_profile.save' defaultMessage='Save' />
          </Button>
        </FormActions>
      </Form>
    </Column>
  );
};

export default EditProfile;
