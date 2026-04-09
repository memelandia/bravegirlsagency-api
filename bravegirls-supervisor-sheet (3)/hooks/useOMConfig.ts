import { useState, useEffect, useCallback } from 'react';
import type { OMAccount, OMMember } from '../types';

const CONFIG_ENDPOINT = 'https://bravegirlsagency-api.vercel.app/api/onlymonster/config';
const CACHE_KEY = 'om_config_cache';
const CACHE_TS_KEY = 'om_config_ts';
const TTL_MS = 60 * 60 * 1000; // 1 hour

interface OMConfigState {
  accounts: OMAccount[];
  members: OMMember[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

function readCache(): { accounts: OMAccount[]; members: OMMember[] } | null {
  try {
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!ts) return null;
    const age = Date.now() - Number(ts);
    if (age > TTL_MS) return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.accounts) && Array.isArray(parsed.members)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCache(data: { accounts: OMAccount[]; members: OMMember[] }) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch { /* quota exceeded — ignore */ }
}

export function useOMConfig(): OMConfigState {
  const [accounts, setAccounts] = useState<OMAccount[]>([]);
  const [members, setMembers] = useState<OMMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (skipCache = false) => {
    setIsLoading(true);
    setError(null);

    if (!skipCache) {
      const cached = readCache();
      if (cached) {
        setAccounts(cached.accounts);
        setMembers(cached.members);
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(CONFIG_ENDPOINT);
      const json = await res.json();
      if (json.success && json.data) {
        setAccounts(json.data.accounts ?? []);
        setMembers(json.data.members ?? []);
        writeCache({ accounts: json.data.accounts ?? [], members: json.data.members ?? [] });
      } else {
        throw new Error(json.error || 'Respuesta inesperada del servidor');
      }
    } catch (e: any) {
      console.error('useOMConfig error:', e);
      setError(e.message || 'Error cargando configuración de OnlyMonster');
      // Try stale cache as last resort
      const stale = (() => {
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();
      if (stale?.accounts) {
        setAccounts(stale.accounts);
        setMembers(stale.members);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { accounts, members, isLoading, error, refresh };
}
