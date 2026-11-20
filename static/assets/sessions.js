(() => {
    const status = document.getElementById('sessions-status');
    const table = document.getElementById('sessions-table');
    const rows = document.getElementById('sessions-rows');
    const endpoint = '/api/auth/developer-sessions';
    const format = accountDateTimeFormat();

    function dateCell(row, value) {
        const time = document.createElement('time');
        time.dateTime = value;
        time.textContent = format.format(new Date(value));
        row.insertCell().append(time);
    }

    async function revokeSession(session, button, row) {
        button.disabled = true;
        status.textContent = accountText('Revoking session…');
        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: session.id })
            });
            if (response.status === 401) {
                window.location.replace('/');
                return;
            }
            if (!response.ok && response.status !== 404) throw new Error();
            row.remove();
            status.textContent = response.status === 404 ? accountText('This session has already ended.') : accountText('Session revoked.');
        } catch {
            status.textContent = accountText('Could not revoke the session. Try again.');
            button.disabled = false;
        }
    }

    async function loadSessions() {
        try {
            const response = await fetch(endpoint, { cache: 'no-store' });
            if (response.status === 401) {
                window.location.replace('/');
                return;
            }
            if (!response.ok) throw new Error();
            const { sessions } = await response.json();
            for (const session of sessions) {
                const row = rows.insertRow();
                row.insertCell().textContent = accountText(session.device);
                row.insertCell().textContent = accountText(session.browser);
                dateCell(row, session.first_seen);
                dateCell(row, session.last_seen);
                const action = row.insertCell();
                if (session.current) {
                    action.textContent = accountText('Current session');
                } else {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'token-action';
                    button.textContent = accountText('Revoke session');
                    button.setAttribute('aria-label', accountText('Revoke {browser} session on {device}', { browser: accountText(session.browser), device: accountText(session.device) }));
                    button.addEventListener('click', () => revokeSession(session, button, row));
                    action.append(button);
                }
            }
            table.hidden = sessions.length === 0;
            status.textContent = sessions.length ? '' : accountText('No active sessions.');
        } catch {
            status.textContent = accountText('Sessions unavailable. Reload the page to try again.');
        }
    }

    loadSessions();
})();
