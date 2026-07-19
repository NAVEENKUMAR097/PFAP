import { useState } from 'react';
import PageScaffold from '../../components/common/Pagescaffold';
import ProfileSection from './sections/Profile';
import MasterDataSection from './sections/MasterData';
import BackupSection from './sections/Backup';
import ExportSection from './sections/Export';
import ImportSection from './sections/Import';
import AnalyticsSection from './sections/Analytics';
import ApplicationSection from './sections/Application';
import DeveloperSection from './sections/Developer';
import DatabaseSection from './sections/Database';
import AboutSection from './sections/About';

const SECTIONS = [
  { id: 'Profile & Preferences', label: 'Profile' },
  { id: 'Master Data', label: 'Master Data' },
  { id: 'Backup & Restore', label: 'Backup' },
  { id: 'Export Center', label: 'Export' },
  { id: 'Import Center', label: 'Import' },
  { id: 'Analytics Settings', label: 'Analytics' },
  { id: 'Application Settings', label: 'App' },
  { id: 'Developer Tools', label: 'Developer' },
  { id: 'Database', label: 'Database' },
  { id: 'About PFAP', label: 'About' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('Master Data');

  return (
    <PageScaffold title="Settings">
      <div className="mt-4 flex flex-col gap-6">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                s.id === active
                  ? 'bg-gold/10 text-gold font-medium'
                  : 'text-muted hover:bg-surface-2'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div>
          {active === 'Profile & Preferences' && <ProfileSection />}
          {active === 'Master Data' && <MasterDataSection />}
          {active === 'Backup & Restore' && <BackupSection />}
          {active === 'Export Center' && <ExportSection />}
          {active === 'Import Center' && <ImportSection />}
          {active === 'Analytics Settings' && <AnalyticsSection />}
          {active === 'Application Settings' && <ApplicationSection />}
          {active === 'Developer Tools' && <DeveloperSection />}
          {active === 'Database' && <DatabaseSection />}
          {active === 'About PFAP' && <AboutSection />}

        </div>
      </div>
    </PageScaffold>
  );
}