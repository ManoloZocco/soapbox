import React, { useRef, useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { v4 as uuidv4 } from 'uuid';

import { updateSoapboxConfig } from 'soapbox/actions/admin';
import { getHost } from 'soapbox/actions/instance';
import snackbar from 'soapbox/actions/snackbar';
import { fetchSoapboxConfig } from 'soapbox/actions/soapbox';
import List, { ListItem } from 'soapbox/components/list';
import { Button, Column, Form, FormActions } from 'soapbox/components/ui';
import DropdownMenuContainer from 'soapbox/containers/dropdown-menu-container';
import ColorWithPicker from 'soapbox/features/soapbox-config/components/color-with-picker';
import { useAppDispatch, useAppSelector, useSoapboxConfig } from 'soapbox/hooks';
import { normalizeSoapboxConfig } from 'soapbox/normalizers';
import { download } from 'soapbox/utils/download';
import { hexToHslPalette } from 'soapbox/utils/tailwind';
import { hexToHsl, hslToHex } from 'soapbox/utils/theme';

import Palette from './components/palette';

import type { ColorChangeHandler } from 'react-color';
import type { Hsl, HslColorPalette } from 'soapbox/types/colors';

const messages = defineMessages({
  title: { id: 'admin.theme.title', defaultMessage: 'Theme' },
  saved: { id: 'theme_editor.saved', defaultMessage: 'Theme updated!' },
  restore: { id: 'theme_editor.restore', defaultMessage: 'Restore default theme' },
  export: { id: 'theme_editor.export', defaultMessage: 'Export theme' },
  import: { id: 'theme_editor.import', defaultMessage: 'Import theme' },
  importSuccess: { id: 'theme_editor.import_success', defaultMessage: 'Theme was successfully imported!' },
});

interface IThemeEditor {
}

/** UI for editing Tailwind theme colors. */
const ThemeEditor: React.FC<IThemeEditor> = () => {
  const intl = useIntl();
  const dispatch = useAppDispatch();

  const soapbox = useSoapboxConfig();
  const host = useAppSelector(state => getHost(state));
  const rawConfig = useAppSelector(state => state.soapbox);

  const [colors, setColors] = useState(hexToHslPalette(soapbox.colors.toJS() as any));
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(uuidv4());

  const fileInput = useRef<HTMLInputElement>(null);

  const updateColors = (key: string) => {
    return (newColors: HslColorPalette) => {
      setColors({
        ...colors,
        [key]: {
          ...colors[key],
          ...newColors,
        },
      });
    };
  };

  const updateColor = (key: string) => {
    return (hex: string) => {
      setColors({
        ...colors,
        [key]: hexToHsl(hex)!,
      });
    };
  };

  const setTheme = (theme: any) => {
    setResetKey(uuidv4());
    setTimeout(() => setColors(theme));
  };

  const resetTheme = () => {
    setTheme(hexToHslPalette(soapbox.colors.toJS() as any));
  };

  dispatch(updateSoapboxConfig(rawConfig.set('colors', {})));

  const updateTheme = async () => {
    // FIXME: convert HSL back to Hex
    // const params = rawConfig.set('colors', colors).toJS();
    // await dispatch(updateSoapboxConfig(params));
  };

  const restoreDefaultTheme = () => {
    const colors = hexToHslPalette(normalizeSoapboxConfig({ brandColor: '#0482d8' }).colors.toJS() as any);
    setTheme(colors);
  };

  const exportTheme = () => {
    const data = JSON.stringify(colors, null, 2);
    download(data, 'theme.json');
  };

  const importTheme = () => {
    fileInput.current?.click();
  };

  const handleSelectFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.item(0);

    if (file) {
      const text = await file.text();
      const json = JSON.parse(text);
      const colors = normalizeSoapboxConfig({ colors: json }).colors.toJS();

      setTheme(colors);
      dispatch(snackbar.success(intl.formatMessage(messages.importSuccess)));
    }
  };

  const handleSubmit = async() => {
    setSubmitting(true);

    try {
      await dispatch(fetchSoapboxConfig(host));
      await updateTheme();
      dispatch(snackbar.success(intl.formatMessage(messages.saved)));
      setSubmitting(false);
    } catch (e) {
      setSubmitting(false);
    }
  };

  return (
    <Column label={intl.formatMessage(messages.title)}>
      <Form onSubmit={handleSubmit}>
        <List>
          <PaletteListItem
            label='Primary'
            palette={colors.primary as HslColorPalette}
            onChange={updateColors('primary')}
            resetKey={resetKey}
          />

          <PaletteListItem
            label='Secondary'
            palette={colors.secondary as HslColorPalette}
            onChange={updateColors('secondary')}
            resetKey={resetKey}
          />

          <PaletteListItem
            label='Accent'
            palette={colors.accent as HslColorPalette}
            onChange={updateColors('accent')}
            resetKey={resetKey}
          />

          <PaletteListItem
            label='Gray'
            palette={colors.gray as HslColorPalette}
            onChange={updateColors('gray')}
            resetKey={resetKey}
          />

          <PaletteListItem
            label='Success'
            palette={colors.success as HslColorPalette}
            onChange={updateColors('success')}
            resetKey={resetKey}
          />

          <PaletteListItem
            label='Danger'
            palette={colors.danger as HslColorPalette}
            onChange={updateColors('danger')}
            resetKey={resetKey}
          />
        </List>

        <List>
          <ColorListItem
            label='Greentext'
            value={hslToHex(colors.greentext as Hsl)}
            onChange={updateColor('greentext')}
          />

          <ColorListItem
            label='Accent Blue'
            value={hslToHex(colors['accent-blue'] as Hsl)}
            onChange={updateColor('accent-blue')}
          />

          <ColorListItem
            label='Gradient Start'
            value={hslToHex(colors['gradient-start'] as Hsl)}
            onChange={updateColor('gradient-start')}
          />

          <ColorListItem
            label='Gradient End'
            value={hslToHex(colors['gradient-end'] as Hsl)}
            onChange={updateColor('gradient-end')}
          />
        </List>

        <FormActions>
          <DropdownMenuContainer
            items={[{
              text: intl.formatMessage(messages.restore),
              action: restoreDefaultTheme,
              icon: require('@tabler/icons/refresh.svg'),
            },{
              text: intl.formatMessage(messages.import),
              action: importTheme,
              icon: require('@tabler/icons/upload.svg'),
            }, {
              text: intl.formatMessage(messages.export),
              action: exportTheme,
              icon: require('@tabler/icons/download.svg'),
            }]}
          />
          <Button theme='secondary' onClick={resetTheme}>
            <FormattedMessage id='theme_editor.Reset' defaultMessage='Reset' />
          </Button>

          <Button type='submit' theme='primary' disabled={submitting}>
            <FormattedMessage id='theme_editor.save' defaultMessage='Save theme' />
          </Button>
        </FormActions>
      </Form>

      <input
        type='file'
        ref={fileInput}
        multiple
        accept='application/json'
        className='hidden'
        onChange={handleSelectFile}
      />
    </Column>
  );
};

interface IPaletteListItem {
  label: React.ReactNode,
  palette: HslColorPalette,
  onChange: (palette: HslColorPalette) => void,
  resetKey?: string,
}

/** Palette editor inside a ListItem. */
const PaletteListItem: React.FC<IPaletteListItem> = ({ label, palette, onChange, resetKey }) => {
  return (
    <ListItem label={<div className='w-20'>{label}</div>}>
      <Palette palette={palette} onChange={onChange} resetKey={resetKey} />
    </ListItem>
  );
};

interface IColorListItem {
  label: React.ReactNode,
  value: string,
  onChange: (hex: string) => void,
}

/** Single-color picker. */
const ColorListItem: React.FC<IColorListItem> = ({ label, value, onChange }) => {
  const handleChange: ColorChangeHandler = (color, _e) => {
    onChange(color.hex);
  };

  return (
    <ListItem label={label}>
      <ColorWithPicker
        value={value}
        onChange={handleChange}
        className='w-10 h-8 rounded-md overflow-hidden'
      />
    </ListItem>
  );
};

export default ThemeEditor;