<script lang="ts">
import { defineComponent } from 'vue';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowRight,
  Trash2,
  CheckCircle2,
  Circle,
  Wallet,
  Calculator,
  RefreshCcw,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  X,
  Menu,
} from 'lucide-vue-next';
import { loadFromStorage, saveToStorage } from './composables/useLocalStorage';

interface AccountDef {
  id: string;
  name: string;
}

interface Entry {
  id: string;
  description: string;
  value: number;
  isPaid: boolean;
  createdAt: number;
  fixedTemplateId?: string;
}

interface FixedTemplate {
  id: string;
  description: string;
  value: number;
}

interface PageData {
  entries: Entry[];
  balances: Record<string, number>;
}

export default defineComponent({
  name: 'App',
  components: {
    ArrowRight,
    Trash2,
    CheckCircle2,
    Circle,
    Wallet,
    Calculator,
    RefreshCcw,
    Plus,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Pin,
    PinOff,
    X,
    Menu,
  },
  data() {
    return {
      accountDefs: loadFromStorage<AccountDef[]>('fin_account_defs', [
        { id: '1', name: 'Fatura Nubank' },
        { id: '2', name: 'Nubank' },
        { id: '3', name: 'Itaú' },
      ]),
      allPages: loadFromStorage<Record<string, PageData>>('fin_month_pages', {}),
      fixedTemplates: loadFromStorage<FixedTemplate[]>('fin_fixed_templates', []),
      currentDate: startOfMonth(new Date()),
      newEntryDesc: '',
      newEntryValue: '',
      pinCurrent: false,
      balanceInputs: {} as Record<string, string>,
      isClient: true,
      isDrawerOpen: false,
    };
  },
  computed: {
    monthKey(): string {
      return format(this.currentDate, 'yyyy-MM');
    },
    monthLabel(): string {
      return format(this.currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    },
    currentPage(): PageData {
      return this.allPages[this.monthKey] || { entries: [], balances: {} };
    },
    entries(): Entry[] {
      return this.currentPage.entries;
    },
    currentAssets(): number {
      return this.accountDefs.reduce((acc, def) => {
        const balance = this.currentPage.balances[def.id] ?? 0;
        return acc + balance;
      }, 0);
    },
    pendingMovements(): number {
      return this.entries
        .filter((e) => !e.isPaid)
        .reduce((acc, curr) => acc + curr.value, 0);
    },
    projectedSaldo(): number {
      return this.currentAssets + this.pendingMovements;
    },
    pendingFixedCount(): number {
      const appliedIds = new Set(
        this.entries
          .map((e) => e.fixedTemplateId)
          .filter((id): id is string => Boolean(id))
      );
      return this.fixedTemplates.filter((t) => !appliedIds.has(t.id)).length;
    },
  },
  watch: {
    accountDefs: {
      handler(val: AccountDef[]) {
        saveToStorage('fin_account_defs', val);
      },
      deep: true,
    },
    allPages: {
      handler(val: Record<string, PageData>) {
        saveToStorage('fin_month_pages', val);
      },
      deep: true,
    },
    fixedTemplates: {
      handler(val: FixedTemplate[]) {
        saveToStorage('fin_fixed_templates', val);
      },
      deep: true,
    },
    monthKey: {
      handler() {
        this.syncBalanceInputs();
      },
      immediate: true,
    },
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
  },
  methods: {
    updatePage(newData: Partial<PageData>) {
      this.allPages = {
        ...this.allPages,
        [this.monthKey]: {
          ...this.currentPage,
          ...newData,
        },
      };
    },
    addAccount() {
      const name = prompt('Nome da conta/cartão (ex: Itaú, Fatura...):');
      if (name) {
        const newId = Date.now().toString();
        this.accountDefs = [
          ...this.accountDefs,
          { id: newId, name },
        ];
        this.balanceInputs[newId] = '';
      }
    },
    syncBalanceInputs() {
      const next: Record<string, string> = {};
      for (const acc of this.accountDefs) {
        const bal = this.currentPage.balances[acc.id];
        next[acc.id] = bal === undefined || bal === 0 ? '' : String(bal);
      }
      this.balanceInputs = next;
    },
    updateAccountBalance(accountId: string, val: number) {
      const newBalances = {
        ...this.currentPage.balances,
        [accountId]: val,
      };
      this.updatePage({ balances: newBalances });
    },
    onBalanceInput(accountId: string, valStr: string) {
      this.balanceInputs[accountId] = valStr;

      const cleaned = valStr.replace(',', '.');

      if (cleaned === '') {
        this.updateAccountBalance(accountId, 0);
        return;
      }

      if (cleaned.endsWith('-') || cleaned.endsWith('.')) {
        return;
      }

      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        this.updateAccountBalance(accountId, parsed);
      }
    },
    removeAccount(id: string) {
      if (confirm('Remover esta conta de todos os meses?')) {
        this.accountDefs = this.accountDefs.filter((acc) => acc.id !== id);
      }
    },
    moveAccount(index: number, direction: 'up' | 'down') {
      const newItems = [...this.accountDefs];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newItems.length) return;
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      this.accountDefs = newItems;
    },
    addEntry() {
      if (!this.newEntryDesc || !this.newEntryValue) return;
      const val = parseFloat(this.newEntryValue.replace(',', '.'));
      if (isNaN(val)) return;

      const shouldPin = this.pinCurrent;
      this.pinCurrent = false;

      let fixedTemplateId: string | undefined;
      let templates = this.fixedTemplates;
      if (shouldPin) {
        const existing = this.fixedTemplates.find(
          (t) => t.description === this.newEntryDesc && t.value === val
        );
        if (existing) {
          fixedTemplateId = existing.id;
        } else {
          const newTemplate: FixedTemplate = {
            id: Date.now().toString(),
            description: this.newEntryDesc,
            value: val,
          };
          templates = [...this.fixedTemplates, newTemplate];
          fixedTemplateId = newTemplate.id;
        }
      }

      const newEntry: Entry = {
        id: (Date.now() + 1).toString(),
        description: this.newEntryDesc,
        value: val,
        isPaid: false,
        createdAt: Date.now(),
        fixedTemplateId,
      };
      this.fixedTemplates = templates;
      this.updatePage({ entries: [newEntry, ...this.entries] });
      this.newEntryDesc = '';
      this.newEntryValue = '';
    },
    togglePinCurrent() {
      this.pinCurrent = !this.pinCurrent;
    },
    applyFixedTemplates() {
      if (this.fixedTemplates.length === 0) {
        alert('Nenhum lançamento fixo cadastrado.');
        return;
      }
      const appliedIds = new Set(
        this.entries
          .map((e) => e.fixedTemplateId)
          .filter((id): id is string => Boolean(id))
      );
      const toApply = this.fixedTemplates.filter((t) => !appliedIds.has(t.id));
      if (toApply.length === 0) {
        alert('Todos os lançamentos fixos já estão aplicados neste mês.');
        return;
      }
      if (!confirm(`Aplicar ${toApply.length} lançamento(s) fixo(s) a este mês?`)) {
        return;
      }
      const baseTime = Date.now();
      const newEntries: Entry[] = toApply.map((t, idx) => ({
        id: `${baseTime + idx}`,
        description: t.description,
        value: t.value,
        isPaid: false,
        createdAt: baseTime + idx,
        fixedTemplateId: t.id,
      }));
      this.updatePage({ entries: [...newEntries, ...this.entries] });
    },
    removeFixedTemplate(id: string) {
      if (!confirm('Remover este modelo de lançamento fixo?')) return;
      this.fixedTemplates = this.fixedTemplates.filter((t) => t.id !== id);
    },
    unfixEntry(id: string) {
      const newEntries = this.entries.map((e) => {
        if (e.id !== id) return e;
        const { fixedTemplateId, ...rest } = e;
        return rest as Entry;
      });
      this.updatePage({ entries: newEntries });
    },
    togglePaid(id: string) {
      const newEntries = this.entries.map((e) =>
        e.id === id ? { ...e, isPaid: !e.isPaid } : e
      );
      this.updatePage({ entries: newEntries });
    },
    removeEntry(id: string) {
      const newEntries = this.entries.filter((e) => e.id !== id);
      this.updatePage({ entries: newEntries });
    },
    nextMonth() {
      this.currentDate = addMonths(this.currentDate, 1);
    },
    prevMonth() {
      this.currentDate = subMonths(this.currentDate, 1);
    },
    resetMonth() {
      if (confirm('Limpar registros deste mês?')) {
        this.updatePage({ entries: [] });
      }
    },
    openDrawer() {
      this.isDrawerOpen = true;
    },
    closeDrawer() {
      this.isDrawerOpen = false;
    },
    toggleDrawer() {
      this.isDrawerOpen = !this.isDrawerOpen;
    },
    handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && this.isDrawerOpen) {
        this.closeDrawer();
      }
    },
    formatCurrency(val: number): string {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(val);
    },
  },
});
</script>

<template>
  <div
    v-if="isClient"
    class="min-h-screen pt-6 pb-24 md:pb-32 px-4 max-w-2xl mx-auto selection:bg-red-100"
  >
    <!-- Header with Navigation -->
    <header class="mb-8 md:mb-12 flex justify-between items-center">
      <div>
        <h1 class="text-2xl md:text-3xl font-medium tracking-tight -mb-1">Minhas Contas</h1>
        <div class="flex items-center gap-3 mt-1">
          <button
            @click="prevMonth"
            class="p-1 hover:bg-black/5 rounded transition-colors text-gray-400 hover:text-ink"
          >
            <ChevronLeft :size="20" />
          </button>
          <p class="text-sm text-gray-700 font-mono italic min-w-[120px] text-center capitalize">
            {{ monthLabel }}
          </p>
          <button
            @click="nextMonth"
            class="p-1 hover:bg-black/5 rounded transition-colors text-gray-400 hover:text-ink"
          >
            <ChevronRight :size="20" />
          </button>
        </div>
      </div>
      <button
        @click="openDrawer"
        class="p-2 text-gray-300 hover:text-ink transition-colors"
        title="Menu"
        aria-label="Abrir menu"
      >
        <Menu :size="20" />
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
              inputmode="decimal"
              pattern="[0-9,.\-]*"
              class="w-24 text-right bg-transparent font-mono text-sm border-b border-black/5 focus:border-black/20 focus:outline-none transition-all py-1 placeholder:opacity-20"
              :value="balanceInputs[acc.id] ?? ''"
              placeholder="0"
              @input="onBalanceInput(acc.id, ($event.target as HTMLInputElement).value)"
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
          <span
            class="font-mono text-base font-bold"
            :class="currentAssets >= 0 ? 'text-emerald-700' : 'text-red-700'"
          >
            {{ formatCurrency(currentAssets) }}
          </span>
        </div>
      </div>
    </section>

    <!-- Movements Section -->
    <section class="mb-12 md:mb-20">
      <div class="flex items-center justify-between mb-4 md:mb-6">
        <h2 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          <Calculator :size="14" /> Entradas e Saídas
        </h2>
        <button
          v-if="fixedTemplates.length > 0"
          @click="applyFixedTemplates"
          :disabled="pendingFixedCount === 0"
          class="flex items-center gap-1.5 text-xs transition-colors border-b border-transparent"
          :class="pendingFixedCount === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-ink hover:border-ink'"
          title="Aplicar lançamentos fixos a este mês"
        >
          <Pin :size="12" />
          <span>Aplicar Fixos</span>
          <span
            v-if="pendingFixedCount > 0"
            class="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-ink text-white leading-none"
          >
            {{ pendingFixedCount }}
          </span>
        </button>
      </div>

      <form @submit.prevent="addEntry" class="mb-4 flex flex-col sm:flex-row gap-2">
        <input
          v-model="newEntryDesc"
          type="text"
          placeholder="Ex: Salário, Aluguel..."
          class="flex-1 bg-white border border-black/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10 transition-all shadow-sm min-w-0"
        />
        <div class="flex gap-2">
          <input
            v-model="newEntryValue"
            type="text"
            inputmode="decimal"
            pattern="[0-9,.\-]*"
            placeholder="-1.200,00"
            class="flex-1 sm:w-28 bg-white border border-black/5 rounded-lg px-4 py-2 text-sm font-mono text-right focus:outline-none focus:ring-1 focus:ring-black/10 transition-all shadow-sm min-w-0"
          />
          <button
            type="button"
            @click="togglePinCurrent"
            class="rounded-lg px-3 py-2 transition-all active:scale-95 duration-200 shrink-0 border shadow-sm"
            :class="pinCurrent ? 'bg-ink text-white border-ink' : 'bg-white text-gray-400 border-black/5 hover:text-ink'"
            :title="pinCurrent ? 'Este lançamento será salvo como fixo' : 'Fixar como lançamento recorrente'"
            :aria-pressed="pinCurrent"
          >
            <Pin :size="16" />
          </button>
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
        <div class="absolute inset-0 pointer-events-none notebook-lines opacity-40" aria-hidden="true"></div>

        <div class="notebook-margin relative">
          <TransitionGroup name="entry" tag="div">
            <div
              v-for="entry in entries"
              :key="entry.id"
              class="group flex items-center gap-4 h-10 border-b border-black/5 transition-all"
              :class="entry.isPaid ? 'opacity-40' : 'opacity-100'"
            >
              <button
                @click="togglePaid(entry.id)"
                class="text-gray-300 hover:text-ink transition-colors shrink-0 outline-none"
                :title="entry.isPaid ? 'Marcar como pendente' : 'Marcar como pago'"
              >
                <CheckCircle2 v-if="entry.isPaid" :size="18" class="text-emerald-500" />
                <Circle v-else :size="18" />
              </button>

              <span
                class="flex-1 text-sm transition-all truncate pr-2 flex items-center gap-1.5 min-w-0"
                :class="entry.isPaid ? 'line-through text-gray-500' : 'font-medium'"
              >
                <PinOff
                  v-if="entry.fixedTemplateId"
                  :size="10"
                  class="text-gray-300 hover:text-red-400 cursor-pointer shrink-0"
                  @click.stop="unfixEntry(entry.id)"
                  title="Desafixar deste modelo"
                />
                <span class="truncate">{{ entry.description }}</span>
              </span>

              <div class="flex items-center gap-3 shrink-0">
                <span
                  class="font-mono text-sm"
                  :class="[entry.value >= 0 ? 'text-emerald-600' : 'text-red-500', entry.isPaid ? 'line-through' : '']"
                >
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

          <div
            v-if="entries.length === 0"
            class="py-12 flex flex-col items-center justify-center text-gray-300 gap-2 select-none"
          >
            <Calculator :size="32" :stroke-width="1" />
            <p class="text-[10px] uppercase tracking-widest font-bold">Anote aqui suas despesas</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Fixed Summary Panel -->
    <footer class="fixed bottom-0 left-0 right-0 p-4 md:bottom-6 md:px-6 flex justify-center pointer-events-none z-50">
      <Transition name="footer" appear>
        <div
          class="bg-ink text-white w-full max-w-lg px-4 py-4 md:px-8 md:py-5 rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-between md:justify-center gap-4 md:gap-12 pointer-events-auto border border-white/5 backdrop-blur-md"
        >
          <div class="flex flex-col">
            <span class="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-gray-500 mb-0.5 md:mb-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span class="hidden xs:inline">Previsão</span> Saldo
            </span>
            <span class="text-lg md:text-2xl font-mono tracking-tighter font-semibold">
              {{ formatCurrency(projectedSaldo) }}
            </span>
          </div>

          <div class="h-8 md:h-10 w-px bg-white/10"></div>

          <div class="flex flex-col text-right md:text-left">
            <span class="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-gray-500 mb-0.5 md:mb-1 flex items-center justify-end md:justify-start gap-1">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="pendingMovements >= 0 ? 'bg-sky-500' : 'bg-red-500'"
              ></span>
              Pendente
            </span>
            <span
              class="text-base md:text-xl font-mono tracking-tighter opacity-80"
              :class="pendingMovements >= 0 ? 'text-sky-200' : 'text-red-200'"
            >
              {{ formatCurrency(pendingMovements) }}
            </span>
          </div>
        </div>
      </Transition>
    </footer>

    <!-- Floating help hint -->
    <div class="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 text-[9px] md:text-[10px] text-gray-400 uppercase tracking-widest font-medium text-center w-full px-4 animate-pulse pointer-events-none">
      Toque no círculo para confirmar o pagamento
    </div>

    <!-- Side Drawer (right to left) -->
    <Transition name="drawer-fade">
      <div
        v-if="isDrawerOpen"
        @click="closeDrawer"
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
        aria-hidden="true"
      ></div>
    </Transition>
    <Transition name="drawer-slide">
      <aside
        v-if="isDrawerOpen"
        class="fixed top-0 right-0 bottom-0 w-[88vw] max-w-sm bg-paper z-[70] shadow-2xl flex flex-col"
        role="dialog"
        aria-label="Menu lateral"
        @click.stop
      >
        <header class="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <h2 class="text-sm font-semibold uppercase tracking-widest text-gray-500">Menu</h2>
          <button
            @click="closeDrawer"
            class="p-2 -mr-2 text-gray-400 hover:text-ink transition-colors"
            title="Fechar"
            aria-label="Fechar menu"
          >
            <X :size="20" />
          </button>
        </header>

        <div class="flex-1 overflow-y-auto px-5 py-5 space-y-8">
          <!-- Fixed Templates Section -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
                <Pin :size="12" /> Lançamentos Fixos
              </h3>
              <span
                v-if="fixedTemplates.length > 0"
                class="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-ink text-white leading-none"
              >
                {{ fixedTemplates.length }}
              </span>
            </div>

            <button
              v-if="fixedTemplates.length > 0"
              @click="applyFixedTemplates"
              :disabled="pendingFixedCount === 0"
              class="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all"
              :class="pendingFixedCount === 0
                ? 'border-black/5 text-gray-300 cursor-not-allowed bg-white/40'
                : 'border-ink bg-ink text-white hover:opacity-90 active:scale-[0.98]'"
            >
              <Pin :size="14" />
              <span>Aplicar ao mês</span>
              <span
                v-if="pendingFixedCount > 0"
                class="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-white text-ink leading-none"
              >
                {{ pendingFixedCount }}
              </span>
            </button>

            <div v-if="fixedTemplates.length === 0" class="text-xs text-gray-400 italic">
              Nenhum modelo. Use o botão 📌 no formulário de novo lançamento para fixar um item.
            </div>

            <ul v-else class="space-y-2">
              <li
                v-for="tpl in fixedTemplates"
                :key="tpl.id"
                class="group flex items-center gap-3 p-3 rounded-lg border border-black/5 bg-white/70 shadow-sm"
              >
                <Pin :size="12" class="text-gray-400 shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="text-sm truncate">{{ tpl.description }}</div>
                  <div
                    class="font-mono text-xs"
                    :class="tpl.value >= 0 ? 'text-emerald-600' : 'text-red-500'"
                  >
                    {{ formatCurrency(tpl.value) }}
                  </div>
                </div>
                <button
                  @click="removeFixedTemplate(tpl.id)"
                  class="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  title="Remover modelo"
                  aria-label="Remover modelo"
                >
                  <Trash2 :size="14" />
                </button>
              </li>
            </ul>
          </section>

          <!-- Danger Zone -->
          <section>
            <h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              <RefreshCcw :size="12" /> Zona de perigo
            </h3>
            <button
              @click="resetMonth"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 active:scale-[0.98] transition-all"
            >
              <RefreshCcw :size="14" />
              <span>Resetar mês</span>
            </button>
            <p class="mt-2 text-[10px] text-gray-400 leading-relaxed">
              Remove todos os lançamentos do mês aberto. Os modelos fixos são preservados.
            </p>
          </section>
        </div>
      </aside>
    </Transition>
  </div>
</template>
