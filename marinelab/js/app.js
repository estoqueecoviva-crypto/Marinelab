/* ============================================
   MARINE LAB - App Controller
   ============================================ */

const App = {
    session: null,
    currentView: 'dashboard',
    cache: {
        users: [],
        trips: [],
        expenses: []
    },
    selectedTripId: null,

    async init() {
        this.session = Auth.requireAuth();
        if (!this.session) return;

        // Render user info
        document.getElementById('userAvatar').textContent = Utils.initials(this.session.name);
        document.getElementById('userName').textContent = this.session.name;
        document.getElementById('userRole').textContent = this.session.role === 'admin' ? 'Administrador' : 'Funcionário';

        // Hide admin-only items if not admin
        if (!Auth.isAdmin()) {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }

        // Sidebar nav
        document.querySelectorAll('.nav-item').forEach(el => {
            el.addEventListener('click', () => {
                const view = el.dataset.view;
                if (view) this.navigate(view);
            });
        });

        // Logout
        document.getElementById('btnLogout').addEventListener('click', async () => {
            if (await Utils.confirmDialog('Deseja realmente sair?')) {
                Auth.logout();
            }
        });

        // Menu toggle (mobile)
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        // Quick actions
        document.getElementById('btnQuickExpense').addEventListener('click', () => Forms.openExpense());
        document.getElementById('btnNewTrip').addEventListener('click', () => Forms.openTrip());

        // Modal close buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.close;
                this.closeModal(id);
            });
        });

        // Forms init
        Forms.init();

        // Carrega dados iniciais
        await this.reloadData();

        // Renderiza dashboard
        this.navigate('dashboard');
    },

    async reloadData() {
        try {
            const isAdmin = Auth.isAdmin();
            const [usersR, tripsR, expensesR] = await Promise.all([
                isAdmin ? API.list('users') : Promise.resolve({ data: [] }),
                API.list('trips'),
                API.list('expenses')
            ]);
            this.cache.users = (usersR.data || [])
                .filter(u => !u.deleted)
                .map(({ password, ...safeUser }) => safeUser);
            this.cache.trips = (tripsR.data || []).filter(t => !t.deleted);
            this.cache.expenses = (expensesR.data || []).filter(e => !e.deleted);
        } catch (err) {
            Utils.showToast('Erro ao carregar dados', 'error');
        }
    },

    navigate(view) {
        // Restrição admin
        const adminViews = ['approvals', 'reports', 'users'];
        if (adminViews.includes(view) && !Auth.isAdmin()) {
            Utils.showToast('Acesso restrito', 'warning');
            return;
        }

        this.currentView = view;
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.view === view);
        });

        // Fecha sidebar mobile
        document.getElementById('sidebar').classList.remove('open');

        // Atualiza topbar
        const titles = {
            dashboard: { title: 'Dashboard', breadcrumb: 'Visão Geral' },
            trips: { title: 'Viagens', breadcrumb: 'Gestão de Viagens' },
            expenses: { title: 'Gastos', breadcrumb: 'Lançamentos' },
            approvals: { title: 'Aprovações', breadcrumb: 'Despesas Pendentes' },
            reports: { title: 'Relatórios', breadcrumb: 'Análises e Exportações' },
            users: { title: 'Usuários', breadcrumb: 'Administração' },
            'trip-detail': { title: 'Detalhes da Viagem', breadcrumb: 'Viagem' }
        };
        const meta = titles[view] || { title: 'Marine Lab', breadcrumb: '' };
        document.getElementById('topTitle').textContent = meta.title;
        document.getElementById('topBreadcrumb').textContent = meta.breadcrumb;

        // Esconder botão "Nova Viagem" em algumas views
        document.getElementById('btnNewTrip').style.display = (view === 'trips' && Auth.isAdmin()) ? '' : 'none';

        // Render
        Views.render(view);
    },

    openModal(id) {
        document.getElementById(id).classList.add('active');
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    },

    // Helpers de cálculo
    getTripExpenses(tripId) {
        return this.cache.expenses.filter(e => e.trip_id === tripId);
    },

    getTripTotal(tripId) {
        return this.getTripExpenses(tripId).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    },

    getMyTrips() {
        if (Auth.isAdmin()) return this.cache.trips;
        return this.cache.trips.filter(t => t.employee_id === this.session.id);
    },

    getMyExpenses() {
        if (Auth.isAdmin()) return this.cache.expenses;
        return this.cache.expenses.filter(e => e.employee_id === this.session.id);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
