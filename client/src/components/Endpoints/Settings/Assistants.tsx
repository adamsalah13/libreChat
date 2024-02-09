import { useState, useMemo, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { TPreset, defaultOrderQuery } from 'librechat-data-provider';
import type { TModelSelectProps, Option } from '~/common';
import { Label, HoverCard, SelectDropDown, HoverCardTrigger } from '~/components/ui';
import { cn, defaultTextProps, removeFocusOutlines, mapAssistants } from '~/utils';
import { useListAssistantsQuery } from '~/data-provider';
import OptionHover from './OptionHover';
import { useLocalize } from '~/hooks';
import { ESide } from '~/common';

export default function Settings({ conversation, setOption, models, readonly }: TModelSelectProps) {
  const localize = useLocalize();
  const defaultOption = useMemo(
    () => ({ label: localize('com_endpoint_use_active_assistant'), value: '' }),
    [localize],
  );

  const { data: assistants = [] } = useListAssistantsQuery(defaultOrderQuery, {
    select: (res) =>
      [
        defaultOption,
        ...res.data.map(({ id, name }) => ({
          label: name,
          value: id,
        })),
      ].filter(Boolean),
  });

  const { data: assistantMap = {} } = useListAssistantsQuery(defaultOrderQuery, {
    select: (res) => mapAssistants(res.data),
  });

  const { model, endpoint, assistant_id, endpointType, promptPrefix } = conversation ?? {};

  const activeAssistant = useMemo(() => {
    if (assistant_id) {
      return assistantMap[assistant_id];
    }

    return null;
  }, [assistant_id, assistantMap]);

  const modelOptions = useMemo(() => {
    return models.map((model) => ({
      label:
        model === activeAssistant?.model
          ? `${model} (${localize('com_endpoint_assistant_model')})`
          : model,
      value: model,
    }));
  }, [models, activeAssistant, localize]);

  const [assistantValue, setAssistantValue] = useState<Option>(
    activeAssistant ? { label: activeAssistant.name, value: activeAssistant.id } : defaultOption,
  );

  useEffect(() => {
    if (assistantValue && assistantValue.value === '') {
      console.log('render check', assistantValue);
      setOption('presetOverride')({
        assistant_id: assistantValue.value,
      } as Partial<TPreset>);
    }

    // Reason: `setOption` causes a re-render on every update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantValue]);

  if (!conversation) {
    return null;
  }

  const setModel = setOption('model');
  const setPromptPrefix = setOption('promptPrefix');
  const setAssistant = (value: string) => {
    if (!value) {
      setAssistantValue(defaultOption);
      return;
    }

    const assistant = assistantMap[value];
    if (!assistant) {
      setAssistantValue(defaultOption);
      return;
    }

    setAssistantValue({
      label: assistant.name ?? '',
      value: assistant.id ?? '',
    });
    setOption('assistant_id')(assistant.id);
  };

  const optionEndpoint = endpointType ?? endpoint;

  return (
    <div className="grid grid-cols-6 gap-6">
      <div className="col-span-6 flex flex-col items-center justify-start gap-6 sm:col-span-3">
        <div className="grid w-full items-center gap-2">
          <SelectDropDown
            value={model ?? ''}
            setValue={setModel}
            availableValues={modelOptions}
            disabled={readonly}
            className={cn(defaultTextProps, 'flex w-full resize-none', removeFocusOutlines)}
            containerClassName="flex w-full resize-none"
          />
        </div>
      </div>
      <div className="col-span-6 flex flex-col items-center justify-start gap-6 px-3 sm:col-span-3">
        <HoverCard openDelay={300}>
          <HoverCardTrigger className="grid w-full items-center gap-2">
            <div className="grid w-full items-center gap-2">
              <SelectDropDown
                title={localize('com_endpoint_assistant')}
                value={assistantValue}
                setValue={setAssistant}
                availableValues={assistants as Option[]}
                disabled={readonly}
                className={cn(defaultTextProps, 'flex w-full resize-none', removeFocusOutlines)}
                containerClassName="flex w-full resize-none"
              />
            </div>
          </HoverCardTrigger>
          <OptionHover endpoint={optionEndpoint ?? ''} type="temp" side={ESide.Left} />
        </HoverCard>
      </div>
      <div className="col-span-6 flex flex-col items-center justify-start gap-6">
        <div className="grid w-full items-center gap-2">
          <Label htmlFor="promptPrefix" className="text-left text-sm font-medium">
            {localize('com_endpoint_prompt_prefix_assistants')}{' '}
            <small className="opacity-40">({localize('com_endpoint_default_blank')})</small>
          </Label>
          <TextareaAutosize
            id="promptPrefix"
            disabled={readonly}
            value={promptPrefix || ''}
            onChange={(e) => setPromptPrefix(e.target.value ?? null)}
            placeholder={localize('com_endpoint_prompt_prefix_assistants_placeholder')}
            className={cn(
              defaultTextProps,
              'dark:bg-gray-700 dark:hover:bg-gray-700/60 dark:focus:bg-gray-700',
              'flex max-h-[240px] min-h-[100px] w-full resize-none px-3 py-2 ',
            )}
          />
        </div>
      </div>
    </div>
  );
}
