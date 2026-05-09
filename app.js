/* =====================================================
   FOOD.RU — Меню на неделю · App
   ===================================================== */

(() => {

const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const DAY_LABELS = { 'пн': 'Понедельник', 'вт': 'Вторник', 'ср': 'Среда', 'чт': 'Четверг', 'пт': 'Пятница', 'сб': 'Суббота', 'вс': 'Воскресенье' };
const MEALS = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин' };
const STORE_KEY = 'food_ru_menu_state_v1';

const ALL_CUISINES = [
    { id: 'Русская', name: 'Русская', img: 'photos/cuisine_russian_1777401418453.png' },
    { id: 'Итальянская', name: 'Итальянская', img: 'photos/cuisine_italian_1777401431686.png' },
    { id: 'Азиатская', name: 'Азиатская', img: 'photos/cuisine_asian_1777401445823.png' },
    { id: 'Грузинская', name: 'Грузинская', img: 'photos/cuisine_georgian_1777401460849.png' },
    { id: 'Французская', name: 'Французская', img: 'photos/cuisine_french_1777401476239.png' },
    { id: 'Мексиканская', name: 'Мексиканская', img: 'photos/cuisine_mexican_1777401490850.png' },
    { id: 'Японская', name: 'Японская', img: 'photos/cuisine_japanese_1777401505076.png' },
    { id: 'Индийская', name: 'Индийская', img: 'photos/cuisine_indian_1777401519824.png' },
];

const COMMON_EXCLUDES = [
    { id: 'глютен', name: 'Глютен', img: 'photos/глютен.png' },
    { id: 'молоко', name: 'Лактоза', img: 'photos/лактоза.png' },
    { id: 'мясо',   name: 'Мясо',   img: 'photos/Мясо.png' },
    { id: 'рыба',   name: 'Рыба',   img: 'photos/Рыба.png' },
    { id: 'яйца',   name: 'Яйца',   img: 'photos/Яйца.png' },
    { id: 'орехи',  name: 'Орехи',  img: 'photos/Орехи.png' },
];

// Map exclude->allergen tokens (some excludes match multiple)
const EXCLUDE_ALLERGENS = {
    'мясо':         ['свинина', 'говядина', 'мясо'],
    'рыба':         ['рыба', 'морепродукты'],
    'морепродукты': ['морепродукты', 'рыба'],
    'молоко':       ['молоко', 'лактоза'],
    'лактоза':      ['молоко', 'лактоза'],
};

const PRESETS = {
    sport:  { mode: 'mid', meals: 4, servings: 2, minProtein: 25, minCalories: 450, maxTime: null,  excludes: [], cuisines: [] },
    home:   { mode: 'familiar', meals: 3, servings: 2, maxTime: 30, excludes: [], cuisines: ['Русская','Итальянская'] },
    family: { mode: 'mid', meals: 3, servings: 4, maxTime: null, excludes: ['острое'], cuisines: ['Русская','Итальянская'] },
    budget: { mode: 'familiar', meals: 3, servings: 4, maxPricePerServing: 130, excludes: [], cuisines: ['Русская'] },
    light:  { mode: 'mid', meals: 3, servings: 2, maxCalories: 380, excludes: [], cuisines: [] },
};

// =============== STATE ===============
const State = {
    onboarded: false,
    cuisines: [],
    excludes: [],
    customExcludes: [],
    budgetByDay: { 'пн': 800, 'вт': 750, 'ср': 850, 'чт': 700, 'пт': 800, 'сб': 800, 'вс': 800 },
    recommendationMode: 'mid', // new | mid | familiar
    mealsPerDay: 3,
    addSnacks: false,
    servings: 4,
    nocookDays: ['вт', 'сб'],
    activePreset: null,
    menu: {}, // { day: { breakfast:[recipeId], lunch:[recipeId], dinner:[recipeId] } }
    summaryMode: 'today',
    summaryDay: 'пн',
    orderPeriod: 'week',
    activeDayMobile: 'пн',
    histogramMetric: 'budget',  // budget | calories | protein | time | delivery
    likedSwipes: [], // for mobile tinder
    swipeIndex: 0,
};

let RECIPES = [];
let READY_MEALS = [];

// =============== HELPERS ===============
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
}
function escapeHTML(s) { return String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])); }
function todayKey() {
    const d = new Date().getDay();
    // 0=sunday → вс, 1=mon → пн ...
    return ['вс','пн','вт','ср','чт','пт','сб'][d];
}
function fmtRub(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }
function fmtNum(n) { return Math.round(n).toLocaleString('ru-RU'); }
function showToast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { t.style.display = 'none'; }, 2800);
}

function recipeById(id) { return RECIPES.find(r => r.id === id) || null; }
function readyById(id) { return READY_MEALS.find(r => r.id === id) || null; }
function dishById(id) { return id && id < 100 ? recipeById(id) : readyById(id); }

function getActiveExcludes() {
    return [...State.excludes, ...State.customExcludes].map(e => e.toLowerCase().trim()).filter(Boolean);
}

function passesStopList(recipe) {
    const ex = getActiveExcludes();
    if (!ex.length) return true;
    const allergens = (recipe.allergens || []).map(a => a.toLowerCase());
    const ingredientsText = (recipe.ingredients || []).map(i => i.name.toLowerCase()).join(' | ');
    for (const stop of ex) {
        const tokens = EXCLUDE_ALLERGENS[stop] || [stop];
        for (const tok of tokens) {
            if (allergens.includes(tok)) return false;
            if (ingredientsText.includes(tok)) return false;
        }
    }
    return true;
}

// =============== DATA LOADING ===============
async function loadData() {
    try {
        // Try embedded JSON first (works on file://)
        const inlineRecipes = $('#recipes-data');
        const inlineMeals = $('#ready-meals-data');
        if (inlineRecipes && inlineRecipes.textContent.trim() && !inlineRecipes.textContent.includes('PLACEHOLDER')) {
            RECIPES = JSON.parse(inlineRecipes.textContent);
        }
        if (inlineMeals && inlineMeals.textContent.trim() && !inlineMeals.textContent.includes('PLACEHOLDER')) {
            READY_MEALS = JSON.parse(inlineMeals.textContent);
        }
        if (RECIPES.length && READY_MEALS.length) return;
    } catch (e) { console.warn('Inline parse failed', e); }

    // Fallback: fetch from network (when served via http://)
    try {
        const [r1, r2] = await Promise.all([
            fetch('recipes.json').then(r => r.json()),
            fetch('ready_meals.json').then(r => r.json()),
        ]);
        RECIPES = r1; READY_MEALS = r2;
    } catch (e) {
        console.error('Failed to load data', e);
        alert('Не удалось загрузить базу рецептов. Запустите через локальный сервер или используйте версию с встроенными данными.');
    }
}

// =============== STORAGE ===============
function saveState() {
    try {
        const persist = {
            onboarded: State.onboarded,
            cuisines: State.cuisines,
            excludes: State.excludes,
            customExcludes: State.customExcludes,
            budgetByDay: State.budgetByDay,
            recommendationMode: State.recommendationMode,
            mealsPerDay: State.mealsPerDay,
            addSnacks: State.addSnacks,
            servings: State.servings,
            nocookDays: State.nocookDays,
            menu: State.menu,
        };
        localStorage.setItem(STORE_KEY, JSON.stringify(persist));
    } catch (_) {}
}
function loadStateFromStorage() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.assign(State, data);
        // Ensure menu shape is valid
        if (!State.menu || typeof State.menu !== 'object') State.menu = {};
        DAYS.forEach(d => {
            if (!State.menu[d]) State.menu[d] = { breakfast: [], lunch: [], dinner: [] };
            MEALS.forEach(m => {
                if (!Array.isArray(State.menu[d][m])) State.menu[d][m] = [];
            });
        });
        // Ensure budgetByDay is valid
        DAYS.forEach(d => {
            if (typeof State.budgetByDay[d] !== 'number') State.budgetByDay[d] = 800;
        });
    } catch (_) {}
}

// =============== MENU GENERATION ===============
function generateMenu() {
    const filtered = RECIPES.filter(passesStopList);
    const byMeal = {
        breakfast: filtered.filter(r => r.meal_type === 'breakfast'),
        lunch:     filtered.filter(r => r.meal_type === 'lunch'),
        dinner:    filtered.filter(r => r.meal_type === 'dinner'),
    };

    // Score recipes vs preferences
    function score(recipe) {
        let s = Math.random() * 0.5;
        if (State.cuisines.length) {
            if (State.cuisines.includes(recipe.cuisine)) s += 2;
            // partial: Asian match for Japanese/Indian etc
            if (State.cuisines.includes('Азиатская') && ['Японская','Тайская','Китайская','Корейская'].includes(recipe.cuisine)) s += 1.5;
        }
        const familiarCuisines = ['Русская', 'Итальянская', 'Французская'];
        if (State.recommendationMode === 'familiar' && familiarCuisines.includes(recipe.cuisine)) s += 1;
        if (State.recommendationMode === 'new' && !familiarCuisines.includes(recipe.cuisine)) s += 1;
        return s;
    }

    Object.keys(byMeal).forEach(k => byMeal[k].sort((a, b) => score(b) - score(a)));

    const newMenu = {};
    DAYS.forEach((day, dayIdx) => {
        newMenu[day] = { breakfast: [], lunch: [], dinner: [] };

        if (State.nocookDays.includes(day)) {
            // pick a single ready meal for dinner; lunch+breakfast still home-cooked
            const breakfast = byMeal.breakfast[(dayIdx * 3) % byMeal.breakfast.length];
            const lunch = byMeal.lunch[(dayIdx * 3 + 1) % byMeal.lunch.length];
            const ready = READY_MEALS[dayIdx % READY_MEALS.length];
            if (breakfast) newMenu[day].breakfast.push(breakfast.id);
            if (lunch) newMenu[day].lunch.push(lunch.id);
            if (ready) newMenu[day].dinner.push(ready.id);
        } else {
            const b = byMeal.breakfast[(dayIdx * 5) % Math.max(byMeal.breakfast.length, 1)];
            const l = byMeal.lunch[(dayIdx * 5 + 2) % Math.max(byMeal.lunch.length, 1)];
            const d = byMeal.dinner[(dayIdx * 5 + 4) % Math.max(byMeal.dinner.length, 1)];
            if (b) newMenu[day].breakfast.push(b.id);
            if (l) newMenu[day].lunch.push(l.id);
            if (d) newMenu[day].dinner.push(d.id);
        }
    });

    // Ensure no duplicate dishes across the week (simple swap pass)
    const seen = new Set();
    DAYS.forEach((day, dayIdx) => {
        MEALS.forEach(meal => {
            const ids = newMenu[day][meal];
            ids.forEach((id, idx) => {
                if (id < 100 && seen.has(id)) {
                    // find replacement
                    const pool = byMeal[meal].filter(r => !seen.has(r.id));
                    if (pool.length) {
                        const repl = pool[(dayIdx + idx) % pool.length];
                        ids[idx] = repl.id;
                        seen.add(repl.id);
                    } else seen.add(id);
                } else if (id < 100) seen.add(id);
            });
        });
    });

    State.menu = newMenu;
    saveState();
}

// =============== RENDER: HOME PREVIEW ===============
function renderHome() {
    const hasOnboard = State.onboarded;
    const banner = $('#personalized-banner');
    if (banner) banner.style.display = hasOnboard ? 'flex' : 'none';
    // Update preview cards
    const preview = $('#recipes-preview');
    preview.innerHTML = '';
    const monday = State.menu['пн'];
    if (!monday) return;
    const cards = [
        { meal: 'breakfast', label: 'ПН — ЗАВТРАК' },
        { meal: 'lunch', label: 'ПН — ОБЕД' },
        { meal: 'dinner', label: 'ПН — УЖИН' },
    ];
    cards.forEach(({meal, label}) => {
        const id = monday[meal] && monday[meal][0];
        const dish = dishById(id);
        if (!dish) return;
        const card = el('div', 'preview-card');
        card.innerHTML = `
            <div class="preview-card-meta">${label}</div>
            <div class="preview-card-title">${escapeHTML(dish.name)}</div>
            <img class="preview-card-img" src="${dish.image}" alt="${escapeHTML(dish.name)}" onerror="this.style.background='#f4f4f4';this.src=''">
        `;
        card.addEventListener('click', () => navigate('menu'));
        preview.appendChild(card);
    });
    // Update budget
    updateHeroStats();
}

function updateHeroStats() {
    const stats = computeWeekStats();
    $('#hero-recipes-count').textContent = stats.dishes;
    $('#hero-budget').textContent = fmtNum(stats.budget);
    $('#menu-recipes-count').textContent = stats.dishes;
    $('#menu-budget').textContent = fmtNum(stats.budget);
    $('#order-price-perekrestok').textContent = '~' + fmtRub(stats.budget);
    $('#order-price-pyaterochka').textContent = '~' + fmtRub(stats.budget);
    // Mini hints in the settings card header
    const hintBudget = $('#hint-budget');
    const hintCal = $('#hint-cal');
    if (hintBudget) hintBudget.textContent = fmtNum(stats.budget) + ' ₽';
    if (hintCal) hintCal.textContent = fmtNum(stats.avgCal) + ' ккал/д';
}

// =============== RENDER: ONBOARDING ===============
function renderOnboarding() {
    const grid = $('#cuisine-grid');
    const search = $('#cuisine-search').value.trim().toLowerCase();
    grid.innerHTML = '';
    ALL_CUISINES.filter(c => !search || c.name.toLowerCase().includes(search)).forEach(c => {
        const card = el('div', 'cuisine-card' + (State.cuisines.includes(c.id) ? ' selected' : ''));
        card.innerHTML = `
            <img src="${c.img}" alt="${c.name}" onerror="this.style.background='#eee';this.src=''">
            <div class="cuisine-card-name">${c.name}</div>
        `;
        card.addEventListener('click', () => {
            const i = State.cuisines.indexOf(c.id);
            if (i >= 0) State.cuisines.splice(i, 1);
            else State.cuisines.push(c.id);
            renderOnboarding();
        });
        grid.appendChild(card);
    });
    $('#onb-step1-next').disabled = State.cuisines.length === 0;
}

function renderExcludes() {
    const grid = $('#excludes-grid');
    grid.innerHTML = '';
    COMMON_EXCLUDES.forEach(e => {
        const card = el('div', 'exclude-card' + (State.excludes.includes(e.id) ? ' selected' : ''));
        card.innerHTML = `
            <img src="${e.img}" alt="${e.name}" onerror="this.style.background='#eee';this.src=''">
            <div class="exclude-card-overlay"><div class="exclude-card-name">${e.name}</div></div>
        `;
        card.addEventListener('click', () => {
            const i = State.excludes.indexOf(e.id);
            if (i >= 0) State.excludes.splice(i, 1);
            else State.excludes.push(e.id);
            renderExcludes();
        });
        grid.appendChild(card);
    });
    renderCustomExcludes();
}

function renderCustomExcludes() {
    const list = $('#excludes-custom-list');
    list.innerHTML = '';
    State.customExcludes.forEach(c => {
        const chip = el('span', 'custom-chip');
        chip.innerHTML = `${escapeHTML(c)}<span class="custom-chip-x">×</span>`;
        chip.querySelector('.custom-chip-x').addEventListener('click', () => {
            State.customExcludes = State.customExcludes.filter(x => x !== c);
            renderCustomExcludes();
        });
        list.appendChild(chip);
    });
}

// =============== RENDER: MENU GRID ===============
function renderMenuGrid() {
    const grid = $('#menu-grid');
    grid.innerHTML = '';
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        const day = State.activeDayMobile;
        // Render only selected day, vertically
        MEALS.forEach(meal => {
            const sectionLabel = el('div', 'meal-section-mobile', MEAL_LABELS[meal].toUpperCase());
            grid.appendChild(sectionLabel);

            const cell = createMenuCell(day, meal);
            grid.appendChild(cell);
        });
        return;
    }

    // Desktop: full table
    const empty = el('div', 'menu-col-header', '');
    grid.appendChild(empty);
    MEALS.forEach(meal => {
        const head = el('div', 'menu-col-header', MEAL_LABELS[meal].toUpperCase());
        grid.appendChild(head);
    });
    DAYS.forEach(day => {
        const dayLabel = el('div', 'menu-day-label', day.charAt(0).toUpperCase() + day.charAt(1));
        grid.appendChild(dayLabel);
        MEALS.forEach(meal => {
            const cell = createMenuCell(day, meal);
            grid.appendChild(cell);
        });
    });
}

function createMenuCell(day, meal) {
    const cell = el('div', 'menu-cell');
    cell.dataset.day = day;
    cell.dataset.meal = meal;

    const stack = el('div', 'menu-cell-stack');
    const ids = (State.menu[day] && State.menu[day][meal]) || [];

    if (ids.length === 0) {
        cell.classList.add('empty');
        const addBtn = el('button', 'add-meal-btn', '+ Добавить блюдо');
        addBtn.addEventListener('click', e => {
            e.stopPropagation();
            openAddModal(day, meal);
        });
        stack.appendChild(addBtn);
    } else {
        ids.forEach((id, idx) => {
            stack.appendChild(createRecipeCard(id, day, meal, idx));
        });
        const addBtn = el('button', 'add-meal-btn', '+ ещё блюдо');
        addBtn.addEventListener('click', e => {
            e.stopPropagation();
            openAddModal(day, meal);
        });
        stack.appendChild(addBtn);
    }

    cell.appendChild(stack);

    // Drop target events
    cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('drop-target'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('drop-target'));
    cell.addEventListener('drop', e => {
        e.preventDefault();
        cell.classList.remove('drop-target');
        const data = JSON.parse(e.dataTransfer.getData('application/json') || 'null');
        if (data) handleDrop(data, day, meal);
    });
    return cell;
}

function createRecipeCard(id, day, meal, idx) {
    const dish = dishById(id);
    const isReady = id >= 100;
    const card = el('div', 'recipe-card' + (isReady ? ' nocook' : ''));
    card.draggable = true;
    card.dataset.day = day;
    card.dataset.meal = meal;
    card.dataset.idx = idx;
    card.dataset.id = id;

    if (!dish) {
        card.innerHTML = `<div class="recipe-card-inner"><div class="recipe-card-text"><div class="recipe-card-name">—</div></div></div>`;
        return card;
    }

    const ingredients = !isReady && dish.ingredients
        ? dish.ingredients.slice(0, 4).map(i => i.name).join(', ')
        : (isReady ? 'Готовое блюдо из ' + dish.store : '');

    const priceText = isReady ? `${dish.price} ₽` : `~${dish.price_per_serving} ₽`;

    const innerHTML = isReady
        ? `
            <div class="recipe-card-front">
                <div class="recipe-card-text">
                    <div>
                        <span class="nocook-badge">Готовая еда</span>
                        <div class="recipe-card-name">${escapeHTML(dish.name)}</div>
                    </div>
                    <div class="nocook-store">из ${escapeHTML(dish.store)}</div>
                </div>
                <img class="recipe-card-img" src="${dish.image}" alt="${escapeHTML(dish.name)}" onerror="this.src=''">
            </div>
            <div class="recipe-card-back">
                <div class="back-row-top">
                    <div class="back-name">${escapeHTML(dish.name)}</div>
                    <div class="back-price">${priceText}</div>
                </div>
                <div class="back-stats">
                    <div class="back-stat"><div class="back-stat-icon">🔥</div><div class="back-stat-val">${dish.calories}</div><div class="back-stat-lbl">ккал</div></div>
                    <div class="back-stat"><div class="back-stat-icon">🥩</div><div class="back-stat-val">${dish.protein}г</div><div class="back-stat-lbl">белок</div></div>
                    <div class="back-stat"><div class="back-stat-icon">💧</div><div class="back-stat-val">${dish.fat}г</div><div class="back-stat-lbl">жиры</div></div>
                    <div class="back-stat"><div class="back-stat-icon">🌾</div><div class="back-stat-val">${dish.carbs}г</div><div class="back-stat-lbl">углев</div></div>
                </div>
                <div class="back-ingredients"><strong>Готово к разогреву.</strong> ${escapeHTML(dish.description || '')}</div>
            </div>
        `
        : `
            <div class="recipe-card-front">
                <div class="recipe-card-text">
                    <div class="recipe-card-name">${escapeHTML(dish.name)}</div>
                    <div class="recipe-card-time">⏱ ${dish.cooking_time_min} мин</div>
                </div>
                <img class="recipe-card-img" src="${dish.image}" alt="${escapeHTML(dish.name)}" onerror="this.src=''">
            </div>
            <div class="recipe-card-back">
                <div class="back-row-top">
                    <div class="back-name">${escapeHTML(dish.name)}</div>
                    <div class="back-price">${priceText}</div>
                </div>
                <div class="back-stats">
                    <div class="back-stat"><div class="back-stat-icon">🔥</div><div class="back-stat-val">${dish.calories}</div><div class="back-stat-lbl">ккал</div></div>
                    <div class="back-stat"><div class="back-stat-icon">🥩</div><div class="back-stat-val">${dish.protein}г</div><div class="back-stat-lbl">белок</div></div>
                    <div class="back-stat"><div class="back-stat-icon">💧</div><div class="back-stat-val">${dish.fat}г</div><div class="back-stat-lbl">жиры</div></div>
                    <div class="back-stat"><div class="back-stat-icon">🌾</div><div class="back-stat-val">${dish.carbs}г</div><div class="back-stat-lbl">углев</div></div>
                </div>
                <div class="back-ingredients"><strong>Состав:</strong> ${escapeHTML(ingredients)}</div>
            </div>
        `;
    const inner = el('div', 'recipe-card-inner');
    inner.innerHTML = innerHTML;
    card.appendChild(inner);

    const swap = el('div', 'recipe-card-swap', '✏️');
    swap.addEventListener('click', e => {
        e.stopPropagation();
        openReplaceModal(day, meal, idx, id);
    });
    card.appendChild(swap);

    // Hover flip on desktop. Longer delay (650ms) so the user has time to reach
    // the swap icon without the flip animation hiding it. Cancel the pending flip
    // immediately if the cursor lands on the swap icon.
    let hoverTimeout;
    card.addEventListener('mouseenter', () => {
        if (window.innerWidth < 768) return;
        hoverTimeout = setTimeout(() => card.classList.add('flipped'), 650);
    });
    card.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
        card.classList.remove('flipped');
    });
    swap.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        card.classList.remove('flipped');
    });
    // Tap flip on mobile
    card.addEventListener('click', e => {
        if (window.innerWidth >= 768) return;
        if (e.target.closest('.recipe-card-swap')) return;
        card.classList.toggle('flipped');
    });

    // HTML5 drag
    card.addEventListener('dragstart', e => {
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({
            id, day, meal, idx
        }));
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));

    // Touch drag for mobile (long-press based)
    setupTouchDrag(card, { id, day, meal, idx });

    return card;
}

function setupTouchDrag(card, payload) {
    let startX, startY, dragging = false, ghost = null, longPressTimer;
    card.addEventListener('touchstart', e => {
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY;
        longPressTimer = setTimeout(() => {
            dragging = true;
            ghost = card.cloneNode(true);
            ghost.style.position = 'fixed';
            ghost.style.zIndex = 999;
            ghost.style.pointerEvents = 'none';
            ghost.style.opacity = '0.85';
            ghost.style.width = card.offsetWidth + 'px';
            ghost.style.transform = 'scale(1.05)';
            ghost.style.left = (t.clientX - card.offsetWidth / 2) + 'px';
            ghost.style.top = (t.clientY - 40) + 'px';
            document.body.appendChild(ghost);
            card.style.opacity = '0.3';
            // haptic-ish feedback
            if (navigator.vibrate) navigator.vibrate(40);
        }, 500);
    });
    card.addEventListener('touchmove', e => {
        if (!dragging) {
            const t = e.touches[0];
            if (Math.hypot(t.clientX - startX, t.clientY - startY) > 10) clearTimeout(longPressTimer);
            return;
        }
        e.preventDefault();
        const t = e.touches[0];
        ghost.style.left = (t.clientX - card.offsetWidth / 2) + 'px';
        ghost.style.top = (t.clientY - 40) + 'px';
        // highlight target
        $$('.menu-cell').forEach(c => c.classList.remove('drop-target'));
        const elBelow = document.elementFromPoint(t.clientX, t.clientY);
        const cellBelow = elBelow && elBelow.closest('.menu-cell');
        if (cellBelow) cellBelow.classList.add('drop-target');
    }, { passive: false });
    card.addEventListener('touchend', e => {
        clearTimeout(longPressTimer);
        if (!dragging) return;
        dragging = false;
        card.style.opacity = '';
        const t = e.changedTouches[0];
        const elBelow = document.elementFromPoint(t.clientX, t.clientY);
        const cellBelow = elBelow && elBelow.closest('.menu-cell');
        if (cellBelow) {
            handleDrop(payload, cellBelow.dataset.day, cellBelow.dataset.meal);
        }
        $$('.menu-cell').forEach(c => c.classList.remove('drop-target'));
        if (ghost) ghost.remove();
    });
}

function handleDrop(src, targetDay, targetMeal) {
    // Move-only: remove from source, append to target. Source becomes empty if it was the only item.
    const srcArr = State.menu[src.day][src.meal];
    const dish = srcArr[src.idx];
    if (dish == null) return;
    if (src.day === targetDay && src.meal === targetMeal) return;

    srcArr.splice(src.idx, 1);
    State.menu[targetDay][targetMeal].push(dish);

    saveState();
    renderAll();
    showToast('Блюдо перемещено');
}

// =============== REPLACE MODAL ===============
function openReplaceModal(day, meal, idx, currentId) {
    const modal = $('#replace-modal');
    const list = $('#modal-alternatives');
    list.innerHTML = '';

    // Used recipe ids in the week (avoid duplicates in alternatives)
    const used = new Set();
    DAYS.forEach(d => MEALS.forEach(m => (State.menu[d][m] || []).forEach(id => used.add(id))));

    let pool = RECIPES.filter(r =>
        r.id !== currentId &&
        r.meal_type === meal &&
        passesStopList(r) &&
        !used.has(r.id)
    );

    // Score by preference
    function scoreFn(r) {
        let s = 0;
        if (State.cuisines.includes(r.cuisine)) s += 2;
        s += Math.random();
        return s;
    }
    pool.sort((a, b) => scoreFn(b) - scoreFn(a));
    pool = pool.slice(0, 6);

    if (pool.length === 0) {
        list.innerHTML = '<p style="padding:24px;text-align:center;color:#888;">Нет подходящих альтернатив. Попробуйте смягчить стоп-лист.</p>';
    } else {
        pool.forEach(r => {
            const card = el('div', 'alt-card');
            card.innerHTML = `
                <img class="alt-card-img" src="${r.image}" alt="${escapeHTML(r.name)}" onerror="this.src=''">
                <div class="alt-card-text">
                    <div class="alt-card-name">${escapeHTML(r.name)}</div>
                    <div class="alt-card-meta">
                        <span>⏱ ${r.cooking_time_min} мин</span>
                        <span>🔥 ${r.calories} ккал</span>
                        <span>~${r.price_per_serving} ₽</span>
                        <span>· ${escapeHTML(r.cuisine)}</span>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => {
                State.menu[day][meal][idx] = r.id;
                saveState();
                modal.style.display = 'none';
                renderAll();
                showToast('Блюдо заменено: ' + r.name);
            });
            list.appendChild(card);
        });
    }
    modal.style.display = 'flex';
}

function openAddModal(day, meal) {
    const modal = $('#add-modal');
    const list = $('#add-alternatives');
    list.innerHTML = '';
    const used = new Set();
    DAYS.forEach(d => MEALS.forEach(m => (State.menu[d][m] || []).forEach(id => used.add(id))));

    let pool = RECIPES.filter(r =>
        r.meal_type === meal &&
        passesStopList(r) &&
        !used.has(r.id)
    );
    pool.sort(() => Math.random() - 0.5);
    pool = pool.slice(0, 6);

    pool.forEach(r => {
        const card = el('div', 'alt-card');
        card.innerHTML = `
            <img class="alt-card-img" src="${r.image}" alt="${escapeHTML(r.name)}" onerror="this.src=''">
            <div class="alt-card-text">
                <div class="alt-card-name">${escapeHTML(r.name)}</div>
                <div class="alt-card-meta">
                    <span>⏱ ${r.cooking_time_min} мин</span>
                    <span>🔥 ${r.calories} ккал</span>
                    <span>~${r.price_per_serving} ₽</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
            State.menu[day][meal].push(r.id);
            saveState();
            modal.style.display = 'none';
            renderAll();
            showToast('Добавлено: ' + r.name);
        });
        list.appendChild(card);
    });
    modal.style.display = 'flex';
}

// =============== STATS ===============
function computeDayStats(day) {
    const ids = MEALS.flatMap(m => (State.menu[day] && State.menu[day][m]) || []);
    let cal = 0, p = 0, f = 0, c = 0, time = 0, budget = 0, dishes = 0;
    ids.forEach(id => {
        const dish = dishById(id);
        if (!dish) return;
        cal += dish.calories || 0;
        p   += dish.protein  || 0;
        f   += dish.fat      || 0;
        c   += dish.carbs    || 0;
        time += dish.cooking_time_min || 0;
        budget += dish.price_per_serving || dish.price || 0;
        dishes++;
    });
    return { cal, p, f, c, time, budget, dishes };
}

function computeWeekStats() {
    let total = { cal: 0, p: 0, f: 0, c: 0, time: 0, budget: 0, dishes: 0 };
    DAYS.forEach(d => {
        const s = computeDayStats(d);
        total.cal += s.cal; total.p += s.p; total.f += s.f; total.c += s.c;
        total.time += s.time; total.budget += s.budget; total.dishes += s.dishes;
    });
    total.avgCal = Math.round(total.cal / 7);
    return total;
}

function renderSummary() {
    const stats = $('#summary-stats');
    stats.innerHTML = '';
    if (State.summaryMode === 'today') {
        $('#summary-day-select').style.display = '';
        const s = computeDayStats(State.summaryDay);
        const cards = [
            { icon: '🔥', val: fmtNum(s.cal), label: 'ккал' },
            { icon: '🥩', val: s.p + ' г', label: 'белок' },
            { icon: '💧', val: s.f + ' г', label: 'жиры' },
            { icon: '🌾', val: s.c + ' г', label: 'углеводы' },
            { icon: '⏱', val: s.time + ' мин', label: 'время' },
            { icon: '💰', val: fmtNum(s.budget) + ' ₽', label: 'бюджет' },
        ];
        cards.forEach(c => {
            const card = el('div', 'summary-stat');
            card.innerHTML = `
                <div class="summary-stat-icon">${c.icon}</div>
                <div class="summary-stat-value">${c.val}</div>
                <div class="summary-stat-label">${c.label}</div>
            `;
            stats.appendChild(card);
        });
    } else {
        $('#summary-day-select').style.display = 'none';
        const w = computeWeekStats();
        const hours = Math.floor(w.time / 60), mins = w.time % 60;
        const cards = [
            { icon: '🔥', val: fmtNum(w.avgCal), label: 'ккал/день' },
            { icon: '🥩', val: Math.round(w.p / 7) + ' г', label: 'белок/день' },
            { icon: '🍽', val: w.dishes, label: 'блюд' },
            { icon: '⏱', val: hours + 'ч ' + mins + 'м', label: 'время' },
            { icon: '💰', val: fmtNum(w.budget) + ' ₽', label: 'бюджет' },
            { icon: '📅', val: '7', label: 'дней' },
        ];
        cards.forEach(c => {
            const card = el('div', 'summary-stat');
            card.innerHTML = `
                <div class="summary-stat-icon">${c.icon}</div>
                <div class="summary-stat-value">${c.val}</div>
                <div class="summary-stat-label">${c.label}</div>
            `;
            stats.appendChild(card);
        });
    }
}

const METRIC_CONFIG = {
    budget:    { label: 'БЮДЖЕТ ПО ДНЯМ',    unit: '₽',    field: 'budget',  totalLabel: 'Итого за неделю',     totalFmt: v => fmtNum(v) + ' ₽' },
    calories:  { label: 'КАЛОРИИ ПО ДНЯМ',  unit: 'ккал', field: 'cal',     totalLabel: 'В среднем за день',  totalFmt: v => fmtNum(Math.round(v/7)) + ' ккал/день' },
    protein:   { label: 'БЕЛОК ПО ДНЯМ',    unit: 'г',    field: 'p',       totalLabel: 'В среднем за день',  totalFmt: v => Math.round(v/7) + ' г/день' },
    time:      { label: 'ВРЕМЯ ГОТОВКИ ПО ДНЯМ', unit: 'мин', field: 'time', totalLabel: 'Всего за неделю',   totalFmt: v => Math.floor(v/60) + ' ч ' + (v%60) + ' мин' },
    delivery:  { label: 'ДОСТАВКА ПО ДНЯМ',  unit: '',     field: 'delivery', totalLabel: 'Слотов на неделю', totalFmt: v => v + ' доставки' },
};

const DELIVERY_SLOTS = {
    'пн': '08:00–10:00', 'вт': null, 'ср': '08:00–10:00', 'чт': null,
    'пт': '18:00–20:00', 'сб': null, 'вс': '10:00–12:00',
};

function renderHistogram() {
    const root = $('#histogram');
    if (!root) return;
    root.innerHTML = '';
    const cfg = METRIC_CONFIG[State.histogramMetric] || METRIC_CONFIG.budget;
    const labelEl = $('#histogram-label');
    if (labelEl) labelEl.textContent = cfg.label;

    const isBudget = State.histogramMetric === 'budget';
    const dayStats = DAYS.map(d => ({ day: d, ...computeDayStats(d), delivery: DELIVERY_SLOTS[d] ? 1 : 0 }));
    // In budget mode, the bar height reflects the planned (dynamic) budget, not the actual cost.
    const values = isBudget
        ? DAYS.map(d => State.budgetByDay[d] || 0)
        : dayStats.map(s => s[cfg.field] || 0);
    const max = Math.max(...values, 1);
    let total = 0;

    DAYS.forEach((day, idx) => {
        const s = dayStats[idx];
        const wrap = el('div', 'histogram-bar-wrap');
        const isNocook = State.nocookDays.includes(day);
        const value = values[idx];
        total += value;
        const barH = Math.max(8, (value / max) * 110);

        let tooltipBody;
        if (isBudget) {
            const actual = s.budget;
            const status = actual <= value ? '✓ В бюджете' : '⚠ Превышение на ' + fmtNum(actual - value) + ' ₽';
            tooltipBody = `Запланировано: ${fmtNum(value)} ₽<br>Потратится: ${fmtNum(actual)} ₽<br>${status}`;
        } else if (State.histogramMetric === 'delivery') {
            tooltipBody = DELIVERY_SLOTS[day] ? 'Слот: ' + DELIVERY_SLOTS[day] : 'Доставка не запланирована';
        } else {
            tooltipBody = `Калории: ${s.cal}<br>Белок: ${s.p} г<br>Жиры: ${s.f} г<br>Углев: ${s.c} г<br>Время: ${s.time} мин`;
        }

        let bottomEl;
        if (isBudget) {
            bottomEl = `
                <div class="histogram-bar-input-wrap">
                    <input type="number" class="histogram-bar-input" data-day="${day}" value="${value}" min="0" step="50">
                    <span class="histogram-bar-input-rub">₽</span>
                </div>
            `;
        } else if (State.histogramMetric === 'delivery') {
            bottomEl = `<div class="histogram-price">${DELIVERY_SLOTS[day] || '—'}</div>`;
        } else if (State.histogramMetric === 'time') {
            bottomEl = `<div class="histogram-price">${value} мин</div>`;
        } else {
            bottomEl = `<div class="histogram-price">${fmtNum(value)}${cfg.unit ? ' ' + cfg.unit : ''}</div>`;
        }

        wrap.innerHTML = `
            <div class="histogram-bar-tooltip">
                <strong>${DAY_LABELS[day]}</strong><br>
                ${tooltipBody}
            </div>
            <div class="histogram-bar-area">
                <div class="histogram-bar ${isNocook ? 'nocook' : ''}" style="height:${barH}px"></div>
            </div>
            <div class="histogram-day">${day.toUpperCase()}</div>
            ${bottomEl}
        `;
        root.appendChild(wrap);
    });

    // Inline budget input handlers — update bar heights + total live without re-render (preserves focus)
    if (isBudget) {
        $$('.histogram-bar-input').forEach(input => {
            input.addEventListener('input', () => {
                const day = input.dataset.day;
                const v = parseInt(input.value) || 0;
                State.budgetByDay[day] = v;
                refreshBudgetBars();
                flashSaved();
                saveState();
            });
        });
    }

    const totalLabelEl = $('#histogram-total-label');
    const totalValEl = $('#histogram-total-val');
    if (totalLabelEl) totalLabelEl.textContent = cfg.totalLabel;
    if (totalValEl) totalValEl.textContent = cfg.totalFmt(total);
}

// Live-update bar heights and the total when a budget input changes.
function refreshBudgetBars() {
    const root = $('#histogram');
    if (!root) return;
    const vals = DAYS.map(d => State.budgetByDay[d] || 0);
    const max = Math.max(...vals, 1);
    let total = 0;
    DAYS.forEach((d, i) => {
        const v = vals[i];
        total += v;
        const wrap = root.children[i];
        if (!wrap) return;
        const bar = wrap.querySelector('.histogram-bar');
        if (bar) bar.style.height = Math.max(8, (v / max) * 110) + 'px';
    });
    const totalValEl = $('#histogram-total-val');
    if (totalValEl) totalValEl.textContent = fmtNum(total) + ' ₽';
    // Update header hint too
    const hintBudget = $('#hint-budget');
    if (hintBudget) hintBudget.textContent = fmtNum(total) + ' ₽';
}
function computeMealBudget(day, meal) {
    const ids = (State.menu[day] && State.menu[day][meal]) || [];
    return ids.reduce((sum, id) => {
        const d = dishById(id);
        return sum + (d ? (d.price_per_serving || d.price || 0) : 0);
    }, 0);
}

// =============== SETTINGS ===============
function renderSettings() {
    // Budget editing is now embedded in the histogram (renderHistogram).
    // The legacy #budget-grid section was removed from the markup.

    // Mode
    $$('.rec-mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === State.recommendationMode);
    });

    // Stop list chips
    renderStopList();

    // Meals + servings: highlight matching button OR fill custom input
    const mealsPresets = [1, 2, 3, 4, 5];
    $$('.meals-btn').forEach(b => b.classList.toggle('active',
        parseInt(b.dataset.meals) === State.mealsPerDay && mealsPresets.includes(State.mealsPerDay)));
    const mealsCustom = $('#meals-custom');
    if (mealsCustom) {
        const isCustom = !mealsPresets.includes(State.mealsPerDay);
        mealsCustom.value = isCustom ? State.mealsPerDay : '';
        mealsCustom.classList.toggle('active', isCustom);
    }
    const servingsPresets = [1, 2, 3, 4, 5];
    $$('.servings-btn').forEach(b => b.classList.toggle('active',
        parseInt(b.dataset.servings) === State.servings && servingsPresets.includes(State.servings)));
    const servingsCustom = $('#servings-custom');
    if (servingsCustom) {
        const isCustom = !servingsPresets.includes(State.servings);
        servingsCustom.value = isCustom ? State.servings : '';
        servingsCustom.classList.toggle('active', isCustom);
    }
    $('#add-snacks').checked = State.addSnacks;

    // Nocook days
    $$('.nocook-btn').forEach(b => b.classList.toggle('active', State.nocookDays.includes(b.dataset.day)));

    // Cuisines mini grid
    const cm = $('#cuisines-mini-grid');
    cm.innerHTML = '';
    ALL_CUISINES.forEach(c => {
        const card = el('div', 'cuisine-mini' + (State.cuisines.includes(c.id) ? ' selected' : ''));
        card.textContent = c.name;
        card.addEventListener('click', () => {
            const i = State.cuisines.indexOf(c.id);
            if (i >= 0) State.cuisines.splice(i, 1);
            else State.cuisines.push(c.id);
            renderSettings();
            flashSaved();
            saveState();
        });
        cm.appendChild(card);
    });
}
function updateBudgetTotal() {
    // Total is rendered inside the histogram (#histogram-total-val).
    const el = $('#budget-total');
    if (!el) return;
    const total = DAYS.reduce((s, d) => s + (State.budgetByDay[d] || 0), 0);
    el.textContent = fmtNum(total);
}
function renderStopList() {
    const ch = $('#stoplist-chips');
    ch.innerHTML = '';
    [...State.excludes, ...State.customExcludes].forEach((e, idx, arr) => {
        const isCommon = State.excludes.includes(e);
        const chip = el('span', 'stop-chip');
        const labelEntry = COMMON_EXCLUDES.find(c => c.id === e);
        const label = labelEntry ? labelEntry.name : e;
        chip.innerHTML = `${escapeHTML(label)}<span class="stop-chip-x">×</span>`;
        chip.querySelector('.stop-chip-x').addEventListener('click', () => {
            if (isCommon) State.excludes = State.excludes.filter(x => x !== e);
            else State.customExcludes = State.customExcludes.filter(x => x !== e);
            renderStopList();
            flashSaved();
            saveState();
        });
        ch.appendChild(chip);
    });
    if (![...State.excludes, ...State.customExcludes].length) {
        ch.innerHTML = '<span style="color:#bbb;font-size:13px;">Стоп-лист пуст</span>';
    }
}
function flashSaved() {
    const s = $('#settings-saved');
    if (!s) return;
    s.classList.add('flash');
    setTimeout(() => s.classList.remove('flash'), 1000);
}

// =============== NAVIGATION ===============
function navigate(screen) {
    // Settings is now a popup modal — clicking "Настроить" goes to menu and opens the modal.
    if (screen === 'settings') {
        $$('.screen').forEach(s => s.classList.remove('active'));
        $('#screen-menu').classList.add('active');
        renderAll();
        openSettingsModal();
        return;
    }

    $$('.screen').forEach(s => s.classList.remove('active'));
    const target = $('#screen-' + screen);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (screen === 'menu') { renderAll(); renderSettings(); }
    if (screen === 'home') renderHome();
    if (screen === 'onboarding') {
        $('#onb-step-1').style.display = 'block';
        $('#onb-step-2').style.display = 'none';
        $('#onb-loading').style.display = 'none';
        $('#onb-progress-fill').style.width = '50%';
        $('#onb-progress-text').textContent = '1/2';
        renderOnboarding();
    }
}

function renderAll() {
    renderHome();
    renderMenuGrid();
    renderSummary();
    renderHistogram();
    renderActivePreset();
    syncPresetCards();
    updateHeroStats();
    // Show personalized banners on menu screen if onboarded
    $('#personalized-banner-menu').style.display = State.onboarded ? 'flex' : 'none';
}

const PRESET_LABELS = {
    sport:  '🏋️ Для спортсменов',
    home:   '🏠 Для домоседов',
    family: '👨‍👩‍👧 Для семьи',
    budget: '💰 Бюджетное',
    light:  '🥗 Лёгкое',
};

function renderActivePreset() {
    const wrap = $('#active-preset-wrap');
    if (!wrap) return;
    if (!State.activePreset) {
        wrap.innerHTML = '';
        return;
    }
    const label = PRESET_LABELS[State.activePreset] || State.activePreset;
    wrap.innerHTML = `
        <span class="active-preset-chip">
            ${label}
            <span class="active-preset-chip-x" id="clear-preset-btn" aria-label="Сбросить пресет">×</span>
        </span>
    `;
    $('#clear-preset-btn').addEventListener('click', () => {
        State.activePreset = null;
        State.cuisines = [];
        generateMenu();
        renderAll();
        showToast('Пресет сброшен');
    });
}

function syncPresetCards() {
    $$('.preset-card').forEach(c => {
        c.classList.toggle('active', c.dataset.preset === State.activePreset);
    });
}

// =============== EVENT BINDING ===============
function bindEvents() {
    // Sidebar toggle (mobile)
    const overlay = el('div', 'sidebar-overlay');
    document.body.appendChild(overlay);
    $('#mobile-menu-btn').addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
        overlay.classList.toggle('open');
    });
    overlay.addEventListener('click', () => {
        $('#sidebar').classList.remove('open');
        overlay.classList.remove('open');
    });

    // Navigation links
    document.body.addEventListener('click', e => {
        const navTrg = e.target.closest('[data-nav]');
        if (navTrg) {
            e.preventDefault();
            navigate(navTrg.dataset.nav);
            $('#sidebar').classList.remove('open');
            overlay.classList.remove('open');
        }
    });

    // Presets
    $$('.preset-card').forEach(b => {
        b.addEventListener('click', () => {
            const preset = PRESETS[b.dataset.preset];
            if (!preset) return;
            $$('.preset-card').forEach(p => p.classList.remove('active'));
            b.classList.add('active');
            // Apply preset
            if (preset.servings) State.servings = preset.servings;
            if (preset.mealsPerDay) State.mealsPerDay = preset.mealsPerDay;
            if (preset.mode) State.recommendationMode = preset.mode;
            if (preset.cuisines && preset.cuisines.length) State.cuisines = preset.cuisines;
            State.activePreset = b.dataset.preset;
            generateMenu();
            renderAll();
            showToast('Применён пресет: ' + b.querySelector('.preset-label').textContent);
            navigate('menu');
        });
    });

    // Onboarding
    $('#cuisine-search').addEventListener('input', renderOnboarding);
    $('#onb-step1-next').addEventListener('click', () => {
        $('#onb-step-1').style.display = 'none';
        $('#onb-step-2').style.display = 'block';
        $('#onb-progress-fill').style.width = '100%';
        $('#onb-progress-text').textContent = '2/2';
        renderExcludes();
    });
    $('#onb-back-btn').addEventListener('click', () => {
        if ($('#onb-step-2').style.display !== 'none') {
            $('#onb-step-2').style.display = 'none';
            $('#onb-step-1').style.display = 'block';
            $('#onb-progress-fill').style.width = '50%';
            $('#onb-progress-text').textContent = '1/2';
        } else {
            navigate('home');
        }
    });
    $('#btn-add-exclude').addEventListener('click', () => {
        const inp = $('#excludes-custom-input');
        const v = inp.value.trim();
        if (v && !State.customExcludes.includes(v)) {
            State.customExcludes.push(v);
            renderCustomExcludes();
        }
        inp.value = '';
    });
    $('#excludes-custom-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') $('#btn-add-exclude').click();
    });
    $('#onb-finish').addEventListener('click', () => {
        $('#onb-step-2').style.display = 'none';
        $('#onb-loading').style.display = 'block';
        State.onboarded = true;
        setTimeout(() => {
            generateMenu();
            saveState();
            navigate('menu');
        }, 1300);
    });

    // Replace modal close
    $('#replace-modal-close').addEventListener('click', () => $('#replace-modal').style.display = 'none');
    $('#replace-modal').addEventListener('click', e => {
        if (e.target.id === 'replace-modal') e.target.style.display = 'none';
    });
    $('#add-modal-close').addEventListener('click', () => $('#add-modal').style.display = 'none');
    $('#add-modal').addEventListener('click', e => {
        if (e.target.id === 'add-modal') e.target.style.display = 'none';
    });

    // Day tabs (mobile)
    $$('.day-tab').forEach(t => {
        t.addEventListener('click', () => {
            $$('.day-tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            State.activeDayMobile = t.dataset.day;
            renderMenuGrid();
        });
    });

    // Summary tabs
    $$('.summary-tab').forEach(t => {
        t.addEventListener('click', () => {
            $$('.summary-tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            State.summaryMode = t.dataset.summaryMode;
            renderSummary();
        });
    });
    $('#summary-day-select').addEventListener('change', e => {
        State.summaryDay = e.target.value;
        renderSummary();
    });

    // Order tabs
    $$('.order-tab').forEach(t => {
        t.addEventListener('click', () => {
            $$('.order-tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            State.orderPeriod = t.dataset.orderPeriod;
            updateOrderButtons();
        });
    });
    $('#btn-order-perekrestok').addEventListener('click', () => {
        const ingredients = collectIngredients();
        showToast(`📦 Заказ ${ingredients.length} ингредиентов отправлен в Перекрёсток`);
    });
    $('#btn-order-pyaterochka').addEventListener('click', () => {
        const ingredients = collectIngredients();
        showToast(`📋 Список из ${ingredients.length} ингредиентов сохранён`);
    });

    // Settings
    $$('.rec-mode-btn').forEach(b => {
        b.addEventListener('click', () => {
            $$('.rec-mode-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            State.recommendationMode = b.dataset.mode;
            flashSaved();
            saveState();
        });
    });
    $('#btn-add-stop').addEventListener('click', () => {
        const inp = $('#stoplist-input');
        const v = inp.value.trim();
        if (v && !State.customExcludes.includes(v) && !State.excludes.includes(v)) {
            State.customExcludes.push(v);
            renderStopList();
            saveState();
        }
        inp.value = '';
    });
    $('#stoplist-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') $('#btn-add-stop').click();
    });
    $$('.meals-btn').forEach(b => {
        b.addEventListener('click', () => {
            $$('.meals-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            State.mealsPerDay = parseInt(b.dataset.meals);
            const customInp = $('#meals-custom');
            if (customInp) { customInp.value = ''; customInp.classList.remove('active'); }
            flashSaved();
            saveState();
        });
    });
    const mealsCustom = $('#meals-custom');
    if (mealsCustom) {
        mealsCustom.addEventListener('input', e => {
            const v = parseInt(e.target.value);
            if (v && v > 0) {
                State.mealsPerDay = v;
                $$('.meals-btn').forEach(x => x.classList.remove('active'));
                e.target.classList.add('active');
                flashSaved();
                saveState();
            } else {
                e.target.classList.remove('active');
            }
        });
    }
    $$('.servings-btn').forEach(b => {
        b.addEventListener('click', () => {
            $$('.servings-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            State.servings = parseInt(b.dataset.servings);
            const customInp = $('#servings-custom');
            if (customInp) { customInp.value = ''; customInp.classList.remove('active'); }
            flashSaved();
            saveState();
        });
    });
    const servingsCustom = $('#servings-custom');
    if (servingsCustom) {
        servingsCustom.addEventListener('input', e => {
            const v = parseInt(e.target.value);
            if (v && v > 0) {
                State.servings = v;
                $$('.servings-btn').forEach(x => x.classList.remove('active'));
                e.target.classList.add('active');
                flashSaved();
                saveState();
            } else {
                e.target.classList.remove('active');
            }
        });
    }
    $('#add-snacks').addEventListener('change', e => {
        State.addSnacks = e.target.checked;
        flashSaved();
        saveState();
    });
    $$('.nocook-btn').forEach(b => {
        b.addEventListener('click', () => {
            const day = b.dataset.day;
            const i = State.nocookDays.indexOf(day);
            if (i >= 0) State.nocookDays.splice(i, 1);
            else State.nocookDays.push(day);
            b.classList.toggle('active');
            renderHistogram();
            flashSaved();
            saveState();
        });
    });
    $('#btn-apply-settings').addEventListener('click', () => {
        generateMenu();
        renderAll();
        showToast('Настройки применены, меню обновлено');
        closeSettingsModal();
    });

    // Settings modal: open / close
    const openBtn = $('#open-settings-btn');
    if (openBtn) openBtn.addEventListener('click', openSettingsModal);
    const closeBtn = $('#settings-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSettingsModal);
    const sm = $('#settings-modal');
    if (sm) sm.addEventListener('click', e => {
        if (e.target.id === 'settings-modal') closeSettingsModal();
    });

    // Histogram tabs
    $$('.hist-tab').forEach(t => {
        t.addEventListener('click', () => {
            $$('.hist-tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            State.histogramMetric = t.dataset.metric;
            renderHistogram();
        });
    });

    // Resize handler — re-render menu grid (mobile vs desktop)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => renderMenuGrid(), 200);
    });
}

function collectIngredients() {
    const map = new Map();
    DAYS.forEach(d => MEALS.forEach(m => {
        const ids = (State.menu[d] && State.menu[d][m]) || [];
        ids.forEach(id => {
            const r = recipeById(id);
            if (!r) return;
            (r.ingredients || []).forEach(ing => {
                if (!map.has(ing.name)) map.set(ing.name, { ...ing });
            });
        });
    }));
    return Array.from(map.values());
}

function updateOrderButtons() {
    let multiplier = 1;
    if (State.orderPeriod === '3days') multiplier = 3 / 7;
    else if (State.orderPeriod === 'today') multiplier = 1 / 7;
    const w = computeWeekStats();
    const total = Math.round(w.budget * multiplier);
    $('#order-price-perekrestok').textContent = '~' + fmtRub(total);
    $('#order-price-pyaterochka').textContent = '~' + fmtRub(total);
}

// Move the settings form from the standalone settings screen into the modal popup.
// The histogram is rendered ABOVE this form, inside the same modal.
function inlineSettingsIntoModal() {
    const modalBody = $('#settings-modal-body-form');
    const settingsCard = $('#screen-settings .settings-card');
    if (!modalBody || !settingsCard) return;
    modalBody.appendChild(settingsCard);
    const settingsScreen = $('#screen-settings');
    if (settingsScreen) settingsScreen.dataset.movedInline = '1';
}

function openSettingsModal() {
    const m = $('#settings-modal');
    if (!m) return;
    m.style.display = 'flex';
    renderSettings();
    renderHistogram();
    document.body.style.overflow = 'hidden';
}
function closeSettingsModal() {
    const m = $('#settings-modal');
    if (!m) return;
    m.style.display = 'none';
    document.body.style.overflow = '';
}

// =============== INIT ===============
async function init() {
    await loadData();
    loadStateFromStorage();

    // Set today's day for summary
    State.summaryDay = todayKey();
    if (!DAYS.includes(State.summaryDay)) State.summaryDay = 'пн';
    State.activeDayMobile = State.summaryDay;
    $('#summary-day-select').value = State.summaryDay;

    // Generate initial menu if empty
    if (!State.menu || !State.menu['пн'] || !State.menu['пн'].breakfast) {
        generateMenu();
    }

    inlineSettingsIntoModal();
    bindEvents();
    renderAll();
    renderSettings();

    // Open home by default
    navigate('home');
}

document.addEventListener('DOMContentLoaded', init);
})();
