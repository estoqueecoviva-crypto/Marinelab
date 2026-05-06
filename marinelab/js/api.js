/* ============================================
   MARINE LAB - API Helpers (RESTful Tables)
   ============================================ */

const API = {
    BASE_PATH: 'tables',
    LOCAL_DB_KEY: 'marinelab_local_db_v1',
    LOCAL_FALLBACK_ENABLED: true,
    TABLES: ['users', 'trips', 'expenses'],

    _clone(value) {
        return JSON.parse(JSON.stringify(value));
    },

    _defaultLocalDb() {
        return {
            users: [
                {
                    id: 'user_admin',
                    name: 'Administrador',
                    email: 'admin@marinelab.com',
                    password: 'admin123',
                    role: 'admin',
                    department: 'Administração',
                    active: true
                },
                {
                    id: 'user_carlos',
                    name: 'Carlos',
                    email: 'carlos@marinelab.com',
                    password: '123456',
                    role: 'employee',
                    department: 'Operações',
                    active: true
                },
                {
                    id: 'user_ana',
                    name: 'Ana',
                    email: 'ana@marinelab.com',
                    password: '123456',
                    role: 'employee',
                    department: 'Financeiro',
                    active: true
                }
            ],
            trips: [],
            expenses: []
        };
    },

    _readLocalDb() {
        const raw = localStorage.getItem(this.LOCAL_DB_KEY);
        if (!raw) {
            const initial = this._defaultLocalDb();
            localStorage.setItem(this.LOCAL_DB_KEY, JSON.stringify(initial));
            return initial;
        }
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') throw new Error('db inválido');
            this.TABLES.forEach((table) => {
                if (!Array.isArray(parsed[table])) parsed[table] = [];
            });
            return parsed;
        } catch {
            const fallback = this._defaultLocalDb();
            localStorage.setItem(this.LOCAL_DB_KEY, JSON.stringify(fallback));
            return fallback;
        }
    },

    _writeLocalDb(db) {
        localStorage.setItem(this.LOCAL_DB_KEY, JSON.stringify(db));
    },

    _buildUrl(path, params = null) {
        const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
        const url = `${this.BASE_PATH}/${normalizedPath}`;
        if (!params) return url;
        const query = new URLSearchParams(params).toString();
        return query ? `${url}?${query}` : url;
    },

    async _request(path, options = {}, params = null) {
        const method = (options.method || 'GET').toUpperCase();
        try {
            const res = await fetch(this._buildUrl(path, params), options);
            if (!res.ok) {
                throw new Error(`Falha na API (${res.status})`);
            }
            if (res.status === 204) return true;
            return res.json();
        } catch (err) {
            if (this.LOCAL_FALLBACK_ENABLED) {
                return this._requestLocal(path, method, options, params);
            }
            if (err instanceof TypeError) {
                if (window.location.protocol === 'file:') {
                    throw new Error('Não abra o sistema pelo arquivo local. Rode em servidor HTTP (ex.: Live Server).');
                }
                if (!navigator.onLine) {
                    throw new Error('Sem conexão com a internet/rede interna.');
                }
                throw new Error('Falha de conexão com a API. Verifique se a rota /tables está disponível.');
            }
            throw err;
        }
    },

    _parsePath(path) {
        const [table, id] = String(path || '').split('/').filter(Boolean);
        return { table, id };
    },

    _requestLocal(path, method, options, params) {
        const { table, id } = this._parsePath(path);
        if (!this.TABLES.includes(table)) {
            throw new Error(`Tabela inválida: ${table}`);
        }

        const db = this._readLocalDb();
        const rows = db[table];

        if (method === 'GET' && !id) {
            const limit = Number(params?.limit || 1000);
            const data = rows.slice(0, Number.isFinite(limit) ? limit : 1000);
            return { data: this._clone(data) };
        }

        if (method === 'GET' && id) {
            const found = rows.find((row) => row.id === id);
            if (!found) throw new Error('Registro não encontrado');
            return this._clone(found);
        }

        if (method === 'POST') {
            const payload = JSON.parse(options.body || '{}');
            rows.push(payload);
            this._writeLocalDb(db);
            return this._clone(payload);
        }

        if (method === 'PUT') {
            const payload = JSON.parse(options.body || '{}');
            const index = rows.findIndex((row) => row.id === id);
            if (index < 0) throw new Error('Registro não encontrado');
            rows[index] = { ...payload, id };
            this._writeLocalDb(db);
            return this._clone(rows[index]);
        }

        if (method === 'PATCH') {
            const payload = JSON.parse(options.body || '{}');
            const index = rows.findIndex((row) => row.id === id);
            if (index < 0) throw new Error('Registro não encontrado');
            rows[index] = { ...rows[index], ...payload, id };
            this._writeLocalDb(db);
            return this._clone(rows[index]);
        }

        if (method === 'DELETE') {
            const index = rows.findIndex((row) => row.id === id);
            if (index < 0) throw new Error('Registro não encontrado');
            rows.splice(index, 1);
            this._writeLocalDb(db);
            return true;
        }

        throw new Error(`Método não suportado no modo local: ${method}`);
    },

    async list(table, params = {}) {
        return this._request(table, {}, { limit: 1000, ...params });
    },

    async get(table, id) {
        return this._request(`${table}/${id}`);
    },

    async create(table, data) {
        return this._request(table, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    async update(table, id, data) {
        return this._request(`${table}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    async patch(table, id, data) {
        return this._request(`${table}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    async remove(table, id) {
        return this._request(`${table}/${id}`, { method: 'DELETE' });
    }
};

/* ============ Utilities ============ */

const Utils = {
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('pt-BR');
    },

    formatDateTime(dateStr, timeStr) {
        const date = this.formatDate(dateStr);
        return timeStr ? `${date} ${timeStr}` : date;
    },

    todayISO() {
        return new Date().toISOString().split('T')[0];
    },

    nowTime() {
        const d = new Date();
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    },

    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    },

    initials(name) {
        if (!name) return '?';
        return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    },

    categoryLabel(cat) {
        const labels = {
            alimentacao: 'Alimentação',
            hospedagem: 'Hospedagem',
            combustivel: 'Combustível',
            transporte: 'Transporte',
            outros: 'Outros'
        };
        return labels[cat] || cat;
    },

    categoryIcon(cat) {
        const icons = {
            alimentacao: 'fa-utensils',
            hospedagem: 'fa-bed',
            combustivel: 'fa-gas-pump',
            transporte: 'fa-car',
            outros: 'fa-tag'
        };
        return icons[cat] || 'fa-tag';
    },

    paymentLabel(method) {
        const labels = {
            dinheiro: 'Dinheiro',
            pix: 'PIX',
            cartao_credito: 'Cartão Crédito',
            cartao_debito: 'Cartão Débito',
            transferencia: 'Transferência',
            outros: 'Outros'
        };
        return labels[method] || method;
    },

    statusLabel(status) {
        const labels = {
            em_andamento: 'Em Andamento',
            finalizada: 'Finalizada',
            pendente: 'Pendente',
            aprovado: 'Aprovado',
            recusado: 'Recusado'
        };
        return labels[status] || status;
    },

    statusBadgeClass(status) {
        const map = {
            em_andamento: 'badge-info',
            finalizada: 'badge-success',
            pendente: 'badge-warning',
            aprovado: 'badge-success',
            recusado: 'badge-danger'
        };
        return map[status] || 'badge-info';
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    showToast(message, type = 'success', duration = 3500) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><div class="text">${message}</div>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    confirmDialog(message) {
        return new Promise(resolve => resolve(window.confirm(message)));
    }
};
