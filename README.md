# Finanças Diárias — Estilo Caderno

Uma ferramenta dinâmica e visual para controle financeiro pessoal, inspirada em
anotações de caderno, com cálculo automático de saldo e projeção mês a mês.
Todos os dados ficam salvos no `localStorage` do navegador — sem cadastro, sem
servidor, sem nuvem.

## ✨ Features

### 📓 Visual estilo caderno
- Fundo em tom papel (`#F8F7F4`) com tipografia que mistura **Inter** (texto) e
  **JetBrains Mono** (valores numéricos).
- Linhas horizontais decorativas (`notebook-lines`) imitando pauta de caderno.
- Margem vermelha lateral (`notebook-margin`) reforçando a estética manuscrita.

### 🏦 Gestão de contas e faturas
- Cadastro ilimitado de contas/cartões (ex.: *Fatura Nubank*, *Itaú*).
- Definições das contas persistidas no `localStorage` e compartilhadas entre
  todos os meses.
- **Reordenação** das contas por botões de seta (para cima / para baixo).
- **Remoção** de conta com confirmação.
- **Edição inline** do saldo de cada conta por mês (aceita vírgula como
  separador decimal).
- Atalhos para adicionar novo banco com apenas um clique.

### 📅 Navegação por mês
- Cabeçalho com mês/ano atual (formatado em **português do Brasil**).
- Botões `‹` e `›` para navegar entre meses sem perder contexto.
- Cada mês é uma "página" independente de dados, com chaves `yyyy-MM`.

### ➕ Lançamentos de entradas e saídas
- Formulário rápido com **descrição** e **valor** (aceita `-1.200,00`).
- Valor é colorizado: verde para entradas, vermelho para saídas.
- Lançamentos são listados em ordem cronológica inversa (mais recente no topo).
- Toque no **círculo** ao lado do item para alternar entre **pago** e
  **pendente** (riscado e com opacidade reduzida quando pago).
- **Exclusão** individual de lançamentos.
- Botão de **resetar mês** com confirmação para limpar todos os lançamentos
  do mês corrente.

### 📌 Lançamentos fixos (recorrentes)
- Botão **📌** no formulário de novo lançamento transforma o item em um
  **modelo fixo** salvo no `localStorage` (namespace `fin_fixed_templates`).
- A **lista de modelos** e a ação de **aplicar** ficam no **menu lateral**
  (drawer), junto com a opção de remover cada modelo e de resetar o mês.
- Lançamentos aplicados carregam um pequeno ícone **📌** que, ao ser clicado,
  **desafixa** a entrada do modelo (sem excluir o lançamento).
- Duplicação é evitada via `fixedTemplateId` na `Entry`, não por
  descrição/valor — editar uma instância aplicada não causa duplicação na
  próxima aplicação.

### 🧮 Cálculos automáticos
- **Saldo Atual Bancário** = soma dos saldos de todas as contas do mês.
- **Pendente** = soma dos valores dos lançamentos ainda não pagos.
- **Previsão de Saldo** = `Saldo Atual + Pendente`, exibido em painel fixo na
  base da tela.
- Todos os valores formatados em **BRL (R$)** via `Intl.NumberFormat`.

### 💾 Persistência local
- Composable `useLocalStorage` para três namespaces:
  - `fin_account_defs` → lista de contas cadastradas.
  - `fin_month_pages` → dicionário `{ "yyyy-MM": { entries, balances } }`.
  - `fin_fixed_templates` → lista de modelos de lançamentos recorrentes.
- Recuperação automática dos dados ao reabrir o app em outra sessão/dispositivo
  com o mesmo navegador.

### 🎨 UI/UX
- Layout responsivo, **mobile-first**, com largura máxima de `2xl`.
- Cabeçalho, formulário e painel de resumo otimizados para toque.
- Painel de resumo **fixo** na parte inferior (glassmorphism) com bolinhas
  coloridas indicando o status.
- Dica flutuante pulsante: *"Toque no círculo para confirmar o pagamento"*.
- **Menu lateral** deslizante da direita para a esquerda, aberto por um botão
  no header, com backdrop desfocado. Reúne:
  - Lista de **Lançamentos Fixos** com botão de aplicar ao mês e remover.
  - **Resetar mês** (com confirmação) em uma seção de "zona de perigo".
  - Fecha por clique no backdrop, no `X` ou pela tecla `Esc`.
- Animações sutis com `<TransitionGroup>` e `<Transition>` do próprio Vue:
  - Entrada/saída dos lançamentos (`name="entry"` + `tag="div"`).
  - Surgimento inicial do painel de resumo (`name="footer" appear`).
  - Backdrop do drawer (`name="drawer-fade"`) e painel deslizante
    (`name="drawer-slide"`, easing `cubic-bezier(0.32, 0.72, 0, 1)`).
- Suporte a `selection:bg-red-100` para uma seleção de texto coerente com o
  tema.

## 🛠️ Stack

- **Vue 3** (Options API) + **TypeScript** com `<script setup lang="ts">` /
  `defineComponent`.
- **Vite 6** com `@vitejs/plugin-vue` e `@tailwindcss/vite`.
- **Tailwind CSS 4** com tema customizado em CSS (`@theme`).
- **lucide-vue-next** para ícones.
- **date-fns** + locale `pt-BR` para manipulação de datas.

## 🚀 Rodando localmente

**Pré-requisitos:** Node.js

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Rode o app em modo desenvolvimento:
   ```bash
   npm run dev
   ```
   O Vite servirá em `http://localhost:3000` (host `0.0.0.0`).
3. Para gerar build de produção:
   ```bash
   npm run build
   npm run preview
   ```
4. Lint de tipos:
   ```bash
   npm run lint
   ```

## 🗂️ Estrutura

```
.
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.vue            # Componente raiz (UI + estado via Options API)
    ├── index.css          # Tema Tailwind, fontes e estilo caderno
    ├── env.d.ts           # Tipagens de ambiente
    ├── main.ts            # Bootstrap Vue (createApp)
    └── composables/
        └── useLocalStorage.ts  # Helpers loadFromStorage/saveToStorage
```

## 📝 Licença

Apache-2.0.
