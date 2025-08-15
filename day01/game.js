(function () {
    const timeEl   = document.getElementById('time');
    const scoreEl  = document.getElementById('score');
    const targetEl = document.getElementById('target');
    const shuriken = document.getElementById('shuriken');
    const pads     = Array.from(document.querySelectorAll('.pad'));
    const skipBtn  = document.getElementById('skip');

    const modalWin  = document.getElementById('modal-win');
    const modalLose = document.getElementById('modal-lose');

    const TARGET_SCORE = 10; // можно поменять
    const TIME_LIMIT   = 30; // секунд

    targetEl.textContent = TARGET_SCORE;

    const COLORS = ['red','blue','green','black','white','teal'];
    const CLASS_BY_COLOR = {
        red:'s-red', blue:'s-blue', green:'s-green', black:'s-black', white:'s-white', teal:'s-teal'
    };
    const randColor = () => COLORS[Math.floor(Math.random()*COLORS.length)];

    // ---- состояние
    const state = {
        timeLeft: TIME_LIMIT,
        score: 0,
        currentColor: null,
        dragging: false,
        startPointer: { x: 0, y: 0 },
        startTranslate: { x: 0, y: 0 },
        hotPad: null,
        timerId: null
    };

    // ---- таймер
    function tick() {
        state.timeLeft -= 1;
        timeEl.textContent = state.timeLeft;
        if (state.timeLeft <= 0) end(false);
    }

    function start() {
        clearInterval(state.timerId);
        state.timeLeft = TIME_LIMIT; timeEl.textContent = TIME_LIMIT;
        state.score = 0; scoreEl.textContent = '0';
        spawnShuriken();
        state.timerId = setInterval(tick, 1000);
    }

    // ---- спавн/перекраска сюрикена
    function spawnShuriken() {
        // сброс transform, чтобы dnd считался от (0,0)
        shuriken.style.transform = 'translate(0px, 0px)';
        // очистить предыдущие цветовые классы
        for (const c of Object.values(CLASS_BY_COLOR)) shuriken.classList.remove(c);

        const color = randColor();
        state.currentColor = color;
        shuriken.classList.add(CLASS_BY_COLOR[color]);
    }

    // ---- окончание игры
    function end(win) {
        clearInterval(state.timerId);
        if (win) {
            const t = (TIME_LIMIT - state.timeLeft);
            modalWin.querySelector('[data-bind="final-time"]').textContent  = t;
            modalWin.querySelector('[data-bind="final-score"]').textContent = `${state.score}/${TARGET_SCORE}`;

            const container = document.getElementById('keys-reveal');
            container.innerHTML = '';
            const keys = (window.NINJAGO_KEYS || []).filter(k => k && k.emoji && k.letter);
            const showCount = Math.max(1, Math.min(window.NINJAGO_REVEAL_COUNT || 1, keys.length));
            if (!keys.length) {
                const p = document.createElement('p');
                p.textContent = '🔒 Добавь ключи в keys.js (window.NINJAGO_KEYS).';
                container.appendChild(p);
            } else {
                for (const k of keys.slice(0, showCount)) {
                    const row = document.createElement('div');
                    row.className = 'key';
                    row.innerHTML = `<div class="emoji">${k.emoji}</div><div>=</div><div class="letter">${k.letter}</div>`;
                    container.appendChild(row);
                }
            }
            modalWin.showModal();
        } else {
            modalLose.showModal();
        }
    }

    // перезапуск по кнопке из обоих диалогов
    [modalWin, modalLose].forEach(dlg => {
        dlg.addEventListener('close', () => {
            if (dlg.returnValue === 'restart') start();
        });
    });

    // ---- утилита чтения текущего translate
    function getTranslate(el) {
        const tr = getComputedStyle(el).transform;
        if (tr && tr !== 'none') {
            const m = tr.match(/matrix\(([^)]+)\)/);
            if (m) {
                const a = m[1].split(',').map(parseFloat);
                return { x: a[4] || 0, y: a[5] || 0 };
            }
            const t = tr.match(/translate\\(([-\\d.]+)px,\\s*([-\\d.]+)px\\)/);
            if (t) return { x: parseFloat(t[1]), y: parseFloat(t[2]) };
        }
        return { x: 0, y: 0 };
    }

    // ---- Pointer Events DnD (без «прыжка»)
    function onPointerDown(e) {
        e.preventDefault();
        shuriken.setPointerCapture?.(e.pointerId);

        state.dragging = true;
        state.startPointer   = { x: e.clientX, y: e.clientY };
        state.startTranslate = getTranslate(shuriken);

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp, { once: true });
    }

    function onPointerMove(e) {
        if (!state.dragging) return;
        e.preventDefault();

        const dx = e.clientX - state.startPointer.x;
        const dy = e.clientY - state.startPointer.y;

        const nx = state.startTranslate.x + dx;
        const ny = state.startTranslate.y + dy;

        shuriken.style.transform = `translate(${nx}px, ${ny}px)`;

        // подсветка горячего пэда по центру сюрикена
        const sRect = shuriken.getBoundingClientRect();
        const sCenter = { x: sRect.left + sRect.width / 2, y: sRect.top + sRect.height / 2 };
        let hot = null;
        for (const p of pads) {
            const pr = p.getBoundingClientRect();
            const inside = sCenter.x > pr.left && sCenter.x < pr.right && sCenter.y > pr.top && sCenter.y < pr.bottom;
            p.dataset.hot = inside ? 'true' : 'false';
            if (inside) hot = p;
        }
        state.hotPad = hot;
    }

    function onPointerUp(e) {
        document.removeEventListener('pointermove', onPointerMove);
        state.dragging = false;
        pads.forEach(p => p.dataset.hot = 'false');

        if (state.hotPad) {
            const match = state.hotPad.getAttribute('data-color') === state.currentColor;
            if (match) {
                state.score += 1; scoreEl.textContent = String(state.score);
                if (state.score >= TARGET_SCORE) { end(true); return; }
            }
        }
        spawnShuriken();
    }

    // Фоллбек клавиатурой (Enter — скип)
    shuriken.addEventListener('keydown', (e) => { if (e.key === 'Enter') spawnShuriken(); });

    // События
    shuriken.addEventListener('pointerdown', onPointerDown);
    skipBtn.addEventListener('click', spawnShuriken);

    // старт
    start();
})();
