import React, { useCallback } from 'react';
import { useMessageProcess, useMessageActions } from '~/hooks';
import type { TMessage } from 'librechat-data-provider';
import type { TMessageProps } from '~/common';
import Icon from '~/components/Chat/Messages/MessageIcon';
import { Plugin } from '~/components/Messages/Content';
import MessageContent from './Content/MessageContent';
import SiblingSwitch from './SiblingSwitch';
// eslint-disable-next-line import/no-cycle
import MultiMessage from './MultiMessage';
import HoverButtons from './HoverButtons';
import SubRow from './SubRow';
import { cn } from '~/utils';

const MessageContainer = React.memo(
  ({ handleScroll, children }: { handleScroll: () => void; children: React.ReactNode }) => {
    return (
      <div
        className="text-token-text-primary w-full border-0 bg-transparent dark:border-0 dark:bg-transparent"
        onWheel={handleScroll}
        onTouchMove={handleScroll}
      >
        {children}
      </div>
    );
  },
);

const MessageRender = React.memo(
  ({
    isCard,
    siblingIdx,
    siblingCount,
    message: msg,
    setSiblingIdx,
    currentEditId,
    isMultiMessage,
    setCurrentEditId,
  }: {
    message?: TMessage;
    isCard?: boolean;
    isMultiMessage?: boolean;
  } & Pick<
    TMessageProps,
    'currentEditId' | 'setCurrentEditId' | 'siblingIdx' | 'setSiblingIdx' | 'siblingCount'
  >) => {
    const {
      ask,
      edit,
      index,
      assistant,
      enterEdit,
      conversation,
      messageLabel,
      isSubmitting,
      latestMessage,
      handleContinue,
      copyToClipboard,
      regenerateMessage,
    } = useMessageActions({
      message: msg,
      currentEditId,
      isMultiMessage,
      setCurrentEditId,
    });

    const handleRegenerateMessage = useCallback(() => regenerateMessage(), [regenerateMessage]);
    const { children, isCreatedByUser, error, unfinished } = msg ?? {};
    const isLast = !children?.length;

    if (!msg) {
      return null;
    }
    return (
      <div
        className={cn(
          'final-completion group mx-auto flex flex-1 gap-3 text-base',
          isCard ? 'rounded-lg border border-border-medium bg-surface-primary-alt p-2 md:p-4' : '',
        )}
      >
        <div className="relative flex flex-shrink-0 flex-col items-end">
          <div>
            <div className="pt-0.5">
              <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full">
                <Icon message={msg} conversation={conversation} assistant={assistant} />
              </div>
            </div>
          </div>
        </div>
        <div
          className={cn('relative flex w-11/12 flex-col', msg?.isCreatedByUser ? '' : 'agent-turn')}
        >
          <div className="select-none font-semibold">{messageLabel}</div>
          <div className="flex-col gap-1 md:gap-3">
            <div className="flex max-w-full flex-grow flex-col gap-0">
              {msg?.plugin && <Plugin plugin={msg?.plugin} />}
              <MessageContent
                ask={ask}
                edit={edit}
                isLast={isLast}
                text={msg.text ?? ''}
                message={msg}
                enterEdit={enterEdit}
                error={!!error}
                isSubmitting={isSubmitting}
                unfinished={unfinished ?? false}
                isCreatedByUser={isCreatedByUser ?? true}
                siblingIdx={siblingIdx ?? 0}
                setSiblingIdx={setSiblingIdx ?? (() => ({}))}
              />
            </div>
          </div>
          {isLast && isSubmitting ? (
            <div className="mt-1 h-[27px] bg-transparent" />
          ) : (
            <SubRow classes="text-xs">
              <SiblingSwitch
                siblingIdx={siblingIdx}
                siblingCount={siblingCount}
                setSiblingIdx={setSiblingIdx}
              />
              <HoverButtons
                index={index}
                isEditing={edit}
                message={msg}
                enterEdit={enterEdit}
                isSubmitting={isSubmitting}
                conversation={conversation ?? null}
                regenerate={handleRegenerateMessage}
                copyToClipboard={copyToClipboard}
                handleContinue={handleContinue}
                latestMessage={latestMessage}
                isLast={isLast}
              />
            </SubRow>
          )}
        </div>
      </div>
    );
  },
);

export default function Message(props: TMessageProps) {
  const { showSibling, conversation, handleScroll, siblingMessage, latestMultiMessage } =
    useMessageProcess({ message: props.message });

  const { message, currentEditId, setCurrentEditId } = props;

  if (!message) {
    return null;
  }

  const { children, messageId = null } = message ?? {};

  return (
    <>
      <MessageContainer handleScroll={handleScroll}>
        {showSibling ? (
          <div className="m-auto my-2 flex justify-center p-4 py-2 text-base md:gap-6">
            <div className="flex w-full flex-row justify-between gap-1 md:max-w-5xl lg:max-w-5xl xl:max-w-6xl">
              <MessageRender {...props} message={message} isCard />
              <MessageRender
                {...props}
                isMultiMessage
                isCard
                message={siblingMessage ?? latestMultiMessage ?? undefined}
              />
            </div>
          </div>
        ) : (
          <div className="m-auto justify-center p-4 py-2 text-base md:gap-6 ">
            <div className="final-completion group mx-auto flex flex-1 gap-3 text-base md:max-w-3xl md:px-5 lg:max-w-[40rem] lg:px-1 xl:max-w-[48rem] xl:px-5">
              <MessageRender {...props} />
            </div>
          </div>
        )}
      </MessageContainer>
      <MultiMessage
        key={messageId}
        messageId={messageId}
        conversation={conversation}
        messagesTree={children ?? []}
        currentEditId={currentEditId}
        setCurrentEditId={setCurrentEditId}
      />
    </>
  );
}
