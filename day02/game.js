(function () {
    const cfg = window.NINJAGO_CONFIG || {};
    const ENEMY_ALIVE_MS = cfg.ENEMY_ALIVE_MS ?? 1000;
    const GOOD_ALIVE_MS = cfg.GOOD_ALIVE_MS ?? 1000;
    const RESPAWN_DELAY_MS = cfg.RESPAWN_DELAY_MS ?? 300;
    const TOTAL_KILLS = cfg.TOTAL_KILLS ?? 10;
    const GOOD_P = Math.max(0, Math.min(1, cfg.GOOD_PROBABILITY ?? 0.35));

    // UI refs
    const timeEl = document.getElementById('time');
    const scoreEl = document.getElementById('score');
    const targetEl = document.getElementById('target');
    const field = document.getElementById('field');
    const wuFlash = document.getElementById('wuFlash');

    const modalWin = document.getElementById('modal-win');
    const modalLose = document.getElementById('modal-lose');

    targetEl.textContent = TOTAL_KILLS;

    // РОСТЕРЫ (картинки в /images)
    const ALLIES = [
        {id: 'kai', name: 'Kai', src: 'images/ninja_kai.png'},
        {id: 'jay', name: 'Jay', src: 'images/ninja_jay.png'},
        {id: 'zane', name: 'Zane', src: 'images/ninja_zane.png'},
        {id: 'cole', name: 'Cole', src: 'images/ninja_cole.png'},
        {id: 'nya', name: 'Nya', src: 'images/ninja_nya.png'},
        {id: 'lloyd', name: 'Lloyd', src: 'images/ninja_lloyd.png'}
    ];

    const ENEMIES = [
        {id: 'garmadon', name: 'Lord Garmadon', src: 'images/enemy_garmadon.png'},
        {id: 'overlord', name: 'Overlord', src: 'images/enemy_overlord.png'},
        {id: 'pythor', name: 'Pythor', src: 'images/enemy_pythor.png'},
        {id: 'morro', name: 'Morro', src: 'images/enemy_morro.png'},
        {id: 'harumi', name: 'Harumi', src: 'images/enemy_harumi.png'}
    ];

    const POOP_SRC = 'images/poop.png';

    // state
    const state = {
        score: 0,
        playing: false,
        timerStart: 0,
        timerId: null,
        lifeTimeout: null
    };

    // utils
    const $ = (tag, cls, attrs = {}) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
        return n;
    };
    const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const remove = (n) => n && n.parentNode && n.parentNode.removeChild(n);

    function reset() {
        clearTimeout(state.lifeTimeout);
        clearTimeout(state.timerId);
        state.score = 0;
        state.playing = false;
        scoreEl.textContent = '0';
        timeEl.textContent = '—';
        field.innerHTML = '';
    }

    function start() {
        reset();
        state.playing = true;
        state.timerStart = performance.now();
        tickTime();
        spawnTarget();
    }

    function tickTime() {
        if (!state.playing) return;
        const t = Math.floor((performance.now() - state.timerStart) / 1000);
        timeEl.textContent = `${t}s`;
        state.timerId = setTimeout(tickTime, 250);
    }

    function spawnTarget() {
        field.innerHTML = '';

        // кто спавнится?
        const isEnemy = Math.random() > GOOD_P;
        const pool = isEnemy ? ENEMIES : ALLIES;
        const item = choice(pool);
        const card = renderCharacter(item.src, item.name);
        card.dataset.role = isEnemy ? 'enemy' : 'ally';

        // случайная позиция в пределах поля
        const rect = field.getBoundingClientRect();
        const size = 128, pad = 12;
        const maxX = Math.max(0, rect.width - size - pad * 2);
        const maxY = Math.max(0, rect.height - size - pad * 2);
        const x = Math.floor(Math.random() * (maxX + 1)) + pad;
        const y = Math.floor(Math.random() * (maxY + 1)) + pad;
        card.style.left = x + 'px';
        card.style.top = y + 'px';

        // клик
        card.addEventListener('click', () => onHit(card));

        field.appendChild(card);

        // жизнь цели
        clearTimeout(state.lifeTimeout);
        const life = isEnemy ? ENEMY_ALIVE_MS : GOOD_ALIVE_MS;
        state.lifeTimeout = setTimeout(() => {
            remove(card);
            if (isEnemy) return lose('timeout'); // не успел кликнуть по врагу
            scheduleRespawn();                   // хороший пропал — без последствий
        }, life);
    }

    function renderCharacter(src, alt) {
        const card = $('div', 'character');
        const img = $('img', '', {src, alt});
        card.appendChild(img);
        return card;
    }

    function onHit(card) {
        clearTimeout(state.lifeTimeout);
        const role = card.dataset.role;
        remove(card);

        if (role === 'enemy') {
            state.score += 1;
            scoreEl.textContent = String(state.score);
            flashWu();
            if (state.score >= TOTAL_KILLS) return win();
            scheduleRespawn();
        } else {
            // удар по своему — показываем 💩 и останавливаем игру с понятным сообщением
            showPoop();
            lose('ally');
        }
    }

    function scheduleRespawn() {
        if (!state.playing) return;
        setTimeout(spawnTarget, RESPAWN_DELAY_MS);
    }

    function flashWu() {
        wuFlash.classList.remove('hidden');
        wuFlash.classList.add('show');
        setTimeout(() => wuFlash.classList.remove('show'), 180);
    }

    function showPoop() {
        const poop = $('img', '', {src: POOP_SRC, alt: 'Какашка', 'aria-hidden': 'true'});
        poop.style.position = 'absolute';
        poop.style.right = '10px';
        poop.style.bottom = '10px';
        poop.style.width = '64px';
        poop.style.height = '64px';
        poop.style.objectFit = 'cover';
        field.appendChild(poop);
        setTimeout(() => remove(poop), 600);
    }

    function win() {
        state.playing = false;
        clearTimeout(state.timerId);
        clearTimeout(state.lifeTimeout);

        // показать ключи
        const container = document.getElementById('keys-reveal');
        container.innerHTML = '';
        const keys = (window.NINJAGO_KEYS || []).filter(k => k && k.emoji && k.letter);
        const toShow = keys.slice(0, Math.max(1, Math.min(window.NINJAGO_REVEAL_COUNT || 1, keys.length)));
        if (!toShow.length) {
            const p = document.createElement('p');
            p.textContent = '🔒 Добавь ключи в keys.js (window.NINJAGO_KEYS).';
            container.appendChild(p);
        } else {
            for (const k of toShow) {
                const row = document.createElement('div');
                row.className = 'key';
                row.innerHTML = `
  <div class="emoji">${k.emoji}</div>
  <div class="letter">${k.letter}</div>
`;
                container.appendChild(row);
            }
        }
        document.querySelector('#modal-win [data-bind="final-score"]').textContent = `${state.score}/${TOTAL_KILLS}`;
        modalWin.showModal();

        // restart только по кнопке «Играть ещё»
        modalWin.addEventListener('close', () => {
            if (modalWin.returnValue === 'restart') start();
        }, {once: true});
    }

    // reason: 'ally' | 'timeout'
    function lose(reason) {
        state.playing = false;
        clearTimeout(state.timerId);
        clearTimeout(state.lifeTimeout);

        const p = modalLose.querySelector('p');
        if (reason === 'ally') {
            p.textContent = 'Ты ударил хорошего ниндзя. Не делай этого! Бить нужно только злодеев. Нажми «Сыграть снова», чтобы попробовать ещё раз.';
        } else {
            p.textContent = 'Ты не успел ударить злодея вовремя. Попробуй ещё раз: нажимай только на злодеев — у тебя 1 секунда. Нажми «Сыграть снова».';
        }

        modalLose.showModal();

        // перезапуск строго по кнопке «Сыграть снова»
        modalLose.addEventListener('close', () => {
            if (modalLose.returnValue === 'restart') start();
            // если закрыли Esc/вне диалога — игра остаётся остановленной, поле пустое
        }, {once: true});
    }

    // GO
    start();
})();
