import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { CryptoAddress, CryptoId, SettingsTabValues, request } from 'librechat-data-provider';
import { Button, Input } from '~/components/ui';
import { BlockchainNetwork, blockchainNetworks } from './Blockchain';
import { useAuthContext, useToast } from '~/hooks';
import { useSetRecoilState } from 'recoil';
import store from '~/store';
import NetworkSelect from './NetworkSelect';
import { XIcon } from 'lucide-react';

const CryptoInput = ({
  item,
  value,
  setValue,
  clearCrypto,
}: {
  item: BlockchainNetwork;
  value: string;
  setValue: (v: string) => void;
  clearCrypto: () => void;
}) => {
  return (
    <div className="flex w-full items-center justify-start gap-1">
      {item.icon}
      <Input
        placeholder={item.placeholder}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
      />
      <button className="rounded-full bg-gray-300 p-1 hover:bg-gray-500" onClick={clearCrypto}>
        <XIcon size={10} className="text-white" />
      </button>
    </div>
  );
};

export default function Crypto() {
  const { showToast } = useToast();
  const { user } = useAuthContext();
  const setUser = useSetRecoilState(store.user);

  const initialCryptoState: CryptoAddress[] = [
    { id: CryptoId.BTC, address: '' },
    { id: CryptoId.ETH, address: '' },
  ];

  const [crypto, setCrypto] = useState<CryptoAddress[]>([]);
  useEffect(() => {
    setCrypto(user?.cryptocurrency ? user.cryptocurrency : []);
  }, [user]);

  console.log(crypto, user);

  const handleSave = () => {
    request
      .post('/api/user/crypto', { cryptocurrency: crypto })
      .then((res) => {
        showToast({ message: 'Successfully saved!', status: 'success' });
        setUser(
          user
            ? { ...user, cryptocurrency: res.cryptocurrency as Array<CryptoAddress> }
            : undefined,
        );
      })
      .then((error) => {
        console.error(error);
      });
  };

  return (
    <Tabs.Content
      value={SettingsTabValues.CRYPTO}
      role="tabpanel"
      className="w-full outline-none md:min-h-[300px]"
    >
      <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-50">
        <div className="flex justify-between border-b pb-3 last-of-type:border-b-0 dark:border-gray-700">
          Please Add your crypto wallet address by networks
          <NetworkSelect networks={crypto} />
        </div>
        <div className="flex w-full flex-col items-center justify-between gap-2 border-b pb-3 dark:border-gray-700">
          {crypto
            .filter((item) =>
              user ? user.cryptocurrency.filter((i) => i.id === item.id).length !== 0 : false,
            )
            .map((item) => (
              <CryptoInput
                item={blockchainNetworks.filter((i) => i.id === item.id)[0]}
                key={item.id}
                value={
                  crypto.filter((i) => i.id === item.id)[0]
                    ? crypto.filter((i) => i.id === item.id)[0].address
                    : initialCryptoState.filter((i) => i.id === item.id)[0].address
                }
                setValue={(value) =>
                  setCrypto([
                    ...crypto.filter((i) => i.id !== item.id),
                    { id: item.id, address: value },
                  ])
                }
                clearCrypto={() => setCrypto(crypto.filter((i) => i.id !== item.id))}
              />
            ))}
        </div>
      </div>
      <div className="mt-3 flex justify-end border-b pb-3 last-of-type:border-b-0 dark:border-gray-700">
        <Button className="bg-green-400 transition hover:bg-green-600" onClick={handleSave}>
          Save
        </Button>
      </div>
    </Tabs.Content>
  );
}
