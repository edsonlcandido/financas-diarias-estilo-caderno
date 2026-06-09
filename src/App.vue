/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

<template>
  <div class="min-h-screen pt-6 pb-24 md:pb-32 px-4 max-w-2xl mx-auto selection:bg-red-100">
    <!-- Header with Navigation -->
    <header class="mb-8 md:mb-12 flex justify-between items-center">
      <div>
        <h1 class="text-2xl md:text-3xl font-medium tracking-tight -mb-1">Minhas Contas</h1>
        <div class="flex items-center gap-3 mt-1">
          <button @click="prevMonth" class="p-1 hover:bg-black/5 rounded transition-colors text-gray-400 hover:text-ink">
            <ChevronLeft :size="20" />
          </button>
          <p class="text-sm text-gray-700 font-mono italic min-w-[120px] text-center capitalize">
            {{ formattedMonth }}
          </p>
          <button @click="nextMonth" class="p-1 hover:bg-black/5 rounded transition-colors text-gray-400 hover:text-ink">
            <ChevronRight :size="20" />
          </button>
        </div>
      </div>
      <button
        @click="resetMonth"
        class="p-2 text-gray-300 hover:text-red-400 transition-colors"
        title="Resetar Mês"
      >
        <RefreshCcw :size="18" />
      </button>
    </header>

    <!-- Balances Section -->
    <section class="mb-8 md:mb-12">
      <div class="flex items-center justify-between mb-4 md:mb-6">
        <h2 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          <Wallet :size="14" /> Saldos e Faturas
        </h2>
        <button
          @click="addAccount"
          class="text-xs text-gray-400 hover:text-ink flex items-center gap-1 transition-colors border-b border-transparent hover:border-ink"
        >
          <Plus :size="12" /> Adicionar Banco
        </button>
      </div>

      <div class="grid grid-cols-1 gap-1">
        <div
          v-for="(acc, index) in accountDefs"
          :key="acc.id"
          class="group flex items-center justify-between py-1 transition-colors"
        >
          <div class="flex items-center gap-2">
            <div class="flex flex-col opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                @click="moveAccount(index, 'up')"
                :disabled="index === 0"
                class="p-0.5 text-gray-300 hover:text-ink disabled:opacity-0"
              >
                <ChevronUp :size="12" />
              </button>
              <button
                @click="moveAccount(index, 'down')"
                :disabled="index === accountDefs.length - 1"
                class="p-0.5 text-gray-300 hover:text-ink disabled:opacity-0"
              >
                <ChevronDown :size="12" />
              </button>
            </div>
            <span class="text-sm font-medium">{{ acc.name }}</span>
          </div>
          <div class="flex items-center gap-3">
            <input
              type="text"
              class="w-24 text-right bg-transparent font-mono text-sm border-b border-black/5 focus:border-black/20 focus:outline-none transition-all py-1 placeholder:opacity-20"
              :value="currentPage.balances[acc.id] ?? ''"
              placeholder="0"
              @change="updateAccountBalance(acc.id, ($event.target as HTMLInputElement).value)"
            />
            <button
              @click="removeAccount(acc.id)"
              class="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-gray-300 hover:text-red-400 transition-all"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <div class="flex flex-col xs:flex-row justify-between py-3 items-start xs:items-center border-t-2 border-dashed border-black/5 mt-4 gap-1">
          <span class="text-[10px] uppercase tracking-wider font-bold opacity-40">Saldo Atual Bancário</span>
          <span :class="['font-mono text-base font-bold', currentAssets >= 0 ? 'text-emerald-700' : 'text-red-700']">
            {{ formatCurrency(currentAssets) }}
          </span>
        </div>
      </div>
    </section>

    <!-- Movements Section -->
    <section class="mb-12 md:mb-20">
      <h2 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4 md:mb-6">
        <Calculator :size="14" /> Entradas e Saídas
      </h2>

      <form @submit.prevent="addEntry" class="mb-6 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Ex: Salário, Aluguel..."
          class="flex-1 bg-white border border-black/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10 transition-all shadow-sm min-w-0"
          v-model="newEntryDesc"
        />
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="-1.200,00"
            class="flex-1 sm:w-28 bg-white border border-black/5 rounded-lg px-4 py-2 text-sm font-mono text-right focus:outline-none focus:ring-1 focus:ring-black/10 transition-all shadow-sm min-w-0"
            v-model="newEntryValue"
          />
          <button
            type="submit"
            class="bg-ink text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity active:scale-95 duration-200 shadow-lg shadow-black/10 shrink-0"
          >
            <ArrowRight :size="18" />
          </button>
        </div>
      </form>

      <div class="relative">
        <!-- Notebook Lines Decorative -->
        <div class="absolute inset-0 pointer-events-none notebook-lines opacity-40" aria-hidden="true" />

        <div class="notebook-margin relative">
          <TransitionGroup name="entry" tag="div">
            <div
              v-for="entry in entries"
              :key="entry.id"
              :class="['group flex items-center gap-4 h-10 border-b border-black/5 transition-all', entry.isPaid ? 'opacity-40' : 'opacity-100']"
            >
              <button
                @click="togglePaid(entry.id)"
                class="text-gray-300 hover:text-ink transition-colors shrink-0 outline-none"
                :title="entry.isPaid ? 'Marcar como pendente' : 'Marcar como pago'"
              >
                <CheckCircle2 v-if="entry.isPaid" :size="18" class="text-emerald-500" />
                <Circle v-else :size="18" />
              </button>

              <span :class="['flex-1 text-sm transition-all truncate pr-2', entry.isPaid ? 'line-through text-gray-500' : 'font-medium']">
                {{ entry.description }}
              </span>

              <div class="flex items-center gap-3 shrink-0">
                <span :class="['font-mono text-sm', entry.value >= 0 ? 'text-emerald-600' : 'text-red-500', entry.isPaid ? 'line-through' : '']">
                  {{ formatCurrency(entry.value) }}
                </span>
                <button
                  @click="removeEntry(entry.id)"
                  class="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </TransitionGroup>

          <div v-if="entries.length === 0" class="py-12 flex flex-col items-center justify-center text-gray-300 gap-2 select-none">
            <Calculator :size="32" :stroke-width="1" />
            <p class="text-[10px] uppercase tracking-widest font-bold">Anote aqui suas despesas</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Fixed Summary Panel -->
    <footer class="fixed bottom-0 left-0 right-0 p-4 md:bottom-6 md:px-6 flex justify-center pointer-events-none z-50">
      <div
        v-motion
        :initial="{ y: 50, opacity: 0 }"
        :enter="{ y: 0, opacity: 1 }"
        class="bg-ink text-white w-full max-w-lg px-4 py-4 md:px-8 md:py-5 rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-between md:justify-center gap-4 md:gap-12 pointer-events-auto border border-white/5 backdrop-blur-md"
      >
        <div class="flex flex-col">
          <span class="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-gray-500 mb-0.5 md:mb-1 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span class="hidden xs:inline">Previsão</span> Saldo
          </span>
          <span class="text-lg md:text-2xl font-mono tracking-tighter font-semibold">
            {{ formatCurrency(projectedSaldo) }}
          </span>
        </div>

        <div class="h-8 md:h-10 w-px bg-white/10" />

        <div class="flex flex-col text-right md:text-left">
          <span class="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-gray-500 mb-0.5 md:mb-1 flex items-center justify-end md:justify-start gap-1">
            <span :class="['w-1.5 h-1.5 rounded-full', pendingMovements >= 0 ? 'bg-sky-500' : 'bg-red-500']" />
            Pendente
          </span>
          <span :class="['text-base md:text-xl font-mono tracking-tighter opacity-80', pendingMovements >= 0 ? 'text-sky-200' : 'text-red-200']">
            {{ formatCurrency(pendingMovements) }}
          </span>
        </div>
      </div>
    </footer>

    <!-- Floating help hint -->
    <div class="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 text-[9px] md:text-[10px] text-gray-400 uppercase tracking-widest font-medium text-center w-full px-4 animate-pulse pointer-events-none">
      Toque no círculo para confirmar o pagamento
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  ArrowRight, Trash2, CheckCircle2, Circle, Wallet, Calculator,
  RefreshCcw, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
} from '@lucide/vue';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocalStorage } from './composables/useLocalStorage';

// Types
interface AccountDef {
  id: string;
  name: string;
}

interface PageData {
  entries: Entry[];
  balances: Record<string, number>;
}

interface Entry {
  id: string;
  description: string;
  value: number;
  isPaid: boolean;
  createdAt: number;
}

// Global account names
const accountDefs = useLocalStorage<AccountDef[]>('fin_account_defs', [
  { id: '1', name: 'Fatura Nubank' },
  { id: '2', name: 'Nubank' },
  { id: '3', name: 'Itaú' },
]);

// Current selected month
const currentDate = ref(startOfMonth(new Date()));

const monthKey = computed(() => format(currentDate.value, 'yyyy-MM'));

const formattedMonth = computed(() =>
  format(currentDate.value, "MMMM 'de' yyyy", { locale: ptBR }),
);

// Month-specific data (entries and balances)
const allPages = useLocalStorage<Record<string, PageData>>('fin_month_pages', {});

const newEntryDesc = ref('');
const newEntryValue = ref('');

// Get data for current page
const currentPage = computed<PageData>(() => {
  return allPages.value[monthKey.value] || { entries: [], balances: {} };
});

const entries = computed(() => currentPage.value.entries);

// Sync methods
const updatePage = (newData: Partial<PageData>) => {
  allPages.value = {
    ...allPages.value,
    [monthKey.value]: {
      ...currentPage.value,
      ...newData,
    },
  };
};

// Calculations
const currentAssets = computed(() => {
  return accountDefs.value.reduce((acc, def) => {
    const balance = currentPage.value.balances[def.id] ?? 0;
    return acc + balance;
  }, 0);
});

const pendingMovements = computed(() => {
  return entries.value.filter(e => !e.isPaid).reduce((acc, curr) => acc + curr.value, 0);
});

const projectedSaldo = computed(() => currentAssets.value + pendingMovements.value);

// Handlers
const addAccount = () => {
  const name = prompt('Nome da conta/cartão (ex: Itaú, Fatura...):');
  if (name) {
    accountDefs.value = [...accountDefs.value, { id: Date.now().toString(), name }];
  }
};

const updateAccountBalance = (accountId: string, valStr: string) => {
  const val = parseFloat(valStr.replace(',', '.'));
  const newBalances = { ...currentPage.value.balances, [accountId]: isNaN(val) ? 0 : val };
  updatePage({ balances: newBalances });
};

const removeAccount = (id: string) => {
  if (confirm('Remover esta conta de todos os meses?')) {
    accountDefs.value = accountDefs.value.filter(acc => acc.id !== id);
  }
};

const moveAccount = (index: number, direction: 'up' | 'down') => {
  const newItems = [...accountDefs.value];
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= newItems.length) return;
  [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
  accountDefs.value = newItems;
};

const addEntry = () => {
  if (!newEntryDesc.value || !newEntryValue.value) return;
  const val = parseFloat(newEntryValue.value.replace(',', '.'));
  if (isNaN(val)) return;

  const newEntry: Entry = {
    id: Date.now().toString(),
    description: newEntryDesc.value,
    value: val,
    isPaid: false,
    createdAt: Date.now(),
  };

  updatePage({ entries: [newEntry, ...entries.value] });
  newEntryDesc.value = '';
  newEntryValue.value = '';
};

const togglePaid = (id: string) => {
  const newEntries = entries.value.map(e => e.id === id ? { ...e, isPaid: !e.isPaid } : e);
  updatePage({ entries: newEntries });
};

const removeEntry = (id: string) => {
  const newEntries = entries.value.filter(e => e.id !== id);
  updatePage({ entries: newEntries });
};

const nextMonth = () => { currentDate.value = addMonths(currentDate.value, 1); };
const prevMonth = () => { currentDate.value = subMonths(currentDate.value, 1); };

const resetMonth = () => {
  if (confirm('Limpar registros deste mês?')) {
    updatePage({ entries: [] });
  }
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};
</script>

<style scoped>
.entry-enter-active,
.entry-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.entry-enter-from {
  opacity: 0;
  transform: translateX(-5px);
}
.entry-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
.entry-move {
  transition: transform 0.2s ease;
}
</style>
