import { Routes, Route } from 'react-router-dom';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useFileAutosave } from '@/hooks/useFileAutosave';
import { useRemoteUpdates } from '@/hooks/useRemoteUpdates';
import { StartupModals } from '@/components/StartupModals';
import { HomeScreen } from '@/screens/HomeScreen';
import { MatchupsScreen } from '@/screens/MatchupsScreen';
import { CombosScreen } from '@/screens/CombosScreen';
import { PlayersScreen } from '@/screens/PlayersScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { TeamNotesScreen } from '@/screens/TeamNotesScreen';
import { KofiFloatStack } from '@/components/KofiFloatStack';
import { DevDebugOverlay } from '@/components/DevDebugOverlay';

export default function App() {
  useAnnouncements();
  useFileAutosave();
  useRemoteUpdates();

  return (
    <>
      <StartupModals />
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
    </>
  );
}
