(() => {
    const status = document.getElementById('profile-status');
    const content = document.getElementById('profile-content');
    const view = document.querySelector('[data-account-view]').dataset.accountView;
    const refresh = document.getElementById('refresh-profile');
    const keyList = document.getElementById('profile-key-list');
    const accountBlock = document.getElementById('profile-block');
    const access = document.getElementById('profile-access');
    const warning = document.getElementById('profile-warning');
    const setText = (id, value) => {
        document.getElementById(id).textContent = value;
    };

    async function loadProfile() {
        if (refresh) refresh.disabled = true;
        status.textContent = accountText('Loading profile…');
        try {
            const response = await fetch('/api/auth/developer-account', { cache: 'no-store' });
            if (!response.ok) throw new Error();
            const profile = await response.json();
            if (view !== 'details') {
                const blocked = Boolean(profile.account_block_until || profile.restricted_keys.length);
                access.textContent = accountText(blocked ? 'Temp. blocked' : profile.premium.active ? 'Active' : 'No active Premium');
                access.dataset.accessState = blocked ? 'temporary' : profile.premium.active ? 'active' : 'inactive';
                warning.classList.toggle('rate-limit-warning', profile.recent >= 2);
                setText('profile-recent', profile.recent);
                setText('profile-warning', profile.recent >= 2
                    ? accountText('Active warning for repeated rate-limit violations in the last 24 hours.')
                    : accountText('No active warning.'));
            }
            if (view === 'api') {
                const timeFormat = accountDateTimeFormat();
                const formatTime = value => timeFormat.format(new Date(value));
                setText('profile-total', profile.total);
                accountBlock.hidden = !profile.account_block_until && !profile.restricted_keys.length;
                accountBlock.textContent = profile.account_block_until
                    ? accountText('All API keys are blocked until {time}.', { time: formatTime(profile.account_block_until) })
                    : accountText('Only the API keys listed below are temporarily blocked.');

                keyList.replaceChildren();
                for (const key of profile.restricted_keys) {
                    const item = document.createElement('li');
                    const name = document.createElement('span');
                    name.textContent = key.name;
                    const time = document.createElement('time');
                    time.dateTime = key.blocked_until;
                    time.textContent = accountText('Blocked until {time}', { time: formatTime(key.blocked_until) });
                    item.append(name, time);
                    keyList.append(item);
                }
                document.getElementById('profile-keys').hidden = !keyList.childElementCount;
            }
            if (view !== 'api') setText('profile-name', profile.name);
            if (view === 'details') {
                setText('profile-premium', profile.premium.active ? accountText('Active') : accountText('No active Premium'));
                setText('profile-premium-expiry', profile.premium.active
                    ? (profile.premium.expires_at
                        ? accountText('Premium expires on {time}.', { time: accountDateTimeFormat().format(new Date(profile.premium.expires_at)) })
                        : accountText('Premium has no scheduled expiry.'))
                    : accountText('You can view your account and manage sessions. The developer portal requires active Premium.'));
                setText('profile-id', profile.discord_id || accountText('Unavailable'));
                setText('profile-username', profile.username);
                setText('profile-email', profile.email || accountText('Unavailable'));
                setText('profile-email-status', profile.email
                    ? (profile.email_verified ? accountText('Email verified by Discord.') : accountText('Email unverified.'))
                    : accountText('Sign in again to load your Discord email.'));
            }
            content.hidden = false;
            status.textContent = '';
        } catch {
            content.hidden = true;
            status.textContent = accountText('Profile unavailable. Reload the page to try again.');
        } finally {
            if (refresh) refresh.disabled = false;
        }
    }

    refresh?.addEventListener('click', loadProfile);
    loadProfile();
})();
