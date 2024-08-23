import React, { useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import * as Tabs from '@radix-ui/react-tabs';
import { Sandpack } from '@codesandbox/sandpack-react';
import { SandpackPreview, SandpackProvider } from '@codesandbox/sandpack-react/unstyled';
import { sharedOptions, sharedFiles, sharedProps } from '~/utils/artifacts';
import store from '~/store';

export function CodeViewer({
  showEditor = false,
  content,
}: {
  showEditor?: boolean;
  content: string;
}) {
  const files = { '/App.js': content };

  if (Object.keys(files).length === 0) {
    return null;
  }

  return showEditor ? (
    <Sandpack
      options={{
        showNavigator: true,
        editorHeight: '80vh',
        showTabs: true,
        ...sharedOptions,
      }}
      files={{
        ...files,
        ...sharedFiles,
      }}
      {...sharedProps}
    />
  ) : (
    <SandpackProvider
      files={{
        ...files,
        ...sharedFiles,
      }}
      options={{ ...sharedOptions }}
      {...sharedProps}
    >
      <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton={false} />
    </SandpackProvider>
  );
}

export default function Artifacts() {
  const [activeTab, setActiveTab] = useState('code');
  const artifactIds = useRecoilValue(store.artifactIdsState);
  const artifacts = useRecoilValue(store.artifactsState);

  const [currentArtifactIndex, setCurrentArtifactIndex] = useState(artifactIds.length - 1);

  const currentArtifact = useMemo(() => {
    if (artifactIds.length === 0) {
      return null;
    }
    const currentId = artifactIds[currentArtifactIndex];
    return artifacts[currentId];
  }, [artifacts, artifactIds, currentArtifactIndex]);

  const cycleArtifact = (direction: 'next' | 'prev') => {
    setCurrentArtifactIndex((prevIndex) => {
      if (direction === 'next') {
        return (prevIndex + 1) % artifactIds.length;
      } else {
        return (prevIndex - 1 + artifactIds.length) % artifactIds.length;
      }
    });
  };

  if (!currentArtifact) {
    return <div>No artifacts available.</div>;
  }

  return (
    <div className="flex h-full w-full items-center justify-center py-2">
      <div className="bg-bg-000 flex h-[97%] w-[97%] flex-col overflow-hidden rounded-xl border border-border-medium text-xl text-text-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-medium bg-surface-primary-alt p-2">
          <div className="flex items-center">
            <button className="mr-2 text-text-secondary" onClick={() => cycleArtifact('prev')}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
              </svg>
            </button>
            <h3 className="font-tiempos truncate text-sm text-text-primary">
              {currentArtifact.title}
            </h3>
          </div>
          <div className="flex items-center">
            <div
              role="group"
              dir="ltr"
              className="mr-2 inline-flex rounded-full border border-border-medium bg-surface-tertiary py-1"
            >
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`border-0.5 flex items-center gap-1 rounded-full border-transparent py-1 pl-2.5 pr-2.5 text-xs font-medium text-text-secondary data-[state="on"]:border-border-light data-[state="on"]:bg-surface-primary-alt data-[state="on"]:text-text-primary ${
                  activeTab === 'preview' ? 'data-[state="on"]' : ''
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`border-0.5 flex items-center gap-1 rounded-full border-transparent py-1 pl-2.5 pr-2.5 text-xs font-medium text-text-secondary data-[state="on"]:border-border-light data-[state="on"]:bg-surface-primary-alt data-[state="on"]:text-text-primary ${
                  activeTab === 'code' ? 'data-[state="on"]' : ''
                }`}
              >
                Code
              </button>
            </div>
            <button className="text-text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-auto bg-surface-secondary">
          {activeTab === 'code' ? (
            <pre className="h-full w-full overflow-auto rounded bg-surface-primary-alt p-2 text-sm">
              <code>{currentArtifact.content}</code>
            </pre>
          ) : (
            <CodeViewer content={currentArtifact.content} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-medium bg-surface-primary-alt p-2 text-sm text-text-secondary">
          <div className="flex items-center">
            <button onClick={() => cycleArtifact('prev')} className="mr-2 text-text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z" />
              </svg>
            </button>
            <span className="text-xs">Last edited 7 hours ago</span>
            <button onClick={() => cycleArtifact('next')} className="ml-2 text-text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center">
            <button className="mr-2 text-text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M200,32H163.74a47.92,47.92,0,0,0-71.48,0H56A16,16,0,0,0,40,48V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm-72,0a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm72,184H56V48H82.75A47.93,47.93,0,0,0,80,64v8a8,8,0,0,0,8,8h80a8,8,0,0,0,8-8V64a47.93,47.93,0,0,0-2.75-16H200Z" />
              </svg>
            </button>
            <button className="mr-2 text-text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z" />
              </svg>
            </button>
            <button className="border-0.5 font-styrene text-text-primary/90 hover:text-text-000 min-w-[4rem] whitespace-nowrap rounded-md border-border-medium bg-[radial-gradient(ellipse,_var(--tw-gradient-stops))] from-surface-active from-50% to-surface-active px-3 py-1 text-xs font-medium transition-colors hover:bg-surface-active active:scale-[0.985] active:bg-surface-active">
              Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
