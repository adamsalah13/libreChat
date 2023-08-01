import axios from 'axios';
import { useEffect, useState } from 'react';
import EndpointSettings from './EndpointSettings';
import exportFromJSON from 'export-from-json';
import { Examples, AgentSettings } from './Settings';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import filenamify from 'filenamify';
import {
  MessagesSquared,
  GPTIcon,
  Input,
  Label,
  Button,
  Dropdown,
  Dialog,
  DialogClose,
  DialogButton,
} from '~/components/';
import DialogTemplate from '~/components/ui/DialogTemplate';
import { cn, defaultTextProps } from '~/utils/';
import cleanupPreset from '~/utils/cleanupPreset';
import { localize } from '~/localization/Translation';

import store from '~/store';

const EditPresetDialog = ({ open, onOpenChange, preset: _preset, title }) => {
  const lang = useRecoilValue(store.lang);
  const [preset, setPreset] = useState(_preset);
  const setPresets = useSetRecoilState(store.presets);
  const [showExamples, setShowExamples] = useState(false);
  const [showAgentSettings, setShowAgentSettings] = useState(false);

  const availableEndpoints = useRecoilValue(store.availableEndpoints);
  const endpointsConfig = useRecoilValue(store.endpointsConfig);

  const triggerExamples = () => setShowExamples((prev) => !prev);
  const triggerAgentSettings = () => setShowAgentSettings((prev) => !prev);

  const setOption = (param) => (newValue) => {
    let update = {};
    update[param] = newValue;
    setPreset((prevState) =>
      cleanupPreset({
        preset: {
          ...prevState,
          ...update,
        },
        endpointsConfig,
      }),
    );
  };

  const setAgentOption = (param) => (newValue) => {
    let editablePreset = JSON.stringify(_preset);
    editablePreset = JSON.parse(editablePreset);
    let { agentOptions } = editablePreset;
    agentOptions[param] = newValue;
    setPreset((prevState) =>
      cleanupPreset({
        preset: {
          ...prevState,
          agentOptions,
        },
        endpointsConfig,
      }),
    );
  };

  const setExample = (i, type, newValue = null) => {
    let update = {};
    let current = preset?.examples.slice() || [];
    let currentExample = { ...current[i] } || {};
    currentExample[type] = { content: newValue };
    current[i] = currentExample;
    update.examples = current;
    setPreset((prevState) =>
      cleanupPreset({
        preset: {
          ...prevState,
          ...update,
        },
        endpointsConfig,
      }),
    );
  };

  const addExample = () => {
    let update = {};
    let current = preset?.examples.slice() || [];
    current.push({ input: { content: '' }, output: { content: '' } });
    update.examples = current;
    setPreset((prevState) =>
      cleanupPreset({
        preset: {
          ...prevState,
          ...update,
        },
        endpointsConfig,
      }),
    );
  };

  const removeExample = () => {
    let update = {};
    let current = preset?.examples.slice() || [];
    if (current.length <= 1) {
      update.examples = [{ input: { content: '' }, output: { content: '' } }];
      setPreset((prevState) =>
        cleanupPreset({
          preset: {
            ...prevState,
            ...update,
          },
          endpointsConfig,
        }),
      );
      return;
    }
    current.pop();
    update.examples = current;
    setPreset((prevState) =>
      cleanupPreset({
        preset: {
          ...prevState,
          ...update,
        },
        endpointsConfig,
      }),
    );
  };

  const submitPreset = () => {
    axios({
      method: 'post',
      url: '/api/presets',
      data: cleanupPreset({ preset, endpointsConfig }),
      withCredentials: true,
    }).then((res) => {
      setPresets(res?.data);
    });
  };

  const exportPreset = () => {
    const fileName = filenamify(preset?.title || 'preset');
    exportFromJSON({
      data: cleanupPreset({ preset, endpointsConfig }),
      fileName,
      exportType: exportFromJSON.types.json,
    });
  };

  useEffect(() => {
    setPreset(_preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const endpoint = preset?.endpoint;
  const isGoogle = endpoint === 'google';
  const isGptPlugins = endpoint === 'gptPlugins';
  const shouldShowSettings =
    (isGoogle && !showExamples) ||
    (isGptPlugins && !showAgentSettings) ||
    (!isGoogle && !isGptPlugins);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTemplate
        title={`${title || localize(lang, 'com_endpoint_edit_preset')} - ${preset?.title}`}
        className="h-[675px] max-w-full"
        main={
          <div className="flex w-full flex-col items-center gap-2 md:h-[475px]">
            <div className="grid w-full gap-6 sm:grid-cols-2">
              <div className="col-span-1 flex flex-col items-start justify-start gap-2">
                <Label htmlFor="chatGptLabel" className="text-left text-sm font-medium">
                  {localize(lang, 'com_endpoint_preset_name')}
                </Label>
                <Input
                  id="chatGptLabel"
                  value={preset?.title || ''}
                  onChange={(e) => setOption('title')(e.target.value || '')}
                  placeholder={localize(lang, 'com_endpoint_set_custom_name')}
                  className={cn(
                    defaultTextProps,
                    'flex h-10 max-h-10 w-full resize-none px-3 py-2 focus:outline-none focus:ring-0 focus:ring-opacity-0 focus:ring-offset-0',
                  )}
                />
              </div>
              <div className="col-span-1 flex flex-col items-start justify-start gap-2">
                <Label htmlFor="endpoint" className="text-left text-sm font-medium">
                  {localize(lang, 'com_endpoint')}
                </Label>
                <Dropdown
                  id="endpoint"
                  value={preset?.endpoint || ''}
                  onChange={setOption('endpoint')}
                  options={availableEndpoints}
                  className={cn(
                    defaultTextProps,
                    'flex h-10 max-h-10 w-full resize-none focus:outline-none focus:ring-0 focus:ring-opacity-0 focus:ring-offset-0',
                  )}
                  containerClassName="flex w-full resize-none"
                />
                {preset?.endpoint === 'google' && (
                  <Button
                    type="button"
                    className="ml-1 flex h-auto w-full bg-transparent px-2 py-1 text-xs font-medium font-normal text-black hover:bg-slate-200 hover:text-black focus:ring-0 focus:ring-offset-0 dark:bg-transparent dark:text-white dark:hover:bg-gray-700 dark:hover:text-white dark:focus:outline-none dark:focus:ring-offset-0"
                    onClick={triggerExamples}
                  >
                    <MessagesSquared className="mr-1 w-[14px]" />
                    {(showExamples
                      ? localize(lang, 'com_endpoint_hide')
                      : localize(lang, 'com_endpoint_show')) +
                      localize(lang, 'com_endpoint_examples')}
                  </Button>
                )}
                {preset?.endpoint === 'gptPlugins' && (
                  <Button
                    type="button"
                    className="ml-1 flex h-auto w-full bg-transparent px-2 py-1 text-xs font-medium font-normal text-black hover:bg-slate-200 hover:text-black focus:ring-0 focus:ring-offset-0 dark:bg-transparent dark:text-white dark:hover:bg-gray-700 dark:hover:text-white dark:focus:outline-none dark:focus:ring-offset-0"
                    onClick={triggerAgentSettings}
                  >
                    <GPTIcon className="mr-1 mt-[2px] w-[14px]" size={14} />
                    {`Show ${showAgentSettings ? 'Completion' : 'Agent'} Settings`}
                    {localize(
                      lang,
                      'com_endpoint_show_what_settings',
                      showAgentSettings
                        ? localize(lang, 'com_endpoint_completion')
                        : localize(lang, 'com_endpoint_agent'),
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div className="my-4 w-full border-t border-gray-300 dark:border-gray-500" />
            <div className="w-full p-0">
              {shouldShowSettings && <EndpointSettings preset={preset} setOption={setOption} />}
              {preset?.endpoint === 'google' &&
                showExamples &&
                !preset?.model?.startsWith('codechat-') && (
                <Examples
                  examples={preset.examples}
                  setExample={setExample}
                  addExample={addExample}
                  removeExample={removeExample}
                  edit={true}
                />
              )}
              {preset?.endpoint === 'gptPlugins' && showAgentSettings && (
                <AgentSettings
                  agent={preset.agentOptions.agent}
                  skipCompletion={preset.agentOptions.skipCompletion}
                  model={preset.agentOptions.model}
                  endpoint={preset.agentOptions.endpoint}
                  temperature={preset.agentOptions.temperature}
                  topP={preset.agentOptions.top_p}
                  freqP={preset.agentOptions.presence_penalty}
                  presP={preset.agentOptions.frequency_penalty}
                  setOption={setAgentOption}
                  tools={preset.tools}
                />
              )}
            </div>
          </div>
        }
        buttons={
          <>
            <DialogButton onClick={exportPreset} className="dark:hover:gray-400 border-gray-700">
              {localize(lang, 'com_endpoint_export')}
            </DialogButton>
            <DialogClose
              onClick={submitPreset}
              className="dark:hover:gray-400 border-gray-700 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800"
            >
              {localize(lang, 'com_endpoint_save')}
            </DialogClose>
          </>
        }
      />
    </Dialog>
  );
};

export default EditPresetDialog;
