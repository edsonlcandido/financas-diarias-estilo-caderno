# Backend com PocketBase — Plano de Migração

Plano para migrar o **Finanças Diárias — Estilo Caderno** de `localStorage` para um
backend real baseado em PocketBase, mantendo a UI atual e ganhando sincronização
entre dispositivos, multi-tenant e (opcionalmente) realtime.

---

## 1. Estado Atual

O app é um SPA Vue 3 + TypeScript com toda a lógica em `src/App.vue` e
persistência em três chaves do `localStorage`:

| Chave localStorage | Conteúdo | Cardinalidade |
|---|---|---|
| `fin_account_defs` | Contas cadastradas (`AccountDef[]`) | 1 por usuário |
| `fin_month_pages` | Páginas mensais com `entries` + `balances` | N por usuário (1 por mês) |
| `fin_fixed_templates` | Modelos de lançamentos fixos (`FixedTemplate[]`) | N por usuário |

```ts
interface AccountDef    { id: string; name: string }
interface Entry         { id: string; description: string; value: number; isPaid: boolean; createdAt: number; fixedTemplateId?: string }
interface FixedTemplate { id: string; description: string; value: number }
interface PageData      { entries: Entry[]; balances: Record<string, number> }
```

---

## 2. Modelo de Dados (Collections no PocketBase)

Recomendo quebrar `fin_month_pages` em 2 collections — o PocketBase lida muito
melhor com relacionamentos e queries por linha do que com JSONs aninhados.

| Collection | Campos | Relações | Regras de acesso |
|---|---|---|---|
| `users` | (já existe no PB) | — | — |
| `accounts` | `name` (text, required, min 1) | `user` (relation → users) | CRUD apenas para o dono |
| `monthly_pages` | `month_key` (text, regex `^\d{4}-\d{2}$`) | `user` (relation → users) | CRUD apenas para o dono |
| `entries` | `description` (text), `value` (number), `is_paid` (bool, default false), `created_at` (date), `fixed_template_id` (text, opcional) | `user`, `page` (relation → monthly_pages) | CRUD apenas para o dono; cascade delete do `page` |
| `balances` | `value` (number) | `user`, `page` (relation), `account` (relation) | CRUD apenas para o dono; cascade delete do `page` |
| `fixed_templates` | `description` (text), `value` (number) | `user` | CRUD apenas para o dono |

### Validações e índices sugeridos

- `monthly_pages.month_key`: índice **único composto** `(user, month_key)` — impede
  duas páginas para o mesmo mês.
- `entries.page` e `balances.page`: índice simples para acelerar a query
  "página do mês atual".
- `value` em `entries`/`balances`/`fixed_templates` deve ser `number` (o app
  trata o sinal: positivo = entrada, negativo = saída).
- Em `accounts.name`, configurar regra "não vazio".

### Exemplo de access rule (todas as collections)

```
listRule:    user = @request.auth.id
viewRule:    user = @request.auth.id
createRule:  user = @request.auth.id
updateRule:  user = @request.auth.id
deleteRule:  user = @request.auth.id
```

---

## 3. Autenticação

Hoje o app **não tem login**. Para multi-tenant no PB, é preciso adicionar.

- Tela de **login/cadastro** (e-mail + senha) usando `pb.collection("users")`.
- O SDK oficial guarda o token em `localStorage` automaticamente (`pb.authStore`).
- Todas as queries filtram por `user = @request.auth.id` (via filter ou
  access rules com `@request.auth.id`).
- O **drawer** ganha um item "Sair" e o **header** mostra o e-mail do usuário.
- **OAuth Google** opcional como melhoria futura (PB suporta nativamente).

---

## 4. Camada de Acesso (cliente Vue)

Três opções, da mais recomendada à mais simples:

### Opção A — SDK oficial `pocketbase` (Recomendada)

- Dependência `pocketbase` no `package.json`.
- `src/pb.ts` exporta uma instância singleton configurada com a `url` do PB.
- `src/composables/useFinance.ts` expõe APIs tipadas:
  - `listAccounts()`, `createAccount()`, `updateAccount()`, `deleteAccount()`, `reorderAccounts()`
  - `getOrCreatePage(monthKey)`, `listEntries(pageId)`, `addEntry()`, `updateEntry()`, `deleteEntry()`, `toggleEntryPaid()`
  - `upsertBalance(pageId, accountId, value)`
  - `listFixedTemplates()`, `addFixedTemplate()`, `deleteFixedTemplate()`
  - `applyFixedTemplates(pageId)` — cria N entries e marca `fixed_template_id`
- Cada método faz a query no PB e atualiza o estado reativo do `App.vue`
  (substituindo os watchers de `saveToStorage`).
- **Bônus**: `pb.collection('entries').subscribe('*', e => ...)` para
  **sync em tempo real** entre abas/dispositivos.

### Opção B — REST via `fetch`

- Mais código manual, sem realtime, sem tipos. Só vale a pena se houver
  restrição de bundle.

### Opção C — Wrapper que espelha `useLocalStorage` (não recomendo)

- Faria só `load/save` de blobs JSON. Perde queries, regras, realtime e
  multi-tenant. É um anti-padrão com PocketBase.

**Recomendação: Opção A.**

---

## 5. Hospedagem do PocketBase

| Cenário | Quando usar | Como |
|---|---|---|
| **Local junto ao front** (dev) | Desenvolver | Binário `./pocketbase serve` na porta `8090`; front aponta para `http://localhost:8090` |
| **Mesmo host do front** (prod simples) | Hobby / pessoal | Binário do PB no mesmo VPS atrás de Nginx. Front em `/`, PB em `/pb/`. O Express (`server.ts`) deixa de ser necessário. |
| **PaaS gerenciado** (Fly.io / Railway) | Sem tempo de sysadmin | Dockerfile baseado em `pocketbase/pocketbase`, volume persistente para `pb_data/`. |
| **PocketHost / externas** | Zero-config | Cobram; menos controle. |

Para esse projeto (uso pessoal, ~1 usuário), o cenário "mesmo VPS + Nginx"
é o melhor custo/benefício.

---

## 6. Migração dos Dados Existentes do `localStorage`

Script one-shot na primeira inicialização pós-login
(`src/composables/migrateFromLocalStorage.ts`):

1. Detecta se as chaves `fin_*` ainda existem no `localStorage`.
2. Se sim e o usuário está autenticado:
   - Lê os 3 blobs JSON.
   - Faz `POST` em massa nas collections correspondentes.
   - Remove as chaves locais após sucesso.
3. Mostra um modal de progresso:
   *"Migramos X contas, Y lançamentos e Z modelos para a nuvem."*
4. Fallback: se o usuário **não** quer criar conta, mantém o modo `localStorage`
   (caminho opcional que exige manter `useLocalStorage.ts` como branch paralelo).

---

## 7. Tratamento de Offline

PocketBase **não tem sync offline nativo**. Duas abordagens:

- **Sem offline** (mais simples): sem rede → botões desabilitados, banner
  "Você está offline". O app nunca foi 100% offline-friendly, então é
  aceitável.
- **Cache + fila de mutações** (mais trabalho): IndexedDB espelhando o estado
  e Service Worker com `BackgroundSync`. Aumento significativo de escopo.

**Recomendação**: começar sem offline. O app continua local-first em espírito
(carrega rápido do PB) e o offline pode ser adicionado depois.

---

## 8. Mudanças no `App.vue`

- Trocar `loadFromStorage` / `saveToStorage` por `await useFinance().loadAll()`.
- Substituir os `watch(...)` que salvam no `localStorage` por chamadas
  explícitas (`await createEntry(...)`, `await updateBalance(...)`).
- `applyFixedTemplates()` vira `async` (cria N entries no PB).
- `currentPage` deixa de ser computed puro: passa a buscar/criar o registro
  `monthly_pages` sob demanda (`getOrCreatePage(monthKey)`).
- Adicionar estado de loading (`isLoading`) e tratamento de erro com o
  modal `showAlert` já existente.

---

## 9. Estrutura de Arquivos Proposta

```
.
├── backend-pocketbase.md          # este documento
├── pocketbase                     # binário (gitignored)
├── pb_data/                       # dados do PB (gitignored)
├── pb_migrations/                 # migrations JS geradas via admin UI
├── server.ts                      # removido (PB cuida do estático)
├── src/
│   ├── App.vue                    # refatorado para usar useFinance()
│   ├── pb.ts                      # NOVO: singleton PocketBase
│   ├── main.ts
│   ├── index.css
│   ├── components/
│   │   ├── AuthScreen.vue         # NOVO: login / cadastro
│   │   └── ...
│   └── composables/
│       ├── useAuth.ts             # NOVO
│       ├── useFinance.ts          # NOVO: CRUD via PB
│       ├── migrateFromLocalStorage.ts  # NOVO
│       └── useLocalStorage.ts     # mantido (modo offline opcional)
└── ...
```

---

## 10. Passo a Passo de Execução

1. Baixar o binário do PocketBase e rodar `./pocketbase serve` localmente.
2. Criar as collections (`accounts`, `monthly_pages`, `entries`, `balances`,
   `fixed_templates`) via admin UI em `http://localhost:8090/_/`.
3. Configurar as **access rules** (`user = @request.auth.id`) em todas as
   collections.
4. Exportar as migrations JS para `pb_migrations/` (admin UI →
   "Generate migration JS").
5. Instalar `pocketbase` no front, criar `src/pb.ts` e `useFinance.ts`.
6. Reescrever `App.vue` substituindo o pipeline de `localStorage`.
7. Criar `AuthScreen.vue` e gate de autenticação.
8. Implementar migração one-shot do `localStorage` antigo.
9. Adicionar realtime subscriptions (opcional, barato).
10. Atualizar README com instruções para rodar PB + Vite juntos.

---

## 11. Variáveis de Ambiente Sugeridas

```env
# .env.local (front)
VITE_PB_URL=http://localhost:8090
```

```ts
// src/pb.ts
import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_PB_URL)
pb.autoCancellation(false)
```

---

## 12. Resumo das Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| SDK | `pocketbase` oficial | Tipos, realtime, auth prontos |
| Auth | E-mail + senha (OAuth depois) | Multi-tenant mínimo viável |
| Modelo | Collections relacionais (não JSON blob) | Queries e regras granulares |
| Offline | Sem offline (Fase 1) | Escopo controlado |
| Migração | Script one-shot pós-login | UX sem perda de dados |
| Hospedagem | Mesmo VPS + Nginx (Fase 1) | Barato e simples |
| Realtime | Subscribe nas collections principais | Sync grátis entre dispositivos |
