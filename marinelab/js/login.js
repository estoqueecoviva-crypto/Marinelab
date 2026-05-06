/* ============================================
   MARINE LAB - Login Page
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se já logado
    if (Auth.getSession()) {
        window.location.href = 'app.html';
        return;
    }

    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn = form.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Autenticando...';

        try {
            await Auth.login(email, password);
            Utils.showToast('Bem-vindo a bordo!', 'success');
            setTimeout(() => window.location.href = 'app.html', 600);
        } catch (err) {
            Utils.showToast(err.message || 'Erro ao fazer login', 'error');
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    });
});
