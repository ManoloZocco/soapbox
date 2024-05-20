import { ExtendedRefs } from '@floating-ui/react';
import clsx from 'clsx';
import React, { KeyboardEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';

import { IconButton } from 'soapbox/components/ui';
import { useClickOutside } from 'soapbox/hooks';

import EmojiPickerDropdown, { IEmojiPickerDropdown } from '../components/emoji-picker-dropdown';

export const messages = defineMessages({
  emoji: { id: 'emoji_button.label', defaultMessage: 'Insert emoji' },
});

const EmojiPickerDropdownContainer = (
  props: Pick<IEmojiPickerDropdown, 'onPickEmoji' | 'condensed' | 'withCustom'>,
) => {
  const intl = useIntl();
  const title = intl.formatMessage(messages.emoji);
  const [visible, setVisible] = useState(false);

  const refs = {
    floating: useRef<HTMLDivElement>(null),
    reference: useRef<HTMLButtonElement>(null),
  };
  const emojiPickerDropdownWidth = refs.floating.current?.clientWidth || 300;
  const emojiPickerDropdownHeight = refs.floating.current?.clientHeight || 435;

  useClickOutside(refs as ExtendedRefs<HTMLDivElement | HTMLButtonElement>, () => {
    setVisible(false);
  });

  const handleToggle = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    setVisible(!visible);
  };

  return (
    <div className='relative'>
      <IconButton
        className={clsx({
          'text-gray-600 hover:text-gray-700 dark:hover:text-gray-500': true,
        })}
        ref={refs.reference}
        src={require('@tabler/icons/outline/mood-happy.svg')}
        title={title}
        aria-label={title}
        aria-expanded={visible}
        role='button'
        onClick={handleToggle as any}
        onKeyDown={handleToggle as React.KeyboardEventHandler<HTMLButtonElement>}
        tabIndex={0}
      />

      {createPortal(
        <div
          className='z-[101]'
          style={visible ? {
            top: `calc(50% - ${emojiPickerDropdownHeight / 2}px)`,
            left: `calc(50% - ${emojiPickerDropdownWidth / 2}px)`,
            position: 'fixed',
            width: `${emojiPickerDropdownWidth}px`,
            height: `${emojiPickerDropdownHeight}px`,
          } : {}}
        >
          <EmojiPickerDropdown
            emojiPickerDropdownRef={refs.floating}
            visible={visible}
            setVisible={setVisible}
            {...props}
          />
        </div>,
        document.body,
      )}
    </div>
  );
};

export default EmojiPickerDropdownContainer;
