(function () {
    const cfg = window.NINJA_RUNNER_CONFIG || {};
    const TARGET_KILLS = cfg.TARGET_KILLS ?? 6;
    const SPEED        = cfg.SPEED_PX_S ?? 190;
    const GRAVITY      = cfg.GRAVITY ?? 1500;
    const JUMP_V0      = cfg.JUMP_VELOCITY ?? 560;
    const ERANGE       = cfg.ATTACK_RANGE_PX ?? 110;
    const MAX_DIST_M   = cfg.MAX_DISTANCE_M ?? 300;

    const SPAWN_GAP    = cfg.SPAWN_GAP_MS || [800,1200];
    const ENEMY_P      = cfg.ENEMY_PROBABILITY ?? 0.6;
    const MAX_ENEMIES  = cfg.MAX_ACTIVE_ENEMIES ?? 2;
    const MAX_OBST     = cfg.MAX_ACTIVE_OBSTACLES ?? 1;

    // UI
    const gameEl = document.getElementById('game');
    const playerEl = document.getElementById('player');
    const killsEl = document.getElementById('kills');
    const targetEl = document.getElementById('target');
    const distEl = document.getElementById('dist');
    const modalWin = document.getElementById('modal-win');
    const modalLose = document.getElementById('modal-lose');
    const loseText = document.getElementById('lose-text');
    targetEl.textContent = TARGET_KILLS;

    // Assets you provide:
    const ENEMY_SOURCES = ['images/enemy1.png','images/enemy2.png','images/enemy3.png'];
    const OBST_SOURCES  = ['images/obst1.png','images/obst2.png'];

    // geometry
    const groundY = gameEl.clientHeight * 0.28; // высота «земли» в %
    const floorY = gameEl.clientHeight - groundY; // пиксельная координата «уровня ног»

    // state
    let running = false;
    let kills = 0;
    let dist = 0;       // в метрах
    let raf = 0;
    let lastTs = 0;

    // player physics
    let y = floorY - 72; // bottom of sprite aligns with floor
    let vy = 0;
    let onGround = true;
    let attacking = false;
    let attackCooldown = 0;

    const enemies = new Set();
    const obstacles = new Set();
    let gateTimer = 0;

    // helpers
    const rnd = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;
    const $img = (cls, src) => {
        const i = document.createElement('img');
        i.className = cls;
        i.src = src;
        i.alt = cls;
        i.style.right = '-90px'; // старт за пределом справа
        i.style.bottom = '28%';
        return i;
    };
    const rect = (el)=> el.getBoundingClientRect();
    const shrink = (r, pad=6) => ({left:r.left+pad, right:r.right-pad, top:r.top+pad, bottom:r.bottom-pad});
    const collide = (a,b)=>{
        const r1 = shrink(a.getBoundingClientRect());
        const r2 = shrink(b.getBoundingClientRect());
        return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
    };

    // controls
    document.getElementById('btnJump').addEventListener('click', jump);
    document.getElementById('btnAttack').addEventListener('click', attack);
    // жесты: тап по левой половине = прыжок; правой = удар
    gameEl.addEventListener('touchstart', (e)=>{
        const x = e.changedTouches[0].clientX;
        if (x < window.innerWidth/2) jump(); else attack();
    });

    function jump(){
        if (!running) return;
        if (onGround){
            vy = -JUMP_V0;
            onGround = false;
        }
    }
    function attack(){
        if (!running || attackCooldown>0) return;
        attacking = true;
        attackCooldown = 250; // мс
        // визуально «двинем» ниндзя вперёд на мгновение
        playerEl.style.transform = 'translateX(6px) scale(1.02)';
        setTimeout(()=> playerEl.style.transform = '', 120);
        // проверим ближайшего врага
        for (const e of enemies) {
            const dx = rect(e).left - rect(playerEl).right;
            if (dx < ERANGE && dx > -20) {
                // убит
                e.dataset.dead = '1';
                e.style.opacity = '0.2';
                e.style.filter = 'grayscale(100%)';
                setTimeout(()=> e.remove(), 140);
                enemies.delete(e);
                kills += 1; killsEl.textContent = String(kills);
                if (kills >= TARGET_KILLS && dist >= MAX_DIST_M) return win();
            }
        }
    }

    function reset() {
        cancelAnimationFrame(raf);
        lastTs = 0; dist = 0; kills = 0; killsEl.textContent = '0'; distEl.textContent = '0';
        vy = 0; onGround = true; attacking = false; attackCooldown = 0;
        enemies.forEach(e=>e.remove()); enemies.clear();
        obstacles.forEach(o=>o.remove()); obstacles.clear();
        playerEl.style.left = '28px'; playerEl.style.bottom = '28%';
        gateTimer = rnd(...SPAWN_GAP);
    }

    function start(){
        reset();
        running = true;
        raf = requestAnimationFrame(loop);
    }

    function loop(ts){
        if (!running) return;
        if (!lastTs) lastTs = ts;
        const dt = Math.min(48, ts - lastTs); // clamp
        lastTs = ts;

        // расстояние (м): пиксели / 40 ~ условно
        dist += (SPEED * dt/1000) / 40;
        distEl.textContent = String(Math.floor(dist));

        // player physics
        if (!onGround){
            vy += GRAVITY * (dt/1000);
            y += vy * (dt/1000);
            const maxY = gameEl.clientHeight - (gameEl.clientHeight*0.28) - playerEl.clientHeight; // высота полёта
            if (y > maxY){ y = maxY; vy = 0; onGround = true; }
            playerEl.style.bottom = `calc(28% + ${maxY - y}px)`;
        }

        // атака кд
        if (attackCooldown>0) attackCooldown -= dt;

        // move enemies/obstacles
        const dx = SPEED * dt/1000;
        for (const e of enemies) {
            e.style.right = (parseFloat(e.style.right) + dx) + 'px';
            // столкновение с игроком (живым врагом)
            if (!e.dataset.dead && collide(playerEl, e)) return lose('Враг ударил ниндзя.');
            // ушёл за игрока → удалим
            if ((rect(e).right) < rect(gameEl).left + 10) { e.remove(); enemies.delete(e); }
        }
        for (const o of obstacles) {
            o.style.right = (parseFloat(o.style.right) + dx) + 'px';
            if (collide(playerEl, o)) return lose('Ниндзя врезался в препятствие.');
            if ((rect(o).right) < rect(gameEl).left + 10) { o.remove(); obstacles.delete(o); }
        }

        // spawn timers
        gateTimer -= dt;
        if (gateTimer <= 0) {
            spawnOne();
            gateTimer = rnd(...SPAWN_GAP);
        }
        // условие победы: и враги добиты, и дистанция пройдена
        if (kills >= TARGET_KILLS && dist >= MAX_DIST_M) return win();

        raf = requestAnimationFrame(loop);
    }

    function spawnOne() {
        // ограничим кол-во активных сущностей
        if (enemies.size >= MAX_ENEMIES && obstacles.size >= MAX_OBST) return;

        // выбираем тип: враг или препятствие, но с учётом лимитов
        let wantEnemy = Math.random() < ENEMY_P;
        if (enemies.size >= MAX_ENEMIES) wantEnemy = false;
        if (obstacles.size >= MAX_OBST)  wantEnemy = true;

        if (wantEnemy) spawnEnemy(); else spawnObstacle();
    }


    function spawnEnemy(){
        const src = ENEMY_SOURCES[rnd(0, ENEMY_SOURCES.length-1)];
        const e = $img('enemy', src);
        // 30% «воздушных», но только если НЕТ препятствия (чтобы не было «двойной ловушки»)
        if (Math.random()<0.30 && obstacles.size === 0) e.style.bottom = 'calc(28% + 40px)';
        gameEl.appendChild(e);
        enemies.add(e);
    }

    function spawnObstacle(){
        // спавним препятствие ТОЛЬКО если врагов меньше 2 (не наслаиваем)
        if (enemies.size >= MAX_ENEMIES) return;
        const src = OBST_SOURCES[rnd(0, OBST_SOURCES.length-1)];
        const o = $img('obstacle', src);
        o.style.bottom = '28%';
        gameEl.appendChild(o);
        obstacles.add(o);
    }

    function showKeys(){
        const box = document.getElementById('keys-reveal');
        box.innerHTML = '';
        const keys = (window.NINJAGO_KEYS || []).filter(k => k && k.emoji && k.letter);
        const count = Math.max(1, Math.min(window.NINJAGO_REVEAL_COUNT || 1, keys.length));
        if (!keys.length) {
            const p = document.createElement('p');
            p.textContent = '🔒 Добавь ключи в keys.js (window.NINJAGO_KEYS).';
            box.appendChild(p);
        } else {
            for (const k of keys.slice(0, count)) {
                const row = document.createElement('div');
                row.className = 'key';
                row.innerHTML = `<div class="emoji">${k.emoji}</div><div class="letter">${k.letter}</div>`;
                box.appendChild(row);
            }
        }
    }

    function win(){
        running = false;
        cancelAnimationFrame(raf);
        showKeys();
        modalWin.showModal();
        modalWin.addEventListener('close', () => {
            if (modalWin.returnValue === 'restart') start();
        }, { once: true });
    }

    function lose(msg){
        running = false;
        cancelAnimationFrame(raf);
        document.getElementById('lose-text').textContent = msg || 'Промах.';
        modalLose.showModal();
        modalLose.addEventListener('close', () => {
            if (modalLose.returnValue === 'restart') start();
        }, { once: true });
    }

    // start
    start();
})();
