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

            for (const { name, created_at } of tokens.slice(0, 5)) {
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
    try {
        const response = await fetch('/api/auth/developer-usage?period=1d', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const { daily } = await response.json();
        const total = daily.reduce((sum, day) => sum + day.total, 0);
        const errors = daily.reduce((sum, day) => sum + day.failed, 0);
        status.textContent = total + ' requests · ' + errors + ' errors in the last 24 hours';
    } catch {
        status.textContent = 'Couldn’t load request counts.';
    }
})();
