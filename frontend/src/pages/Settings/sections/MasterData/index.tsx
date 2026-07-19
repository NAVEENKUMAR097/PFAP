import { useState } from 'react';
import Categories from './Categories';
import PaymentMethods from './PaymentMethods';
import Accounts from './Accounts';
import IncomeSources from './IncomeSources';
import InvestmentTypes from './InvestmentTypes';
import People from './People';

const TABS = ['Categories', 'Accounts', 'Payment Methods', 'Income Sources', 'Investment Types', 'People'] as const;

export default function MasterDataSection() {
  const [active, setActive] = useState<(typeof TABS)[number]>('Categories');

  return (
    <div>
      <h2 className="font-display text-xl font-medium text-ink mb-1">Master Data</h2>
      <p className="text-sm text-muted mb-6">Manage categories, accounts, payment methods, income sources, investment types, and people.</p>

      <div>
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
                active === t
                  ? 'bg-gold/10 text-gold font-medium'
                  : 'text-muted hover:bg-surface-2'
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div>
          {active === 'Categories' && <Categories />}
          {active === 'Accounts' && <Accounts />}
          {active === 'Payment Methods' && <PaymentMethods />}
          {active === 'Income Sources' && <IncomeSources />}
          {active === 'Investment Types' && <InvestmentTypes />}
          {active === 'People' && <People />}
        </div>
      </div>
    </div>
  );
}