import React from 'react';
import TickerSearch from '../components/settings/TickerSearch';
import PopularTickers from '../components/settings/PopularTickers';
import HoldingsEditor from '../components/settings/HoldingsEditor';
import AllocationEditor from '../components/settings/AllocationEditor';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">銘柄の追加</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">銘柄を検索して追加</h3>
            <TickerSearch />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">人気銘柄を追加</h3>
            <PopularTickers />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">保有資産の設定</h2>
        <HoldingsEditor />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">目標配分の設定</h2>
        <AllocationEditor />
      </div>
    </div>
  );
};

export default Settings;