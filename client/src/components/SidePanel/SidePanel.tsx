import throttle from 'lodash/throttle';
import { getConfigDefaults } from 'librechat-data-provider';
import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import {
  useGetEndpointsQuery,
  useGetStartupConfig,
  useUserKeyQuery,
} from 'librechat-data-provider/react-query';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import type { TEndpointsConfig } from 'librechat-data-provider';
import { ResizableHandleAlt, ResizablePanel, ResizablePanelGroup } from '~/components/ui/Resizable';
import { TooltipProvider, Tooltip } from '~/components/ui/Tooltip';
import useSideNavLinks from '~/hooks/Nav/useSideNavLinks';
import { useMediaQuery, useLocalStorage, useLocalize } from '~/hooks';
import NavToggle from '~/components/Nav/NavToggle';
import { useChatContext } from '~/Providers';
import Switcher from './Switcher';
import { cn } from '~/utils';
import Nav from './Nav';

interface SidePanelProps {
  defaultLayout?: number[] | undefined;
  defaultCollapsed?: boolean;
  navCollapsedSize?: number;
  fullPanelCollapse?: boolean;
  artifacts?: React.ReactNode;
  children: React.ReactNode;
}

const defaultMinSize = 20;
const defaultInterface = getConfigDefaults().interface;

const normalizeLayout = (layout: number[]) => {
  const sum = layout.reduce((acc, size) => acc + size, 0);
  if (Math.abs(sum - 100) < 0.01) {
    return layout.map((size) => Number(size.toFixed(2)));
  }

  const factor = 100 / sum;
  const normalizedLayout = layout.map((size) => Number((size * factor).toFixed(2)));

  const adjustedSum = normalizedLayout.reduce(
    (acc, size, index) => (index === layout.length - 1 ? acc : acc + size),
    0,
  );
  normalizedLayout[normalizedLayout.length - 1] = Number((100 - adjustedSum).toFixed(2));

  return normalizedLayout;
};

const SidePanel = ({
  defaultLayout = [97, 3],
  defaultCollapsed = false,
  fullPanelCollapse = false,
  navCollapsedSize = 3,
  artifacts,
  children,
}: SidePanelProps) => {
  const localize = useLocalize();
  const [isHovering, setIsHovering] = useState(false);
  const [minSize, setMinSize] = useState(defaultMinSize);
  const [newUser, setNewUser] = useLocalStorage('newUser', true);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [fullCollapse, setFullCollapse] = useState(fullPanelCollapse);
  const [collapsedSize, setCollapsedSize] = useState(navCollapsedSize);

  const { data: startupConfig } = useGetStartupConfig({
    cacheTime: 0,
    staleTime: 0,
  });

  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();
  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const isSmallScreen = useMediaQuery('(max-width: 767px)');
  const { conversation } = useChatContext();
  const { endpoint } = conversation ?? {};
  const { data: keyExpiry = { expiresAt: undefined } } = useUserKeyQuery(endpoint ?? '');

  const panelRef = useRef<ImperativePanelHandle>(null);

  const defaultActive = useMemo(() => {
    const activePanel = localStorage.getItem('side:active-panel');
    return typeof activePanel === 'string' ? activePanel : undefined;
  }, []);

  const assistants = useMemo(() => endpointsConfig?.[endpoint ?? ''], [endpoint, endpointsConfig]);
  const userProvidesKey = useMemo(
    () => !!(endpointsConfig?.[endpoint ?? '']?.userProvide ?? false),
    [endpointsConfig, endpoint],
  );
  const keyProvided = useMemo(
    () => (userProvidesKey ? !!(keyExpiry.expiresAt ?? '') : true),
    [keyExpiry.expiresAt, userProvidesKey],
  );

  const hidePanel = useCallback(() => {
    setIsCollapsed(true);
    setCollapsedSize(0);
    setMinSize(defaultMinSize);
    setFullCollapse(true);
    localStorage.setItem('fullPanelCollapse', 'true');
    panelRef.current?.collapse();
  }, []);

  const [showBookmarks, setShowBookmarks] = useState(false);

  const manageBookmarks = useCallback((e) => {
    e.preventDefault();
    setShowBookmarks((prev) => !prev);
  }, []);

  const Links = useSideNavLinks({
    startupConfig,
    hidePanel,
    assistants,
    keyProvided,
    endpoint,
    interfaceConfig,
  });

  const calculateLayout = useCallback(() => {
    if (!artifacts) {
      const navSize = defaultLayout.length === 2 ? defaultLayout[1] : defaultLayout[2];
      return [100 - navSize, navSize];
    } else {
      const navSize = Math.max(minSize, navCollapsedSize);
      const remainingSpace = 100 - navSize;
      const newMainSize = Math.floor(remainingSpace / 2);
      const artifactsSize = remainingSpace - newMainSize;
      return [newMainSize, artifactsSize, navSize];
    }
  }, [artifacts, defaultLayout, minSize, navCollapsedSize]);

  const currentLayout = useMemo(() => normalizeLayout(calculateLayout()), [calculateLayout]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledSaveLayout = useCallback(
    throttle((sizes: number[]) => {
      const normalizedSizes = normalizeLayout(sizes);
      localStorage.setItem('react-resizable-panels:layout', JSON.stringify(normalizedSizes));
    }, 350),
    [],
  );

  useEffect(() => {
    if (isSmallScreen) {
      setIsCollapsed(true);
      setCollapsedSize(0);
      setMinSize(defaultMinSize);
      setFullCollapse(true);
      localStorage.setItem('fullPanelCollapse', 'true');
      panelRef.current?.collapse();
      return;
    } else {
      setIsCollapsed(defaultCollapsed);
      setCollapsedSize(navCollapsedSize);
      setMinSize(defaultMinSize);
    }
  }, [isSmallScreen, defaultCollapsed, navCollapsedSize, fullPanelCollapse]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`/api/config?timestamp=${new Date().getTime()}`, {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const config = await response.json();
          localStorage.setItem(
            'userAssistantConfigPermission',
            '' + config.userAssistantConfigPermission,
          );
        } else {
          console.error('Error fetching config:', response.status);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };

    fetchConfig();
  }, [startupConfig]);

  const toggleNavVisible = useCallback(() => {
    if (newUser) {
      setNewUser(false);
    }
    setIsCollapsed((prev: boolean) => {
      if (prev) {
        setMinSize(defaultMinSize);
        setCollapsedSize(navCollapsedSize);
        setFullCollapse(false);
        localStorage.setItem('fullPanelCollapse', 'false');
      }
      return !prev;
    });
    if (!isCollapsed) {
      panelRef.current?.collapse();
    } else {
      panelRef.current?.expand();
    }
  }, [isCollapsed, newUser, setNewUser, navCollapsedSize]);

  const minSizeMain = useMemo(() => (artifacts != null ? 15 : 30), [artifacts]);

  return (
    <>
      <TooltipProvider delayDuration={0}>
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={(sizes) => throttledSaveLayout(sizes)}
          className="transition-width relative h-full w-full flex-1 overflow-auto bg-white dark:bg-gray-800"
        >
          <ResizablePanel
            defaultSize={currentLayout[0]}
            minSize={minSizeMain}
            order={1}
            id="messages-view"
          >
            {children}
          </ResizablePanel>
          {artifacts != null && (
            <>
              <ResizableHandleAlt withHandle className="ml-3 bg-border-medium dark:text-white" />
              <ResizablePanel
                defaultSize={currentLayout[1]}
                minSize={minSizeMain}
                order={2}
                id="artifacts-panel"
              >
                {artifacts}
              </ResizablePanel>
            </>
          )}
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <div
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="relative flex w-px items-center justify-center"
              >
                <NavToggle
                  navVisible={!isCollapsed}
                  isHovering={isHovering}
                  onToggle={toggleNavVisible}
                  setIsHovering={setIsHovering}
                  className={cn(
                    'fixed top-1/2',
                    (isCollapsed && (minSize === 0 || collapsedSize === 0)) || fullCollapse
                      ? 'mr-9'
                      : 'mr-16',
                  )}
                  translateX={false}
                  side="right"
                />
              </div>
            </Tooltip>
          </TooltipProvider>
          {(!isCollapsed || minSize > 0) && !isSmallScreen && !fullCollapse && (
            <ResizableHandleAlt withHandle className="bg-transparent dark:text-white" />
          )}
          <ResizablePanel
            tagName="nav"
            id="controls-nav"
            order={artifacts != null ? 3 : 2}
            aria-label={localize('com_ui_controls')}
            role="region"
            collapsedSize={collapsedSize}
            defaultSize={currentLayout[currentLayout.length - 1]}
            collapsible={true}
            minSize={minSize}
            maxSize={40}
            ref={panelRef}
            style={{
              overflowY: 'auto',
              transition: 'width 0.2s ease, visibility 0s linear 0.2s',
            }}
            onExpand={() => {
              setIsCollapsed(false);
              localStorage.setItem('react-resizable-panels:collapsed', 'false');
            }}
            onCollapse={() => {
              setIsCollapsed(true);
              localStorage.setItem('react-resizable-panels:collapsed', 'true');
            }}
            className={cn(
              'sidenav hide-scrollbar border-l border-border-light bg-surface-primary-alt transition-opacity',
              isCollapsed ? 'min-w-[50px]' : 'min-w-[340px] sm:min-w-[352px]',
              (isSmallScreen && isCollapsed && (minSize === 0 || collapsedSize === 0)) ||
                fullCollapse
                ? 'hidden min-w-0'
                : 'opacity-100',
            )}
          >
            {interfaceConfig.modelSelect && (
              <div
                className={cn(
                  'sticky left-0 right-0 top-0 z-[100] flex h-[52px] flex-wrap items-center justify-center bg-surface-primary-alt',
                  isCollapsed ? 'h-[52px]' : 'px-2',
                )}
              >
                <Switcher
                  isCollapsed={isCollapsed}
                  endpointKeyProvided={keyProvided}
                  endpoint={endpoint}
                />
              </div>
            )}
            <Nav
              resize={panelRef.current?.resize}
              isCollapsed={isCollapsed}
              defaultActive={defaultActive}
              links={Links}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </TooltipProvider>
      <button
        aria-label="Close right side panel"
        className={`nav-mask ${!isCollapsed ? 'active' : ''}`}
        onClick={() => {
          setIsCollapsed(() => {
            localStorage.setItem('fullPanelCollapse', 'true');
            setFullCollapse(true);
            setCollapsedSize(0);
            setMinSize(0);
            return false;
          });
          panelRef.current?.collapse();
        }}
      />
    </>
  );
};

export default memo(SidePanel);
