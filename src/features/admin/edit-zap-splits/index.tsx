// import React, { useState } from 'react';
// import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

// import List, { ListItem } from 'soapbox/components/list';
// import { Button, Column, Form, FormActions } from 'soapbox/components/ui';
// import { Slider } from 'soapbox/components/ui';

// const messages = defineMessages({
//   title: { id: 'admin.zap_splits.title', defaultMessage: 'Zap Splits' },
//   saved: { id: 'zap_split_editor.saved', defaultMessage: 'Theme updated!' },
//   restore: { id: 'zap_split_editor.restore', defaultMessage: 'Restore default zap split' },
//   adm: { id: 'zap_split_editor.primary', defaultMessage: 'Adm' },
// });

// interface IZapSplitEditor {
// }

// /** UI for editing Zap splits. */
// const ZapSplitEditor: React.FC<IZapSplitEditor> = () => {
//   const intl = useIntl();
  
//   // const [submitting, setSubmitting] = useState(true);
//   // const [resetPercent, setResetPercent] = useState();

//   return (
//     <Column label={intl.formatMessage(messages.title)}>
//       <Form>
//         <List>
//           <SliderListItem
//             label={intl.formatMessage(messages.adm)}
//           />

//           <SliderListItem
//             label={intl.formatMessage(messages.adm)}
//           />
//         </List>

//         <FormActions>
//           <Button theme='secondary' >
//           {/* <Button theme='secondary' onClick={resetPercent}> */}
//             <FormattedMessage id='zap_split_editor.reset' defaultMessage='Reset' />
//           </Button>

//           <Button type='submit' theme='primary' >
//           {/* <Button type='submit' theme='primary' disabled={submitting}> */}
//             <FormattedMessage id='zap_split_editor.save' defaultMessage='Save' />
//           </Button>
//         </FormActions>
//       </Form>

//     </Column>
//   );
// };

// interface ISliderListItem {
//   pictureAdm?: React.ReactNode;
//   label?: React.ReactNode;
//   resetKey?: true | false;
// }

// /** Slider editor inside a ListItem. */
// const SliderListItem: React.FC<ISliderListItem> = ({ label, resetKey }) => {

//   const [percent, setPercent] = useState(0);

//   return (
//     <ListItem label={<div className='w-20'>{label}</div>}>
//       <Slider value={percent} onChange={setPercent} />
//     </ListItem>
//   );
// };

//   export default ZapSplitEditor;