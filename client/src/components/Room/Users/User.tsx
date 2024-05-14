import { TUser } from 'librechat-data-provider';
import React from 'react';
import useAvatar from '~/hooks/Messages/useAvatar';
import UserKickButton from './UserKickButton';
import { useChatContext } from '~/Providers';
import { useRecoilValue } from 'recoil';
import store from '~/store';
import TipModal from './TipModal';

export default function User({
  user,
  isCollapsed = false,
}: {
  user: TUser;
  isCollapsed?: boolean;
}) {
  const { conversation } = useChatContext();
  const activeConvo = false;
  const avatarSrc = useAvatar(user);
  const you = useRecoilValue(store.user);

  const aProps = {
    className: `group relative mt-1 flex cursor-pointer items-center gap-2 break-all rounded-lg bg-gray-200 ${
      isCollapsed ? 'px-0 py-0' : 'px-2 py-2'
    } active:opacity-50 dark:bg-gray-700 w-full flex justify-between`,
  };

  if (!activeConvo) {
    aProps.className =
      'group relative grow overflow-hidden whitespace-nowrap rounded-lg active:opacity-50 flex cursor-pointer items-center mt-2 gap-2 break-all rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 dark:text-white py-2 px-2';
  }

  return (
    <a data-testid="convo-item" {...aProps}>
      <div className="flex gap-3">
        <img
          src={user && user.avatar ? user.avatar : avatarSrc}
          alt={user.name}
          className="h-6 w-6 flex-shrink-0 rounded-full"
        />
        {!isCollapsed && user.name}
      </div>
      {!isCollapsed && you?.id === conversation?.user._id && you.id !== user._id && (
        <UserKickButton user={user} />
      )}
      {user.cryptocurrency &&
        user.cryptocurrency.length !== 0 &&
        !isCollapsed &&
        you?.id !== user?._id && <TipModal user={user} />}
    </a>
  );
}