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
    const title = document.getElementById('token-dialog-title');
    const expiry = form.elements.namedItem('expiry');
    const keep = expiry.querySelector('[value="keep"]');
    const allowedIP = form.elements.namedItem('allowedIP');
    const ipList = document.getElementById('token-ip-list');
    let addresses = [];
    const createHelp = document.getElementById('token-create-help');
    const revoke = document.getElementById('revoke-token');
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
    const editId = new URLSearchParams(window.location.search).get('edit');
    const editPage = document.getElementById('token-edit-page');
    const editForm = document.getElementById('token-edit-form');
    const editStatus = document.getElementById('token-edit-status');
    const revokeSection = document.getElementById('token-revoke-section');

    if (editId !== null) {
        document.getElementById('token-list-intro').hidden = true;
        document.getElementById('token-list-section').hidden = true;
        editPage.hidden = false;
        document.title = 'Edit API token | Disc-Tools';
    }
    const dateFormat = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'short' });

    function tokenAddresses(token) {
        return token.allowed_ips ?? (token.allowed_ip ? [token.allowed_ip] : []);
    }

    function renderAddresses() {
        const entries = addresses.map((address, index) => {
            const item = document.createElement('li');
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.textContent = address + ' ×';
            remove.setAttribute('aria-label', 'Remove ' + address);
            remove.addEventListener('click', () => {
                addresses.splice(index, 1);
                renderAddresses();
                allowedIP.focus();
            });
            item.append(remove);
            return item;
        });
        ipList.replaceChildren(...entries);
        ipList.hidden = !entries.length;
    }

    function addAddress() {
        const address = allowedIP.value.trim();
        if (!address) return true;
        if (!addresses.includes(address)) {
            if (addresses.length >= 32) {
                formError.textContent = 'You can add up to 32 IP addresses.';
                return false;
            }
            addresses.push(address);
        }
        allowedIP.value = '';
        formError.textContent = '';
        renderAddresses();
        return true;
    }

    allowedIP.addEventListener('keydown', event => {
        if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key === ' ' || (event.key === 'Enter' && allowedIP.value.trim())) {
            event.preventDefault();
            addAddress();
        } else if (event.key === 'Backspace' && !allowedIP.value && addresses.length) {
            event.preventDefault();
            addresses.pop();
            renderAddresses();
        }
    });

    function render() {
        const { can_create: canCreate, tokens } = tokenState;
        create.disabled = pending || !canCreate;
        status.textContent = !canCreate ? 'Active Disc-Tools Premium is required to create a token.'
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
                token.last_used_at ? dateFormat.format(new Date(token.last_used_at)) : 'Not tracked yet',
                tokenAddresses(token).join(', ') || 'Any IP'
            ]) {
                row.insertCell().textContent = value;
            }
            const edit = document.createElement('a');
            edit.className = 'token-action';
            edit.textContent = 'Edit';
            edit.setAttribute('aria-label', 'Edit ' + token.name);
            edit.href = '/portal/api-tokens/?edit=' + encodeURIComponent(token.id);
            row.insertCell().append(edit);
            return row;
        });
        list.replaceChildren(...rows);
    }

    async function mutate(method, body) {
        if (pending) return;
        pending = true;
        submit.disabled = cancel.disabled = revoke.disabled = true;
        formError.textContent = '';
        if (editId === null) render();
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
                window.location.replace('/portal/api-tokens/');
                return;
            }
        } catch (error) {
            failure = error;
        } finally {
            pending = false;
            submit.disabled = cancel.disabled = revoke.disabled = false;
            if (editId === null) render();
            if (failure) {
                formError.textContent = failure.message;
                if (method === 'DELETE') formError.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    function showEditor(token) {
        editStatus.textContent = '';
        title.hidden = true;
        submit.textContent = 'Save changes';
        createHelp.hidden = true;
        keep.hidden = keep.disabled = false;
        document.getElementById('token-edit-title').textContent = token.name;
        const nameField = document.getElementById('token-name-field');
        nameField.hidden = true;
        const nameInput = form.elements.namedItem('name');
        nameInput.disabled = true;
        nameInput.removeAttribute('autofocus');
        addresses = [...tokenAddresses(token)];
        renderAddresses();
        keep.textContent = 'Keep current expiration (' + (token.expires_at
            ? dateFormat.format(new Date(token.expires_at)) : 'Unlimited') + ')';
        expiry.value = 'keep';
        editForm.append(form);
        editForm.hidden = revokeSection.hidden = false;
    }

    create.addEventListener('click', () => {
        form.reset();
        addresses = [];
        renderAddresses();
        formError.textContent = '';
        dialog.showModal();
    });
    revoke.addEventListener('click', () => mutate('DELETE', { id: editId }));
    cancel.addEventListener('click', () => {
        if (editId === null) dialog.close();
        else window.location.assign('/portal/api-tokens/');
    });
    dialog.addEventListener('cancel', event => {
        if (submit.disabled) event.preventDefault();
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!addAddress()) return;
        const data = new FormData(form);
        const duration = data.get('expiry');
        const body = {
            expiresInDays: duration === 'keep' ? 'keep' : duration === 'unlimited' ? null : Number(duration),
            allowedIPs: addresses
        };
        if (editId !== null) mutate('PATCH', { id: editId, ...body });
        else mutate('POST', { name: data.get('name').trim(), ...body });
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
        if (editId === null) {
            render();
            return;
        }
        const token = data.tokens.find(token => token.id === editId);
        if (token) showEditor(token);
        else editStatus.textContent = 'API token not found.';
    }).catch(error => { (editId === null ? status : editStatus).textContent = error.message; });
}
