import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { chatterMetricsAPI } from '../api-service';
import { useOMConfig } from '../hooks/useOMConfig';
import { ACCOUNT_COLORS } from '../types';

interface Props {
  onNavigate?: (tab: string) => void;
}

// ═══════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatMsgTime(dateStr: string): { time: string; relative: string } {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.max(0, now.getTime() - d.getTime());
  const mins = Math.floor(diff / 60000);

  // relative
  let relative: string;
  if (mins < 1) relative = 'ahora';
  else if (mins < 60) relative = `hace ${mins}m`;
  else if (mins < 1440) relative = `hace ${Math.floor(mins / 60)}h`;
  else relative = `hace ${Math.floor(mins / 1440)}d`;

  // time
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const hhmm = `${hh}:${mm}`;

  const isToday = d.toDateString() === now.toDateString();
  const diffDays = Math.floor(diff / 86400000);

  let time: string;
  if (isToday) {
    time = hhmm;
  } else if (diffDays < 7) {
    time = `${DAY_NAMES[d.getDay()]} ${hhmm}`;
  } else {
    time = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${hhmm}`;
  }

  return { time, relative };
}

function formatGapDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════

const AuditoriaChat: React.FC<Props> = ({ onNavigate }) => {
  const { accounts: omAccounts, isLoading: configLoading, error: configError } = useOMConfig();

  // Panel izquierdo state
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [fanIds, setFanIds] = useState<string[]>([]);
  const [fansLoading, setFansLoading] = useState(false);
  const [fansError, setFansError] = useState<string | null>(null);
  const [fanSearch, setFanSearch] = useState('');
  const [selectedFan, setSelectedFan] = useState<string | null>(null);

  // Panel derecho state
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(true);

  // Mobile tabs
  const [mobileTab, setMobileTab] = useState<'fans' | 'chat'>('fans');

  // Visited fans tracking (persists within session)
  const [visitedFans, setVisitedFans] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Current account name
  const accountName = useMemo(() => {
    if (!selectedAccountId) return '';
    return omAccounts.find(a => String(a.id) === selectedAccountId)?.name ?? `#${selectedAccountId}`;
  }, [selectedAccountId, omAccounts]);

  // Load fans when account changes
  const loadFans = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setFansLoading(true);
    setFansError(null);
    setFanIds([]);
    setSelectedFan(null);
    setMessages([]);
    try {
      const ids = await chatterMetricsAPI.getActiveFans(accountId);
      setFanIds(ids);
    } catch (e) {
      setFansError('Error cargando fans');
      console.error(e);
    }
    setFansLoading(false);
  }, []);

  useEffect(() => {
    if (selectedAccountId) loadFans(selectedAccountId);
  }, [selectedAccountId, loadFans]);

  // Filtered fans
  const filteredFans = useMemo(() => {
    if (!fanSearch.trim()) return fanIds;
    const q = fanSearch.toLowerCase();
    return fanIds.filter(id => id.toLowerCase().includes(q));
  }, [fanIds, fanSearch]);

  // Load messages when fan is selected
  const loadMessages = useCallback(async () => {
    if (!selectedAccountId || !selectedFan) return;
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const items = await chatterMetricsAPI.getChatMessages(selectedAccountId, selectedFan);
      setMessages(items);
      setLoadedAt(new Date());
    } catch (e) {
      setMessagesError('Error cargando mensajes');
      console.error(e);
    }
    setMessagesLoading(false);
  }, [selectedAccountId, selectedFan]);

  useEffect(() => {
    if (selectedFan) loadMessages();
  }, [selectedFan, loadMessages]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── ANÁLISIS ──
  const analysis = useMemo(() => {
    if (messages.length === 0) return null;

    const sorted = [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Gaps >30min
    const gaps: { duration: number; timestamp: string }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].is_sent_by_me === false) {
        // Fan message — find next creator message
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[j].is_sent_by_me === true) {
            const fanTime = new Date(sorted[i].created_at).getTime();
            const creatorTime = new Date(sorted[j].created_at).getTime();
            const diffSec = (creatorTime - fanTime) / 1000;
            if (diffSec > 1800) {
              gaps.push({ duration: diffSec, timestamp: sorted[i].created_at });
            }
            break;
          }
        }
      }
    }

    // Prices in text
    const priceSet = new Set<string>();
    sorted.forEach(msg => {
      if (msg.text) {
        const matches = msg.text.match(/\$\d+(\.\d{1,2})?/g);
        if (matches) matches.forEach((p: string) => priceSet.add(p));
      }
    });

    // Response ratio
    const creatorMsgs = sorted.filter(m => m.is_sent_by_me === true).length;
    const fanMsgs = sorted.filter(m => m.is_sent_by_me === false).length;
    const ratio = fanMsgs > 0 ? Math.round((creatorMsgs / fanMsgs) * 100) : 0;

    return { gaps, prices: Array.from(priceSet), creatorMsgs, fanMsgs, ratio };
  }, [messages]);

  // Register error handler
  const handleRegisterError = useCallback(() => {
    const sorted = [...messages]
      .filter(m => m.is_sent_by_me === false)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const lastTwo = sorted.slice(0, 2).map(m => (m.text || '').slice(0, 80));
    const context = `Auditoría fan #${selectedFan} en ${accountName}: "${lastTwo[0] || ''}" / "${lastTwo[1] || ''}"`;

    localStorage.setItem('auditoria_prefill', context);
    if (onNavigate) onNavigate('REGISTRO_ERRORES');
  }, [messages, selectedFan, accountName, onNavigate]);

  // ── LOADING GUARD ──
  if (configLoading && omAccounts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <span className="animate-spin inline-block text-3xl mb-2">🔄</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (configError && omAccounts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Error cargando configuración</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{configError}</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER: PANEL IZQUIERDO (Fans)
  // ═══════════════════════════════════════════

  const fansPanel = (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            👥 Fans Activos (48h)
          </h2>
          {fanIds.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {fanIds.length}
            </span>
          )}
        </div>

        {/* Account selector */}
        <select
          value={selectedAccountId}
          onChange={e => setSelectedAccountId(e.target.value)}
          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 mb-2"
        >
          <option value="">Seleccionar modelo...</option>
          {omAccounts.map(a => (
            <option key={a.id} value={String(a.id)}>{a.name}</option>
          ))}
        </select>

        {/* Search */}
        {fanIds.length > 0 && (
          <input
            type="text"
            value={fanSearch}
            onChange={e => setFanSearch(e.target.value)}
            placeholder="🔍 Buscar fan ID..."
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Fan list */}
      <div className="flex-1 overflow-y-auto">
        {!selectedAccountId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-4">
            <span className="text-3xl mb-2">👆</span>
            <p className="text-sm text-center">Seleccioná una modelo para ver fans activos.</p>
          </div>
        ) : fansLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : fansError ? (
          <div className="p-4 text-center text-red-500 dark:text-red-400 text-sm">{fansError}</div>
        ) : filteredFans.length === 0 ? (
          <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm">
            {fanSearch ? 'Sin resultados para la búsqueda' : 'No se encontraron fans activos'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredFans.map((fanId, idx) => {
              const isVisited = visitedFans.has(fanId);
              const isSelected = selectedFan === fanId;
              return (
                <button
                  key={fanId}
                  onClick={() => {
                    setSelectedFan(fanId);
                    setVisitedFans(prev => new Set(prev).add(fanId));
                    setMobileTab('chat');
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isVisited
                        ? 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs mr-1.5">{idx + 1}.</span>
                    👤 #{fanId}
                  </span>
                  {isVisited && !isSelected && (
                    <span className="text-green-500 text-xs" title="Revisado">✓</span>
                  )}
                </button>
              );
            })}
            {/* Progress counter */}
            {fanIds.length > 0 && visitedFans.size > 0 && (
              <div className="px-3 py-2 text-[10px] text-gray-400 dark:text-gray-500 text-center border-t border-gray-200 dark:border-gray-700 mt-2">
                ✓ {visitedFans.size}/{fanIds.length} revisados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════
  // RENDER: PANEL DERECHO (Chat + Análisis)
  // ═══════════════════════════════════════════

  const chatPanel = (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {!selectedFan ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-sm font-medium">Seleccioná un fan para ver la conversación</p>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                Fan #{selectedFan} — {accountName}
              </h3>
              {loadedAt && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Cargado {formatMsgTime(loadedAt.toISOString()).relative}
                </p>
              )}
            </div>
            <button
              onClick={loadMessages}
              disabled={messagesLoading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg"
              title="Recargar mensajes"
            >
              <span className={messagesLoading ? 'animate-spin inline-block' : ''}>🔄</span>
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <span className="animate-spin mr-2 text-lg">🔄</span> Cargando mensajes...
              </div>
            ) : messagesError ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400 text-sm">{messagesError}</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No hay mensajes disponibles</div>
            ) : (
              <>
                {[...messages]
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((msg, idx) => {
                    const isCreator = msg.is_sent_by_me === true;
                    const hasPPV = msg.price > 0 && msg.is_free === false;
                    const hasMedia = (msg.media_count || 0) > 0;

                    return (
                      <div key={msg.id || idx} className={`flex ${isCreator ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            isCreator
                              ? 'bg-emerald-700 dark:bg-emerald-800 text-white rounded-br-md'
                              : 'bg-blue-600 dark:bg-blue-700 text-white rounded-bl-md'
                          }`}
                        >
                          {msg.text && (
                            <>
                              <span className={`block text-[9px] uppercase tracking-wider opacity-70 mb-0.5 ${isCreator ? 'text-emerald-200' : 'text-blue-200'}`}>
                                {isCreator ? 'Modelo' : 'Fan'}
                              </span>
                              <p
                                className="text-sm whitespace-pre-wrap break-words"
                                dangerouslySetInnerHTML={{
                                  __html: msg.text
                                    .replace(/<script[^>]*>.*?<\/script>/gi, '')
                                    .replace(/<(?!\/?(b|i|em|strong|br)\b)[^>]+>/gi, '')
                                    .trim()
                                }}
                              />
                            </>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] opacity-60">{formatMsgTime(msg.created_at).time}</span>
                            <span className="text-[10px] opacity-40 ml-1">({formatMsgTime(msg.created_at).relative})</span>
                            {hasPPV && (
                              <span className="bg-yellow-400/20 text-yellow-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                💰 PPV ${msg.price}
                              </span>
                            )}
                            {hasMedia && (
                              <span className="bg-gray-500/30 text-gray-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                🖼️ ×{msg.media_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Analysis panel */}
          {messages.length > 0 && analysis && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
              <button
                onClick={() => setAnalysisOpen(prev => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span>📊 Análisis Automático</span>
                <span className="text-xs">{analysisOpen ? '▲' : '▼'}</span>
              </button>

              {analysisOpen && (
                <div className="px-4 pb-4 space-y-4 max-h-48 overflow-y-auto">
                  {/* Gaps */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      ⏱️ Gaps de respuesta &gt;30min
                    </h4>
                    {analysis.gaps.length === 0 ? (
                      <p className="text-sm text-green-600 dark:text-green-400">✅ Sin gaps mayores a 30 minutos</p>
                    ) : (
                      <div className="space-y-1">
                        {analysis.gaps.map((gap, i) => (
                          <div key={i} className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">
                            Gap de {formatGapDuration(gap.duration)} — {formatMsgTime(gap.timestamp).relative}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Prices */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      💰 Precios detectados en el texto
                    </h4>
                    {analysis.prices.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sin precios detectados en el texto</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.prices.map((p, i) => (
                          <span key={i} className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-bold px-2 py-1 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ratio */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      📊 Ratio de respuesta
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Creator: <strong>{analysis.creatorMsgs}</strong> msgs | Fan: <strong>{analysis.fanMsgs}</strong> msgs | Ratio: <strong>{analysis.ratio}%</strong>
                    </p>
                  </div>

                  {/* Register error button */}
                  <button
                    onClick={handleRegisterError}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    🚨 Registrar Error
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════
  // LAYOUT
  // ═══════════════════════════════════════════

  return (
    <div className="h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Desktop: side by side */}
      <div className="hidden md:flex h-full">
        <div className="w-1/3 min-w-[16rem] shrink-0">{fansPanel}</div>
        <div className="flex-1">{chatPanel}</div>
      </div>

      {/* Mobile: tabs */}
      <div className="md:hidden flex flex-col h-full">
        <div className="flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={() => setMobileTab('fans')}
            className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${
              mobileTab === 'fans'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            👥 Fans
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${
              mobileTab === 'chat'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            💬 Chat
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'fans' ? fansPanel : chatPanel}
        </div>
      </div>
    </div>
  );
};

export default AuditoriaChat;
