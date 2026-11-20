const onPortal = document.body.classList.contains('portal-page');
const onAccount = document.body.hasAttribute('data-account-page');
const loginStatus = document.getElementById('login-status');
const loginLink = document.getElementById('login-link');
const accountMenu = document.getElementById('account-menu');
const accountToggle = document.getElementById('account-toggle');
const accountAvatar = document.getElementById('account-avatar');
const accountName = document.getElementById('account-name');
const portalLink = document.getElementById('portal-link');
const logoutButton = document.getElementById('logout-button');

async function checkAccess() {
    try {
        const endpoint = onAccount ? '/api/auth/developer-account-access'
            : onPortal ? '/api/auth/developer-access' : '/api/auth/developer-profile';
        const response = await fetch(endpoint);
        if (response.status === 401) {
            if (onPortal) window.location.replace('/');
            return;
        }
        if (response.status === 403) {
            const banned = response.headers.get('X-Developer-Access-Block') === 'banned';
            window.location.replace(banned ? '/blocked/banned/' : '/blocked/no-access');
            return;
        }
        if (!response.ok) throw new Error();
        const profile = await response.json();
        if (!profile) return;
        if (profile.name) accountName.textContent = profile.name;
        if (profile.avatarUrl) accountAvatar.src = profile.avatarUrl;
        if (!onPortal) {
            const accessNotice = loginStatus.closest('.access');
            if (accessNotice) accessNotice.hidden = profile.portalAvailable === true;
            loginLink.hidden = true;
            portalLink.hidden = profile.portalAvailable !== true;
        }
        accountMenu.hidden = false;
    } catch {
        loginStatus.textContent = globalThis.accountText?.('Access verification is temporarily unavailable. Please try again shortly.') ?? 'Access verification is temporarily unavailable. Please try again shortly.';
    }
}

document.addEventListener('click', event => {
    if (accountMenu.open && !accountMenu.contains(event.target)) accountMenu.open = false;
});

accountMenu.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !accountMenu.open) return;
    accountMenu.open = false;
    accountToggle.focus();
});

accountAvatar.addEventListener('error', () => {
    const fallback = '/static/assets/img/logo.svg';
    if (accountAvatar.getAttribute('src') !== fallback) accountAvatar.src = fallback;
});

logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
        const response = await fetch('/api/auth/developer-logout', { method: 'POST' });
        if (!response.ok) throw new Error();
        if (onPortal) window.location.replace('/');
        else window.location.reload();
    } catch {
        loginStatus.textContent = globalThis.accountText?.('Sign-out failed. Please try again.') ?? 'Sign-out failed. Please try again.';
        logoutButton.disabled = false;
    }
});
checkAccess();
