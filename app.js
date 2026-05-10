document.addEventListener('DOMContentLoaded', () => {

            // === КБЖУ GRID HELPER ===
            function makeKbjuHtml(kcal, prot, fat, carb, name, price) {
                name = name || 'Блюдо';
                return `<div class="kbju_back_top">
            <span class="kbju_back_name">${name}</span>
            <span class="kbju_price">на 100 г</span>
        </div>
        <div class="kbju_back_row">
            <div class="kbju_nut"><div class="kbju_nut_icon">🔥</div><div class="kbju_nut_val">${kcal}</div><div class="kbju_nut_label">ККАЛ</div></div>
            <div class="kbju_nut"><div class="kbju_nut_icon">🥩</div><div class="kbju_nut_val">${prot}г</div><div class="kbju_nut_label">БЕЛОК</div></div>
            <div class="kbju_nut"><div class="kbju_nut_icon">💧</div><div class="kbju_nut_val">${fat}г</div><div class="kbju_nut_label">ЖИРЫ</div></div>
            <div class="kbju_nut"><div class="kbju_nut_icon">🌾</div><div class="kbju_nut_val">${carb}г</div><div class="kbju_nut_label">УГЛЕВ</div></div>
        </div>`;
            }
            const defaultPrices = [85, 120, 150, 95, 110, 105, 90, 130, 160, 75, 140, 125, 85, 115, 180, 90, 145, 105, 90, 135, 70];
            const defaultKbju = [
                [185, 12, 7, 20], [140, 8, 5, 16], [95, 6, 3, 12], [210, 14, 9, 22], [160, 10, 6, 18],
                [120, 7, 4, 15], [175, 11, 8, 14], [130, 9, 5, 13], [200, 13, 8, 21], [155, 10, 6, 17]
            ];
            let kbjuIdx = 0;

            // === UPGRADE FLAT GM_MEAL_CARDS ===
            document.querySelectorAll('.gm_meal_card').forEach(card => {
                if (card.querySelector('.gm_meal_card_inner')) {
                    // Already has structure — just fill the back
                    const back = card.querySelector('.gm_meal_back');
                    if (back && !back.querySelector('.kbju_back_row')) {
                        const k = card.dataset.kcal || defaultKbju[kbjuIdx % defaultKbju.length][0];
                        const p = card.dataset.prot || defaultKbju[kbjuIdx % defaultKbju.length][1];
                        const f = card.dataset.fat || defaultKbju[kbjuIdx % defaultKbju.length][2];
                        const c = card.dataset.carb || defaultKbju[kbjuIdx % defaultKbju.length][3];
                        const nameEl = card.querySelector('.gm_meal_title');
                        const mealName = nameEl ? nameEl.textContent.trim() : '';
                        const mealPrice = card.dataset.price || defaultPrices[kbjuIdx % defaultPrices.length];
                        back.innerHTML = makeKbjuHtml(k, p, f, c, mealName, mealPrice);
                        kbjuIdx++;
                    }
                    return;
                }
                // Flat card — wrap contents with inner/front/back
                const swap = card.querySelector('.gm_swap_icon');
                const nameEl = card.querySelector('.gm_meal_title');
                const mealName = nameEl ? nameEl.textContent.trim() : '';
                const mealPrice = card.dataset.price || defaultPrices[kbjuIdx % defaultPrices.length];
                const kd = defaultKbju[kbjuIdx % defaultKbju.length];
                kbjuIdx++;

                const inner = document.createElement('div');
                inner.className = 'gm_meal_card_inner';

                const front = document.createElement('div');
                front.className = 'gm_meal_front';
                // Move all children into front
                while (card.firstChild) front.appendChild(card.firstChild);

                // Move swap back to the card level so it isn't flipped
                if (swap) {
                    card.appendChild(swap);
                }

                const back = document.createElement('div');
                back.className = 'gm_meal_back';
                back.innerHTML = makeKbjuHtml(kd[0], kd[1], kd[2], kd[3], mealName, mealPrice);

                inner.appendChild(front);
                inner.appendChild(back);
                card.appendChild(inner);
            });



            // --- МОДАЛЬНОЕ ОКНО ЗАМЕНЫ/ДОБАВЛЕНИЯ БЛЮДА ---
            const replaceModal = document.getElementById('replaceModal');
            const closeReplaceModal = document.getElementById('closeReplaceModal');
            const replaceSearchInput = document.querySelector('.replace_search_input');
            const replaceListContainer = document.querySelector('.replace_list_container');
            const replaceEmptyState = document.createElement('div');
            replaceEmptyState.className = 'replace_empty_state';
            replaceEmptyState.textContent = 'Ничего не нашли. Попробуйте другой запрос.';
            if (replaceListContainer) replaceListContainer.appendChild(replaceEmptyState);

            let activeActionType = null; // 'replace' | 'add'
            let activeActionTarget = null; // HTMLElement
            let activeReplaceCategory = null;

            function filterReplaceList() {
                const query = replaceSearchInput ? replaceSearchInput.value.trim().toLowerCase() : '';
                let visibleCount = 0;

                document.querySelectorAll('.replace_list_item').forEach(item => {
                    const itemCategory = item.getAttribute('data-category');
                    const title = item.querySelector('.replace_item_title')?.innerText.toLowerCase() || '';
                    const cuisine = item.querySelector('.replace_meta_cuisine')?.innerText.toLowerCase() || '';
                    const matchesCategory = !activeReplaceCategory || !itemCategory || itemCategory === activeReplaceCategory;
                    const matchesQuery = !query || title.includes(query) || cuisine.includes(query);
                    const isVisible = matchesCategory && matchesQuery;

                    item.style.display = isVisible ? 'flex' : 'none';
                    if (isVisible) visibleCount++;
                });

                replaceEmptyState.classList.toggle('visible', visibleCount === 0);
            }

            function openReplaceModal(type, target) {
                activeActionType = type;
                activeActionTarget = target;
                document.querySelector('.replace_modal_title').innerText = type === 'replace' ? 'Заменить блюдо' : 'Добавить блюдо';

                // Получаем категорию из родительского столбца
                const col = target.closest('.gm_meal_col');
                activeReplaceCategory = col ? col.getAttribute('data-category') : null;
                if (replaceSearchInput) replaceSearchInput.value = '';
                filterReplaceList();

                replaceModal.style.display = 'flex';
                if (replaceSearchInput) replaceSearchInput.focus();
            }

            closeReplaceModal.addEventListener('click', () => replaceModal.style.display = 'none');
            replaceModal.addEventListener('click', (e) => {
                if (e.target === replaceModal) replaceModal.style.display = 'none';
            });
            if (replaceSearchInput) replaceSearchInput.addEventListener('input', filterReplaceList);

            // Обработчик клика по элементам списка в модальном окне
            document.querySelectorAll('.replace_list_item').forEach(item => {
                item.addEventListener('click', () => {
                    const title = item.querySelector('.replace_item_title').innerText;
                    const photo = item.querySelector('img').src;
                    const time = item.querySelector('.replace_meta_time').innerText;

                    const newCard = document.createElement('div');
                    newCard.className = 'gm_meal_card';
                    newCard.innerHTML = `
                        <div class="gm_swap_icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="16 3 21 3 21 8"></polyline>
                                <line x1="4" y1="14" x2="21" y2="3"></line>
                                <polyline points="8 21 3 21 3 16"></polyline>
                                <line x1="20" y1="10" x2="3" y2="21"></line>
                            </svg>
                        </div>
                        <div class="gm_meal_card_inner">
                            <div class="gm_meal_front">
                                <div class="gm_meal_info">
                                    <div class="gm_meal_title">${title}</div>
                                    <div class="gm_meal_time">${time}</div>
                                </div>
                                <img src="${photo}" class="gm_meal_photo" alt="">
                            </div>
                            <div class="gm_meal_back">
                                ${makeKbjuHtml(
                                    defaultKbju[kbjuIdx % defaultKbju.length][0],
                                    defaultKbju[kbjuIdx % defaultKbju.length][1],
                                    defaultKbju[kbjuIdx % defaultKbju.length][2],
                                    defaultKbju[kbjuIdx % defaultKbju.length][3],
                                    title,
                                    defaultPrices[kbjuIdx % defaultPrices.length]
                                )}
                            </div>
                        </div>
                    `;
                    kbjuIdx++;

                    attachDragEvents(newCard);

                    if (activeActionType === 'replace' && activeActionTarget) {
                        activeActionTarget.replaceWith(newCard);
                    } else if (activeActionType === 'add' && activeActionTarget) {
                        activeActionTarget.parentNode.insertBefore(newCard, activeActionTarget);
                    }

                    replaceModal.style.display = 'none';
                });
            });

            // === ДОБАВЛЕНИЕ КНОПКИ "+ ДОБАВИТЬ БЛЮДО" В СЕТКУ МЕНЮ ===
            document.querySelectorAll('.gm_grid_row').forEach(row => {
                const children = Array.from(row.children);
                const cards = children.filter(c => c.classList.contains('gm_meal_card'));

                cards.forEach((card, index) => {
                    const col = document.createElement('div');
                    col.className = 'gm_meal_col';

                    // Назначаем категорию в зависимости от колонки
                    let category = 'breakfast';
                    if (index === 1) category = 'lunch';
                    if (index === 2) category = 'dinner';
                    col.setAttribute('data-category', category);

                    row.insertBefore(col, card);
                    col.appendChild(card);

                    const addBtn = document.createElement('button');
                    addBtn.className = 'gm_add_dish_btn';
                    addBtn.innerHTML = '+ Добавить блюдо';
                    addBtn.addEventListener('click', () => openReplaceModal('add', addBtn));
                    col.appendChild(addBtn);
                });
            });

            // --- ЛОГИКА ПЕРЕТАСКИВАНИЯ КАРТОЧЕК ---
            let draggedCard = null;

            function attachDragEvents(card) {
                const swapIcon = card.querySelector('.gm_swap_icon');
                if (swapIcon) {
                    swapIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openReplaceModal('replace', card);
                    });
                }

                let deleteIcon = card.querySelector('.gm_delete_icon');
                if (!deleteIcon) {
                    deleteIcon = document.createElement('div');
                    deleteIcon.className = 'gm_delete_icon';
                    deleteIcon.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    `;
                    card.insertBefore(deleteIcon, card.firstChild);
                }

                deleteIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    card.remove();
                });

                card.addEventListener('click', (e) => {
                    const isTouchLayout = window.matchMedia('(max-width: 767px)').matches;
                    if (!isTouchLayout || e.target.closest('.gm_swap_icon') || e.target.closest('.gm_delete_icon')) return;
                    card.classList.toggle('flipped');
                });

                card.addEventListener('mousedown', (e) => {
                    if (!e.target.closest('.gm_swap_icon') && !e.target.closest('.gm_delete_icon')) {
                        card.setAttribute('draggable', 'true');
                    }
                });

                card.addEventListener('mouseup', () => card.removeAttribute('draggable'));
                card.addEventListener('mouseleave', () => card.removeAttribute('draggable'));

                card.addEventListener('dragstart', (e) => {
                    draggedCard = e.target.closest('.gm_meal_card');
                    e.target.style.opacity = '0.5';
                });

                card.addEventListener('dragend', (e) => {
                    e.target.style.opacity = '1';
                    e.target.removeAttribute('draggable');
                    draggedCard = null;
                });

                card.addEventListener('dragover', (e) => e.preventDefault());

                card.addEventListener('dragenter', (e) => {
                    e.preventDefault();
                    if (draggedCard !== card && draggedCard !== null) {
                        card.classList.add('drag_over');
                    }
                });

                card.addEventListener('dragleave', (e) => {
                    card.classList.remove('drag_over');
                });

                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.classList.remove('drag_over');
                    const targetCard = e.target.closest('.gm_meal_card');

                    if (targetCard && draggedCard !== targetCard) {
                        const parent = draggedCard.parentNode;
                        const next = draggedCard.nextSibling;
                        targetCard.parentNode.insertBefore(draggedCard, targetCard);
                        parent.insertBefore(targetCard, next);
                    }
                });
            }

            document.querySelectorAll('.gm_meal_card').forEach(attachDragEvents);
            // ----------------------------------------

            // Получаем ссылки на основные блоки
            const surveyStep1 = document.querySelector('.survey_step_wrapper');
            const surveyStep2 = document.querySelector('.survey_step_2_wrapper');
            const generatedMenu = document.querySelector('.generated_menu_wrapper');
            const settingsMenu = document.querySelector('.settings_menu_wrapper');

            // Элементы для баннеров персонализации
            const gmInfoBox = document.getElementById('gmInfoBox');
            const gmMiniSurveyBlock = document.getElementById('gmMiniSurveyBlock');

            // Кнопки
            const backBtn1 = document.getElementById('surveyBackBtn');
            const continueBtn1 = document.getElementById('surveyContinueBtn');
            const backBtn2 = document.getElementById('surveyBackBtn2');
            const finishBtn = document.getElementById('surveyFinishBtn');
            const openSettingsBtn = document.getElementById('openSettingsBtn');
            const applySettingsBtn = document.getElementById('applySettingsBtn');
            const closeSettingsBtn = document.getElementById('closeSettingsBtn');
            const openSurveyFromGmBtn = document.getElementById('openSurveyFromGmBtn');
            const gmLoadMoreBtn = document.getElementById('gmLoadMoreBtn');
            const gmHideMoreBtn = document.getElementById('gmHideMoreBtn');
            const gmWrapper = document.querySelector('.generated_menu_wrapper');

            // Карточки
            const cards1 = document.querySelectorAll('.cuisine_card');
            const cards2 = document.querySelectorAll('.exclude_card');

            // --- ИНИЦИАЛИЗАЦИЯ (СТАРТОВОЕ СОСТОЯНИЕ) ---
            surveyStep1.style.display = 'none';
            surveyStep2.style.display = 'none';
            settingsMenu.style.display = 'none';

            generatedMenu.style.display = 'block';
            if (gmInfoBox) gmInfoBox.style.display = 'none';
            if (gmMiniSurveyBlock) gmMiniSurveyBlock.style.display = 'flex';
            // ---------------------------------------------

            function openSettingsModal() {
                settingsMenu.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }

            function closeSettingsModal() {
                settingsMenu.style.display = 'none';
                document.body.style.overflow = '';
            }

            // Клик "Пройти" опрос из дефолтного меню
            if (openSurveyFromGmBtn) {
                openSurveyFromGmBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    generatedMenu.style.display = 'none';
                    surveyStep1.style.display = 'block';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }

            // Возврат из шага 1
            backBtn1.addEventListener('click', () => {
                surveyStep1.style.display = 'none';
                generatedMenu.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Переход к шагу 2
            continueBtn1.addEventListener('click', () => {
                surveyStep1.style.display = 'none';
                surveyStep2.style.display = 'block';
            });

            // Возврат из шага 2 в шаг 1
            backBtn2.addEventListener('click', () => {
                surveyStep2.style.display = 'none';
                surveyStep1.style.display = 'block';
            });

            // Успешное завершение опроса
            // --- ИНТЕГРАЦИЯ X5ID: ПОИСК ЭЛЕМЕНТОВ ---
            const x5idAuthWrapper = document.getElementById('x5idAuthWrapper');
            const fakeSubmitBtn = document.getElementById('fake_submit_button');
            const closeX5Button = document.getElementById('close-x5-button');

            // Кнопка завершения опроса -> Переход к X5ID
            finishBtn.addEventListener('click', () => {
                surveyStep2.style.display = 'none';

                // 1. ПОКАЗЫВАЕМ сгенерированное меню на заднем фоне
                generatedMenu.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // 2. ПОКАЗЫВАЕМ попап авторизации поверх меню
                if (x5idAuthWrapper) {
                    x5idAuthWrapper.style.display = 'flex';
                    document.body.style.overflow = 'hidden'; // Блокируем скролл страницы под попапом
                }
            });

            // Крестик в интерфейсе X5ID (Отмена авторизации)
            if (closeX5Button) {
                closeX5Button.addEventListener('click', () => {
                    // Просто скрываем попап и разрешаем пользователю смотреть меню
                    x5idAuthWrapper.style.display = 'none';
                    document.body.style.overflow = ''; // Возвращаем скролл страницы

                    if (gmInfoBox) gmInfoBox.style.display = 'flex';
                    if (gmMiniSurveyBlock) gmMiniSurveyBlock.style.display = 'none';
                });
            }

            // Симуляция отправки формы в X5ID (Успешная авторизация)
            if (fakeSubmitBtn) {
                fakeSubmitBtn.addEventListener('click', (e) => {
                    e.preventDefault(); // Останавливаем реальную отправку формы

                    const btnText = fakeSubmitBtn.querySelector('.submit-text');
                    if (btnText) btnText.innerText = 'Проверка...';
                    fakeSubmitBtn.style.opacity = '0.7';

                    setTimeout(() => {
                        if (btnText) btnText.innerText = 'Отправить код';
                        fakeSubmitBtn.style.opacity = '1';

                        // Скрываем авторизацию
                        x5idAuthWrapper.style.display = 'none';
                        document.body.style.overflow = ''; // Возвращаем скролл страницы

                        // Меню уже на фоне, просто убеждаемся, что плашка успеха видна
                        if (gmInfoBox) gmInfoBox.style.display = 'flex';
                        if (gmMiniSurveyBlock) gmMiniSurveyBlock.style.display = 'none';

                        // Показываем пресет "Для Вас" и сразу включаем его
                        const forYouPreset = document.getElementById('gmPresetForYou');
                        if (forYouPreset) {
                            forYouPreset.style.display = 'flex';
                            forYouPreset.click();
                        }
                    }, 1000); // 1 секунда имитации загрузки
                });
            }

            // Открытие настроек из меню
            openSettingsBtn.addEventListener('click', () => {
                openSettingsModal();
            });
            if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && settingsMenu.style.display !== 'none') closeSettingsModal();
            });

            // Логика переключения быстрых пресетов
            const menuPresets = {
                'Сбалансированное': {
                    b: ['Овсянка с ягодами', 'Творожная запеканка', 'Сырники', 'Яичница с беконом'],
                    l: ['Куриный суп с лапшой', 'Гречка с котлетой', 'Паста с курицей', 'Борщ'],
                    d: ['Стейк лосося', 'Курица с овощами', 'Салат Цезарь', 'Запеченная рыба']
                },
                'Спортивное': {
                    b: ['Овсянка с протеином', 'Протеиновые панкейки', 'Омлет из 5 белков', 'Творог 0%'],
                    l: ['Куриная грудка с гречкой', 'Стейк из тунца', 'Бурый рис с индейкой', 'Салат с креветками'],
                    d: ['Стейк лосося', 'Куриное филе с брокколи', 'Запеченный судак', 'Творог с кефиром']
                },
                'Вегетарианское': {
                    b: ['Смузи-боул', 'Тофу-скрэмбл', 'Гречневая каша на миндальном', 'Чиа-пудинг'],
                    l: ['Крем-суп из тыквы', 'Паста с томатным соусом', 'Овощное рагу', 'Фалафель с хумусом'],
                    d: ['Салат с киноа и авокадо', 'Запеченные баклажаны', 'Греческий салат', 'Овощи на гриле']
                },
                'Для семьи': {
                    b: ['Блинчики с мясом', 'Сырники со сметаной', 'Каша дружба', 'Омлет с сыром'],
                    l: ['Борщ с пампушками', 'Макароны по-флотски', 'Куриный суп', 'Пюре с котлетой'],
                    d: ['Запеченная курица', 'Домашняя пицца', 'Лазанья', 'Мясной рулет']
                },
                'Бюджетное': {
                    b: ['Манная каша', 'Яичница из 2 яиц', 'Бутерброды с сыром', 'Пшенная каша'],
                    l: ['Суп гороховый', 'Макароны с сосиской', 'Гречка с подливой', 'Жареная картошка'],
                    d: ['Пельмени домашние', 'Винегрет', 'Капуста тушеная', 'Оладьи из кабачков']
                },
                'Быстрое': {
                    b: ['Мюсли с молоком', 'Тост с авокадо', 'Яичница-глазунья', 'Хлопья'],
                    l: ['Готовый крем-суп', 'Пельмени', 'Сэндвич с ветчиной', 'Салат с тунцом'],
                    d: ['Сосиски с горошком', 'Готовая пицца', 'Курица гриль', 'Макароны с сыром']
                },
                'Для Вас': {
                    b: ['Сырники с малиной', 'Тост с лососем', 'Овсянка на кокосовом', 'Смузи-боул'],
                    l: ['Поке с лососем', 'Том Ям', 'Паста Карбонара', 'Стейк Рибай'],
                    d: ['Запеченный сибас', 'Цезарь с креветками', 'Тартар из говядины', 'Салат с ростбифом']
                }
            };

            const presetBtns = document.querySelectorAll('.gm_preset_btn');
            presetBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    presetBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    const presetName = btn.textContent.replace(/[^\wА-Яа-яЁё -]/g, '').trim();
                    const presetData = menuPresets[presetName];

                    if (presetData) {
                        const rows = document.querySelectorAll('.gm_grid_row');
                        rows.forEach((row, dayIndex) => {
                            const cards = row.querySelectorAll('.gm_meal_card');
                            const categories = ['b', 'l', 'd'];

                            cards.forEach((card, idx) => {
                                if (idx >= 3) return;
                                const cat = categories[idx];
                                const titleEl = card.querySelector('.gm_meal_title');
                                const timeEl = card.querySelector('.gm_meal_time');

                                if (titleEl && presetData[cat]) {
                                    // Change title
                                    titleEl.innerText = presetData[cat][(dayIndex + idx) % presetData[cat].length];

                                    // Change time if not nocook
                                    if (timeEl) {
                                        const times = [10, 15, 20, 25, 30, 40];
                                        const rTime = times[Math.floor(Math.random() * times.length)];
                                        timeEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${rTime} мин`;
                                    }

                                    // Animation effect
                                    card.style.transition = 'none';
                                    card.style.opacity = '0.3';
                                    card.style.transform = 'scale(0.96)';

                                    // Force reflow
                                    void card.offsetWidth;

                                    card.style.transition = 'all 0.4s ease';
                                    card.style.opacity = '1';
                                    card.style.transform = 'scale(1)';
                                }
                            });
                        });
                    }
                });
            });

            // Сохранение ручных настроек
            applySettingsBtn.addEventListener('click', () => {
                closeSettingsModal();
                generatedMenu.style.display = 'block';

                if (gmInfoBox) gmInfoBox.style.display = 'flex';
                if (gmMiniSurveyBlock) gmMiniSurveyBlock.style.display = 'none';

                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Раскрытие/скрытие сетки меню
            if (gmLoadMoreBtn) {
                gmLoadMoreBtn.addEventListener('click', () => {
                    gmWrapper.classList.add('expanded');
                });
            }
            if (gmHideMoreBtn) {
                gmHideMoreBtn.addEventListener('click', () => {
                    gmWrapper.classList.remove('expanded');
                    setTimeout(() => {
                        const targetBox = gmInfoBox.style.display !== 'none' ? gmInfoBox : gmMiniSurveyBlock;
                        if (targetBox) {
                            window.scrollTo({ top: targetBox.offsetTop - 20, behavior: 'smooth' });
                        }
                    }, 100);
                });
            }

            // Взаимодействия с UI настроек

            // Данные для графиков
            const chartData = {
                budget: {
                    title: "БЮДЖЕТ ПО ДНЯМ",
                    totalLabel: "Итого за неделю",
                    totalValue: "5 500 ₽",
                    days: [
                        { day: "ПН", val: 800, max: 1000, type: "cook" },
                        { day: "ВТ", val: 750, max: 1000, type: "ready" },
                        { day: "СР", val: 850, max: 1000, type: "cook" },
                        { day: "ЧТ", val: 700, max: 1000, type: "cook" },
                        { day: "ПТ", val: 800, max: 1000, type: "cook" },
                        { day: "СБ", val: 800, max: 1000, type: "ready" },
                        { day: "ВС", val: 800, max: 1000, type: "cook" },
                    ]
                },
                calories: {
                    title: "КАЛОРИИ ПО ДНЯМ",
                    totalLabel: "В среднем за день",
                    totalValue: "1 286 ккал/день",
                    days: [
                        { day: "ПН", val: 2480, max: 3000, type: "cook" },
                        { day: "ВТ", val: 1080, max: 3000, type: "ready" },
                        { day: "СР", val: 1360, max: 3000, type: "cook" },
                        { day: "ЧТ", val: 1070, max: 3000, type: "cook" },
                        { day: "ПТ", val: 750, max: 3000, type: "cook" },
                        { day: "СБ", val: 960, max: 3000, type: "ready" },
                        { day: "ВС", val: 1300, max: 3000, type: "cook" },
                    ]
                },
                protein: {
                    title: "БЕЛОК ПО ДНЯМ",
                    totalLabel: "В среднем за день",
                    totalValue: "95 г/день",
                    days: [
                        { day: "ПН", val: 110, max: 150, type: "cook" },
                        { day: "ВТ", val: 80, max: 150, type: "ready" },
                        { day: "СР", val: 95, max: 150, type: "cook" },
                        { day: "ЧТ", val: 105, max: 150, type: "cook" },
                        { day: "ПТ", val: 75, max: 150, type: "cook" },
                        { day: "СБ", val: 85, max: 150, type: "ready" },
                        { day: "ВС", val: 120, max: 150, type: "cook" },
                    ]
                },
                time: {
                    title: "ВРЕМЯ ГОТОВКИ",
                    totalLabel: "Итого за неделю",
                    totalValue: "6 ч 15 мин",
                    days: [
                        { day: "ПН", val: 90, max: 120, type: "cook" },
                        { day: "ВТ", val: 0, max: 120, type: "ready" },
                        { day: "СР", val: 60, max: 120, type: "cook" },
                        { day: "ЧТ", val: 45, max: 120, type: "cook" },
                        { day: "ПТ", val: 80, max: 120, type: "cook" },
                        { day: "СБ", val: 0, max: 120, type: "ready" },
                        { day: "ВС", val: 100, max: 120, type: "cook" },
                    ]
                },
                delivery: {
                    title: "СТОИМОСТЬ ДОСТАВКИ",
                    totalLabel: "Итого за неделю",
                    totalValue: "398 ₽",
                    days: [
                        { day: "ПН", val: 0, max: 200, type: "cook" },
                        { day: "ВТ", val: 199, max: 200, type: "ready" },
                        { day: "СР", val: 0, max: 200, type: "cook" },
                        { day: "ЧТ", val: 0, max: 200, type: "cook" },
                        { day: "ПТ", val: 0, max: 200, type: "cook" },
                        { day: "СБ", val: 199, max: 200, type: "ready" },
                        { day: "ВС", val: 0, max: 200, type: "cook" },
                    ]
                }
            };

            const chartContainer = document.getElementById('smChartContainer');
            const chartTitle = document.getElementById('smChartTitle');
            const chartTotalLabel = document.getElementById('smChartTotalLabel');
            const chartTotalValue = document.getElementById('smChartTotalValue');

            function formatRub(value) {
                return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
            }

            function refreshBudgetChartHeights() {
                const budgetData = chartData.budget.days;
                const maxValue = Math.max(1000, ...budgetData.map(day => Number(day.val) || 0));
                const cols = chartContainer.querySelectorAll('.chart_col');

                cols.forEach((col, index) => {
                    const bar = col.querySelector('.chart_bar');
                    if (!bar || !budgetData[index]) return;
                    const height = Math.max(4, Math.min(100, (budgetData[index].val / maxValue) * 100));
                    bar.style.height = `${height}%`;
                });

                const total = budgetData.reduce((sum, day) => sum + (Number(day.val) || 0), 0);
                chartTotalValue.innerText = formatRub(total);
            }

            function renderChart(tabKey) {
                const data = chartData[tabKey];
                if (!data) return;

                chartTitle.innerText = data.title;
                chartTotalLabel.innerText = data.totalLabel;
                chartTotalValue.innerText = tabKey === 'budget'
                    ? formatRub(data.days.reduce((sum, day) => sum + (Number(day.val) || 0), 0))
                    : data.totalValue;

                chartContainer.innerHTML = '';
                const dynamicMax = tabKey === 'budget'
                    ? Math.max(1000, ...data.days.map(day => Number(day.val) || 0))
                    : null;

                data.days.forEach((d, index) => {
                    const col = document.createElement('div');
                    col.className = 'chart_col';

                    const maxValue = dynamicMax || d.max;
                    const heightPercent = Math.max(4, Math.min(100, (d.val / maxValue) * 100));
                    const bgColor = d.type === 'cook' ? '#398829' : '#d9d9d9';

                    let valueHtml = '';
                    if (tabKey === 'budget') {
                        valueHtml = `<input type="number" class="chart_input_budget" value="${d.val}" min="0" step="50" data-index="${index}"><span style="color:#999; font-size:13px; margin-left:2px;">₽</span>`;
                    } else {
                        let textVal = d.val;
                        if (tabKey === 'calories') textVal += ' ккал';
                        if (tabKey === 'protein') textVal += ' г';
                        if (tabKey === 'time') textVal += ' мин';
                        if (tabKey === 'delivery') textVal += ' ₽';
                        valueHtml = `<span class="chart_value_text">${textVal}</span>`;
                    }

                    col.innerHTML = `
                        <div class="chart_bar_wrap">
                            <div class="chart_bar" style="height: ${heightPercent}%; background-color: ${bgColor};"></div>
                        </div>
                        <div class="chart_day">${d.day}</div>
                        <div class="chart_value_wrap">
                            ${valueHtml}
                        </div>
                    `;
                    chartContainer.appendChild(col);
                });

                if (tabKey === 'budget') {
                    chartContainer.querySelectorAll('.chart_input_budget').forEach(input => {
                        input.addEventListener('input', () => {
                            const index = Number(input.dataset.index);
                            chartData.budget.days[index].val = Math.max(0, Number(input.value) || 0);
                            refreshBudgetChartHeights();
                        });
                    });
                }
            }

            const chartTabs = document.querySelectorAll('.chart_tab_btn');
            chartTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    chartTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    renderChart(tab.getAttribute('data-tab'));
                });
            });

            // Initial render
            if (chartContainer) renderChart('budget');

            const simpleBtns = document.querySelectorAll('.sm_simple_btn_js');
            simpleBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const parent = btn.parentElement;
                    parent.querySelectorAll('.sm_simple_btn_js').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const customInput = parent.querySelector('.sm_custom_count input');
                    if (customInput) customInput.value = '';
                });
            });

            document.querySelectorAll('.sm_custom_count input').forEach(input => {
                input.addEventListener('focus', () => {
                    input.closest('.sm_btn_row')?.querySelectorAll('.sm_simple_btn_js').forEach(btn => {
                        btn.classList.remove('active');
                    });
                });
                input.addEventListener('input', () => {
                    if (input.value !== '' && Number(input.value) < Number(input.min)) input.value = input.min;
                    input.closest('.sm_btn_row')?.querySelectorAll('.sm_simple_btn_js').forEach(btn => {
                        btn.classList.remove('active');
                    });
                });
            });

            const dayBtns = document.querySelectorAll('.sm_day_js');
            dayBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.classList.toggle('active');
                });
            });

            const checkBtns = document.querySelectorAll('.sm_check_js');
            checkBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const check = btn.querySelector('.sm_checkbox');
                    check.classList.toggle('checked');
                    if (check.classList.contains('checked')) {
                        check.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    } else {
                        check.innerHTML = '';
                    }
                });
            });

            // Логика выбора карточек (Опрос)
            function updateCuisineContinueState(forceActive = false) {
                const hasSelected = document.querySelectorAll('.cuisine_card.selected').length > 0;
                continueBtn1.classList.toggle('active', forceActive || hasSelected);
            }

            const cuisineSearchInput = document.querySelector('.survey_search_input');
            if (cuisineSearchInput) {
                cuisineSearchInput.addEventListener('input', () => {
                    const query = cuisineSearchInput.value.trim().toLowerCase();
                    cards1.forEach(card => {
                        const title = card.querySelector('.cuisine_card_title')?.innerText.toLowerCase() || '';
                        card.style.display = !query || title.includes(query) ? '' : 'none';
                    });
                });
            }

            let suppressCuisineClick = false;
            cards1.forEach(card => {
                card.addEventListener('click', () => {
                    if (suppressCuisineClick) return;
                    card.classList.toggle('selected');
                    updateCuisineContinueState();
                });
            });

            function setupMobileTinderSurvey() {
                const cuisineGrid = document.getElementById('cuisineGrid');
                if (!cuisineGrid || !window.matchMedia('(max-width: 767px)').matches) return;

                const cards = Array.from(cards1).slice(0, 10);
                let activeIndex = 0;
                let startX = 0;
                let currentX = 0;
                let isDragging = false;
                const counter = document.createElement('div');
                counter.className = 'tinder_counter';
                cuisineGrid.after(counter);
                cuisineGrid.classList.add('tinder_mode');

                function renderActiveCard() {
                    cards.forEach((card, index) => {
                        card.classList.toggle('active', index === activeIndex);
                        card.style.transform = '';
                        card.classList.remove('swipe_like', 'swipe_nope');
                    });

                    const isDone = activeIndex >= cards.length;
                    counter.textContent = isDone ? 'Готово. Можно перейти дальше.' : `${activeIndex + 1}/${cards.length}`;
                    updateCuisineContinueState(isDone);
                }

                function finishSwipe(card, liked) {
                    suppressCuisineClick = true;
                    setTimeout(() => {
                        suppressCuisineClick = false;
                    }, 360);

                    card.classList.toggle('selected', liked);
                    card.classList.add(liked ? 'swipe_like' : 'swipe_nope');
                    card.style.transform = `translateX(${liked ? 120 : -120}%) rotate(${liked ? 12 : -12}deg)`;
                    card.style.opacity = '0';

                    setTimeout(() => {
                        activeIndex++;
                        renderActiveCard();
                    }, 180);
                }

                cards.forEach(card => {
                    card.addEventListener('touchstart', (e) => {
                        if (!card.classList.contains('active')) return;
                        startX = e.touches[0].clientX;
                        currentX = startX;
                        isDragging = true;
                        card.style.transition = 'none';
                    }, { passive: true });

                    card.addEventListener('touchmove', (e) => {
                        if (!isDragging || !card.classList.contains('active')) return;
                        currentX = e.touches[0].clientX;
                        const delta = currentX - startX;
                        card.style.transform = `translateX(${delta}px) rotate(${delta / 18}deg)`;
                        card.classList.toggle('swipe_like', delta > 35);
                        card.classList.toggle('swipe_nope', delta < -35);
                    }, { passive: true });

                    card.addEventListener('touchend', () => {
                        if (!isDragging || !card.classList.contains('active')) return;
                        isDragging = false;
                        card.style.transition = '';
                        const delta = currentX - startX;

                        if (Math.abs(delta) > 90) {
                            finishSwipe(card, delta > 0);
                        } else {
                            card.style.transform = '';
                            card.classList.remove('swipe_like', 'swipe_nope');
                        }
                    });
                });

                renderActiveCard();
            }

            setupMobileTinderSurvey();

            cards2.forEach(card => {
                card.addEventListener('click', () => {
                    card.classList.toggle('selected');
                });
            });

            // --- ЛОГИКА ДОБАВЛЕНИЯ ТЕГОВ В МИНИ-ОПРОСЕ (ШАГ 2) ---
            const customInput = document.querySelector('.custom_exclude_input');
            const addCustomBtn = document.querySelector('.btn_add_custom');
            const customTagsWrap = document.getElementById('customExcludeTags');

            const addTag = (e) => {
                if (e) e.preventDefault();
                const val = customInput.value.trim();
                if (val) {
                    const tag = document.createElement('div');
                    tag.className = 'custom_tag';
                    tag.innerHTML = `
                ${val}
                <div class="custom_tag_remove" style="cursor: pointer; display: flex; align-items: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            `;
                    tag.querySelector('.custom_tag_remove').addEventListener('click', () => tag.remove());
                    customTagsWrap.appendChild(tag);
                    customInput.value = '';
                }
            };

            if (addCustomBtn && customInput) {
                addCustomBtn.addEventListener('click', addTag);
                customInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                    }
                });
            }

            // --- ЛОГИКА ДОБАВЛЕНИЯ ТЕГОВ В НАСТРОЙКАХ (СТОП-ЛИСТ) ---
            const smStopInput = document.querySelector('.sm_stop_input');
            const smStopAddBtn = document.querySelector('.sm_stop_add_btn');
            const smStopTagsWrap = document.querySelector('.sm_stop_tags');
            const smStopHint = document.getElementById('smStopHint');

            function refreshStopListEmptyState() {
                if (!smStopTagsWrap) return;
                const hasTags = smStopTagsWrap.querySelectorAll('.sm_stop_tag').length > 0;
                let emptyState = smStopTagsWrap.querySelector('.sm_stop_empty');

                if (!hasTags && !emptyState) {
                    emptyState = document.createElement('div');
                    emptyState.className = 'sm_stop_empty';
                    emptyState.textContent = 'Стоп-лист пуст';
                    smStopTagsWrap.appendChild(emptyState);
                }

                if (emptyState) emptyState.style.display = hasTags ? 'none' : 'block';
            }

            function showStopHint(message) {
                if (!smStopHint) return;
                smStopHint.textContent = message;
                smStopHint.classList.add('visible');
            }

            const addSmStopTag = (e) => {
                if (e) e.preventDefault();
                const val = smStopInput.value.trim();
                if (!val) {
                    showStopHint('Сначала введите ингредиент, например: кинза, орехи или лактоза.');
                    smStopInput.focus();
                    return;
                }

                const tag = document.createElement('div');
                tag.className = 'sm_stop_tag';
                tag.innerHTML = `${val} <span class="sm_stop_tag_remove" style="cursor: pointer;">✕</span>`;

                tag.querySelector('.sm_stop_tag_remove').addEventListener('click', () => {
                    tag.remove();
                    refreshStopListEmptyState();
                });

                smStopTagsWrap.appendChild(tag);
                smStopInput.value = '';
                if (smStopHint) smStopHint.classList.remove('visible');
                refreshStopListEmptyState();
            };

            if (smStopAddBtn && smStopInput) {
                smStopAddBtn.addEventListener('click', addSmStopTag);
                smStopInput.addEventListener('focus', () => {
                    showStopHint('Введите ингредиент и нажмите «+» или Enter.');
                });
                smStopInput.addEventListener('input', () => {
                    if (smStopHint) smStopHint.classList.toggle('visible', smStopInput.value.trim().length > 0);
                });
                smStopInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addSmStopTag();
                    }
                });
            }

            // Оживляем крестики у тегов, если они были в HTML по умолчанию
            document.querySelectorAll('.sm_stop_tag_remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.target.closest('.sm_stop_tag').remove();
                    refreshStopListEmptyState();
                });
            });
            refreshStopListEmptyState();
            // --- ЛОГИКА КОРЗИНЫ ---
            const slDrawer = document.getElementById('slDrawer');
            const slOverlay = document.getElementById('slOverlay');

            // Слушаем клик на "Собрать корзину"
            document.getElementById('openChecklistBtn').addEventListener('click', () => {
                slOverlay.style.display = 'block';
                setTimeout(() => slDrawer.classList.add('active'), 10);
            });

            // Закрытие списка
            const closeSl = () => {
                slDrawer.classList.remove('active');
                setTimeout(() => slOverlay.style.display = 'none', 300);
            };
            document.getElementById('closeSl').addEventListener('click', closeSl);
            slOverlay.addEventListener('click', closeSl);

            // Клик по товарам (галочки)
            document.querySelectorAll('.sl_item').forEach(item => {
                item.addEventListener('click', () => item.classList.toggle('checked'));
            });

            // Финальная покупка
            document.getElementById('btnFinalBuy').addEventListener('click', function () {
                this.innerText = 'Добавляем...';
                setTimeout(() => {
                    this.innerText = 'Товары в корзине!';
                    this.style.background = '#398829';
                    setTimeout(closeSl, 1000);
                }, 800);
            });
        });
