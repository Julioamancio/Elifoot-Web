import React, { useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { StartScreen } from './components/StartScreen';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Squad } from './components/Squad';
import { Standings } from './components/Standings';
import { MatchDay } from './components/MatchDay';
import { Market } from './components/Market';
import { Club } from './components/Club';
import { Ranking } from './components/Ranking';
import { PlayerDashboard } from './components/PlayerDashboard';
import { CalendarView } from './components/CalendarView';

export default function App() {
  const { userTeamId, gameMode, startNewGame } = useGameStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!userTeamId) {
    return <StartScreen onStart={startNewGame} />;
  }

  const renderContent = () => {
    if (gameMode === 'player' && activeTab === 'dashboard') {
      return <PlayerDashboard />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'squad':
        return <Squad />;
      case 'calendar':
        return <CalendarView />;
      case 'market':
        return <Market />;
      case 'club':
        return <Club />;
      case 'standings':
        return <Standings />;
      case 'ranking':
        return <Ranking />;
      case 'match':
        return <MatchDay />;
      default:
        return gameMode === 'player' ? <PlayerDashboard /> : <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
