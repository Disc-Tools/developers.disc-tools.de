const onPortal = document.body.classList.contains('portal-page');
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
        const response = await fetch('/api/auth/developer-access');
        if (response.status === 401) {
            if (onPortal) window.location.replace('/');
            return;
        }
        if (response.status === 403) {
            window.location.replace('/blocked/no-access');
            return;
        }
        if (!response.ok) throw new Error();
        const profile = await response.json();
        if (profile.name) accountName.textContent = profile.name;
        if (profile.avatarUrl) accountAvatar.src = profile.avatarUrl;
        if (!onPortal) {
            loginStatus.textContent = 'You’re signed in with a Disc-Tools staff account.';
            loginLink.hidden = true;
            portalLink.hidden = false;
        }
        accountMenu.hidden = false;
    } catch {
        loginStatus.textContent = 'Access verification is temporarily unavailable. Please try again shortly.';
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
        loginStatus.textContent = 'Sign-out failed. Please try again.';
        logoutButton.disabled = false;
    }
});
checkAccess();
