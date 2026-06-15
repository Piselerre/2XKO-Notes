import { Routes, Route } from 'react-router-dom';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useFileAutosave } from '@/hooks/useFileAutosave';
import { useRemoteUpdates } from '@/hooks/useRemoteUpdates';
import { UpdateManagerProvider } from '@/hooks/useUpdateManager';
import { StartupModals } from '@/components/StartupModals';
import { BinaryUpdateNotice } from '@/components/BinaryUpdateNotice';
import { MobileNav } from '@/components/MobileNav';
import { HomeScreen } from '@/screens/HomeScreen';
import { MatchupsScreen } from '@/screens/MatchupsScreen';
import { CombosScreen } from '@/screens/CombosScreen';
import { PlayersScreen } from '@/screens/PlayersScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { TeamNotesScreen } from '@/screens/TeamNotesScreen';
import { KofiFloatStack } from '@/components/KofiFloatStack';
import { DevDebugOverlay } from '@/components/DevDebugOverlay';
import { useUiScale } from '@/hooks/useUiScale';

export default function App() {
  useAnnouncements();
  useFileAutosave();
  useRemoteUpdates();
  useUiScale();

  return (
    <UpdateManagerProvider>
      <StartupModals />
      <BinaryUpdateNotice />
      <MobileNav />
      <DevDebugOverlay />
      <KofiFloatStack />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/combos/*" element={<CombosScreen />} />
        <Route path="/matchups/*" element={<MatchupsScreen />} />
        <Route path="/players" element={<PlayersScreen />} />
        <Route path="/team-notes/*" element={<TeamNotesScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </UpdateManagerProvider>
  );
}
