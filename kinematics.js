// Чистый Шов (Clean Seam Contract // Валорум MVP)
window.AppContract = {
    brand: 'ВАЛОРУМ',
    archetype: 'ARCH-02-FJORD',
    rateAnnualPct: 20,
    delayDays: 45,
    netMarginGainRub: 151013
};
window.AppUI = { version: '1.0.0' };
(function () {
            const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            /* 1. Линия телеметрии чтения в нижней грани шапки */
            const progressEl = document.getElementById('scroll-telemetry');
            if (progressEl) {
                let ticking = false;
                const updateProgress = () => {
                    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
                    const ratio = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
                    progressEl.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
                    ticking = false;
                };
                window.addEventListener('scroll', () => {
                    if (!ticking) {
                        window.requestAnimationFrame(updateProgress);
                        ticking = true;
                    }
                }, { passive: true });
                updateProgress();
            }

            /* 2. Проявление блоков и очистка transform после завершения (кристальная резкость букв) */
            const revealItems = document.querySelectorAll('.reveal-item');
            if (!prefersReduced && 'IntersectionObserver' in window) {
                revealItems.forEach((el) => {
                    el.addEventListener('transitionend', (e) => {
                        if (e.target === el && e.propertyName === 'transform') {
                            el.classList.add('is-settled');
                        }
                    });
                });

                const observer = new IntersectionObserver(
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
            if (ledger && !prefersReduced && 'IntersectionObserver' in window) {
                const formatInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                const countObserver = new IntersectionObserver(
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

            /* 4. Защита якоря кнопки до подстановки боевого URL Telegram-бота */
            document.querySelectorAll('[data-bot-cta]').forEach((link) => {
                link.addEventListener('click', (e) => {
                    if (link.getAttribute('href') === '#telegram-bot') {
                        e.preventDefault();
                    }
                });
            });
        })();
