{
    const status = document.getElementById('token-status');
    const create = document.getElementById('create-token');
    const list = document.getElementById('token-list');
    const result = document.getElementById('token-result');
    const copy = document.getElementById('copy-token');
    const copyStatus = document.getElementById('copy-status');
    const secret = document.getElementById('token-secret');
    const dialog = document.getElementById('token-dialog');
    const form = document.getElementById('token-form');
    const cancel = document.getElementById('cancel-token');
    const submit = document.getElementById('submit-token');
    const formError = document.getElementById('token-form-error');
    const endpoint = '/api/auth/developer-tokens';

    async function request(method, body) {
        const options = { method, cache: 'no-store' };
        if (body) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
        const response = await fetch(endpoint, options);
        if (response.status === 204) return;
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'API tokens are temporarily unavailable.');
        return data;
    }

    let tokenState;
    let pending = false;
    const dateFormat = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'short' });

    function render() {
        const { premium, tokens } = tokenState;
        create.disabled = pending || !premium;
        status.textContent = !premium ? 'Active Disc-Tools Premium is required to create a token.'
            : tokens.length ? '' : 'No API tokens yet.';
        const rows = tokens.map(token => {
            const row = document.createElement('tr');
            const name = document.createElement('th');
            name.scope = 'row';
            name.textContent = token.name;
            row.append(name);
            for (const value of [
                token.expired ? 'Expired' : 'Active',
                dateFormat.format(new Date(token.created_at)),
                token.expires_at ? dateFormat.format(new Date(token.expires_at)) : 'Unlimited',
                token.last_used_at ? dateFormat.format(new Date(token.last_used_at)) : 'Not tracked yet'
            ]) {
                row.insertCell().textContent = value;
            }
            const revoke = document.createElement('button');
            revoke.type = 'button';
            revoke.className = 'token-action';
            revoke.textContent = 'Revoke';
            revoke.setAttribute('aria-label', 'Revoke ' + token.name);
            revoke.disabled = pending;
            revoke.addEventListener('click', () => {
                if (window.confirm('Revoke this API token?')) mutate('DELETE', { id: token.id });
            });
            row.insertCell().append(revoke);
            return row;
        });
        list.replaceChildren(...rows);
    }

    async function mutate(method, body) {
        if (pending) return;
        pending = true;
        render();
        let failure;
        try {
            const data = await request(method, body);
            if (method === 'POST') {
                const { token, ...metadata } = data;
                tokenState.tokens.unshift(metadata);
                dialog.close();
                secret.value = token;
                result.showModal();
            } else {
                tokenState.tokens = tokenState.tokens.filter(token => token.id !== body.id);
            }
        } catch (error) {
            failure = error;
        } finally {
            pending = false;
            render();
            if (failure) (method === 'POST' ? formError : status).textContent = failure.message;
        }
    }

    create.addEventListener('click', () => {
        form.reset();
        formError.textContent = '';
        dialog.showModal();
    });
    cancel.addEventListener('click', () => dialog.close());
    dialog.addEventListener('cancel', event => {
        if (submit.disabled) event.preventDefault();
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const data = new FormData(form);
        const duration = data.get('expiry');
        formError.textContent = '';
        submit.disabled = cancel.disabled = true;
        try {
            await mutate('POST', { name: data.get('name').trim(), expiresInDays: duration === 'unlimited' ? null : Number(duration) });
        } finally {
            submit.disabled = cancel.disabled = false;
        }
    });
    copy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(secret.value);
            if (result.open) copyStatus.textContent = 'Copied to clipboard.';
        } catch {
            if (!result.open) return;
            secret.focus();
            secret.select();
            copyStatus.textContent = 'Couldn’t copy automatically. Copy the selected key manually.';
        }
    });
    result.addEventListener('close', () => {
        secret.value = '';
        copyStatus.textContent = '';
        create.focus();
    });
    window.addEventListener('pagehide', () => {
        secret.value = '';
        if (result.open) result.close();
    });

    request('GET').then(data => {
        tokenState = data;
        render();
    }).catch(error => { status.textContent = error.message; });
}
