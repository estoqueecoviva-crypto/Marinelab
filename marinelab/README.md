# ⚓ Marine Lab • Controle de Viagens

Sistema completo de **controle de gastos em viagens corporativas** para a **Marine Lab**, empresa do segmento náutico.
Design moderno com identidade **náutica, luxuosa e minimalista** — paleta navy + dourado champagne.

---

## 🎯 Visão Geral

**Objetivo:** Permitir que funcionários registrem gastos durante viagens em tempo real e que a gestão acompanhe, analise e gere relatórios detalhados por viagem.

**Stack escolhido (100% gratuito para deploy):**
- **Frontend puro:** HTML5 + CSS3 + JavaScript Vanilla
- **UI:** Tipografia premium (Playfair Display + Inter), Font Awesome, paleta náutica luxuosa
- **Persistência:** API RESTful de tabelas integrada (sem servidor próprio)
- **Bibliotecas via CDN:**
  - Chart.js (gráficos)
  - jsPDF + AutoTable (exportação PDF)
  - SheetJS / XLSX (exportação Excel)

> 💡 Por ser uma aplicação 100% estática, pode ser deployada gratuitamente em **GitHub Pages, Netlify, Vercel ou Cloudflare Pages** — sem custo de servidor.

---

## ✅ Funcionalidades Implementadas

### 🔐 Autenticação
- Login com e-mail e senha
- Sessão persistida em `localStorage`
- 2 perfis: **Administrador** e **Funcionário**
- Restrição automática de menus por perfil
- Redirecionamento seguro

### 🧭 Cadastro de Viagens (Admin)
- Nome da viagem, funcionário responsável, datas, cidade/estado
- Objetivo, orçamento previsto, observações
- Status (Em andamento / Finalizada)
- Edição e visualização detalhada

### 💸 Registro Rápido de Gastos
- **Lançamento em 1 clique:** botão "Lançar Gasto" no topo
- Categorias com **botões grandes visuais** (Alimentação, Hospedagem, Combustível, Transporte, Outros)
- Campo "Outros" abre especificação automaticamente
- Data, hora (preenchidas automaticamente), valor, forma de pagamento
- Local + observações
- **Upload de comprovante** (imagem ou PDF, base64) com preview
- **📍 Captura de geolocalização GPS** (botão dedicado)
- **📷 Captura via câmera do celular** (atributo `capture="environment"`)

### 📊 Dashboard Inteligente
- KPIs: Total gasto, Total no mês, Viagens ativas, Média por viagem
- 📈 Gráfico de **gastos por categoria** (doughnut)
- 📈 Gráfico de **evolução mensal** (linha — últimos 6 meses)
- 🏆 Ranking dos **5 maiores gastos**

### 🗂 Painel Administrativo
- Todas as viagens em formato de cards modernos
- **Filtros:** funcionário, status, busca textual
- Visualização detalhada de cada viagem com:
  - Header com totais e % do orçamento
  - Resumo por categoria + gráfico
  - Tabela cronológica completa
  - Comprovantes anexados

### ✅ Aprovação de Despesas
- Status: Pendente / Aprovado / Recusado
- Modal de revisão com todos os dados + comprovante
- Notas de aprovação opcionais
- Lista dedicada de pendentes para o admin

### 📑 Relatórios e Exportação
- Relatório consolidado por viagem
- Ranking de funcionários
- **📄 Exportação em PDF profissional** (com identidade Marine Lab)
- **📊 Exportação em Excel** (.xlsx, múltiplas abas: Resumo + Lançamentos)
- Exportação consolidada de todos os dados

### 👥 Gestão de Usuários (Admin)
- CRUD completo de usuários
- Definição de perfil e departamento
- Ativação/desativação

### 🔍 Lista Global de Gastos
- Filtros avançados: categoria, viagem, período, busca
- Total filtrado em tempo real
- Visualização de comprovantes

### 📱 Experiência Mobile
- 100% responsivo (sidebar colapsa em menu hambúrguer)
- Botões grandes para uso em viagem
- Captura de câmera direta no celular

---

## 🚀 URIs / Páginas

| Caminho | Descrição |
|---------|-----------|
| `/index.html` | Página de **login** |
| `/app.html` | Aplicação principal (após autenticação) |

### Views internas (SPA-style via `data-view`)
- `dashboard` — Painel inteligente
- `trips` — Lista de viagens
- `trip-detail` — Detalhes de uma viagem
- `expenses` — Lançamentos com filtros
- `approvals` — Aprovação de despesas (admin)
- `reports` — Relatórios e exportações (admin)
- `users` — Gestão de usuários (admin)

---

## 🔑 Credenciais de Demonstração

Por segurança, o projeto não publica credenciais reais no repositório nem na tela de login.
Cadastre usuários de teste no ambiente local e utilize senhas fortes.

---

## 🗄️ Modelo de Dados

### Tabela `users`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| name | text | Nome completo |
| email | text | E-mail (login) |
| password | text | Hash da senha (`sha256$salt$hash`) |
| role | text | `admin` ou `employee` |
| department | text | Departamento |
| active | bool | Usuário ativo |

### Tabela `trips`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| name | text | Nome da viagem |
| employee_id / employee_name | text | Funcionário |
| start_date / end_date | text | Período |
| city / state | text | Local |
| purpose | text | Objetivo |
| budget | number | Orçamento (R$) |
| status | text | `em_andamento` ou `finalizada` |
| notes | rich_text | Observações |

### Tabela `expenses`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| trip_id / trip_name | text | Viagem associada |
| employee_id / employee_name | text | Funcionário |
| expense_date / expense_time | text | Data e hora |
| category | text | `alimentacao`, `hospedagem`, `combustivel`, `transporte`, `outros` |
| category_other | text | Especificação (se "outros") |
| amount | number | Valor (R$) |
| payment_method | text | `dinheiro`, `pix`, `cartao_credito`, `cartao_debito`, `transferencia`, `outros` |
| location | text | Cidade / estabelecimento |
| notes | rich_text | Observações |
| receipt_url | text | Comprovante (base64) |
| receipt_name | text | Nome do arquivo |
| geolocation | text | Coordenadas GPS |
| approval_status | text | `pendente`, `aprovado`, `recusado` |
| approval_notes | text | Notas da aprovação |

---

## 📂 Estrutura do Projeto

```
/
├── index.html          # Tela de login
├── app.html            # Aplicação principal
├── README.md
├── css/
│   └── style.css       # Tema Marine Lab (náutico/luxo/minimalista)
└── js/
    ├── api.js          # Wrapper para API RESTful + utilitários
    ├── auth.js         # Sessão / autenticação
    ├── login.js        # Lógica da tela de login
    ├── app.js          # Controlador principal
    ├── views.js        # Renderização de todas as telas
    ├── forms.js        # Modais (viagem, gasto, usuário, aprovação)
    └── reports.js      # Exportação PDF e Excel
```

---

## 🌐 Deploy 100% Gratuito (Recomendado)

Por ser uma aplicação totalmente estática, sugere-se:

1. **Recomendado** — Use a aba **Publish** desta plataforma (1 clique)
2. **GitHub Pages** — gratuito e ilimitado
3. **Netlify Drop** — arraste a pasta no [app.netlify.com/drop](https://app.netlify.com/drop)
4. **Vercel** — suporta zero-config para sites estáticos
5. **Cloudflare Pages** — CDN global gratuita

> Para deploy: vá ao botão **Publish** no topo da plataforma — gera URL pública instantaneamente.

---

## 🎨 Identidade Visual

- **Paleta:** Navy `#102A43` + Dourado Champagne `#C9A961` + Pearl `#F0F4F8`
- **Tipografia:** Playfair Display (títulos elegantes) + Inter (UI limpa) + JetBrains Mono (números)
- **Conceito:** Náutico, sofisticação minimalista, sensação de "iate de luxo"
- **Detalhes:** Ondas SVG no login, ícone âncora, gradientes sutis, sombras suaves

---

## 🔮 Recomendações de Próximos Passos

### Curto prazo
- [ ] Hash real de senhas (bcrypt no front via WebCrypto)
- [ ] Recuperação de senha por e-mail (requer serviço externo gratuito tipo EmailJS)
- [ ] Notificações no navegador (Web Notifications API)
- [ ] PWA: instalar como app no celular + funcionamento offline

### Médio prazo
- [ ] Anexar múltiplos comprovantes por gasto
- [ ] OCR no comprovante (extrair valor automaticamente — ex.: Tesseract.js)
- [ ] Política de limites por categoria/funcionário com alertas automáticos
- [ ] Comentários internos em despesas (chat por gasto)
- [ ] Modo escuro

### Longo prazo
- [ ] Integração com cartão corporativo via Open Finance
- [ ] App nativo (React Native / Flutter) reaproveitando a API
- [ ] Dashboard de previsão com IA (gastos esperados vs reais)
- [ ] Aprovação multi-nível com workflow

---

## 🛡️ Considerações de Segurança

> ⚠️ Este sistema usa autenticação simples (front-end). Para uso corporativo real, é altamente recomendado:
> - Hash de senhas (bcrypt/argon2)
> - Backend de autenticação (Firebase Auth, Auth0, Supabase — todos com tier gratuito)
> - HTTPS obrigatório
> - Rate-limiting em endpoints de login

---

## 📞 Suporte

Sistema desenvolvido sob medida para a **Marine Lab** — modernidade, luxo e minimalismo no segmento náutico.

**Lemas do projeto:** *"Navegue com controle. Lance com elegância."* ⚓
