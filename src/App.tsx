/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Trash2, CheckCircle2, Circle, Wallet, Calculator, TrendingUp, TrendingDown, RefreshCcw, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
interface AccountDef {
  id: string;
  name: string;
}

interface PageData {
  entries: Entry[];
  balances: Record<string, number>; // accountId -> balance
}

interface Entry {
  id: string;
  description: string;
  value: number;
  isPaid: boolean;
  createdAt: number;
}

// Custom Hook for LocalStorage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

import { addMonths, subMonths, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  // Global account names
  const [accountDefs, setAccountDefs] = useLocalStorage<AccountDef[]>('fin_account_defs', [
    { id: '1', name: 'Fatura Nubank' },
    { id: '2', name: 'Nubank' },
    { id: '3', name: 'Itaú' },
  ]);

  // Current selected month
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()));
  const monthKey = format(currentDate, 'yyyy-MM');

  // Month-specific data (entries and balances)
  const [allPages, setAllPages] = useLocalStorage<Record<string, PageData>>('fin_month_pages', {});

  const [newEntryDesc, setNewEntryDesc] = useState('');
  const [newEntryValue, setNewEntryValue] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get data for current page
  const currentPage: PageData = useMemo(() => {
    return allPages[monthKey] || { entries: [], balances: {} };
  }, [allPages, monthKey]);

  const entries = currentPage.entries;

  // Sync methods
  const updatePage = (newData: Partial<PageData>) => {
    setAllPages(prev => ({
      ...prev,
      [monthKey]: {
        ...currentPage,
        ...newData
      }
    }));
  };

  // Calculations
  const currentAssets = useMemo(() => {
    return accountDefs.reduce((acc, def) => {
      const balance = currentPage.balances[def.id] ?? 0;
      return acc + balance;
    }, 0);
  }, [accountDefs, currentPage.balances]);

  const pendingMovements = useMemo(() => {
    return entries.filter(e => !e.isPaid).reduce((acc, curr) => acc + curr.value, 0);
  }, [entries]);

  const projectedSaldo = currentAssets + pendingMovements;

  // Handlers
  const addAccount = () => {
    const name = prompt('Nome da conta/cartão (ex: Itaú, Fatura...):');
    if (name) {
      setAccountDefs([...accountDefs, { id: Date.now().toString(), name }]);
    }
  };

  const updateAccountBalance = (accountId: string, valStr: string) => {
    const val = parseFloat(valStr.replace(',', '.'));
    const newBalances = { ...currentPage.balances, [accountId]: isNaN(val) ? 0 : val };
    updatePage({ balances: newBalances });
  };

  const removeAccount = (id: string) => {
    if (confirm('Remover esta conta de todos os meses?')) {
      setAccountDefs(accountDefs.filter(acc => acc.id !== id));
      // Optionally clean up balances in all pages, but keeping them doesn't hurt much
    }
  };

  const moveAccount = (index: number, direction: 'up' | 'down') => {
    const newItems = [...accountDefs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setAccountDefs(newItems);
  };

  const addEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryDesc || !newEntryValue) return;

    const val = parseFloat(newEntryValue.replace(',', '.'));
    if (isNaN(val)) return;

    const newEntry: Entry = {
      id: Date.now().toString(),
      description: newEntryDesc,
      value: val,
      isPaid: false,
      createdAt: Date.now()
    };

    updatePage({ entries: [newEntry, ...entries] });
    setNewEntryDesc('');
    setNewEntryValue('');
  };

  const togglePaid = (id: string) => {
    const newEntries = entries.map(e => e.id === id ? { ...e, isPaid: !e.isPaid } : e);
    updatePage({ entries: newEntries });
  };

  const removeEntry = (id: string) => {
    const newEntries = entries.filter(e => e.id !== id);
    updatePage({ entries: newEntries });
  };

  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen pt-6 pb-24 md:pb-32 px-4 max-w-2xl mx-auto selection:bg-red-100">
      {/* Header with Navigation */}
      <header className="mb-8 md:mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight -mb-1">Minhas Contas</h1>
          <div className="flex items-center gap-3 mt-1">
            <button onClick={prevMonth} className="p-1 hover:bg-black/5 rounded transition-colors text-gray-400 hover:text-ink">
              <ChevronLeft size={20} />
            </button>
            <p className="text-sm text-gray-700 font-mono italic min-w-[120px] text-center capitalize">
              {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <button onClick={nextMonth} className="p-1 hover:bg-black/5 rounded transition-colors text-gray-400 hover:text-ink">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <button 
          onClick={() => { if(confirm('Limpar registros deste mês?')) { updatePage({ entries: [] }); }}}
          className="p-2 text-gray-300 hover:text-red-400 transition-colors"
          title="Resetar Mês"
        >
          <RefreshCcw size={18} />
        </button>
      </header>

      {/* Balances Section */}
      <section className="mb-8 md:mb-12">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            <Wallet size={14} /> Saldos e Faturas
          </h2>
          <button 
            onClick={addAccount}
            className="text-xs text-gray-400 hover:text-ink flex items-center gap-1 transition-colors border-b border-transparent hover:border-ink"
          >
            <Plus size={12} /> Adicionar Banco
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-1">
          {accountDefs.map((acc, index) => (
            <div key={acc.id} className="group flex items-center justify-between py-1 transition-colors">
              <div className="flex items-center gap-2">
                <div className="flex flex-col opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => moveAccount(index, 'up')}
                    disabled={index === 0}
                    className="p-0.5 text-gray-300 hover:text-ink disabled:opacity-0"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button 
                    onClick={() => moveAccount(index, 'down')}
                    disabled={index === accountDefs.length - 1}
                    className="p-0.5 text-gray-300 hover:text-ink disabled:opacity-0"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
                <span className="text-sm font-medium">{acc.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className="w-24 text-right bg-transparent font-mono text-sm border-b border-black/5 focus:border-black/20 focus:outline-none transition-all py-1 placeholder:opacity-20"
                  value={currentPage.balances[acc.id] ?? ''}
                  placeholder="0"
                  onChange={(e) => updateAccountBalance(acc.id, e.target.value)}
                />
                <button 
                  onClick={() => removeAccount(acc.id)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-gray-300 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <div className="flex flex-col xs:flex-row justify-between py-3 items-start xs:items-center border-t-2 border-dashed border-black/5 mt-4 gap-1">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-40">Saldo Atual Bancário</span>
            <span className={`font-mono text-base font-bold ${currentAssets >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(currentAssets)}
            </span>
          </div>
        </div>
      </section>

      {/* Movements Section */}
      <section className="mb-12 md:mb-20">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4 md:mb-6">
          <Calculator size={14} /> Entradas e Saídas
        </h2>

        <form onSubmit={addEntry} className="mb-6 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Ex: Salário, Aluguel..."
            className="flex-1 bg-white border border-black/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10 transition-all shadow-sm min-w-0"
            value={newEntryDesc}
            onChange={(e) => setNewEntryDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="-1.200,00"
              className="flex-1 sm:w-28 bg-white border border-black/5 rounded-lg px-4 py-2 text-sm font-mono text-right focus:outline-none focus:ring-1 focus:ring-black/10 transition-all shadow-sm min-w-0"
              value={newEntryValue}
              onChange={(e) => setNewEntryValue(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-ink text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity active:scale-95 duration-200 shadow-lg shadow-black/10 shrink-0"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        <div className="relative">
          {/* Notebook Lines Decorative */}
          <div className="absolute inset-0 pointer-events-none notebook-lines opacity-40" aria-hidden="true" />
          
          <div className="notebook-margin relative">
            <AnimatePresence mode="popLayout" initial={false}>
              {entries.map(entry => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`group flex items-center gap-4 h-10 border-b border-black/5 transition-all
                    ${entry.isPaid ? 'opacity-40' : 'opacity-100'}
                  `}
                >
                  <button 
                    onClick={() => togglePaid(entry.id)}
                    className="text-gray-300 hover:text-ink transition-colors shrink-0 outline-none"
                    title={entry.isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
                  >
                    {entry.isPaid ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} />}
                  </button>
                  
                  <span className={`flex-1 text-sm transition-all truncate pr-2 ${entry.isPaid ? 'line-through text-gray-500' : 'font-medium'}`}>
                    {entry.description}
                  </span>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono text-sm ${entry.value >= 0 ? 'text-emerald-600' : 'text-red-500'} ${entry.isPaid ? 'line-through' : ''}`}>
                      {formatCurrency(entry.value)}
                    </span>
                    <button 
                      onClick={() => removeEntry(entry.id)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {entries.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-gray-300 gap-2 select-none">
                <Calculator size={32} strokeWidth={1} />
                <p className="text-[10px] uppercase tracking-widest font-bold">Anote aqui suas despesas</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Fixed Summary Panel */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 md:bottom-6 md:px-6 flex justify-center pointer-events-none z-50">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-ink text-white w-full max-w-lg px-4 py-4 md:px-8 md:py-5 rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-between md:justify-center gap-4 md:gap-12 pointer-events-auto border border-white/5 backdrop-blur-md"
        >
          <div className="flex flex-col">
            <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-gray-500 mb-0.5 md:mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="hidden xs:inline">Previsão</span> Saldo
            </span>
            <span className="text-lg md:text-2xl font-mono tracking-tighter font-semibold">
              {formatCurrency(projectedSaldo)}
            </span>
          </div>

          <div className="h-8 md:h-10 w-px bg-white/10" />

          <div className="flex flex-col text-right md:text-left">
            <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-gray-500 mb-0.5 md:mb-1 flex items-center justify-end md:justify-start gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${pendingMovements >= 0 ? 'bg-sky-500' : 'bg-red-500'}`} />
              Pendente
            </span>
            <span className={`text-base md:text-xl font-mono tracking-tighter opacity-80 ${pendingMovements >= 0 ? 'text-sky-200' : 'text-red-200'}`}>
              {formatCurrency(pendingMovements)}
            </span>
          </div>
        </motion.div>
      </footer>

      {/* Floating help hint */}
      <div className="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 text-[9px] md:text-[10px] text-gray-400 uppercase tracking-widest font-medium text-center w-full px-4 animate-pulse pointer-events-none">
        Toque no círculo para confirmar o pagamento
      </div>
    </div>
  );
}
