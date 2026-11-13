{
    const storageKey = 'disc-tools:cookie-notice:dismissed';
    let dismissed = false;
    try {
        dismissed = localStorage.getItem(storageKey) === 'true';
    } catch {
        // The notice can still be dismissed for this page.
    }

    if (!dismissed) {
        const notice = document.createElement('aside');
        notice.className = 'cookie-notice';
        notice.setAttribute('aria-labelledby', 'cookie-notice-title');
        notice.innerHTML = `
            <div>
                <h2 id="cookie-notice-title">Cookies and browser storage</h2>
                <p>We use cookies to secure Discord sign-in and keep you signed in. Your browser also remembers which sidebar sections you’ve expanded.</p>
            </div>
            <button type="button">Got it</button>
        `;
        notice.querySelector('button').addEventListener('click', event => {
            event.currentTarget.disabled = true;
            try {
                localStorage.setItem(storageKey, 'true');
            } catch {
                // The notice is still removed from this page.
            }
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                notice.remove();
                return;
            }
            notice.addEventListener('animationend', event => {
                if (event.animationName === 'cookie-notice-out') notice.remove();
            });
            notice.classList.add('cookie-notice-dismissing');
            window.setTimeout(() => notice.remove(), 300);
        });
        document.body.append(notice);
    }
}
