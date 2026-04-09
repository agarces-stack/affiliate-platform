// ============================================
// MagnetRaffic UX System
// Toasts, Skeleton, Transitions, Cmd+K, Onboarding
// ============================================

// TOAST NOTIFICATIONS (reemplaza alert())
const toastContainer = document.createElement('div');
toastContainer.id = 'toastContainer';
toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
document.body.appendChild(toastContainer);

function toast(msg, type = 'success', duration = 3000) {
    const t = document.createElement('div');
    const colors = { success: '#22c55e', error: '#ef4444', warning: '#eab308', info: '#3b82f6' };
    const icons = { success: '&#10003;', error: '&#10007;', warning: '&#9888;', info: '&#8505;' };
    t.innerHTML = `<span style="margin-right:8px">${icons[type] || ''}</span>${msg}`;
    t.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.3);pointer-events:auto;opacity:0;transform:translateX(30px);transition:all 0.3s ease;max-width:400px`;
    toastContainer.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        t.style.opacity = '0'; t.style.transform = 'translateX(30px)';
        setTimeout(() => t.remove(), 300);
    }, duration);
}

// SKELETON LOADING
function skeleton(rows = 3, cols = 4) {
    let html = '';
    for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
            const w = 40 + Math.random() * 50;
            html += `<td style="padding:12px 15px"><div class="skeleton-line" style="width:${w}%;height:14px;border-radius:4px"></div></td>`;
        }
        html += '</tr>';
    }
    return html;
}

function skeletonCards(count = 4) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<div class="stat-card"><div class="skeleton-line" style="width:60%;height:12px;margin-bottom:8px;border-radius:4px"></div><div class="skeleton-line" style="width:40%;height:28px;border-radius:4px"></div></div>`;
    }
    return html;
}

// SECTION TRANSITIONS
function fadeIn(element) {
    if (!element) return;
    element.style.opacity = '0';
    element.style.transform = 'translateY(8px)';
    requestAnimationFrame(() => {
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    });
}

// EMPTY STATES
function emptyState(icon, title, subtitle, ctaText, ctaAction) {
    return `<div style="text-align:center;padding:40px 20px">
        <div style="font-size:48px;margin-bottom:12px;opacity:0.5">${icon}</div>
        <h3 style="color:#e2e8f0;margin-bottom:6px;font-size:16px">${title}</h3>
        <p style="color:#64748b;font-size:13px;margin-bottom:16px">${subtitle}</p>
        ${ctaText ? `<button class="btn btn-blue" onclick="${ctaAction}">${ctaText}</button>` : ''}
    </div>`;
}

// CMD+K SEARCH OVERLAY
function initCmdK() {
    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const overlay = document.getElementById('cmdkOverlay');
            if (overlay) {
                overlay.style.display = overlay.style.display === 'flex' ? 'none' : 'flex';
                if (overlay.style.display === 'flex') {
                    overlay.querySelector('input')?.focus();
                }
            }
        }
        if (e.key === 'Escape') {
            const overlay = document.getElementById('cmdkOverlay');
            if (overlay) overlay.style.display = 'none';
        }
    });
}

function createCmdKOverlay() {
    const div = document.createElement('div');
    div.id = 'cmdkOverlay';
    div.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:9998;align-items:flex-start;justify-content:center;padding-top:15vh';
    div.innerHTML = `
        <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;width:560px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden">
            <div style="display:flex;align-items:center;padding:16px;border-bottom:1px solid #334155;gap:12px">
                <span style="color:#64748b;font-size:18px">&#128269;</span>
                <input id="cmdkInput" type="text" placeholder="Search agents, campaigns, conversions... (Esc to close)" style="flex:1;background:none;border:none;color:#e2e8f0;font-size:16px;outline:none" oninput="cmdkSearch(this.value)">
                <kbd style="background:#0f172a;color:#64748b;padding:2px 8px;border-radius:4px;font-size:11px;border:1px solid #334155">ESC</kbd>
            </div>
            <div id="cmdkResults" style="max-height:400px;overflow-y:auto;padding:8px"></div>
        </div>`;
    div.addEventListener('click', e => { if (e.target === div) div.style.display = 'none'; });
    document.body.appendChild(div);
    initCmdK();
}

// ONBOARDING WIZARD
function showOnboarding(steps) {
    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.8);z-index:9997;display:flex;align-items:center;justify-content:center';

    let current = 0;

    function render() {
        const step = steps[current];
        const progress = ((current + 1) / steps.length * 100).toFixed(0);
        overlay.innerHTML = `
            <div style="background:#1e293b;border-radius:20px;width:500px;max-width:90vw;padding:30px;box-shadow:0 20px 60px rgba(0,0,0,.5)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                    <span style="color:#64748b;font-size:13px">Step ${current + 1} of ${steps.length}</span>
                    <button onclick="document.getElementById('onboardingOverlay').remove()" style="background:none;border:none;color:#64748b;font-size:18px;cursor:pointer">&#10005;</button>
                </div>
                <div style="background:#0f172a;border-radius:8px;height:4px;margin-bottom:25px;overflow:hidden">
                    <div style="background:#8b5cf6;height:100%;width:${progress}%;transition:width 0.3s ease;border-radius:8px"></div>
                </div>
                <div style="text-align:center;margin-bottom:20px">
                    <div style="font-size:48px;margin-bottom:12px">${step.icon}</div>
                    <h2 style="color:#e2e8f0;margin-bottom:8px;font-size:20px">${step.title}</h2>
                    <p style="color:#94a3b8;font-size:14px;line-height:1.6">${step.description}</p>
                </div>
                ${step.content || ''}
                <div style="display:flex;gap:10px;margin-top:25px">
                    ${current > 0 ? '<button onclick="onboardingPrev()" style="flex:1;padding:12px;background:#334155;color:#94a3b8;border:none;border-radius:10px;font-size:14px;cursor:pointer">Back</button>' : ''}
                    <button onclick="${current < steps.length - 1 ? 'onboardingNext()' : 'onboardingFinish()'}" style="flex:1;padding:12px;background:#8b5cf6;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">${current < steps.length - 1 ? 'Next' : 'Get Started!'}</button>
                </div>
            </div>`;
    }

    window.onboardingNext = () => { current++; render(); };
    window.onboardingPrev = () => { current--; render(); };
    window.onboardingFinish = () => { overlay.remove(); localStorage.setItem('mr_onboarded', '1'); };

    render();
    document.body.appendChild(overlay);
}

// INJECT GLOBAL STYLES
const uxStyles = document.createElement('style');
uxStyles.textContent = `
    .skeleton-line { background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
    .section { animation: sectionFadeIn 0.3s ease-out; }
    @keyframes sectionFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .btn { transition: transform 0.15s ease, opacity 0.15s ease; }
    .btn:active { transform: scale(0.95); }
    .btn:hover { opacity: 0.9; }
    tr { transition: background 0.15s ease; }
    .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,.2); }
    .sidebar a { transition: all 0.15s ease; }
    .sidebar .nav-group-title { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 15px 15px 5px; margin-top: 5px; }
    .sidebar .nav-group-title:first-child { margin-top: 0; }
    @media(max-width:768px) { #cmdkOverlay { padding-top: 5vh; } }
`;
document.head.appendChild(uxStyles);
