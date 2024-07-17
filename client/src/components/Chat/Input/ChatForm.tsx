import { memo, useRef, useMemo } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  supportsFiles,
  mergeFileConfig,
  isAssistantsEndpoint,
  fileConfig as defaultFileConfig,
} from 'librechat-data-provider';
import {
  useChatContext,
  useAddedChatContext,
  useAssistantsMapContext,
  useChatFormContext,
} from '~/Providers';
import {
  useTextarea,
  useAutoSave,
  useRequiresKey,
  useHandleKeyUp,
  useSubmitMessage,
} from '~/hooks';
import { TextareaAutosize } from '~/components/ui';
import { useGetFileConfig } from '~/data-provider';
import { cn, removeFocusRings } from '~/utils';
import TextareaHeader from './TextareaHeader';
import PromptsCommand from './PromptsCommand';
import AttachFile from './Files/AttachFile';
import AudioRecorder from './AudioRecorder';
import { mainTextareaId } from '~/common';
import StreamAudio from './StreamAudio';
import StopButton from './StopButton';
import SendButton from './SendButton';
import FileRow from './Files/FileRow';
import Mention from './Mention';
import store from '~/store';
import CallOverlay from './CallOverlay';

const ChatForm = ({ index = 0 }) => {
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const SpeechToText = useRecoilState<boolean>(store.speechToText);
  const TextToSpeech = useRecoilState<boolean>(store.textToSpeech);
  const automaticPlayback = useRecoilValue(store.automaticPlayback);

  const [showStopButton, setShowStopButton] = useRecoilState(store.showStopButtonByIndex(index));
  const [showPlusPopover, setShowPlusPopover] = useRecoilState(store.showPlusPopoverFamily(index));
  const [showMentionPopover, setShowMentionPopover] = useRecoilState(
    store.showMentionPopoverFamily(index),
  );

  const eventTarget = useMemo(() => new EventTarget(), []); // Use useMemo to create the EventTarget once

  const chatDirection = useRecoilValue(store.chatDirection).toLowerCase();
  const isRTL = chatDirection === 'rtl';

  const { requiresKey } = useRequiresKey();
  const handleKeyUp = useHandleKeyUp({
    index,
    textAreaRef,
    setShowPlusPopover,
    setShowMentionPopover,
  });
  const { handlePaste, handleKeyDown, handleCompositionStart, handleCompositionEnd } = useTextarea({
    textAreaRef,
    submitButtonRef,
    disabled: !!requiresKey,
  });

  const {
    files,
    setFiles,
    conversation,
    isSubmitting,
    filesLoading,
    setFilesLoading,
    newConversation,
    handleStopGenerating,
  } = useChatContext();
  const methods = useChatFormContext();
  const {
    addedIndex,
    generateConversation,
    conversation: addedConvo,
    setConversation: setAddedConvo,
    isSubmitting: isSubmittingAdded,
  } = useAddedChatContext();
  const showStopAdded = useRecoilValue(store.showStopButtonByIndex(addedIndex));

  const { clearDraft } = useAutoSave({
    conversationId: useMemo(() => conversation?.conversationId, [conversation]),
    textAreaRef,
    files,
    setFiles,
  });

  const assistantMap = useAssistantsMapContext();
  const { submitMessage, submitPrompt } = useSubmitMessage({ clearDraft });

  const [showCallOverlay, setShowCallOverlay] = useRecoilState(store.showCallOverlay);

  const { endpoint: _endpoint, endpointType } = conversation ?? { endpoint: null };
  const endpoint = endpointType ?? _endpoint;

  const { data: fileConfig = defaultFileConfig } = useGetFileConfig({
    select: (data) => mergeFileConfig(data),
  });

  const endpointFileConfig = fileConfig.endpoints[endpoint ?? ''];
  const invalidAssistant = useMemo(
    () =>
      isAssistantsEndpoint(conversation?.endpoint) &&
      (!conversation?.assistant_id ||
        !assistantMap?.[conversation?.endpoint ?? '']?.[conversation?.assistant_id ?? '']),
    [conversation?.assistant_id, conversation?.endpoint, assistantMap],
  );
  const disableInputs = useMemo(
    () => !!(requiresKey || invalidAssistant),
    [requiresKey, invalidAssistant],
  );

  const { ref, ...registerProps } = methods.register('text', {
    required: true,
    onChange: (e) => {
      methods.setValue('text', e.target.value, { shouldValidate: true });
    },
  });

  const openCallOverlay = () => {
    setShowCallOverlay(true);
  };

  return (
    <form
      onSubmit={methods.handleSubmit((data) => submitMessage(data))}
      className="stretch mx-2 flex flex-row gap-3 last:mb-2 md:mx-4 md:last:mb-6 lg:mx-auto lg:max-w-2xl xl:max-w-3xl"
    >
      <div className="relative flex h-full flex-1 items-stretch md:flex-col">
        <div className="flex w-full items-center">
          {showPlusPopover && !isAssistantsEndpoint(endpoint) && (
            <Mention
              setShowMentionPopover={setShowPlusPopover}
              newConversation={generateConversation}
              textAreaRef={textAreaRef}
              commandChar="+"
              placeholder="com_ui_add"
              includeAssistants={false}
            />
          )}
          {showMentionPopover && (
            <Mention
              setShowMentionPopover={setShowMentionPopover}
              newConversation={newConversation}
              textAreaRef={textAreaRef}
            />
          )}
          <PromptsCommand index={index} textAreaRef={textAreaRef} submitPrompt={submitPrompt} />
          <div className="bg-token-main-surface-primary relative flex w-full flex-grow flex-col overflow-hidden rounded-2xl border dark:border-gray-600 dark:text-white [&:has(textarea:focus)]:border-gray-300 [&:has(textarea:focus)]:shadow-[0_2px_6px_rgba(0,0,0,.05)] dark:[&:has(textarea:focus)]:border-gray-500">
            <TextareaHeader addedConvo={addedConvo} setAddedConvo={setAddedConvo} />
            <FileRow
              files={files}
              setFiles={setFiles}
              setFilesLoading={setFilesLoading}
              isRTL={isRTL}
              Wrapper={({ children }) => (
                <div className="mx-2 mt-2 flex flex-wrap gap-2 px-2.5 md:pl-0 md:pr-4">
                  {children}
                </div>
              )}
            />
            {endpoint && (
              <TextareaAutosize
                {...registerProps}
                autoFocus
                ref={(e) => {
                  ref(e);
                  textAreaRef.current = e;
                }}
                disabled={disableInputs}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                id={mainTextareaId}
                tabIndex={0}
                data-testid="text-input"
                style={{ height: 44, overflowY: 'auto' }}
                rows={1}
                className={cn(
                  supportsFiles[endpointType ?? endpoint ?? ''] && !endpointFileConfig?.disabled
                    ? ' pl-10 md:pl-[55px]'
                    : 'pl-3 md:pl-4',
                  'm-0 w-full resize-none border-0 bg-transparent py-[10px] placeholder-black/50 focus:ring-0 focus-visible:ring-0 dark:bg-transparent dark:placeholder-white/50 md:py-3.5  ',
                  SpeechToText && !isRTL ? 'pr-20 md:pr-[85px]' : 'pr-10 md:pr-12',
                  'max-h-[65vh] md:max-h-[75vh]',
                  removeFocusRings,
                )}
              />
            )}
            <CallOverlay
              eventTarget={eventTarget}
              showCallOverlay={showCallOverlay}
              disableInputs={disableInputs}
              textAreaRef={textAreaRef}
              methods={methods}
              index={index}
              automaticPlayback={automaticPlayback}
              ask={submitMessage}
            />

            <button
              onClick={openCallOverlay}
              className="absolute bottom-1.5 right-20 flex h-[30px] w-[30px] items-center justify-center rounded-lg p-0.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 md:bottom-3 md:right-20"
              type="button"
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="0"
                stroke="currentColor"
                className="size-10"
              >
                <path
                  fillRule="evenodd"
                  d="M12 5a7 7 0 0 0-7 7v1.17c.313-.11.65-.17 1-.17h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a3 3 0 0 1-3-3v-6a9 9 0 0 1 18 0v6a3 3 0 0 1-3 3h-2a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h2c.35 0 .687.06 1 .17V12a7 7 0 0 0-7-7Z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
            <AttachFile
              endpoint={_endpoint ?? ''}
              endpointType={endpointType}
              isRTL={isRTL}
              disabled={disableInputs}
            />
            {(isSubmitting || isSubmittingAdded) && (showStopButton || showStopAdded) ? (
              <StopButton
                stop={handleStopGenerating}
                setShowStopButton={setShowStopButton}
                isRTL={isRTL}
              />
            ) : (
              endpoint && (
                <SendButton
                  ref={submitButtonRef}
                  control={methods.control}
                  isRTL={isRTL}
                  disabled={!!(filesLoading || isSubmitting || disableInputs)}
                />
              )
            )}
            {SpeechToText && (
              <AudioRecorder
                disabled={!!disableInputs}
                textAreaRef={textAreaRef}
                ask={submitMessage}
                isRTL={isRTL}
                methods={methods}
              />
            )}
            {TextToSpeech && automaticPlayback && <StreamAudio index={index} />}
          </div>
        </div>
      </div>
    </form>
  );
};

export default memo(ChatForm);
