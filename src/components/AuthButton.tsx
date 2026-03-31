import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, Save, Download } from 'lucide-react';
import { auth, loginWithGoogle, logout, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useGameStore } from '../store/useGameStore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const AuthButton: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { teams, matches, currentWeek, userTeamId, isGameOver, setGameState } = useGameStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const path = `saves/${user.uid}`;
    try {
      const saveRef = doc(db, 'saves', user.uid);
      await setDoc(saveRef, {
        teams,
        matches,
        currentWeek,
        userTeamId,
        isGameOver,
        updatedAt: serverTimestamp(),
      });
      alert('Jogo salvo com sucesso!');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, path);
      } else {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar o jogo.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async () => {
    if (!user) return;
    setIsLoading(true);
    const path = `saves/${user.uid}`;
    try {
      const saveRef = doc(db, 'saves', user.uid);
      const saveSnap = await getDoc(saveRef);
      if (saveSnap.exists()) {
        const data = saveSnap.data();
        setGameState({
          teams: data.teams,
          matches: data.matches,
          currentWeek: data.currentWeek,
          userTeamId: data.userTeamId,
          isGameOver: data.isGameOver,
          userPlayerId: data.userPlayerId || null,
          gameMode: data.gameMode || 'manager',
          marketPlayers: data.marketPlayers || [],
        });
        alert('Jogo carregado com sucesso!');
      } else {
        alert('Nenhum jogo salvo encontrado.');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.GET, path);
      } else {
        console.error('Erro ao carregar:', error);
        alert('Erro ao carregar o jogo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <span className="text-sm text-slate-400 hidden md:inline-block w-full text-center mb-2">
          {user.email}
        </span>
        {userTeamId && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
            title="Salvar Jogo"
          >
            <Save size={16} />
            <span className="hidden sm:inline">{isSaving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        )}
        <button
          onClick={handleLoad}
          disabled={isLoading}
          className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
          title="Carregar Jogo"
        >
          <Download size={16} />
          <span className="hidden sm:inline">{isLoading ? 'Carregando...' : 'Carregar'}</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1 bg-slate-800 text-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors text-sm border border-slate-700"
          title="Sair"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={loginWithGoogle}
      className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-md hover:bg-slate-100 transition-colors font-medium shadow-sm"
    >
      <LogIn size={18} />
      Entrar com Google
    </button>
  );
};
