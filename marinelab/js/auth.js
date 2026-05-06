/* ============================================
   MARINE LAB - Auth System
   ============================================ */

const Auth = {
    SESSION_KEY: 'marinelab_session',
    LOGIN_GUARD_KEY: 'marinelab_login_guard',
    SESSION_TTL_MS: 8 * 60 * 60 * 1000,
    MAX_ATTEMPTS: 5,
    ATTEMPT_WINDOW_MS: 10 * 60 * 1000,
    LOCK_DURATION_MS: 5 * 60 * 1000,

    _safeParse(value, fallback = null) {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    },

    _toHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    },

    _randomSalt() {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return this._toHex(bytes.buffer);
    },

    async _sha256(input) {
        const data = new TextEncoder().encode(input);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return this._toHex(digest);
    },

    async hashPassword(password, salt = null) {
        const finalSalt = salt || this._randomSalt();
        const hash = await this._sha256(`${finalSalt}:${password}`);
        return `sha256$${finalSalt}$${hash}`;
    },

    _isHashedPassword(storedPassword) {
        return /^sha256\$[^$]+\$[a-f0-9]{64}$/i.test(storedPassword || '');
    },

    async verifyPassword(inputPassword, storedPassword) {
        if (!storedPassword) return { valid: false, needsMigration: false };
        if (this._isHashedPassword(storedPassword)) {
            const parts = storedPassword.split('$');
            const salt = parts[1];
            const expectedHash = parts[2];
            const computedHash = await this._sha256(`${salt}:${inputPassword}`);
            return { valid: computedHash === expectedHash, needsMigration: false };
        }
        return { valid: storedPassword === inputPassword, needsMigration: true };
    },

    _loadGuardState() {
        const raw = localStorage.getItem(this.LOGIN_GUARD_KEY);
        const parsed = this._safeParse(raw, {});
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        return parsed;
    },

    _saveGuardState(state) {
        localStorage.setItem(this.LOGIN_GUARD_KEY, JSON.stringify(state));
    },

    _normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    },

    _pruneAttempts(history) {
        const now = Date.now();
        return (history || []).filter((ts) => now - ts <= this.ATTEMPT_WINDOW_MS);
    },

    _getEmailGuard(email) {
        const state = this._loadGuardState();
        return state[this._normalizeEmail(email)] || { attempts: [], lockedUntil: 0 };
    },

    _setEmailGuard(email, guard) {
        const state = this._loadGuardState() || {};
        state[this._normalizeEmail(email)] = guard;
        this._saveGuardState(state);
    },

    _checkLock(email) {
        const now = Date.now();
        const guard = this._getEmailGuard(email);
        if (guard.lockedUntil && guard.lockedUntil > now) {
            return guard.lockedUntil - now;
        }
        if (guard.lockedUntil && guard.lockedUntil <= now) {
            this._setEmailGuard(email, { attempts: this._pruneAttempts(guard.attempts), lockedUntil: 0 });
        }
        return 0;
    },

    _registerFailedAttempt(email) {
        const now = Date.now();
        const guard = this._getEmailGuard(email);
        const attempts = this._pruneAttempts(guard.attempts);
        attempts.push(now);
        const lockedUntil = attempts.length >= this.MAX_ATTEMPTS ? now + this.LOCK_DURATION_MS : 0;
        this._setEmailGuard(email, { attempts, lockedUntil });
    },

    _clearFailedAttempts(email) {
        this._setEmailGuard(email, { attempts: [], lockedUntil: 0 });
    },

    getSession() {
        const sessionStorageValue = sessionStorage.getItem(this.SESSION_KEY);
        if (sessionStorageValue) {
            return this._safeParse(sessionStorageValue, null);
        }

        // Migra sessão legado para sessionStorage e remove persistência indefinida.
        const localStorageValue = localStorage.getItem(this.SESSION_KEY);
        if (!localStorageValue) return null;
        const legacySession = this._safeParse(localStorageValue, null);
        if (!legacySession) return null;
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(legacySession));
        localStorage.removeItem(this.SESSION_KEY);
        return legacySession;
    },

    setSession(user) {
        const session = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            loggedAt: Date.now()
        };
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        localStorage.removeItem(this.SESSION_KEY);
        return session;
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'index.html';
    },

    requireAuth() {
        const session = this.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return null;
        }
        if (!session.loggedAt || (Date.now() - session.loggedAt) > this.SESSION_TTL_MS) {
            this.logout();
            return null;
        }
        return session;
    },

    requireAdmin() {
        const session = this.requireAuth();
        if (session && session.role !== 'admin') {
            Utils.showToast('Acesso restrito a administradores', 'error');
            setTimeout(() => window.location.href = 'app.html', 1500);
            return null;
        }
        return session;
    },

    isAdmin() {
        const s = this.getSession();
        return s && s.role === 'admin';
    },

    async login(email, password) {
        const normalizedEmail = this._normalizeEmail(email);
        const lockMs = this._checkLock(normalizedEmail);
        if (lockMs > 0) {
            const waitMinutes = Math.ceil(lockMs / 60000);
            throw new Error(`Muitas tentativas. Aguarde ${waitMinutes} minuto(s) e tente novamente.`);
        }

        const result = await API.list('users', { limit: 1000 });
        const user = (result.data || []).find(
            (u) => u.email && this._normalizeEmail(u.email) === normalizedEmail && u.active !== false
        );

        if (!user) {
            this._registerFailedAttempt(normalizedEmail);
            throw new Error('Credenciais inválidas');
        }

        const passwordCheck = await this.verifyPassword(password, user.password);
        if (!passwordCheck.valid) {
            this._registerFailedAttempt(normalizedEmail);
            throw new Error('Credenciais inválidas');
        }

        this._clearFailedAttempts(normalizedEmail);

        if (passwordCheck.needsMigration) {
            try {
                const password = await this.hashPassword(password);
                await API.patch('users', user.id, { password });
            } catch {
                // Se a migração falhar, mantém login para não bloquear usuário.
            }
        }

        return this.setSession(user);
    }
};
