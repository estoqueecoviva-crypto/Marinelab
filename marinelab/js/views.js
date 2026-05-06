/* ============================================
   MARINE LAB - Views (renderização)
   ============================================ */

const Views = {
    chartInstances: {},

    render(view) {
        const content = document.getElementById('pageContent');
        switch (view) {
            case 'dashboard':    this.renderDashboard(content); break;
            case 'trips':        this.renderTrips(content); break;
            case 'expenses':     this.renderExpenses(content); break;
            case 'approvals':    this.renderApprovals(content); break;
            case 'reports':      this.renderReports(content); break;
            case 'users':        this.renderUsers(content); break;
            case 'trip-detail':  this.renderTripDetail(content); break;
            default:             content.innerHTML = '<div class="empty-state"><i class="fas fa-compass"></i><h3>Página não encontrada</h3></div>';
        }
    },

    /* =================== DASHBOARD =================== */
    renderDashboard(container) {
        const expenses = App.getMyExpenses();
        const trips = App.getMyTrips();

        const totalGeral = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const tripsAtivas = trips.filter(t => t.status === 'em_andamento').length;
        const tripsFinalizadas = trips.filter(t => t.status === 'finalizada').length;
        const mediaPorViagem = trips.length ? totalGeral / trips.length : 0;

        // Gastos do mês atual
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;
        const totalMes = expenses
            .filter(e => (e.expense_date || '').startsWith(ym))
            .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

        // Por categoria
        const byCategory = {};
        expenses.forEach(e => {
            const c = e.category || 'outros';
            byCategory[c] = (byCategory[c] || 0) + parseFloat(e.amount || 0);
        });

        // Por mês (últimos 6)
        const byMonth = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            byMonth[k] = 0;
        }
        expenses.forEach(e => {
            const k = (e.expense_date || '').substring(0, 7);
            if (k in byMonth) byMonth[k] += parseFloat(e.amount || 0);
        });

        // Ranking maiores gastos (top 5)
        const topExp = [...expenses]
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
            .slice(0, 5);

        container.innerHTML = `
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="label">Total Gasto</div>
                    <div class="value">${Utils.formatCurrency(totalGeral)}</div>
                    <div class="meta">${expenses.length} lançamentos</div>
                    <i class="icon-corner fas fa-coins"></i>
                </div>
                <div class="kpi-card">
                    <div class="label">Total no Mês</div>
                    <div class="value">${Utils.formatCurrency(totalMes)}</div>
                    <div class="meta">${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
                    <i class="icon-corner fas fa-calendar-alt"></i>
                </div>
                <div class="kpi-card">
                    <div class="label">Viagens Ativas</div>
                    <div class="value">${tripsAtivas}</div>
                    <div class="meta">${tripsFinalizadas} finalizadas</div>
                    <i class="icon-corner fas fa-route"></i>
                </div>
                <div class="kpi-card">
                    <div class="label">Média por Viagem</div>
                    <div class="value">${Utils.formatCurrency(mediaPorViagem)}</div>
                    <div class="meta">${trips.length} viagens registradas</div>
                    <i class="icon-corner fas fa-chart-pie"></i>
                </div>
            </div>

            <div class="panels-row">
                <div class="panel">
                    <div class="panel-header">
                        <h3><i class="fas fa-chart-pie text-gold"></i> Gastos por Categoria</h3>
                    </div>
                    <div class="chart-container"><canvas id="chartCategory"></canvas></div>
                </div>
                <div class="panel">
                    <div class="panel-header">
                        <h3><i class="fas fa-chart-line text-gold"></i> Evolução Mensal</h3>
                    </div>
                    <div class="chart-container"><canvas id="chartMonthly"></canvas></div>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <h3><i class="fas fa-trophy text-gold"></i> Maiores Gastos</h3>
                </div>
                ${topExp.length === 0 ? this._emptyState('Nenhum gasto registrado ainda', 'fa-receipt') : `
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>#</th><th>Quem</th><th>Data</th><th>Categoria</th><th>Local</th><th>Viagem</th><th class="text-right">Valor</th></tr></thead>
                        <tbody>
                            ${topExp.map((e, i) => `
                                <tr>
                                    <td><strong style="color:var(--gold-luxury)">${i+1}º</strong></td>
                                    <td>${e.employee_name || '-'}</td>
                                    <td>${Utils.formatDateTime(e.expense_date, e.expense_time)}</td>
                                    <td><span class="category-icon cat-${e.category}"><i class="fas ${Utils.categoryIcon(e.category)}"></i></span> ${Utils.categoryLabel(e.category)}</td>
                                    <td>${e.location || '-'}</td>
                                    <td>${e.trip_name || '-'}</td>
                                    <td class="text-right"><strong>${Utils.formatCurrency(e.amount)}</strong></td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`}
            </div>
        `;

        // Charts
        this._destroyChart('chartCategory');
        this._destroyChart('chartMonthly');

        const catLabels = Object.keys(byCategory);
        if (catLabels.length > 0) {
            this.chartInstances.chartCategory = new Chart(document.getElementById('chartCategory'), {
                type: 'doughnut',
                data: {
                    labels: catLabels.map(c => Utils.categoryLabel(c)),
                    datasets: [{
                        data: catLabels.map(c => byCategory[c]),
                        backgroundColor: ['#E07856','#5C8AA0','#4A4A4A','#7A9E7E','#C9A961']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { family: 'Inter' } } }
                    }
                }
            });
        }

        const monthLabels = Object.keys(byMonth).map(k => {
            const [y,m] = k.split('-');
            return new Date(y, m-1).toLocaleDateString('pt-BR', { month: 'short' });
        });
        this.chartInstances.chartMonthly = new Chart(document.getElementById('chartMonthly'), {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Gasto Total',
                    data: Object.values(byMonth),
                    borderColor: '#C9A961',
                    backgroundColor: 'rgba(201, 169, 97, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#102A43',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') }
                    }
                }
            }
        });
    },

    /* =================== TRIPS =================== */
    renderTrips(container) {
        const trips = App.getMyTrips();

        container.innerHTML = `
            <div class="panel" style="margin-bottom:20px;">
                <div class="filter-bar" style="margin:0;">
                    <div class="form-group">
                        <label>Buscar</label>
                        <input type="text" class="form-control" id="filterTripSearch" placeholder="Nome, cidade...">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select class="form-control" id="filterTripStatus">
                            <option value="">Todos</option>
                            <option value="em_andamento">Em Andamento</option>
                            <option value="finalizada">Finalizada</option>
                        </select>
                    </div>
                    ${Auth.isAdmin() ? `
                    <div class="form-group">
                        <label>Funcionário</label>
                        <select class="form-control" id="filterTripEmployee">
                            <option value="">Todos</option>
                            ${App.cache.users.filter(u => u.role === 'employee').map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                        </select>
                    </div>` : ''}
                </div>
            </div>
            <div id="tripsContainer"></div>
        `;

        const renderList = () => {
            const search = document.getElementById('filterTripSearch').value.toLowerCase();
            const status = document.getElementById('filterTripStatus').value;
            const employee = Auth.isAdmin() ? document.getElementById('filterTripEmployee').value : '';

            let filtered = trips.filter(t => {
                if (search && !((t.name||'').toLowerCase().includes(search) || (t.city||'').toLowerCase().includes(search))) return false;
                if (status && t.status !== status) return false;
                if (employee && t.employee_id !== employee) return false;
                return true;
            });

            const cont = document.getElementById('tripsContainer');
            if (filtered.length === 0) {
                cont.innerHTML = this._emptyState('Nenhuma viagem encontrada', 'fa-route', Auth.isAdmin() ? 'Crie a primeira viagem clicando em "Nova Viagem"' : 'Aguarde a criação de uma viagem para você');
                return;
            }
            cont.innerHTML = `<div class="trip-grid">${filtered.map(t => {
                const total = App.getTripTotal(t.id);
                const expCount = App.getTripExpenses(t.id).length;
                const budget = parseFloat(t.budget || 0);
                const pct = budget > 0 ? Math.min(100, (total/budget)*100) : 0;
                return `
                <div class="trip-card" data-trip-id="${t.id}">
                    <div class="trip-header">
                        <div>
                            <h4>${t.name}</h4>
                            <div class="trip-meta"><i class="fas fa-user"></i> ${t.employee_name || '-'}</div>
                            <div class="trip-meta"><i class="fas fa-map-marker-alt"></i> ${t.city || '-'}${t.state ? '/' + t.state : ''}</div>
                            <div class="trip-meta"><i class="fas fa-calendar"></i> ${Utils.formatDate(t.start_date)} → ${Utils.formatDate(t.end_date)}</div>
                        </div>
                        <span class="badge ${Utils.statusBadgeClass(t.status)}">${Utils.statusLabel(t.status)}</span>
                    </div>
                    <div class="trip-stats">
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em;">Total Gasto</div>
                            <div class="total-spent"><span class="currency">R$</span>${total.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                            <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${expCount} ${expCount === 1 ? 'gasto' : 'gastos'}${budget > 0 ? ` • ${pct.toFixed(0)}% do orçamento` : ''}</div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            ${Auth.isAdmin() ? `<button class="btn btn-secondary btn-sm" data-action="edit-trip" data-id="${t.id}"><i class="fas fa-pen"></i></button>` : ''}
                            ${Auth.isAdmin() ? `<button class="btn btn-danger btn-sm" data-action="del-trip" data-id="${t.id}"><i class="fas fa-trash"></i></button>` : ''}
                            <button class="btn btn-gold btn-sm" data-action="view-trip" data-id="${t.id}"><i class="fas fa-eye"></i> Ver</button>
                        </div>
                    </div>
                </div>`;
            }).join('')}</div>`;

            // Event handlers
            cont.querySelectorAll('[data-action="view-trip"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    App.selectedTripId = btn.dataset.id;
                    App.navigate('trip-detail');
                });
            });
            cont.querySelectorAll('[data-action="edit-trip"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Forms.openTrip(btn.dataset.id);
                });
            });
            cont.querySelectorAll('[data-action="del-trip"]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this._deleteTrip(btn.dataset.id);
                });
            });
            cont.querySelectorAll('.trip-card').forEach(card => {
                card.addEventListener('click', () => {
                    App.selectedTripId = card.dataset.tripId;
                    App.navigate('trip-detail');
                });
            });
        };

        document.getElementById('filterTripSearch').addEventListener('input', renderList);
        document.getElementById('filterTripStatus').addEventListener('change', renderList);
        if (Auth.isAdmin()) document.getElementById('filterTripEmployee').addEventListener('change', renderList);
        renderList();
    },

    /* =================== TRIP DETAIL =================== */
    renderTripDetail(container) {
        const trip = App.cache.trips.find(t => t.id === App.selectedTripId);
        if (!trip) {
            container.innerHTML = this._emptyState('Viagem não encontrada', 'fa-route');
            return;
        }
        const expenses = App.getTripExpenses(trip.id).sort((a,b) => {
            const ad = (a.expense_date||'') + ' ' + (a.expense_time||'');
            const bd = (b.expense_date||'') + ' ' + (b.expense_time||'');
            return ad.localeCompare(bd);
        });
        const total = App.getTripTotal(trip.id);
        const budget = parseFloat(trip.budget || 0);

        const byCategory = {};
        expenses.forEach(e => {
            const c = e.category || 'outros';
            byCategory[c] = (byCategory[c] || 0) + parseFloat(e.amount || 0);
        });

        container.innerHTML = `
            <button class="btn btn-secondary btn-sm mb-2" id="btnBackTrips"><i class="fas fa-arrow-left"></i> Voltar</button>

            <div class="trip-detail-header">
                <span class="badge ${Utils.statusBadgeClass(trip.status)}">${Utils.statusLabel(trip.status)}</span>
                <h2>${trip.name}</h2>
                <div class="meta-row">
                    <span><i class="fas fa-user"></i> ${trip.employee_name}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${trip.city}${trip.state ? '/' + trip.state : ''}</span>
                    <span><i class="fas fa-calendar"></i> ${Utils.formatDate(trip.start_date)} → ${Utils.formatDate(trip.end_date)}</span>
                    ${trip.purpose ? `<span><i class="fas fa-bullseye"></i> ${trip.purpose}</span>` : ''}
                </div>
                <div class="total-display">
                    <div class="label">Total Gasto</div>
                    <div class="amount">${Utils.formatCurrency(total)}</div>
                    ${budget > 0 ? `<div style="font-size:13px; color:rgba(255,255,255,0.7); margin-top:4px;">Orçamento: ${Utils.formatCurrency(budget)} • ${((total/budget)*100).toFixed(1)}% utilizado</div>` : ''}
                </div>
            </div>

            <div class="panels-row">
                <div class="panel">
                    <div class="panel-header">
                        <h3><i class="fas fa-chart-pie text-gold"></i> Por Categoria</h3>
                    </div>
                    ${Object.keys(byCategory).length === 0 ? '<p class="text-muted text-center">Sem gastos</p>' : `
                    <div class="chart-container" style="height:280px;"><canvas id="chartTripCat"></canvas></div>`}
                </div>
                <div class="panel">
                    <div class="panel-header">
                        <h3><i class="fas fa-list text-gold"></i> Resumo</h3>
                    </div>
                    <table class="data-table">
                        <tbody>
                            ${Object.entries(byCategory).map(([c,v]) => `
                                <tr>
                                    <td><span class="category-icon cat-${c}"><i class="fas ${Utils.categoryIcon(c)}"></i></span> ${Utils.categoryLabel(c)}</td>
                                    <td class="text-right"><strong>${Utils.formatCurrency(v)}</strong></td>
                                    <td class="text-right text-muted">${total > 0 ? ((v/total)*100).toFixed(1) : 0}%</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <h3><i class="fas fa-receipt text-gold"></i> Lançamentos (${expenses.length})</h3>
                    <div class="actions">
                        <button class="btn btn-secondary btn-sm" id="btnExportPDF"><i class="fas fa-file-pdf"></i> PDF</button>
                        <button class="btn btn-secondary btn-sm" id="btnExportExcel"><i class="fas fa-file-excel"></i> Excel</button>
                        <button class="btn btn-gold btn-sm" id="btnAddExp"><i class="fas fa-plus"></i> Novo Gasto</button>
                    </div>
                </div>
                ${expenses.length === 0 ? this._emptyState('Nenhum gasto registrado nesta viagem', 'fa-receipt') : `
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>Data/Hora</th><th>Quem</th><th>Categoria</th><th>Local</th><th>Pagto</th><th>Status</th><th class="text-right">Valor</th><th></th></tr></thead>
                        <tbody>
                            ${expenses.map(e => `
                                <tr>
                                    <td><strong>${Utils.formatDate(e.expense_date)}</strong><br><small class="text-muted">${e.expense_time || ''}</small></td>
                                    <td>${e.employee_name || '-'}</td>
                                    <td><span class="category-icon cat-${e.category}"><i class="fas ${Utils.categoryIcon(e.category)}"></i></span> ${Utils.categoryLabel(e.category)}${e.category === 'outros' && e.category_other ? ` <small>(${e.category_other})</small>` : ''}</td>
                                    <td>${e.location || '-'}</td>
                                    <td><small>${Utils.paymentLabel(e.payment_method)}</small></td>
                                    <td><span class="badge ${Utils.statusBadgeClass(e.approval_status || 'pendente')}">${Utils.statusLabel(e.approval_status || 'pendente')}</span></td>
                                    <td class="text-right"><strong>${Utils.formatCurrency(e.amount)}</strong></td>
                                    <td>
                                        ${e.receipt_url ? `<button class="btn btn-secondary btn-sm" data-action="view-receipt" data-id="${e.id}" title="Ver comprovante"><i class="fas fa-paperclip"></i></button>` : ''}
                                        <button class="btn btn-secondary btn-sm" data-action="edit-exp" data-id="${e.id}" title="Editar"><i class="fas fa-pen"></i></button>
                                        ${Auth.isAdmin() ? `<button class="btn btn-secondary btn-sm" data-action="del-exp" data-id="${e.id}" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`}
            </div>
        `;

        document.getElementById('btnBackTrips').addEventListener('click', () => App.navigate('trips'));
        document.getElementById('btnAddExp').addEventListener('click', () => Forms.openExpense(null, trip.id));
        document.getElementById('btnExportPDF').addEventListener('click', () => Reports.exportTripPDF(trip));
        document.getElementById('btnExportExcel').addEventListener('click', () => Reports.exportTripExcel(trip));

        container.querySelectorAll('[data-action="edit-exp"]').forEach(b => b.addEventListener('click', () => Forms.openExpense(b.dataset.id)));
        container.querySelectorAll('[data-action="del-exp"]').forEach(b => b.addEventListener('click', () => this._deleteExpense(b.dataset.id)));
        container.querySelectorAll('[data-action="view-receipt"]').forEach(b => b.addEventListener('click', () => this._viewReceipt(b.dataset.id)));

        if (Object.keys(byCategory).length > 0) {
            this._destroyChart('chartTripCat');
            this.chartInstances.chartTripCat = new Chart(document.getElementById('chartTripCat'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(byCategory).map(c => Utils.categoryLabel(c)),
                    datasets: [{
                        data: Object.values(byCategory),
                        backgroundColor: ['#E07856','#5C8AA0','#4A4A4A','#7A9E7E','#C9A961']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    },

    /* =================== EXPENSES (lista global) =================== */
    renderExpenses(container) {
        const expenses = App.getMyExpenses();

        container.innerHTML = `
            <div class="filter-bar">
                <div class="form-group">
                    <label>Buscar</label>
                    <input type="text" class="form-control" id="filExpSearch" placeholder="Local, observação...">
                </div>
                <div class="form-group">
                    <label>Categoria</label>
                    <select class="form-control" id="filExpCat">
                        <option value="">Todas</option>
                        <option value="alimentacao">Alimentação</option>
                        <option value="hospedagem">Hospedagem</option>
                        <option value="combustivel">Combustível</option>
                        <option value="transporte">Transporte</option>
                        <option value="outros">Outros</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Viagem</label>
                    <select class="form-control" id="filExpTrip">
                        <option value="">Todas</option>
                        ${App.cache.trips.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>De</label>
                    <input type="date" class="form-control" id="filExpFrom">
                </div>
                <div class="form-group">
                    <label>Até</label>
                    <input type="date" class="form-control" id="filExpTo">
                </div>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <h3 id="expCount">Lançamentos</h3>
                    <div class="actions">
                        <strong id="expTotal" style="color:var(--gold-luxury); font-size:18px;">R$ 0,00</strong>
                    </div>
                </div>
                <div id="expensesContainer"></div>
            </div>
        `;

        const renderTbl = () => {
            const search = document.getElementById('filExpSearch').value.toLowerCase();
            const cat = document.getElementById('filExpCat').value;
            const trip = document.getElementById('filExpTrip').value;
            const from = document.getElementById('filExpFrom').value;
            const to = document.getElementById('filExpTo').value;

            let filtered = expenses.filter(e => {
                if (search && !((e.location||'').toLowerCase().includes(search) || (e.notes||'').toLowerCase().includes(search))) return false;
                if (cat && e.category !== cat) return false;
                if (trip && e.trip_id !== trip) return false;
                if (from && e.expense_date < from) return false;
                if (to && e.expense_date > to) return false;
                return true;
            }).sort((a,b) => (b.expense_date || '').localeCompare(a.expense_date || ''));

            const total = filtered.reduce((s,e) => s + parseFloat(e.amount||0), 0);
            document.getElementById('expCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'lançamento' : 'lançamentos'}`;
            document.getElementById('expTotal').textContent = Utils.formatCurrency(total);

            const cont = document.getElementById('expensesContainer');
            if (filtered.length === 0) {
                cont.innerHTML = this._emptyState('Nenhum gasto encontrado', 'fa-receipt');
                return;
            }
            cont.innerHTML = `
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>Data/Hora</th><th>Quem</th><th>Viagem</th><th>Categoria</th><th>Local</th><th>Pagto</th><th>Status</th><th class="text-right">Valor</th><th></th></tr></thead>
                        <tbody>
                            ${filtered.map(e => `
                                <tr>
                                    <td><strong>${Utils.formatDate(e.expense_date)}</strong><br><small class="text-muted">${e.expense_time || ''}</small></td>
                                    <td>${e.employee_name || '-'}</td>
                                    <td>${e.trip_name || '-'}</td>
                                    <td><span class="category-icon cat-${e.category}"><i class="fas ${Utils.categoryIcon(e.category)}"></i></span> ${Utils.categoryLabel(e.category)}</td>
                                    <td>${e.location || '-'}</td>
                                    <td><small>${Utils.paymentLabel(e.payment_method)}</small></td>
                                    <td><span class="badge ${Utils.statusBadgeClass(e.approval_status || 'pendente')}">${Utils.statusLabel(e.approval_status || 'pendente')}</span></td>
                                    <td class="text-right"><strong>${Utils.formatCurrency(e.amount)}</strong></td>
                                    <td>
                                        ${e.receipt_url ? `<button class="btn btn-secondary btn-sm" data-action="view-receipt" data-id="${e.id}"><i class="fas fa-paperclip"></i></button>` : ''}
                                        <button class="btn btn-secondary btn-sm" data-action="edit-exp" data-id="${e.id}"><i class="fas fa-pen"></i></button>
                                        ${Auth.isAdmin() ? `<button class="btn btn-secondary btn-sm" data-action="del-exp" data-id="${e.id}"><i class="fas fa-trash"></i></button>` : ''}
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;

            cont.querySelectorAll('[data-action="edit-exp"]').forEach(b => b.addEventListener('click', () => Forms.openExpense(b.dataset.id)));
            cont.querySelectorAll('[data-action="del-exp"]').forEach(b => b.addEventListener('click', () => this._deleteExpense(b.dataset.id)));
            cont.querySelectorAll('[data-action="view-receipt"]').forEach(b => b.addEventListener('click', () => this._viewReceipt(b.dataset.id)));
        };

        ['filExpSearch','filExpCat','filExpTrip','filExpFrom','filExpTo'].forEach(id => {
            document.getElementById(id).addEventListener(id === 'filExpSearch' ? 'input' : 'change', renderTbl);
        });
        renderTbl();
    },

    /* =================== APPROVALS =================== */
    renderApprovals(container) {
        const pendentes = App.cache.expenses.filter(e => (e.approval_status || 'pendente') === 'pendente');

        container.innerHTML = `
            <div class="panel">
                <div class="panel-header">
                    <h3><i class="fas fa-clock text-gold"></i> Despesas Pendentes (${pendentes.length})</h3>
                </div>
                ${pendentes.length === 0 ? this._emptyState('Tudo em ordem!', 'fa-check-circle', 'Nenhuma despesa aguardando aprovação.') : `
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>Data</th><th>Funcionário</th><th>Viagem</th><th>Categoria</th><th>Local</th><th class="text-right">Valor</th><th>Ação</th></tr></thead>
                        <tbody>
                            ${pendentes.map(e => `
                                <tr>
                                    <td>${Utils.formatDate(e.expense_date)} ${e.expense_time || ''}</td>
                                    <td>${e.employee_name}</td>
                                    <td>${e.trip_name || '-'}</td>
                                    <td><span class="category-icon cat-${e.category}"><i class="fas ${Utils.categoryIcon(e.category)}"></i></span> ${Utils.categoryLabel(e.category)}</td>
                                    <td>${e.location || '-'}</td>
                                    <td class="text-right"><strong>${Utils.formatCurrency(e.amount)}</strong></td>
                                    <td><button class="btn btn-gold btn-sm" data-action="review" data-id="${e.id}"><i class="fas fa-search"></i> Revisar</button></td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`}
            </div>
        `;
        container.querySelectorAll('[data-action="review"]').forEach(b => {
            b.addEventListener('click', () => Forms.openApproval(b.dataset.id));
        });
    },

    /* =================== REPORTS =================== */
    renderReports(container) {
        const trips = App.cache.trips;
        const expenses = App.cache.expenses;
        const totalGeral = expenses.reduce((s,e) => s + parseFloat(e.amount||0), 0);

        // Por funcionário
        const byEmp = {};
        expenses.forEach(e => {
            const k = e.employee_name || 'Desconhecido';
            byEmp[k] = (byEmp[k] || 0) + parseFloat(e.amount||0);
        });

        container.innerHTML = `
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="label">Total Geral</div>
                    <div class="value">${Utils.formatCurrency(totalGeral)}</div>
                    <i class="icon-corner fas fa-coins"></i>
                </div>
                <div class="kpi-card">
                    <div class="label">Total Viagens</div>
                    <div class="value">${trips.length}</div>
                    <i class="icon-corner fas fa-route"></i>
                </div>
                <div class="kpi-card">
                    <div class="label">Funcionários Ativos</div>
                    <div class="value">${Object.keys(byEmp).length}</div>
                    <i class="icon-corner fas fa-users"></i>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <h3><i class="fas fa-file-invoice-dollar text-gold"></i> Relatórios por Viagem</h3>
                    <div class="actions">
                        <button class="btn btn-secondary btn-sm" id="btnExportAllExcel"><i class="fas fa-file-excel"></i> Exportar Tudo (Excel)</button>
                        <button class="btn btn-danger btn-sm" id="btnResetSystem"><i class="fas fa-eraser"></i> Zerar Sistema</button>
                    </div>
                </div>
                ${trips.length === 0 ? this._emptyState('Nenhuma viagem cadastrada', 'fa-route') : `
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>Viagem</th><th>Funcionário</th><th>Período</th><th>Status</th><th class="text-right">Total</th><th class="text-right">Lançamentos</th><th>Ações</th></tr></thead>
                        <tbody>
                            ${trips.map(t => {
                                const total = App.getTripTotal(t.id);
                                const cnt = App.getTripExpenses(t.id).length;
                                return `
                                <tr>
                                    <td><strong>${t.name}</strong></td>
                                    <td>${t.employee_name}</td>
                                    <td>${Utils.formatDate(t.start_date)} → ${Utils.formatDate(t.end_date)}</td>
                                    <td><span class="badge ${Utils.statusBadgeClass(t.status)}">${Utils.statusLabel(t.status)}</span></td>
                                    <td class="text-right"><strong>${Utils.formatCurrency(total)}</strong></td>
                                    <td class="text-right">${cnt}</td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" data-action="rep-pdf" data-id="${t.id}"><i class="fas fa-file-pdf"></i></button>
                                        <button class="btn btn-secondary btn-sm" data-action="rep-xls" data-id="${t.id}"><i class="fas fa-file-excel"></i></button>
                                        <button class="btn btn-gold btn-sm" data-action="rep-view" data-id="${t.id}"><i class="fas fa-eye"></i></button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`}
            </div>

            <div class="panel">
                <div class="panel-header">
                    <h3><i class="fas fa-trophy text-gold"></i> Ranking por Funcionário</h3>
                </div>
                ${Object.keys(byEmp).length === 0 ? this._emptyState('Sem dados', 'fa-users') : `
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>#</th><th>Funcionário</th><th class="text-right">Total Gasto</th><th class="text-right">% do Total</th></tr></thead>
                        <tbody>
                            ${Object.entries(byEmp).sort((a,b)=>b[1]-a[1]).map(([n,v],i) => `
                                <tr>
                                    <td><strong style="color:var(--gold-luxury)">${i+1}º</strong></td>
                                    <td>${n}</td>
                                    <td class="text-right"><strong>${Utils.formatCurrency(v)}</strong></td>
                                    <td class="text-right text-muted">${totalGeral > 0 ? ((v/totalGeral)*100).toFixed(1) : 0}%</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`}
            </div>
        `;

        container.querySelectorAll('[data-action="rep-pdf"]').forEach(b => b.addEventListener('click', () => {
            const t = trips.find(x => x.id === b.dataset.id);
            Reports.exportTripPDF(t);
        }));
        container.querySelectorAll('[data-action="rep-xls"]').forEach(b => b.addEventListener('click', () => {
            const t = trips.find(x => x.id === b.dataset.id);
            Reports.exportTripExcel(t);
        }));
        container.querySelectorAll('[data-action="rep-view"]').forEach(b => b.addEventListener('click', () => {
            App.selectedTripId = b.dataset.id;
            App.navigate('trip-detail');
        }));
        document.getElementById('btnExportAllExcel').addEventListener('click', () => Reports.exportAllExcel());
        document.getElementById('btnResetSystem').addEventListener('click', async () => {
            await this._resetSystemData();
        });
    },

    /* =================== USERS =================== */
    renderUsers(container) {
        const users = App.cache.users;
        container.innerHTML = `
            <div class="panel">
                <div class="panel-header">
                    <h3><i class="fas fa-users text-gold"></i> Usuários (${users.length})</h3>
                    <div class="actions">
                        <button class="btn btn-gold btn-sm" id="btnNewUser"><i class="fas fa-user-plus"></i> Novo Usuário</button>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>Nome</th><th>E-mail</th><th>Departamento</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
                        <tbody>
                            ${users.map(u => `
                                <tr>
                                    <td><div style="display:flex; align-items:center; gap:10px;"><div class="user-avatar" style="width:32px;height:32px;font-size:12px;">${Utils.initials(u.name)}</div><strong>${u.name}</strong></div></td>
                                    <td>${u.email}</td>
                                    <td>${u.department || '-'}</td>
                                    <td><span class="badge ${u.role === 'admin' ? 'badge-gold' : 'badge-info'}">${u.role === 'admin' ? 'Admin' : 'Funcionário'}</span></td>
                                    <td><span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">${u.active ? 'Ativo' : 'Inativo'}</span></td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" data-action="edit-user" data-id="${u.id}"><i class="fas fa-pen"></i></button>
                                        ${u.id !== App.session.id ? `<button class="btn btn-secondary btn-sm" data-action="del-user" data-id="${u.id}"><i class="fas fa-trash"></i></button>` : ''}
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('btnNewUser').addEventListener('click', () => Forms.openUser());
        container.querySelectorAll('[data-action="edit-user"]').forEach(b => b.addEventListener('click', () => Forms.openUser(b.dataset.id)));
        container.querySelectorAll('[data-action="del-user"]').forEach(b => b.addEventListener('click', () => this._deleteUser(b.dataset.id)));
    },

    /* =================== Helpers =================== */
    _emptyState(title, icon = 'fa-inbox', subtitle = '') {
        return `<div class="empty-state"><i class="fas ${icon}"></i><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ''}</div>`;
    },

    _destroyChart(id) {
        if (this.chartInstances[id]) {
            try { this.chartInstances[id].destroy(); } catch {}
            delete this.chartInstances[id];
        }
    },

    async _deleteExpense(id) {
        if (!await Utils.confirmDialog('Excluir este lançamento?')) return;
        try {
            await API.remove('expenses', id);
            await App.reloadData();
            App.navigate(App.currentView);
            Utils.showToast('Gasto excluído', 'success');
        } catch (err) {
            Utils.showToast('Erro ao excluir', 'error');
        }
    },

    async _deleteTrip(id) {
        if (!Auth.isAdmin()) {
            Utils.showToast('Acesso restrito', 'warning');
            return;
        }
        const trip = App.cache.trips.find((t) => t.id === id);
        if (!trip) {
            Utils.showToast('Viagem não encontrada', 'warning');
            return;
        }
        const confirmed = await Utils.confirmDialog(`Excluir a viagem "${trip.name}" e todos os gastos vinculados?`);
        if (!confirmed) return;
        try {
            const relatedExpenses = App.cache.expenses.filter((e) => e.trip_id === id);
            await Promise.all(relatedExpenses.map((e) => API.remove('expenses', e.id)));
            await API.remove('trips', id);
            if (App.selectedTripId === id) App.selectedTripId = null;
            await App.reloadData();
            App.navigate('trips');
            Utils.showToast('Viagem excluída com sucesso', 'success');
        } catch (err) {
            Utils.showToast('Erro ao excluir viagem', 'error');
        }
    },

    async _resetSystemData() {
        if (!Auth.isAdmin()) {
            Utils.showToast('Acesso restrito', 'warning');
            return;
        }
        const confirmed = await Utils.confirmDialog('Isso vai apagar TODAS as viagens e TODOS os gastos. Deseja continuar?');
        if (!confirmed) return;
        try {
            const deleteTrips = App.cache.trips.map((trip) => API.remove('trips', trip.id));
            const deleteExpenses = App.cache.expenses.map((expense) => API.remove('expenses', expense.id));
            await Promise.all([...deleteExpenses, ...deleteTrips]);
            App.selectedTripId = null;
            await App.reloadData();
            App.navigate('dashboard');
            Utils.showToast('Sistema zerado com sucesso', 'success');
        } catch (err) {
            Utils.showToast('Erro ao zerar sistema', 'error');
        }
    },

    async _deleteUser(id) {
        if (!await Utils.confirmDialog('Excluir este usuário?')) return;
        try {
            await API.remove('users', id);
            await App.reloadData();
            App.navigate(App.currentView);
            Utils.showToast('Usuário excluído', 'success');
        } catch (err) {
            Utils.showToast('Erro ao excluir', 'error');
        }
    },

    _viewReceipt(id) {
        const exp = App.cache.expenses.find(e => e.id === id);
        if (!exp || !exp.receipt_url) return;
        const w = window.open('', '_blank');
        if (exp.receipt_url.startsWith('data:application/pdf')) {
            w.document.write(`<iframe src="${exp.receipt_url}" style="width:100vw;height:100vh;border:0;"></iframe>`);
        } else {
            w.document.write(`<body style="margin:0;background:#222;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${exp.receipt_url}" style="max-width:100%;max-height:100vh;"></body>`);
        }
    }
};
