import classNames from 'classnames';
import { Map as ImmutableMap, List as ImmutableList } from 'immutable';
import { escape, throttle } from 'lodash';
import { readMessage, decrypt, readKey } from 'openpgp';
import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { injectIntl, defineMessages } from 'react-intl';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { fetchChatMessages, deleteChatMessage } from 'soapbox/actions/chats';
import { openModal } from 'soapbox/actions/modals';
import { initReportById } from 'soapbox/actions/reports';
import { Text, Icon, HStack } from 'soapbox/components/ui';
import DropdownMenuContainer from 'soapbox/containers/dropdown_menu_container';
import emojify from 'soapbox/features/emoji/emoji';
import Bundle from 'soapbox/features/ui/components/bundle';
import { MediaGallery } from 'soapbox/features/ui/util/async-components';
import { unescapeHTML } from 'soapbox/utils/html';
import { isPgpMessage, isPgpEncryptedMessage, getPgpKey } from 'soapbox/utils/pgp';
import { onlyEmoji } from 'soapbox/utils/rich_content';

const BIG_EMOJI_LIMIT = 1;

const messages = defineMessages({
  today: { id: 'chats.dividers.today', defaultMessage: 'Today' },
  more: { id: 'chats.actions.more', defaultMessage: 'More' },
  delete: { id: 'chats.actions.delete', defaultMessage: 'Delete message' },
  report: { id: 'chats.actions.report', defaultMessage: 'Report user' },
});

const timeChange = (prev, curr) => {
  const prevDate = new Date(prev.get('created_at')).getDate();
  const currDate = new Date(curr.get('created_at')).getDate();
  const nowDate  = new Date().getDate();

  if (prevDate !== currDate) {
    return currDate === nowDate ? 'today' : 'date';
  }

  return null;
};

const makeEmojiMap = record => record.get('emojis', ImmutableList()).reduce((map, emoji) => {
  return map.set(`:${emoji.get('shortcode')}:`, emoji);
}, ImmutableMap());

const makeGetChatMessages = () => {
  return createSelector(
    [(chatMessages, chatMessageIds) => (
      chatMessageIds.reduce((acc, curr) => {
        const chatMessage = chatMessages.get(curr);
        return chatMessage ? acc.push(chatMessage) : acc;
      }, ImmutableList())
    )],
    chatMessages => chatMessages,
  );
};

const makeMapStateToProps = () => {
  const getChatMessages = makeGetChatMessages();

  const mapStateToProps = (state, { chatMessageIds }) => {
    const chatMessages = state.get('chat_messages');

    return {
      me: state.get('me'),
      account: state.accounts.get(state.me),
      chatMessages: getChatMessages(chatMessages, chatMessageIds),
    };
  };

  return mapStateToProps;
};

export default @connect(makeMapStateToProps)
@injectIntl
class ChatMessageList extends ImmutablePureComponent {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    chatId: PropTypes.string,
    chatMessages: ImmutablePropTypes.list,
    chatMessageIds: ImmutablePropTypes.orderedSet,
    me: PropTypes.node,
  }

  static defaultProps = {
    chatMessages: ImmutableList(),
  }

  state = {
    initialLoad: true,
    isLoading: false,
    decryptedMessages: {},
  }

  scrollToBottom = () => {
    if (!this.messagesEnd) return;
    this.messagesEnd.scrollIntoView(false);
  }

  setMessageEndRef = (el) => {
    this.messagesEnd = el;
  };

  getFormattedTimestamp = (chatMessage) => {
    const { intl } = this.props;
    return intl.formatDate(
      new Date(chatMessage.get('created_at')), {
        hour12: false,
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  };

  setBubbleRef = (c) => {
    if (!c) return;
    const links = c.querySelectorAll('a[rel="ugc"]');

    links.forEach(link => {
      link.classList.add('chat-link');
      link.setAttribute('rel', 'ugc nofollow noopener');
      link.setAttribute('target', '_blank');
    });

    if (onlyEmoji(c, BIG_EMOJI_LIMIT, false)) {
      c.classList.add('chat-message__bubble--onlyEmoji');
    } else {
      c.classList.remove('chat-message__bubble--onlyEmoji');
    }
  }

  isNearBottom = () => {
    const elem = this.node;
    if (!elem) return false;

    const scrollBottom = elem.scrollHeight - elem.offsetHeight - elem.scrollTop;
    return scrollBottom < elem.offsetHeight * 1.5;
  }

  handleResize = throttle((e) => {
    if (this.isNearBottom()) this.scrollToBottom();
  }, 150);

  componentDidMount() {
    const { dispatch, chatId } = this.props;
    dispatch(fetchChatMessages(chatId));

    this.node.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.handleResize);
    this.scrollToBottom();
  }

  getSnapshotBeforeUpdate(prevProps, prevState) {
    const { scrollHeight, scrollTop } = this.node;
    return scrollHeight - scrollTop;
  }

  restoreScrollPosition = (scrollBottom) => {
    this.lastComputedScroll = this.node.scrollHeight - scrollBottom;
    this.node.scrollTop = this.lastComputedScroll;
  }

  componentDidUpdate(prevProps, prevState, scrollBottom) {
    const { initialLoad } = this.state;
    const oldCount = prevProps.chatMessages.count();
    const newCount = this.props.chatMessages.count();
    const isNearBottom = this.isNearBottom();
    const historyAdded = prevProps.chatMessages.getIn([0, 'id']) !== this.props.chatMessages.getIn([0, 'id']);

    // Retain scroll bar position when loading old messages
    this.restoreScrollPosition(scrollBottom);

    if (oldCount !== newCount) {
      if (isNearBottom || initialLoad) this.scrollToBottom();
      if (historyAdded) this.setState({ isLoading: false, initialLoad: false });
    }
  }

  componentWillUnmount() {
    this.node.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
  }

  handleLoadMore = () => {
    const { dispatch, chatId, chatMessages } = this.props;
    const maxId = chatMessages.getIn([0, 'id']);
    dispatch(fetchChatMessages(chatId, maxId));
    this.setState({ isLoading: true });
  }

  handleScroll = throttle(() => {
    const { lastComputedScroll } = this;
    const { isLoading, initialLoad } = this.state;
    const { scrollTop, offsetHeight } = this.node;
    const computedScroll = lastComputedScroll === scrollTop;
    const nearTop = scrollTop < offsetHeight * 2;

    if (nearTop && !isLoading && !initialLoad && !computedScroll)
      this.handleLoadMore();
  }, 150, {
    trailing: true,
  });

  onOpenMedia = (media, index) => {
    this.props.dispatch(openModal('MEDIA', { media, index }));
  };

  maybeRenderMedia = chatMessage => {
    const attachment = chatMessage.get('attachment');
    if (!attachment) return null;
    return (
      <div className='chat-message__media'>
        <Bundle fetchComponent={MediaGallery}>
          {Component => (
            <Component
              media={ImmutableList([attachment])}
              height={120}
              onOpenMedia={this.onOpenMedia}
            />
          )}
        </Bundle>
      </div>
    );
  }

  parsePendingContent = content => {
    return escape(content).replace(/(?:\r\n|\r|\n)/g, '<br>');
  }

  parseContent = chatMessage => {
    const content = chatMessage.get('content') || '';
    const pending = chatMessage.get('pending', false);
    const deleting = chatMessage.get('deleting', false);
    const formatted = (pending && !deleting) ? this.parsePendingContent(content) : content;
    const emojiMap = makeEmojiMap(chatMessage);
    return emojify(formatted, emojiMap.toJS());
  }

  setRef = (c) => {
    this.node = c;
  }

  renderDivider = (key, text) => (
    <div className='chat-messages__divider' key={key}>{text}</div>
  )

  handleDeleteMessage = (chatId, messageId) => {
    return () => {
      this.props.dispatch(deleteChatMessage(chatId, messageId));
    };
  }

  handleReportUser = (userId) => {
    return () => {
      this.props.dispatch(initReportById(userId));
    };
  }

  decryptMessage = async(chatMessage) => {
    const { account } = this.props;
    const content = unescapeHTML(chatMessage.content);

    const keys = await getPgpKey(account.fqn);
    const recipientKeys = await getPgpKey(chatMessage.account_id);

    const publicKey = await readKey({ armoredKey: recipientKeys.publicKey });
    const privateKey = await readKey({ armoredKey: keys.privateKey });
    const message = await readMessage({ armoredMessage: content });

    const { data: decrypted } = await decrypt({
      message,
      verificationKeys: publicKey,
      decryptionKeys: privateKey,
    });

    this.setState({ decryptedMessages: { ...this.state.decryptedMessages, [chatMessage.id]: decrypted } });
  }

  renderDecryptedMessage = (chatMessage) => {
    const decryptedContent = this.state.decryptedMessages[chatMessage.id];

    if (!decryptedContent) {
      this.decryptMessage(chatMessage);
    }

    const newMessage = chatMessage.set('content', decryptedContent || '...');
    return this.renderMessage(newMessage, true);
  }

  renderEncryptedMessage = (chatMessage) => {
    const { me } = this.props;

    if (isPgpEncryptedMessage(unescapeHTML(chatMessage.content))) {
      return this.renderDecryptedMessage(chatMessage);
    }

    return (
      <div
        className={classNames('chat-message', {
          'chat-message--me': chatMessage.get('account_id') === me,
          'chat-message--pending': chatMessage.get('pending', false) === true,
        })}
        key={chatMessage.get('id')}
      >
        <div
          title={this.getFormattedTimestamp(chatMessage)}
          className='chat-message__bubble'
          ref={this.setBubbleRef}
          tabIndex={0}
        >
          <HStack space={1} alignItems='center'>
            <Icon size={14} src={require('@tabler/icons/icons/info-circle.svg')} />
            <Text size='xs' className='italic'>
              Encrypted message
            </Text>
          </HStack>
        </div>
      </div>
    );
  }

  renderMessage = (chatMessage, encrypted = false) => {
    const { me, intl } = this.props;
    const menu = [
      {
        text: intl.formatMessage(messages.delete),
        action: this.handleDeleteMessage(chatMessage.get('chat_id'), chatMessage.get('id')),
        icon: require('@tabler/icons/icons/trash.svg'),
        destructive: true,
      },
    ];

    if (chatMessage.get('account_id') !== me) {
      menu.push({
        text: intl.formatMessage(messages.report),
        action: this.handleReportUser(chatMessage.get('account_id')),
        icon: require('@tabler/icons/icons/flag.svg'),
      });
    }

    return (
      <div
        className={classNames('chat-message', {
          'chat-message--me': chatMessage.get('account_id') === me,
          'chat-message--pending': chatMessage.get('pending', false) === true,
        })}
        key={chatMessage.get('id')}
      >
        <div
          title={this.getFormattedTimestamp(chatMessage)}
          className='chat-message__bubble'
          ref={this.setBubbleRef}
          tabIndex={0}
        >
          {this.maybeRenderMedia(chatMessage)}

          <Text size='sm' dangerouslySetInnerHTML={{ __html: this.parseContent(chatMessage) }} />

          {encrypted && (
            <Icon size={14} src={require('@tabler/icons/icons/lock.svg')} />
          )}

          <div className='chat-message__menu'>
            <DropdownMenuContainer
              items={menu}
              src={require('@tabler/icons/icons/dots.svg')}
              direction='top'
              title={intl.formatMessage(messages.more)}
            />
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { chatMessages, intl } = this.props;

    return (
      <div className='chat-messages' ref={this.setRef}>
        {chatMessages.reduce((acc, curr, idx) => {
          const lastMessage = chatMessages.get(idx - 1);

          if (lastMessage) {
            const key = `${curr.get('id')}_divider`;
            switch (timeChange(lastMessage, curr)) {
              case 'today':
                acc.push(this.renderDivider(key, intl.formatMessage(messages.today)));
                break;
              case 'date':
                acc.push(this.renderDivider(key, new Date(curr.get('created_at')).toDateString()));
                break;
            }
          }

          if (isPgpMessage(curr.get('content'))) {
            acc.push(this.renderEncryptedMessage(curr));
          } else {
            acc.push(this.renderMessage(curr));
          }

          return acc;
        }, [])}
        <div style={{ float: 'left', clear: 'both' }} ref={this.setMessageEndRef} />
      </div>
    );
  }

}
