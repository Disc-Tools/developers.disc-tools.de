{
    const form = document.getElementById('activity-filters');
    const status = document.getElementById('activity-status');
    const rows = document.getElementById('activity-rows');
    const more = document.getElementById('activity-more');
    const submit = form.querySelector('button');
    const isUsage = form.closest('main').dataset.activity === 'usage';
    const date = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'medium' });
    const selected = new URLSearchParams(location.search);
    let current;
    const observer = more && 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => {
            if (current?.cursor && !current.retry && entries.some(entry => entry.isIntersecting)) loadPage(current);
        }, { rootMargin: '0px 0px 120px 0px' })
        : null;

    for (const select of form.querySelectorAll('select')) {
        const value = selected.get(select.name);
        if (value && [...select.options].some(option => option.value === value)) select.value = value;
    }
    const day = form.elements.namedItem('day');
    if (day) day.value = selected.get('day') || '';

    function renderItems(items, filters, totalCount) {
        for (const item of items) {
            const row = rows.insertRow();
            const values = isUsage
                ? [item.day, item.total, ((item.total - item.failed) / item.total * 100).toFixed(1) + '%']
                : [totalCount - row.sectionRowIndex, date.format(new Date(item.created_at)), item.token_name, 'POST /api/v1/link-cleaner', item.status, item.duration_ms + ' ms', item.id];
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
    }

    async function loadPage(page) {
        if (page.loading) return;
        const first = !page.cursor;
        page.loading = true;
        page.retry = false;
        if (first) submit.disabled = true;
        if (more) {
            observer?.unobserve(more);
            more.disabled = true;
        }
        status.textContent = first ? 'Loading activity…' : 'Loading more requests…';

        try {
            const params = new URLSearchParams(page.filters);
            if (!isUsage) {
                params.set('view', 'logs');
                if (page.cursor) params.set('cursor', page.cursor);
                else params.delete('cursor');
            }
            const response = await fetch('/api/auth/developer-usage?' + params, {
                cache: 'no-store', signal: page.controller.signal
            });
            if (!response.ok) throw new Error();
            const { daily, logs, keys, nextCursor, totalCount } = await response.json();
            if (page !== current) return;
            if (first) {
                page.totalCount = totalCount;
                const key = form.elements.namedItem('key');
                key.replaceChildren(new Option('All keys', ''), ...keys.map(item => new Option(item.name, item.id)));
                key.value = page.filters.get('key') || '';
                if (!key.value) key.selectedIndex = 0;
            }
            renderItems(isUsage ? daily : logs, page.filters, page.totalCount);
            page.cursor = nextCursor || null;
            status.textContent = rows.rows.length
                ? (isUsage ? '' : 'Showing ' + rows.rows.length + ' matching requests' + (page.cursor ? '.' : ' · End of results.'))
                : 'No requests match these filters.';
        } catch {
            if (page !== current) return;
            page.retry = !first;
            status.textContent = first
                ? 'Couldn’t load API activity. Try applying the filters again.'
                : 'Couldn’t load more requests. Try again.';
        } finally {
            page.loading = false;
            if (page === current) {
                submit.disabled = false;
                if (more) {
                    more.hidden = !page.cursor;
                    more.disabled = false;
                    more.textContent = page.retry ? 'Retry' : 'Load more';
                    if (page.cursor && !page.retry) observer?.observe(more);
                }
            }
        }
    }

    function start(filters) {
        current?.controller.abort();
        if (more) more.hidden = true;
        rows.replaceChildren();
        current = { filters, cursor: null, controller: new AbortController() };
        loadPage(current);
    }

    more?.addEventListener('click', () => {
        if (current?.cursor) loadPage(current);
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        const filters = new URLSearchParams(new FormData(form));
        history.replaceState(null, '', '?' + filters);
        start(filters);
    });
    start(new URLSearchParams({ period: form.elements.namedItem('period').value, ...Object.fromEntries(selected) }));
}
