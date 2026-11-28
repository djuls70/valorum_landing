// Чистый Шов (Clean Seam Contract // Валорум MVP)
window.AppContract = {
    brand: 'ВАЛОРУМ',
    archetype: 'ARCH-02-FJORD',
    rateAnnualPct: 20,
    delayDays: 45,
    netMarginGainRub: 151013,
    ymCounterId: 114652395
};
window.AppUI = { version: '1.0.0' };

/* КОНТУР 1: Независимая приборная кинетика (телеметрия, проявление, ведомость) */
(function () {
    try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        const prefersReduced =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* 1. Линия телеметрии чтения в нижней грани шапки */
        const progressEl = document.getElementById('scroll-telemetry');
        if (progressEl && document.documentElement) {
            let ticking = false;
            const updateProgress = () => {
                const maxScroll = Math.max(document.documentElement.scrollHeight - (window.innerHeight || 0), 1);
                const ratio = Math.min(Math.max((window.scrollY || 0) / maxScroll, 0), 1);
                progressEl.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
                ticking = false;
            };
            if (typeof window.addEventListener === 'function') {
                window.addEventListener('scroll', () => {
                    if (!ticking && typeof window.requestAnimationFrame === 'function') {
                        window.requestAnimationFrame(updateProgress);
                        ticking = true;
                    } else if (!ticking) {
                        updateProgress();
                    }
                }, { passive: true });
            }
            updateProgress();
        }

        /* 2. Проявление блоков и очистка transform после завершения (кристальная резкость букв) */
        const revealItems = document.querySelectorAll('.reveal-item');
        if (!prefersReduced && typeof window.IntersectionObserver === 'function') {
            revealItems.forEach((el) => {
                el.addEventListener('transitionend', (e) => {
                    if (e.target === el && e.propertyName === 'transform') {
                        el.classList.add('is-settled');
                    }
                });
            });

            const observer = new window.IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-visible');
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
            );
            revealItems.forEach((el) => observer.observe(el));
        } else {
            revealItems.forEach((el) => {
                el.classList.add('is-visible', 'is-settled');
            });
        }

        /* 3. Однократный точный пересчет цифр в финансовой таблице при доскролле */
        const ledger = document.getElementById('financial-ledger');
        if (ledger && !prefersReduced && typeof window.IntersectionObserver === 'function') {
            const formatInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            const countObserver = new window.IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        countObserver.unobserve(ledger);
                        const cells = ledger.querySelectorAll('[data-count]');
                        const duration = 520;
                        const start = performance.now();

                        const tick = (now) => {
                            const t = Math.min((now - start) / duration, 1);
                            const eased = 0.72 + 0.28 * (1 - Math.pow(1 - t, 3));
                            cells.forEach((el) => {
                                const target = Number(el.getAttribute('data-count') || 0);
                                const prefix = el.getAttribute('data-prefix') || '';
                                const suffix = el.getAttribute('data-suffix') || '';
                                const val = t === 1 ? target : target * eased;
                                el.textContent = prefix + formatInt(val) + suffix;
                            });
                            if (t < 1) requestAnimationFrame(tick);
                        };
                        requestAnimationFrame(tick);
                    });
                },
                { threshold: 0.2 }
            );
            countObserver.observe(ledger);
        }

        /* 4. Делегированный фильтр рубрик блога ([data-filter] -> [data-rubric]) */
        if (typeof document.addEventListener === 'function') {
            document.addEventListener('click', (e) => {
                const target = e.target;
                const btn = target && typeof target.closest === 'function' ? target.closest('[data-filter]') : null;
                if (!btn || btn.disabled) return;
                const filter = btn.getAttribute('data-filter') || 'all';
                document.querySelectorAll('[data-filter]').forEach((b) => {
                    b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                });
                let visibleCount = 0;
                document.querySelectorAll('[data-rubric]').forEach((card) => {
                    const match = filter === 'all' || card.getAttribute('data-rubric') === filter;
                    card.hidden = !match;
                    if (match) {
                        card.removeAttribute('hidden');
                        visibleCount += 1;
                    } else {
                        card.setAttribute('hidden', '');
                    }
                });
                const emptyEl = document.querySelector('[data-blog-empty]');
                if (emptyEl) {
                    emptyEl.hidden = visibleCount > 0;
                    if (visibleCount > 0) emptyEl.setAttribute('hidden', '');
                    else emptyEl.removeAttribute('hidden');
                }
            });
        }
    } catch (_err) {}
})();

/* КОНТУР 2: safeStorage, плашка cookie, Яндекс Метрика и BigInt-атрибуция Telegram CTA */
(function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const COOKIE_ACK_KEY = 'valorum_cookie_ack';
    const ATTR_STORAGE_KEY = 'valorum_attr_v1';
    const ORG_CAMP_SESSION_KEY = 'valorum_org_camp_v1';
    const LAST_BLOG_CAMP_KEY = 'valorum_last_blog_camp';
    const ATTR_TTL_MS = 21 * 86400 * 1000;
    const BOT_BASE_URL = 'https://t.me/valorum_official_bot?start=';
    const DEFAULT_START = 'landing_cta';
    const METRIKA_SRC = 'https://mc.yandex.ru/metrika/tag.js';
    const BASE36_MOD_6 = 2176782336; // 36^6

    const makeSafeStorage = (areaName) => {
        const memoryStore = Object.create(null);
        return {
            getItem(key) {
                try {
                    const area = window[areaName];
                    if (area) {
                        const val = area.getItem(key);
                        if (val !== null) return val;
                    }
                } catch (_e) {}
                return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
            },
            setItem(key, value) {
                const val = String(value);
                memoryStore[key] = val;
                try {
                    const area = window[areaName];
                    if (area) {
                        area.setItem(key, val);
                    }
                } catch (_e) {}
            },
            removeItem(key) {
                delete memoryStore[key];
                try {
                    const area = window[areaName];
                    if (area) {
                        area.removeItem(key);
                    }
                } catch (_e) {}
            }
        };
    };
    const safeStorage = makeSafeStorage('localStorage');
    const safeSessionStorage = makeSafeStorage('sessionStorage');

    const parseQuery = (searchStr) => {
        const result = Object.create(null);
        if (!searchStr || typeof searchStr !== 'string') return result;
        const clean = searchStr.charAt(0) === '?' ? searchStr.slice(1) : searchStr;
        if (!clean) return result;
        const pairs = clean.split('&');
        for (let i = 0; i < pairs.length; i++) {
            const part = pairs[i];
            if (!part) continue;
            const eqIdx = part.indexOf('=');
            const rawKey = eqIdx >= 0 ? part.slice(0, eqIdx) : part;
            const rawVal = eqIdx >= 0 ? part.slice(eqIdx + 1) : '';
            try {
                const k = decodeURIComponent(rawKey.replace(/\+/g, ' '));
                const v = decodeURIComponent(rawVal.replace(/\+/g, ' '));
                if (!(k in result)) result[k] = v;
            } catch (_e) {}
        }
        return result;
    };

    const utf8Bytes = (str) => {
        if (typeof TextEncoder === 'function') {
            return new TextEncoder().encode(str);
        }
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);
            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
            } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
                const next = str.charCodeAt(++i);
                code = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
                bytes.push(
                    0xf0 | (code >> 18),
                    0x80 | ((code >> 12) & 0x3f),
                    0x80 | ((code >> 6) & 0x3f),
                    0x80 | (code & 0x3f)
                );
            } else {
                bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            }
        }
        return bytes;
    };

    const encodeCamp6 = (rawCamp) => {
        const trimmed = typeof rawCamp === 'string' ? rawCamp.trim() : '';
        if (!trimmed) return '0';
        const dashed = trimmed.replace(/_/g, '-');
        if (/^[A-Za-z0-9-]{1,6}$/.test(dashed)) {
            return dashed.toLowerCase();
        }
        const bytes = utf8Bytes(trimmed);
        let hash = 0x811c9dc5;
        for (let i = 0; i < bytes.length; i++) {
            hash ^= bytes[i];
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return (hash % BASE36_MOD_6).toString(36).padStart(6, '0');
    };

    const encodeNumericB36 = (raw) => {
        const val = String(raw == null ? '' : raw).trim();
        if (!/^\d{1,38}$/.test(val)) return '0';
        try {
            return BigInt(val).toString(36);
        } catch (_e) {
            return '0';
        }
    };

    const readYmUidFromCookie = () => {
        try {
            const rawCookie = document.cookie || '';
            const match = rawCookie.match(/(?:^|;\s*)_ym_uid=(\d{1,38})(?:;|$)/);
            return match ? match[1] : '';
        } catch (_e) {
            return '';
        }
    };

    const readStoredAttribution = (nowMs) => {
        const raw = safeStorage.getItem(ATTR_STORAGE_KEY);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            const ts = Number(parsed.ts || 0);
            if (!Number.isFinite(ts) || ts <= 0 || nowMs - ts > ATTR_TTL_MS || nowMs < ts - 60000) {
                safeStorage.removeItem(ATTR_STORAGE_KEY);
                return null;
            }
            const yclid = /^\d{1,38}$/.test(String(parsed.yclid || '')) ? String(parsed.yclid) : '';
            const camp = typeof parsed.camp === 'string' ? parsed.camp : '';
            return { yclid, camp, ts };
        } catch (_e) {
            safeStorage.removeItem(ATTR_STORAGE_KEY);
            return null;
        }
    };

    let ymClientIdCache = '';
    let currentUrlCamp = '';
    const BTN_CAMP_RE = /^[a-z0-9-]{1,6}$/;

    const syncAttributionState = () => {
        const nowMs = Date.now();
        const stored = readStoredAttribution(nowMs);
        const searchStr = (window.location && window.location.search) || '';
        const params = parseQuery(searchStr);

        const qYclidRaw = String(params.yclid || '').trim();
        const qYclid = /^\d{1,38}$/.test(qYclidRaw) ? qYclidRaw : '';
        const qCamp = String(params.utm_campaign || params.camp || '').trim();

        let state = stored || { yclid: '', camp: '', ts: 0 };
        if (qYclid) {
            state = { yclid: qYclid, camp: qCamp, ts: nowMs };
            safeStorage.setItem(ATTR_STORAGE_KEY, JSON.stringify(state));
        } else if (qCamp) {
            currentUrlCamp = qCamp;
            if (!stored || !stored.yclid) {
                safeSessionStorage.setItem(ORG_CAMP_SESSION_KEY, qCamp);
            }
        }

        const pathStr = String((window.location && window.location.pathname) || '');
        const isArticlePath = /^\/blog\/[a-z0-9-]+\/?$/i.test(pathStr);
        if (isArticlePath) {
            const ctas = document.querySelectorAll('[data-bot-cta]');
            for (let i = 0; i < ctas.length; i++) {
                const rawBtnCamp = typeof ctas[i].getAttribute === 'function' ? ctas[i].getAttribute('data-bot-camp') : '';
                const cleanBtnCamp = typeof rawBtnCamp === 'string' && BTN_CAMP_RE.test(rawBtnCamp.trim()) ? rawBtnCamp.trim() : '';
                if (cleanBtnCamp && /^bg-a\d{2}$/.test(cleanBtnCamp)) {
                    safeSessionStorage.setItem(LAST_BLOG_CAMP_KEY, cleanBtnCamp);
                    break;
                }
            }
        }
        return state;
    };

    const buildStartParam = (campRaw, yclidRaw, ymuidRaw) => {
        const camp6 = encodeCamp6(campRaw);
        const yclidB36 = encodeNumericB36(yclidRaw);
        const ymuidB36 = encodeNumericB36(ymuidRaw);
        if (camp6 === '0' && yclidB36 === '0' && ymuidB36 === '0') {
            return DEFAULT_START;
        }
        const token = 'v1_' + camp6 + '_' + yclidB36 + '_' + ymuidB36;
        return /^[A-Za-z0-9_-]{1,64}$/.test(token) ? token : DEFAULT_START;
    };

    const updateBotCtaLinks = () => {
        try {
            const ctas = document.querySelectorAll('[data-bot-cta]');
            if (!ctas || !ctas.length) return;
            const state = readStoredAttribution(Date.now()) || { yclid: '', camp: '', ts: 0 };
            const ymuid = ymClientIdCache || readYmUidFromCookie();
            const orgCamp = safeSessionStorage.getItem(ORG_CAMP_SESSION_KEY) || '';
            const lastBlogCamp = safeSessionStorage.getItem(LAST_BLOG_CAMP_KEY) || '';
            ctas.forEach((el) => {
                const rawBtnCamp = typeof el.getAttribute === 'function' ? el.getAttribute('data-bot-camp') : '';
                const cleanBtnCamp = typeof rawBtnCamp === 'string' && BTN_CAMP_RE.test(rawBtnCamp.trim()) ? rawBtnCamp.trim() : '';
                let startParam;
                if (state.yclid) {
                    startParam = buildStartParam(state.camp, state.yclid, ymuid);
                } else if (currentUrlCamp) {
                    startParam = buildStartParam(currentUrlCamp, '', ymuid);
                } else if (cleanBtnCamp) {
                    startParam = 'v1_' + cleanBtnCamp + '_0_' + encodeNumericB36(ymuid);
                } else if (orgCamp || lastBlogCamp) {
                    startParam = buildStartParam(orgCamp || lastBlogCamp, '', ymuid);
                } else {
                    startParam = buildStartParam('', '', ymuid);
                }
                el.setAttribute('href', BOT_BASE_URL + startParam);
            });
        } catch (_e) {}
    };

    /* 1. Первичная синхронизация атрибуции и пересборка CTA */
    syncAttributionState();
    updateBotCtaLinks();

    /* 2. Синхронная пересборка CTA перед переходом (без preventDefault и fetch) */
    const ctaElements = document.querySelectorAll('[data-bot-cta]');
    ctaElements.forEach((el) => {
        ['pointerdown', 'focus', 'click'].forEach((evtName) => {
            el.addEventListener(evtName, updateBotCtaLinks);
        });
    });

    /* 3. Плашка технических cookie */
    const noticeEl = document.getElementById('cookie-notice');
    const acceptBtn = document.getElementById('cookie-accept-btn');
    if (noticeEl) {
        if (safeStorage.getItem(COOKIE_ACK_KEY) !== '1') {
            noticeEl.hidden = false;
            noticeEl.removeAttribute('hidden');
        }
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                safeStorage.setItem(COOKIE_ACK_KEY, '1');
                noticeEl.hidden = true;
                noticeEl.setAttribute('hidden', '');
            });
        }
    }

    /* 4. Мгновенный запуск Яндекс Метрики по контракту window.AppContract.ymCounterId */
    const counterId = window.AppContract && window.AppContract.ymCounterId;
    if (Number.isInteger(counterId) && counterId > 0 && !window.__valorumYmInited) {
        window.__valorumYmInited = true;
        if (typeof window.ym !== 'function') {
            window.ym = function () {
                (window.ym.a = window.ym.a || []).push(arguments);
            };
            window.ym.l = Number(new Date());
        }
        try {
            const existingScripts = document.querySelectorAll('script[src]');
            let hasTagScript = false;
            existingScripts.forEach((s) => {
                if ((s.getAttribute('src') || '').indexOf(METRIKA_SRC) === 0) {
                    hasTagScript = true;
                }
            });
            if (!hasTagScript && typeof document.createElement === 'function') {
                const tag = document.createElement('script');
                tag.async = true;
                tag.src = METRIKA_SRC;
                const parent = document.head || document.body || document.documentElement;
                if (parent) parent.appendChild(tag);
            }
        } catch (_e) {}

        try {
            window.ym(counterId, 'init', {
                clickmap: true,
                trackLinks: true,
                accurateTrackBounce: true,
                webvisor: true
            });
            window.ym(counterId, 'getClientID', (cid) => {
                const cleanCid = String(cid == null ? '' : cid).trim();
                if (/^\d{1,38}$/.test(cleanCid)) {
                    ymClientIdCache = cleanCid;
                }
                updateBotCtaLinks();
            });
        } catch (_e) {}
    }
})();
