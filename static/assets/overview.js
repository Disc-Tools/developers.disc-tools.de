{
    const stats = document.getElementById('overview-stats');
    const status = document.getElementById('overview-status');
    const activity = document.getElementById('key-activity');
    const empty = document.getElementById('activity-empty');
    const format = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'short' });

    async function loadOverview() {
        try {
            const response = await fetch('/api/auth/developer-tokens', { cache: 'no-store' });
            if (!response.ok) throw new Error();
            const { tokens } = await response.json();
            const expired = tokens.filter(token => token.expired).length;
            document.getElementById('keys-total').textContent = tokens.length;
            document.getElementById('keys-active').textContent = tokens.length - expired;
            document.getElementById('keys-expired').textContent = expired;
            stats.hidden = false;
            status.hidden = true;

            const recentTokens = [...tokens].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            for (const { name, created_at } of recentTokens.slice(0, 3)) {
                const item = document.createElement('li');
                const key = document.createElement('span');
                key.textContent = name;
                const time = document.createElement('time');
                time.dateTime = created_at;
                time.textContent = format.format(new Date(created_at));
                item.append(key, time);
                activity.append(item);
            }
            activity.hidden = !tokens.length;
            empty.hidden = Boolean(tokens.length);
            empty.textContent = 'No API keys yet.';
        } catch {
            status.textContent = 'Couldn’t load API keys. Reload to try again.';
            empty.textContent = 'Key activity is temporarily unavailable.';
        }
    }

    loadOverview();
}

(async () => {
    const status = document.getElementById('overview-requests');
    const activity = document.getElementById('request-activity');
    const activityStatus = document.getElementById('request-activity-status');
    const date = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'short' });
    try {
        const response = await fetch('/api/auth/developer-usage?period=1d', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const { daily, logs } = await response.json();
        const total = daily.reduce((sum, day) => sum + day.total, 0);
        const errors = daily.reduce((sum, day) => sum + day.failed, 0);
        document.getElementById('requests-total').textContent = total.toLocaleString();
        document.getElementById('requests-failed').textContent = errors.toLocaleString();
        document.getElementById('requests-success').textContent = total
            ? ((total - errors) / total).toLocaleString(undefined, { style: 'percent', maximumFractionDigits: 1 })
            : '—';
        document.getElementById('request-stats').hidden = false;
        status.hidden = true;

        const recent = [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        for (const request of recent.slice(0, 5)) {
            const item = document.createElement('li');
            const details = document.createElement('div');
            const name = document.createElement('strong');
            name.textContent = request.token_name;
            const time = document.createElement('time');
            time.dateTime = request.created_at;
            time.textContent = date.format(new Date(request.created_at));
            details.append(name, time);

            const result = document.createElement('span');
            result.className = 'request-result';
            result.textContent = 'HTTP ' + request.status + ' · ' + request.duration_ms + ' ms';
            item.append(details, result);
            activity.append(item);
        }
        activity.hidden = !recent.length;
        activityStatus.hidden = Boolean(recent.length);
        activityStatus.textContent = 'No requests in the last 24 hours.';
    } catch {
        status.textContent = 'Couldn’t load request counts.';
        activityStatus.textContent = 'Couldn’t load recent requests.';
    }
})();
