'use strict';

const toolStatus = document.getElementById('api-tool-status');
const playground = document.getElementById('playground-form');
const refreshStatus = document.getElementById('api-status-refresh');

async function callDeveloperTool(path, token, body) {
    return fetch(path, {
        method: 'POST',
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
    });
}

if (playground) {
    const tokenField = document.getElementById('playground-token');
    const urlField = document.getElementById('playground-url');
    const output = document.getElementById('playground-response');
    const submit = playground.querySelector('button[type="submit"]');

    playground.addEventListener('submit', async event => {
        event.preventDefault();
        submit.disabled = true;
        output.hidden = true;
        output.textContent = '';
        toolStatus.textContent = 'Sending request…';

        try {
            const response = await callDeveloperTool('/api/v1/link-cleaner', tokenField.value.trim(), { url: urlField.value });
            const payload = await response.json().catch(() => null);
            toolStatus.textContent = 'HTTP ' + response.status;
            if (payload) {
                output.textContent = JSON.stringify(payload, null, 2);
                output.hidden = false;
            }
        } catch {
            toolStatus.textContent = 'Could not reach the API. Try again.';
        } finally {
            submit.disabled = false;
        }
    });
}

if (refreshStatus) {
    const board = document.getElementById('api-status-board');
    const checked = document.getElementById('api-status-checked');
    const apiChecks = [
        ['link-cleaner', '/api/v1/link-cleaner', { url: 'https://example.com/' }],
        ['batch', '/api/v1/link-cleaner/batch', { urls: ['https://example.com/'] }],
        ['timestamp', '/api/v1/discord/timestamp', { timestamp: 1767225600 }]
    ];

    async function measure(key, probe) {
        const row = document.getElementById('status-' + key);
        const badge = row.querySelector('.status-badge');
        const latency = row.querySelector('.status-latency');
        badge.dataset.state = 'checking';
        badge.textContent = 'Checking';
        latency.textContent = '—';

        const start = performance.now();
        let state = 'unknown';
        try {
            state = await probe();
            const elapsed = Math.round(performance.now() - start);
            latency.textContent = elapsed + ' ms';
            latency.setAttribute('aria-label', 'Response time: ' + elapsed + ' ms');
        } catch {
            latency.setAttribute('aria-label', 'Response time unavailable');
        }
        badge.dataset.state = state;
        badge.textContent = { reachable: 'Reachable', unavailable: 'Unavailable', unknown: 'Unknown' }[state];
        return state;
    }

    async function checkTool(path, body) {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const token = 'dt_' + btoa(String.fromCharCode(...bytes))
            .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
        const response = await callDeveloperTool(path, token, body);
        const payload = await response.json().catch(() => null);
        if (response.status === 401 && payload?.error === 'A valid API key with API access and an allowed source IP is required.') {
            return 'reachable';
        }
        return response.status >= 500 ? 'unavailable' : 'unknown';
    }

    async function checkLogin() {
        const response = await fetch('/api/auth/developer-login', {
            credentials: 'omit', cache: 'no-store', redirect: 'manual',
            signal: AbortSignal.timeout(10000)
        });
        if (response.type === 'opaqueredirect') return 'reachable';
        return response.status >= 500 ? 'unavailable' : 'unknown';
    }

    async function checkPremium() {
        const response = await fetch('/api/v1/status', {
            credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(10000)
        });
        const result = await response.json().catch(() => null);
        if (result?.premium === true) return 'reachable';
        return result?.premium === false ? 'unavailable' : 'unknown';
    }

    async function checkStatus() {
        refreshStatus.disabled = true;
        board.dataset.state = 'checking';
        toolStatus.textContent = 'Checking service availability…';

        const checks = apiChecks.map(([key, path, body]) => measure(key, () => checkTool(path, body)));
        const results = await Promise.all([
            ...checks, measure('login', checkLogin), measure('premium', checkPremium)
        ]);
        const state = results.includes('unavailable') ? 'unavailable'
            : results.includes('unknown') ? 'unknown' : 'reachable';
        board.dataset.state = state;
        toolStatus.textContent = {
            reachable: 'All checks passed',
            unavailable: 'One or more services are unavailable',
            unknown: 'Some checks were inconclusive'
        }[state];

        const now = new Date();
        checked.dateTime = now.toISOString();
        checked.textContent = now.toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        refreshStatus.disabled = false;
    }

    refreshStatus.addEventListener('click', checkStatus);
    checkStatus();
}
