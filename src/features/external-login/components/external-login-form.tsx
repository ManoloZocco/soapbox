import { useState, useEffect } from 'react';
import { useIntl, FormattedMessage, defineMessages } from 'react-intl';

import { externalLogin, loginWithCode } from 'soapbox/actions/external-auth.ts';
import { HTTPError } from 'soapbox/api/HTTPError.ts';
import Button from 'soapbox/components/ui/button.tsx';
import FormActions from 'soapbox/components/ui/form-actions.tsx';
import FormGroup from 'soapbox/components/ui/form-group.tsx';
import Form from 'soapbox/components/ui/form.tsx';
import Input from 'soapbox/components/ui/input.tsx';
import Spinner from 'soapbox/components/ui/spinner.tsx';
import { useAppDispatch } from 'soapbox/hooks/useAppDispatch.ts';
import toast from 'soapbox/toast.tsx';

const messages = defineMessages({
  instanceLabel: { id: 'login.fields.instance_label', defaultMessage: 'Instance' },
  instancePlaceholder: { id: 'login.fields.instance_placeholder', defaultMessage: 'example.com' },
  instanceFailed: { id: 'login_external.errors.instance_fail', defaultMessage: 'The instance returned an error.' },
  networkFailed: { id: 'login_external.errors.network_fail', defaultMessage: 'Connection failed. Is a browser extension blocking it?' },
});

/** Form for logging into a remote instance */
const ExternalLoginForm: React.FC = () => {
  const query = new URLSearchParams(window.location.search);
  const code = query.get('code');
  const server = query.get('server');

  const intl = useIntl();
  const dispatch = useAppDispatch();

  const [host, setHost] = useState(server || '');
  const [isLoading, setLoading] = useState(false);

  const handleHostChange: React.ChangeEventHandler<HTMLInputElement> = ({ currentTarget }) => {
    setHost(currentTarget.value);
  };

  const handleSubmit = () => {
    setLoading(true);

    dispatch(externalLogin(host))
      .then(() => setLoading(false))
      .catch((error: unknown) => {
        console.error(error);

        const status = error instanceof HTTPError ? error.response.status : undefined;

        if (status) {
          toast.error(intl.formatMessage(messages.instanceFailed));
        } else if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_NETWORK') {
          toast.error(intl.formatMessage(messages.networkFailed));
        }

        // If the server was invalid, clear it from the URL.
        // https://stackoverflow.com/a/40592892
        if (server) {
          window.history.pushState(null, '', window.location.pathname);
        }

        setLoading(false);
      });
  };

  useEffect(() => {
    if (code) {
      dispatch(loginWithCode(code));
    }
  }, [code]);

  useEffect(() => {
    if (server && !code) {
      handleSubmit();
    }
  }, [server]);

  if (code || server) {
    return <Spinner />;
  }

  return (
    <Form onSubmit={handleSubmit} data-testid='external-login'>
      <FormGroup labelText={intl.formatMessage(messages.instanceLabel)}>
        <Input
          aria-label={intl.formatMessage(messages.instancePlaceholder)}
          placeholder={intl.formatMessage(messages.instancePlaceholder)}
          type='text'
          name='host'
          onChange={handleHostChange}
          autoCorrect='off'
          autoCapitalize='off'
          required
        />
      </FormGroup>

      <FormActions>
        <Button theme='primary' type='submit' disabled={isLoading}>
          <FormattedMessage id='login.log_in' defaultMessage='Log in' />
        </Button>
      </FormActions>
    </Form>
  );
};

export default ExternalLoginForm;
