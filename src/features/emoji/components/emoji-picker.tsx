import { Picker as EmojiPicker } from 'emoji-mart';
import React, { useEffect } from 'react';

import { joinPublicPath } from 'soapbox/utils/static';

import data from '../data';

const getSpritesheetURL = (set: string) => {
  return require('emoji-datasource/img/twitter/sheets/32.png');
};

const getImageURL = (set: string, name: string) => {
  return joinPublicPath(`/packs/emoji/${name}.svg`);
};

const Picker: React.FC<any> = (props) => {

  useEffect(() => {
    const input = { ...props, data, ref: props.emojiPickerDropdownRef, getImageURL, getSpritesheetURL };

    new EmojiPicker(input);
  }, []);

  return <div ref={props.emojiPickerDropdownRef} />;
};

export default Picker;
