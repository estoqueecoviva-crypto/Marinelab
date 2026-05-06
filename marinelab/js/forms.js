/* ============================================
   MARINE LAB - Forms (Modais e submissões)
   ============================================ */

const Forms = {
    currentApprovalId: null,
    currentReceipt: null,

    init() {
        // ===== Trip Form =====
        document.getElementById('formTrip').addEventListener('submit', (e) => this.submitTrip(e));

        // ===== Expense Form =====
        document.getElementById('formExpense').addEventListener('submit', (e) => this.submitExpense(e));

        // Categorias rápidas
        document.querySelectorAll('.quick-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.quick-cat-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('exp-category').value = btn.dataset.cat;
                document.getElementById('categoryOtherWrap').classList.toggle('hidden', btn.dataset.cat !== 'outros');
            });
        });

        // Upload comprovante
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('exp-receipt');
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                Utils.showToast('Arquivo muito grande (máx 5MB)', 'error');
                return;
            }
            const base64 = await Utils.fileToBase64(file);
            this.currentReceipt = { url: base64, name: file.name };
            const preview = document.getElementById('receiptPreview');
            const info = document.getElementById('receiptInfo');
            if (file.type.startsWith('image/')) {
                preview.src = base64;
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
            }
            info.textContent = `✓ ${file.name}`;
            info.classList.remove('hidden');
        });

        // Geolocalização
        document.getElementById('btnGeo').addEventListener('click', () => this.captureLocation());

        // ===== User Form =====
        document.getElementById('formUser').addEventListener('submit', (e) => this.submitUser(e));

        // ===== Approval =====
        document.getElementById('btnApprove').addEventListener('click', () => this.processApproval('aprovado'));
        document.getElementById('btnReject').addEventListener('click', () => this.processApproval('recusado'));
    },

    /* =================== TRIP =================== */
    openTrip(tripId = null) {
        if (!Auth.isAdmin()) {
            Utils.showToast('Apenas administradores podem criar viagens', 'warning');
            return;
        }
        const form = document.getElementById('formTrip');
        form.reset();
        document.getElementById('trip-id').value = '';

        // Popula funcionários
        const select = document.getElementById('trip-employee');
        select.innerHTML = App.cache.users
            .filter(u => u.active !== false)
            .map(u => `<option value="${u.id}">${u.name}${u.role === 'admin' ? ' (Admin)' : ''}</option>`).join('');

        if (tripId) {
            const t = App.cache.trips.find(x => x.id === tripId);
            if (!t) return;
            document.getElementById('modalTripTitle').textContent = 'Editar Viagem';
            document.getElementById('trip-id').value = t.id;
            document.getElementById('trip-name').value = t.name || '';
            document.getElementById('trip-employee').value = t.employee_id || '';
            document.getElementById('trip-status').value = t.status || 'em_andamento';
            document.getElementById('trip-start').value = t.start_date || '';
            document.getElementById('trip-end').value = t.end_date || '';
            document.getElementById('trip-city').value = t.city || '';
            document.getElementById('trip-state').value = t.state || '';
            document.getElementById('trip-purpose').value = t.purpose || '';
            document.getElementById('trip-budget').value = t.budget || '';
            document.getElementById('trip-notes').value = t.notes || '';
        } else {
            document.getElementById('modalTripTitle').textContent = 'Nova Viagem';
            document.getElementById('trip-start').value = Utils.todayISO();
        }
        App.openModal('modalTrip');
    },

    async submitTrip(e) {
        e.preventDefault();
        const id = document.getElementById('trip-id').value;
        const empId = document.getElementById('trip-employee').value;
        const emp = App.cache.users.find(u => u.id === empId);

        const data = {
            name: document.getElementById('trip-name').value.trim(),
            employee_id: empId,
            employee_name: emp ? emp.name : '',
            start_date: document.getElementById('trip-start').value,
            end_date: document.getElementById('trip-end').value,
            city: document.getElementById('trip-city').value.trim(),
            state: document.getElementById('trip-state').value.trim().toUpperCase(),
            purpose: document.getElementById('trip-purpose').value.trim(),
            budget: parseFloat(document.getElementById('trip-budget').value) || 0,
            status: document.getElementById('trip-status').value,
            notes: document.getElementById('trip-notes').value
        };

        try {
            if (id) {
                await API.patch('trips', id, data);
                Utils.showToast('Viagem atualizada', 'success');
            } else {
                data.id = Utils.generateId('trip');
                await API.create('trips', data);
                Utils.showToast('Viagem criada com sucesso!', 'success');
            }
            App.closeModal('modalTrip');
            await App.reloadData();
            App.navigate(App.currentView);
        } catch (err) {
            Utils.showToast('Erro ao salvar viagem', 'error');
        }
    },

    /* =================== EXPENSE =================== */
    openExpense(expId = null, presetTripId = null) {
        const form = document.getElementById('formExpense');
        form.reset();
        document.getElementById('exp-id').value = '';
        document.querySelectorAll('.quick-cat-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('exp-category').value = '';
        document.getElementById('categoryOtherWrap').classList.add('hidden');
        document.getElementById('receiptPreview').classList.add('hidden');
        document.getElementById('receiptInfo').classList.add('hidden');
        document.getElementById('geoHint').textContent = '';
        this.currentReceipt = null;

        // Popula viagens disponíveis
        const tripSel = document.getElementById('exp-trip');
        const myTrips = App.getMyTrips().filter(t => t.status === 'em_andamento' || expId);
        if (myTrips.length === 0) {
            Utils.showToast('Nenhuma viagem em andamento. Crie uma viagem primeiro.', 'warning');
            return;
        }
        tripSel.innerHTML = myTrips.map(t => `<option value="${t.id}">${t.name} ${t.status === 'finalizada' ? '(Finalizada)' : ''}</option>`).join('');

        if (expId) {
            const e = App.cache.expenses.find(x => x.id === expId);
            if (!e) return;
            document.getElementById('modalExpenseTitle').textContent = 'Editar Gasto';
            document.getElementById('exp-id').value = e.id;
            // Categoria
            const catBtn = document.querySelector(`.quick-cat-btn[data-cat="${e.category}"]`);
            if (catBtn) {
                catBtn.classList.add('selected');
                document.getElementById('exp-category').value = e.category;
                if (e.category === 'outros') {
                    document.getElementById('categoryOtherWrap').classList.remove('hidden');
                    document.getElementById('exp-category-other').value = e.category_other || '';
                }
            }
            tripSel.value = e.trip_id || '';
            document.getElementById('exp-amount').value = e.amount || '';
            document.getElementById('exp-date').value = e.expense_date || '';
            document.getElementById('exp-time').value = e.expense_time || '';
            document.getElementById('exp-payment').value = e.payment_method || '';
            document.getElementById('exp-location').value = e.location || '';
            document.getElementById('exp-notes').value = e.notes || '';
            if (e.receipt_url) {
                this.currentReceipt = { url: e.receipt_url, name: e.receipt_name || 'comprovante' };
                if (e.receipt_url.startsWith('data:image')) {
                    const p = document.getElementById('receiptPreview');
                    p.src = e.receipt_url;
                    p.classList.remove('hidden');
                }
                const info = document.getElementById('receiptInfo');
                info.textContent = `✓ ${e.receipt_name || 'Comprovante anexado'}`;
                info.classList.remove('hidden');
            }
        } else {
            document.getElementById('modalExpenseTitle').textContent = 'Lançamento Rápido de Gasto';
            document.getElementById('exp-date').value = Utils.todayISO();
            document.getElementById('exp-time').value = Utils.nowTime();
            if (presetTripId) tripSel.value = presetTripId;
        }
        App.openModal('modalExpense');
    },

    async submitExpense(e) {
        e.preventDefault();
        const cat = document.getElementById('exp-category').value;
        if (!cat) {
            Utils.showToast('Selecione uma categoria', 'warning');
            return;
        }
        const id = document.getElementById('exp-id').value;
        const tripId = document.getElementById('exp-trip').value;
        const trip = App.cache.trips.find(t => t.id === tripId);

        const data = {
            trip_id: tripId,
            trip_name: trip ? trip.name : '',
            employee_id: App.session.id,
            employee_name: App.session.name,
            expense_date: document.getElementById('exp-date').value,
            expense_time: document.getElementById('exp-time').value,
            category: cat,
            category_other: cat === 'outros' ? document.getElementById('exp-category-other').value : '',
            amount: parseFloat(document.getElementById('exp-amount').value) || 0,
            payment_method: document.getElementById('exp-payment').value,
            location: document.getElementById('exp-location').value.trim(),
            notes: document.getElementById('exp-notes').value,
            receipt_url: this.currentReceipt ? this.currentReceipt.url : '',
            receipt_name: this.currentReceipt ? this.currentReceipt.name : '',
            geolocation: document.getElementById('geoHint').dataset.geo || '',
            approval_status: id ? undefined : 'pendente'
        };

        try {
            if (id) {
                // Mantém status de aprovação existente
                const existing = App.cache.expenses.find(x => x.id === id);
                data.approval_status = existing ? existing.approval_status : 'pendente';
                data.approval_notes = existing ? existing.approval_notes : '';
                await API.patch('expenses', id, data);
                Utils.showToast('Gasto atualizado!', 'success');
            } else {
                data.id = Utils.generateId('exp');
                data.approval_notes = '';
                await API.create('expenses', data);
                Utils.showToast('Gasto registrado com sucesso!', 'success');
            }
            App.closeModal('modalExpense');
            await App.reloadData();
            App.navigate(App.currentView);
        } catch (err) {
            Utils.showToast('Erro ao salvar gasto', 'error');
        }
    },

    captureLocation() {
        if (!navigator.geolocation) {
            Utils.showToast('Geolocalização não suportada', 'warning');
            return;
        }
        const hint = document.getElementById('geoHint');
        hint.textContent = '📍 Capturando localização...';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                hint.textContent = `📍 GPS: ${coords}`;
                hint.dataset.geo = coords;
                Utils.showToast('Localização capturada', 'success');
            },
            (err) => {
                hint.textContent = '⚠ Não foi possível capturar a localização';
                Utils.showToast('Erro ao obter GPS', 'warning');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    },

    /* =================== USER =================== */
    openUser(userId = null) {
        const form = document.getElementById('formUser');
        const passwordInput = document.getElementById('user-password');
        form.reset();
        document.getElementById('user-id').value = '';
        document.getElementById('user-active').checked = true;
        passwordInput.value = '';
        passwordInput.required = true;
        passwordInput.placeholder = 'Mínimo de 8 caracteres';

        if (userId) {
            const u = App.cache.users.find(x => x.id === userId);
            if (!u) return;
            document.getElementById('modalUserTitle').textContent = 'Editar Usuário';
            document.getElementById('user-id').value = u.id;
            document.getElementById('user-name').value = u.name || '';
            document.getElementById('user-email').value = u.email || '';
            passwordInput.required = false;
            passwordInput.placeholder = 'Preencha apenas para alterar a senha';
            document.getElementById('user-role').value = u.role || 'employee';
            document.getElementById('user-department').value = u.department || '';
            document.getElementById('user-active').checked = u.active !== false;
        } else {
            document.getElementById('modalUserTitle').textContent = 'Novo Usuário';
        }
        App.openModal('modalUser');
    },

    async submitUser(e) {
        e.preventDefault();
        const id = document.getElementById('user-id').value;
        const plainPassword = document.getElementById('user-password').value;
        const data = {
            name: document.getElementById('user-name').value.trim(),
            email: document.getElementById('user-email').value.trim().toLowerCase(),
            role: document.getElementById('user-role').value,
            department: document.getElementById('user-department').value.trim(),
            active: document.getElementById('user-active').checked
        };

        // Verifica email duplicado
        const dup = App.cache.users.find(u => u.email === data.email && u.id !== id);
        if (dup) {
            Utils.showToast('E-mail já cadastrado', 'error');
            return;
        }

        if (!id && !plainPassword) {
            Utils.showToast('Informe uma senha para o novo usuário', 'warning');
            return;
        }
        if (plainPassword && plainPassword.length < 8) {
            Utils.showToast('Use senha com no mínimo 8 caracteres', 'warning');
            return;
        }

        try {
            if (plainPassword) {
                data.password = await Auth.hashPassword(plainPassword);
            }
            if (id) {
                await API.patch('users', id, data);
                Utils.showToast('Usuário atualizado', 'success');
            } else {
                data.id = Utils.generateId('user');
                await API.create('users', data);
                Utils.showToast('Usuário criado', 'success');
            }
            App.closeModal('modalUser');
            await App.reloadData();
            App.navigate(App.currentView);
        } catch (err) {
            Utils.showToast('Erro ao salvar usuário', 'error');
        }
    },

    /* =================== APPROVAL =================== */
    openApproval(expId) {
        const e = App.cache.expenses.find(x => x.id === expId);
        if (!e) return;
        this.currentApprovalId = expId;
        const body = document.getElementById('approvalBody');
        body.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px;">
                <div><strong>Funcionário:</strong><br>${e.employee_name}</div>
                <div><strong>Viagem:</strong><br>${e.trip_name || '-'}</div>
                <div><strong>Data/Hora:</strong><br>${Utils.formatDateTime(e.expense_date, e.expense_time)}</div>
                <div><strong>Categoria:</strong><br>${Utils.categoryLabel(e.category)}${e.category_other ? ' (' + e.category_other + ')' : ''}</div>
                <div><strong>Local:</strong><br>${e.location || '-'}</div>
                <div><strong>Pagamento:</strong><br>${Utils.paymentLabel(e.payment_method)}</div>
            </div>
            <div style="text-align:center; padding:18px; background:var(--pearl); border-radius:12px; margin-bottom:16px;">
                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em;">Valor Solicitado</div>
                <div style="font-family:'Playfair Display',serif; font-size:32px; color:var(--navy-primary); font-weight:700;">${Utils.formatCurrency(e.amount)}</div>
            </div>
            ${e.notes ? `<div class="form-group"><label>Observações do funcionário</label><div class="form-control" style="background:var(--pearl); min-height:auto;">${e.notes}</div></div>` : ''}
            ${e.receipt_url ? `<div class="form-group"><label>Comprovante</label><br><button class="btn btn-secondary btn-sm" id="btnApprovalReceipt"><i class="fas fa-paperclip"></i> Visualizar comprovante</button></div>` : '<p class="text-muted"><i class="fas fa-exclamation-circle"></i> Sem comprovante anexado</p>'}
            <div class="form-group">
                <label>Notas da aprovação (opcional)</label>
                <textarea id="approval-notes" class="form-control" rows="2" placeholder="Adicione um comentário..."></textarea>
            </div>
        `;
        if (e.receipt_url) {
            setTimeout(() => {
                document.getElementById('btnApprovalReceipt').addEventListener('click', () => Views._viewReceipt(expId));
            }, 50);
        }
        App.openModal('modalApproval');
    },

    async processApproval(status) {
        if (!this.currentApprovalId) return;
        const notes = document.getElementById('approval-notes').value;
        try {
            await API.patch('expenses', this.currentApprovalId, {
                approval_status: status,
                approval_notes: notes
            });
            App.closeModal('modalApproval');
            await App.reloadData();
            App.navigate(App.currentView);
            Utils.showToast(`Despesa ${status === 'aprovado' ? 'aprovada' : 'recusada'}`, status === 'aprovado' ? 'success' : 'warning');
            this.currentApprovalId = null;
        } catch (err) {
            Utils.showToast('Erro ao processar', 'error');
        }
    }
};
