{
    const form = document.getElementById('activity-filters');
    const status = document.getElementById('activity-status');
    const rows = document.getElementById('activity-rows');
    const isUsage = form.closest('main').dataset.activity === 'usage';
    const date = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'medium' });
    const selected = new URLSearchParams(location.search);
    for (const select of form.querySelectorAll('select')) {
        const value = selected.get(select.name);
        if (value && [...select.options].some(option => option.value === value)) select.value = value;
    }

    const day = form.elements.namedItem('day');
    if (day) day.value = selected.get('day') || '';

    async function load(filters) {
        const submit = form.querySelector('button');
        submit.disabled = true;
        status.textContent = 'Loading activity…';
        rows.replaceChildren();
        try {
            const response = await fetch('/api/auth/developer-usage?' + filters, { cache: 'no-store' });
            if (!response.ok) throw new Error();
            const { daily, logs, keys } = await response.json();
            const key = form.elements.namedItem('key');
            key.replaceChildren(new Option('All keys', ''), ...keys.map(item => new Option(item.name, item.id)));
            key.value = filters.get('key') || '';
            if (!key.value) key.selectedIndex = 0;
            for (const item of isUsage ? daily : logs) {
                const row = rows.insertRow();
                const values = isUsage
                    ? [item.day, item.total, ((item.total - item.failed) / item.total * 100).toFixed(1) + '%']
                    : [date.format(new Date(item.created_at)), item.token_name, 'POST /api/v1/link-cleaner', item.status, item.duration_ms + ' ms', item.id];
                for (const value of values) row.insertCell().textContent = value;
                if (isUsage) {
                    const link = document.createElement('a');
                    const params = new URLSearchParams(filters);
                    params.set('status', 'failed');
                    params.set('day', item.day);
                    link.href = '/portal/request-logs/?' + params;
                    link.textContent = item.failed;
                    row.insertCell().append(link);
                }
            }
            status.textContent = rows.rows.length ? (isUsage ? '' : 'Showing the latest ' + rows.rows.length + ' matching requests.') : 'No requests match these filters.';
        } catch {
            status.textContent = 'Couldn’t load API activity. Try applying the filters again.';
        } finally {
            submit.disabled = false;
        }
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        const filters = new URLSearchParams(new FormData(form));
        history.replaceState(null, '', '?' + filters);
        load(filters);
    });
    load(new URLSearchParams({ period: form.elements.namedItem('period').value, ...Object.fromEntries(selected) }));
}
