for (const group of document.querySelectorAll('[data-sidebar-group]')) {
    const key = 'disc-tools:portal:sidebar:' + group.dataset.sidebarGroup;
    try {
        const saved = localStorage.getItem(key);
        if (saved === 'open' || saved === 'closed') group.open = saved === 'open';
    } catch {
        // The default state still works if storage is unavailable.
    }

    group.addEventListener('toggle', () => {
        try {
            localStorage.setItem(key, group.open ? 'open' : 'closed');
        } catch {
            // The category still toggles for this page.
        }
    });
}
