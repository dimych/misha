(function () {
    // UI refs
    const board   = document.getElementById('board');
    const movesEl = document.getElementById('moves');
    const pairsEl = document.getElementById('pairs');
    const totalEl = document.getElementById('total');
    const modalWin = document.getElementById('modal-win');

    // РОСТЕР: шесть персонажей (можно смешать героев и врагов). Положи файлы в /images/
    const ROSTER = [
        { id: 'kai',      name: 'Kai',      src: 'images/ninja_kai.png' },
        { id: 'lloyd',    name: 'Lloyd',    src: 'images/ninja_lloyd.png' },
        { id: 'nya',      name: 'Nya',      src: 'images/ninja_nya.png' },
        { id: 'garmadon', name: 'Garmadon', src: 'images/enemy_garmadon.png' },
        { id: 'overlord', name: 'Overlord', src: 'images/enemy_overlord.png' },
        { id: 'morro',    name: 'Morro',    src: 'images/enemy_morro.png' }
    ];
    const TOTAL_PAIRS = ROSTER.length;

    totalEl.textContent = TOTAL_PAIRS;

    // helpers
    const $ = (tag, cls, attrs={}) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v);
        return n;
    };
    const shuffle = (arr) => arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]);

    // state
    let deck = [];              // [{id, src, idx}]
    let open = [];              // массив открытых на данный момент карточек (<=2)
    let moves = 0;
    let pairs = 0;
    let busy = false;           // блокируем клики во время анимации

    function buildDeck() {
        // удваиваем персонажей и перемешиваем
        const doubled = ROSTER.flatMap((c, i) => [
            { id: c.id, src: c.src, idx: i*2 },
            { id: c.id, src: c.src, idx: i*2+1 }
        ]);
        deck = shuffle(doubled);
    }

    function renderBoard() {
        board.innerHTML = '';
        for (const card of deck) {
            const tile = $('button', 'card-tile', { 'data-id': card.id, 'aria-label': 'закрытая карта' });
            tile.type = 'button';

            const inner = $('div','card-inner');
            const back  = $('div','face back');  back.textContent = '🌀'; // задник
            const front = $('div','face front');
            const img   = $('img','', { src: card.src, alt: card.id });
            front.appendChild(img);

            inner.append(back, front);
            tile.appendChild(inner);

            tile.addEventListener('click', () => onFlip(tile, card));

            board.appendChild(tile);
        }
    }

    function onFlip(tile, card) {
        if (busy) return;
        if (tile.classList.contains('is-open') || tile.classList.contains('is-matched')) return;

        tile.classList.add('is-open');
        open.push({ tile, card });

        if (open.length === 2) {
            busy = true;
            moves += 1; movesEl.textContent = String(moves);

            const [a, b] = open;
            if (a.card.id === b.card.id) {
                // совпадение
                setTimeout(() => {
                    a.tile.classList.remove('is-open'); a.tile.classList.add('is-matched');
                    b.tile.classList.remove('is-open'); b.tile.classList.add('is-matched');
                    open = []; busy = false;

                    pairs += 1; pairsEl.textContent = `${pairs}`;
                    if (pairs >= TOTAL_PAIRS) win();
                }, 250);
            } else {
                // нет совпадения — скрываем обе
                setTimeout(() => {
                    a.tile.classList.remove('is-open');
                    b.tile.classList.remove('is-open');
                    open = []; busy = false;
                }, 700);
            }
        }
    }

    function start() {
        moves = 0; pairs = 0; busy = false; open = [];
        movesEl.textContent = '0'; pairsEl.textContent = '0';
        buildDeck();
        renderBoard();
    }

    function win() {
        // заполняем ключи
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

        modalWin.querySelector('[data-bind="final-moves"]').textContent = moves;
        modalWin.showModal();

        // рестарт строго по кнопке
        modalWin.addEventListener('close', () => {
            if (modalWin.returnValue === 'restart') start();
        }, { once: true });
    }

    // go
    start();
})();
