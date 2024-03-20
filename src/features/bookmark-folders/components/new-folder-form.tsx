import React from 'react';
import { defineMessages, useIntl } from 'react-intl';

import { useCreateBookmarkFolder } from 'soapbox/api/hooks';
import { Button, Form, HStack, Input } from 'soapbox/components/ui';
import { useTextField } from 'soapbox/hooks/forms';
import toast from 'soapbox/toast';

const messages = defineMessages({
  label: { id: 'bookmark_folders.new.title_placeholder', defaultMessage: 'New folder title' },
  create: { id: 'bookmark_folders.new.create_title', defaultMessage: 'Add folder' },
  createSuccess: { id: 'bookmark_folders.success.add', defaultMessage: 'Bookmark folder created successfully' },
  createFail: { id: 'bookmark_folders.fail.add', defaultMessage: 'Failed to create bookmark folder' },
});

const NewFolderForm: React.FC = () => {
  const intl = useIntl();

  const name = useTextField();

  const { createBookmarkFolder, isSubmitting } = useCreateBookmarkFolder();

  const handleSubmit = (e: React.FormEvent<Element>) => {
    e.preventDefault();
    createBookmarkFolder({
      name: name.value,
    }).then(() => {
      toast.success(messages.createSuccess);
    }).catch(() => {
      toast.success(messages.createFail);
    });
  };

  const label = intl.formatMessage(messages.label);
  const create = intl.formatMessage(messages.create);

  return (
    <Form onSubmit={handleSubmit}>
      <HStack space={2}>
        <label className='grow'>
          <span style={{ display: 'none' }}>{label}</span>

          <Input
            type='text'
            placeholder={label}
            disabled={isSubmitting}
            {...name}
          />
        </label>

        <Button
          disabled={isSubmitting}
          onClick={handleSubmit}
          theme='primary'
        >
          {create}
        </Button>
      </HStack>
    </Form>
  );
};

export default NewFolderForm;
