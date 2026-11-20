(() => {
    const storageKey = 'disc-tools:developer-consent';
    const translate = globalThis.accountText ?? (text => text);
    const preferences = document.getElementById('cookie-preferences');
    const ad = ['/','/index.html'].includes(window.location.pathname)
        ? document.querySelector('[data-public-ad]') : null;
    let notice;
    let saved;
    let choice = { analytics: false, advertising: false };
    let adEligibility;
    let adCheckRunning = false;

    try {
        const stored = JSON.parse(localStorage.getItem(storageKey));
        if (typeof stored?.analytics === 'boolean' && typeof stored.advertising === 'boolean') {
            choice = stored;
            saved = true;
        } else {
            choice.analytics = localStorage.getItem('disc-tools:umami-consent') === 'true';
        }
    } catch {
        // Default to essentials when the saved choice cannot be read.
    }

    function loadUmami() {
        if (document.getElementById('disc-tools-umami')) return;
        const script = document.createElement('script');
        script.id = 'disc-tools-umami';
        script.defer = true;
        script.dataset.websiteId = '7ea19e6c-f28f-4d34-bf61-6ec65bc0f47e';
        script.dataset.domains = 'developers.disc-tools.de';
        script.dataset.excludeSearch = 'true';
        script.dataset.excludeHash = 'true';
        script.src = 'https://umami.disc-tools.de/script.js';
        document.head.append(script);
    }

    function showAdBlockPage() {
        if (choice.advertising && navigator.onLine) {
            window.location.replace('/blocked/ad-blocker/');
        }
    }

    async function adElementIsBlocked() {
        const bait = document.createElement('div');
        bait.className = 'adsbygoogle ad-banner ad-placement advertisement';
        bait.setAttribute('aria-hidden', 'true');
        bait.style.cssText = 'position:fixed;top:-1000px;left:0;width:300px;height:250px;pointer-events:none';
        document.body.append(bait);
        await new Promise(resolve => window.setTimeout(resolve, 200));
        const { visibility } = getComputedStyle(bait);
        const blocked = !bait.isConnected || bait.offsetHeight === 0 || ['hidden', 'collapse'].includes(visibility);
        bait.remove();
        return blocked;
    }

    async function loadAdSense() {
        if (!ad) return;
        adEligibility ??= fetch('/api/auth/developer-profile', { cache: 'no-store' })
            .then(async response => {
                if (!response.ok) return false;
                const profile = await response.json();
                return profile === null || profile.portalAvailable === false;
            }).catch(() => false);
        if (!await adEligibility || !choice.advertising || document.getElementById('disc-tools-adsense')) return;
        if (adCheckRunning) return;
        adCheckRunning = true;
        const blocked = await adElementIsBlocked();
        adCheckRunning = false;
        if (!choice.advertising) return;
        if (blocked) {
            showAdBlockPage();
            return;
        }
        const script = document.createElement('script');
        script.id = 'disc-tools-adsense';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6223306610300371';
        script.addEventListener('load', () => {
            if (!choice.advertising) return;
            ad.hidden = false;
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch {
                ad.hidden = true;
            }
        }, { once: true });
        document.head.append(script);
    }

    function applyChoice() {
        if (choice.analytics) loadUmami();
        if (choice.advertising) loadAdSense();
    }

    function closeBanner(banner) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            banner.remove();
            notice = null;
            return;
        }
        banner.classList.add('cookie-notice-dismissing');
        window.setTimeout(() => {
            banner.remove();
            notice = null;
        }, 240);
    }

    function saveChoice(banner, next) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
            banner.querySelector('[role="status"]').textContent = translate('Could not save these preferences in your browser.');
            return;
        }
        choice = next;
        if ((!choice.analytics && document.getElementById('disc-tools-umami')) ||
            (!choice.advertising && document.getElementById('disc-tools-adsense'))) {
            window.location.reload();
            return;
        }
        applyChoice();
        closeBanner(banner);
    }

    function openBanner() {
        if (notice) return;
        const banner = document.createElement('aside');
        banner.className = 'cookie-notice';
        banner.setAttribute('aria-labelledby', 'cookie-notice-title');
        banner.innerHTML = `
            <div>
                <h2 id="cookie-notice-title">${translate('Cookies and browser storage')}</h2>
                <p>${translate('Essential storage keeps sign-in and preferences working. You can also allow Umami analytics and Google AdSense on the public homepage.')}</p>
                <p role="status"></p>
            </div>
            <div class="cookie-notice-actions">
                <button type="button" data-choice="essential">${translate('Essentials only')}</button>
                <button type="button" aria-expanded="false" aria-controls="cookie-notice-options">${translate('Select')}</button>
                <button type="button" data-choice="all">${translate('Accept all')}</button>
            </div>
            <div class="cookie-notice-options" id="cookie-notice-options" hidden>
                <div class="cookie-notice-option">
                    <span id="cookie-analytics-label">${translate('Analytics (Umami)')}</span>
                    <button type="button" class="cookie-switch" role="switch" aria-labelledby="cookie-analytics-label" aria-checked="${choice.analytics}"></button>
                </div>
                <div class="cookie-notice-option">
                    <span id="cookie-advertising-label">${translate('Advertising (Google AdSense)')}</span>
                    <button type="button" class="cookie-switch" role="switch" aria-labelledby="cookie-advertising-label" aria-checked="${choice.advertising}"></button>
                </div>
                <div class="cookie-notice-save">
                    <button type="button" data-choice="custom">${translate('Save selection')}</button>
                </div>
            </div>
        `;
        const options = banner.querySelector('#cookie-notice-options');
        const toggles = options.querySelectorAll('[role="switch"]');
        banner.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button) return;
            if (button.hasAttribute('aria-expanded')) {
                options.hidden = !options.hidden;
                button.setAttribute('aria-expanded', String(!options.hidden));
            } else if (button.getAttribute('role') === 'switch') {
                button.setAttribute('aria-checked', String(button.getAttribute('aria-checked') !== 'true'));
            } else if (button.dataset.choice === 'custom') {
                saveChoice(banner, {
                    analytics: toggles[0].getAttribute('aria-checked') === 'true',
                    advertising: toggles[1].getAttribute('aria-checked') === 'true'
                });
            } else {
                const allowAll = button.dataset.choice === 'all';
                saveChoice(banner, { analytics: allowAll, advertising: allowAll });
            }
        });
        document.body.append(banner);
        notice = banner;
    }

    preferences?.addEventListener('click', openBanner);
    applyChoice();
    if (!saved) openBanner();
})();
