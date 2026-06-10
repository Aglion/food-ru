document.addEventListener('DOMContentLoaded', () => {

            function makeKbjuHtml(kcal, prot, fat, carb, name, price) {
                return '';
            }

            function makeMealNutritionHtml(kcal, grams, isReadyMeal) {
                const gramsHtml = isReadyMeal && grams ? `<span>${grams} г</span>` : '';
                return `<div class="gm_meal_nutrition" aria-label="Калорийность блюда">
                    <span>${kcal} ккал</span>
                    ${gramsHtml}
                </div>`;
            }

            function syncMealFrontNutrition(card) {
                if (!card) return;
                const info = card.querySelector('.gm_meal_info');
                if (!info) return;
                const existing = info.querySelector('.gm_meal_nutrition');
                if (existing) existing.remove();
            }
            const defaultPrices = [85, 120, 150, 95, 110, 105, 90, 130, 160, 75, 140, 125, 85, 115, 180, 90, 145, 105, 90, 135, 70];
            const defaultKbju = [
                [185, 12, 7, 20], [140, 8, 5, 16], [95, 6, 3, 12], [210, 14, 9, 22], [160, 10, 6, 18],
                [120, 7, 4, 15], [175, 11, 8, 14], [130, 9, 5, 13], [200, 13, 8, 21], [155, 10, 6, 17]
            ];
            const recipeCatalog = Array.isArray(window.recipeCatalog) ? window.recipeCatalog : [];
            const recipesByName = new Map(recipeCatalog.map(recipe => [normalizeRecipeName(recipe.name), recipe]));
            let kbjuIdx = 0;
            const mealSlotLabels = ['ЗАВТРАК', 'ОБЕД', 'УЖИН', 'ПЕРЕКУС', 'ПЕРЕКУС 2', 'ПЕРЕКУС 3'];
            const mealSlotCategories = ['breakfast', 'lunch', 'dinner', 'snack', 'snack', 'snack'];
            const dayFullNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
            const dayIndexesByShortName = {
                'пн': 0,
                'вт': 1,
                'ср': 2,
                'чт': 3,
                'пт': 4,
                'сб': 5,
                'вс': 6
            };

            function getMealSlot(index) {
                const label = mealSlotLabels[index] || `ПРИЁМ ${index + 1}`;
                const category = mealSlotCategories[index] || 'snack';
                return { label, category };
            }

            function initSideNavigation() {
                const navToggle = document.querySelector('.navigationControl_navigationControll__via4b');
                const asideColumn = document.querySelector('#__next > .grid_container__JBmS8 > .grid_row__6w91D > .grid_col_lg_3__m_gG4');
                const categoryButtons = document.querySelectorAll('.categoryHeader_button__nGpLJ');
                const desktopQuery = window.matchMedia('(min-width: 1281px)');
                let overlay = document.querySelector('.food_nav_overlay');
                let closeButton = null;

                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'food_nav_overlay';
                    document.body.appendChild(overlay);
                }

                if (asideColumn) {
                    asideColumn.id = asideColumn.id || 'foodSideNavigation';
                    closeButton = asideColumn.querySelector('.food_nav_close');

                    if (!closeButton) {
                        closeButton = document.createElement('button');
                        closeButton.className = 'food_nav_close';
                        closeButton.type = 'button';
                        closeButton.setAttribute('aria-label', 'Закрыть меню');
                        closeButton.setAttribute('aria-hidden', 'true');
                        closeButton.tabIndex = -1;
                        closeButton.innerHTML = '<span aria-hidden="true">×</span>';
                        asideColumn.prepend(closeButton);
                    }
                }

                function setDrawerOpen(isOpen) {
                    document.body.classList.toggle('food_nav_open', isOpen);
                    if (closeButton) {
                        closeButton.setAttribute('aria-hidden', String(!isOpen));
                        closeButton.tabIndex = isOpen ? 0 : -1;
                    }
                    if (navToggle) {
                        navToggle.setAttribute('aria-expanded', String(isOpen));
                        if (asideColumn) navToggle.setAttribute('aria-controls', asideColumn.id);
                    }
                }

                function setCategoryOpen(button, isOpen) {
                    const targetId = button.getAttribute('aria-controls');
                    const region = targetId ? document.getElementById(targetId) : null;
                    const chevron = button.querySelector('.categoryHeader_chevron__oVH4O');

                    button.setAttribute('aria-expanded', String(isOpen));
                    if (!region) return;

                    region.setAttribute('aria-hidden', String(!isOpen));
                    region.classList.toggle('twoTieredCategory_hidenSubCategoriesWrapper__Z0sym', !isOpen);
                    region.classList.toggle('threeTieredCategory_hidenSubCategoriesWrapper__9XuhU', !isOpen);
                    if (chevron) chevron.classList.toggle('categoryHeader_chevron_opened__HddAx', isOpen);
                }

                categoryButtons.forEach(button => {
                    setCategoryOpen(button, button.getAttribute('aria-expanded') === 'true');
                    button.addEventListener('click', event => {
                        event.preventDefault();
                        const isOpen = button.getAttribute('aria-expanded') === 'true';
                        setCategoryOpen(button, !isOpen);
                    });
                });

                if (navToggle) {
                    navToggle.setAttribute('aria-expanded', 'false');
                    navToggle.addEventListener('click', () => {
                        setDrawerOpen(!document.body.classList.contains('food_nav_open'));
                    });
                }

                if (closeButton) {
                    closeButton.addEventListener('click', () => setDrawerOpen(false));
                }

                overlay.addEventListener('click', () => setDrawerOpen(false));
                document.addEventListener('keydown', event => {
                    if (event.key === 'Escape') setDrawerOpen(false);
                });

                const handleDesktopChange = event => {
                    if (event.matches) setDrawerOpen(false);
                };

                if (desktopQuery.addEventListener) {
                    desktopQuery.addEventListener('change', handleDesktopChange);
                } else if (desktopQuery.addListener) {
                    desktopQuery.addListener(handleDesktopChange);
                }
            }

            initSideNavigation();

            function normalizeRecipeName(value) {
                return String(value || '').trim().toLowerCase();
            }

            function findRecipeByName(name) {
                return recipesByName.get(normalizeRecipeName(name)) || null;
            }

            function normalizeCatalogMealType(mealType) {
                return mealType === 'dessert' ? 'snack' : (mealType || 'snack');
            }

            function getRecipeImagePath(recipe) {
                if (!recipe) return '';
                const image = String(recipe.image || '').trim();
                if (image && !image.startsWith('URL_')) return image;
                return `photos/${recipe.name}.jpeg`;
            }

            function getRecipeTimeText(recipe) {
                return recipe && recipe.cooking_time_min ? `${recipe.cooking_time_min} мин` : '';
            }

            function formatNutritionValue(value) {
                const number = Number(value);
                if (!Number.isFinite(number)) return value || 0;
                return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
            }

            function getRecipeKbju(recipe, fallbackIndex) {
                const fallback = defaultKbju[fallbackIndex % defaultKbju.length];
                if (!recipe) return fallback;
                return [
                    formatNutritionValue(recipe.calories),
                    formatNutritionValue(recipe.protein),
                    formatNutritionValue(recipe.fat),
                    formatNutritionValue(recipe.carbs)
                ];
            }

            function getRecipePrice(recipe, fallbackIndex) {
                return recipe && recipe.price_per_serving ? recipe.price_per_serving : defaultPrices[fallbackIndex % defaultPrices.length];
            }

            function getRecipeIngredients(recipe) {
                if (!recipe || !Array.isArray(recipe.ingredients)) return [];
                return recipe.ingredients.map(ingredient => {
                    if (typeof ingredient === 'string') return ingredient;
                    return `${ingredient.name || ''}${ingredient.amount ? ` ${ingredient.amount}` : ''}`.trim();
                }).filter(Boolean);
            }

            function clockIconSvg(size = 14) {
                return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
            }

            function setRecipeCardData(card, recipe) {
                if (!card || !recipe) return;
                card.dataset.recipeId = String(recipe.id ?? '');
                card.dataset.recipeName = recipe.name || '';
                card.dataset.kcal = formatNutritionValue(recipe.calories);
                card.dataset.prot = formatNutritionValue(recipe.protein);
                card.dataset.fat = formatNutritionValue(recipe.fat);
                card.dataset.carb = formatNutritionValue(recipe.carbs);
                card.dataset.price = String(getRecipePrice(recipe, 0));
            }

            function clearRecipeCardData(card) {
                if (!card) return;
                ['recipeId', 'recipeName', 'kcal', 'prot', 'fat', 'carb', 'price'].forEach(key => delete card.dataset[key]);
            }

            function applyRecipeToCard(card, recipe, options = {}) {
                if (!card || !recipe) return;
                setRecipeCardData(card, recipe);

                const titleEl = card.querySelector('.gm_meal_title');
                if (titleEl && options.updateTitle !== false) titleEl.innerText = recipe.name;

                const timeEl = card.querySelector('.gm_meal_time');
                if (timeEl && options.updateTime !== false) {
                    timeEl.innerHTML = `${clockIconSvg(14)} ${getRecipeTimeText(recipe)}`;
                }

                const image = card.querySelector('.gm_meal_photo');
                if (image && options.updateImage !== false) {
                    image.src = getRecipeImagePath(recipe);
                    image.alt = recipe.name || '';
                }

                const back = card.querySelector('.gm_meal_back');
                if (back && options.updateBack !== false) {
                    const kbju = getRecipeKbju(recipe, 0);
                    const displayName = titleEl ? titleEl.innerText.trim() : recipe.name;
                    back.innerHTML = makeKbjuHtml(kbju[0], kbju[1], kbju[2], kbju[3], displayName, getRecipePrice(recipe, 0));
                }

                syncMealFrontNutrition(card);
            }

            function refreshCardNutrition(card, title, fallbackIndex) {
                const recipe = findRecipeByName(title);
                if (recipe) {
                    applyRecipeToCard(card, recipe, { updateTitle: false });
                    return;
                }

                clearRecipeCardData(card);
                const back = card.querySelector('.gm_meal_back');
                if (back) {
                    const kbju = getRecipeKbju(null, fallbackIndex);
                    const price = getRecipePrice(null, fallbackIndex);
                    card.dataset.kcal = String(kbju[0]);
                    card.dataset.prot = String(kbju[1]);
                    card.dataset.fat = String(kbju[2]);
                    card.dataset.carb = String(kbju[3]);
                    card.dataset.price = String(price);
                    back.innerHTML = makeKbjuHtml(kbju[0], kbju[1], kbju[2], kbju[3], title, price);
                }
                syncMealFrontNutrition(card);
            }

            function getRecipeSearchText(recipe) {
                if (!recipe) return '';
                return [
                    recipe.name,
                    recipe.cuisine,
                    recipe.meal_type,
                    ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
                ].join(' ').toLowerCase();
            }

            function textHasAny(text, keywords) {
                return keywords.some(keyword => text.includes(keyword));
            }

            function recipeHasAny(recipe, keywords) {
                return textHasAny(getRecipeSearchText(recipe), keywords);
            }

            const recipeKeywordGroups = {
                meat: ['кур', 'свин', 'гов', 'бекон', 'ветчин', 'колбас', 'фарш', 'голень', 'филе кур', 'мяс'],
                fish: ['рыб', 'лосос', 'тунец', 'треск', 'горбуш', 'краб', 'кревет', 'морепродукт', 'моллюск', 'мидии', 'ракообраз'],
                dairy: ['молоко', 'сыр', 'слив', 'сметан', 'творог', 'йогурт', 'моцарел', 'пармезан', 'рикотт', 'сулугуни', 'фета'],
                gluten: ['хлеб', 'мука', 'муч', 'паста', 'макарон', 'спагетти', 'фетучини', 'чиабатт', 'тортиль', 'сухар', 'манн', 'лаваш'],
                eggs: ['яйц', 'омлет', 'желток', 'белок'],
                nuts: ['орех', 'арахис', 'миндал', 'кешью', 'песто'],
                spicy: ['чили', 'халапеньо', 'аджик', 'остр', 'кайен'],
                soy: ['соя', 'соев'],
                sesame: ['кунжут'],
                mustard: ['горчиц'],
                celery: ['сельдер'],
                chocolate: ['шоколад', 'какао'],
                caffeine: ['кофе', 'кофеин'],
                honey: ['мёд', 'мед'],
                citrus: ['цитрус', 'лимон', 'лайм', 'апельсин'],
                mushrooms: ['гриб', 'шампиньон'],
                tomatoes: ['томат', 'помидор'],
                pork: ['свин', 'бекон', 'ветчин'],
                chicken: ['кур', 'цыплен'],
                redMeat: ['свин', 'гов', 'бекон', 'ветчин', 'фарш'],
                offal: ['печен', 'печён', 'сердц', 'желуд', 'субпродукт'],
                prepared: ['полуфабрикат', 'готов', 'котлета по-киевски', 'пятёрочка кафе', 'пятерочка кафе'],
                soups: ['суп', 'борщ', 'солянк', 'рассольник', 'щи', 'харчо', 'окрошк'],
                potatoes: ['картоф'],
                buckwheat: ['греч'],
                beetroot: ['свек', 'свёк'],
                pasta: ['макарон', 'паста', 'спагетти', 'фетучини', 'лапш'],
                pepper: ['перец', 'паприк', 'чили'],
                raisins: ['изюм'],
                rice: ['рис'],
                sugar: ['сахар', 'сгущ', 'сироп'],
                legumes: ['боб', 'фасол', 'нут', 'горох', 'чечевиц', 'маш'],
                eggplants: ['баклажан'],
                nightshades: ['томат', 'помидор', 'картоф', 'перец', 'баклажан', 'паприк', 'чили'],
                yeast: ['дрожж'],
                sulfites: ['сульфит', 'диоксид серы'],
                aspartame: ['аспартам'],
                garlic: ['чеснок'],
                onion: ['лук', 'шалот'],
                noCook: ['сэндвич', 'тост', 'салат', 'суфле', 'овсян', 'паштет', 'закуска']
            };

            function getSelectedTexts(selector, titleSelector) {
                return Array.from(document.querySelectorAll(selector))
                    .map(item => (item.querySelector(titleSelector)?.innerText || '').trim())
                    .filter(Boolean);
            }

            function getPlainTagText(tag) {
                const firstTextNode = Array.from(tag.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                return (firstTextNode ? firstTextNode.textContent : tag.textContent)
                    .replace(/[×✕]/g, '')
                    .trim();
            }

            function getStopListTerms() {
                const surveyExcludes = getSelectedTexts('.exclude_card.selected', '.exclude_card_title');
                const customExcludes = Array.from(document.querySelectorAll('.custom_tag')).map(getPlainTagText);
                const settingsExcludes = Array.from(document.querySelectorAll('.sm_stop_tag')).map(getPlainTagText);

                return [...surveyExcludes, ...customExcludes, ...settingsExcludes]
                    .map(term => term.toLowerCase())
                    .filter(term => term && !term.includes('исключения не выбраны'));
            }

            function getSelectedCuisines() {
                return getSelectedTexts('.cuisine_card.selected', '.cuisine_card_title')
                    .map(title => title.toLowerCase());
            }

            function recipeMatchesStopTerm(recipe, term) {
                const text = getRecipeSearchText(recipe);
                if (!term) return false;
                if (term.includes('мясо крас') || term.includes('красное мяс')) return recipeHasAny(recipe, recipeKeywordGroups.redMeat);
                if (term.includes('мясо любое')) return recipeHasAny(recipe, recipeKeywordGroups.meat);
                if (term.includes('свин')) return recipeHasAny(recipe, recipeKeywordGroups.pork);
                if (term.includes('кур')) return recipeHasAny(recipe, recipeKeywordGroups.chicken);
                if (term.includes('творог')) return recipeHasAny(recipe, recipeKeywordGroups.dairy);
                if (term.includes('субпродукт')) return recipeHasAny(recipe, recipeKeywordGroups.offal);
                if (term.includes('полуфабрикат')) return recipeHasAny(recipe, recipeKeywordGroups.prepared);
                if (term.includes('суп')) return recipeHasAny(recipe, recipeKeywordGroups.soups);
                if (term.includes('картоф')) return recipeHasAny(recipe, recipeKeywordGroups.potatoes);
                if (term.includes('греч')) return recipeHasAny(recipe, recipeKeywordGroups.buckwheat);
                if (term.includes('свек') || term.includes('свёк')) return recipeHasAny(recipe, recipeKeywordGroups.beetroot);
                if (term.includes('макарон')) return recipeHasAny(recipe, recipeKeywordGroups.pasta);
                if (term.includes('перец')) return recipeHasAny(recipe, recipeKeywordGroups.pepper);
                if (term.includes('изюм')) return recipeHasAny(recipe, recipeKeywordGroups.raisins);
                if (term.includes('рис')) return recipeHasAny(recipe, recipeKeywordGroups.rice);
                if (term.includes('добавленный сахар') || term.includes('сахар')) return recipeHasAny(recipe, recipeKeywordGroups.sugar);
                if (term.includes('бобов')) return recipeHasAny(recipe, recipeKeywordGroups.legumes);
                if (term.includes('баклаж')) return recipeHasAny(recipe, recipeKeywordGroups.eggplants);
                if (term.includes('паслен') || term.includes('паслён')) return recipeHasAny(recipe, recipeKeywordGroups.nightshades);
                if (term.includes('дрожж')) return recipeHasAny(recipe, recipeKeywordGroups.yeast);
                if (term.includes('сульфит') || term.includes('диоксид серы')) return recipeHasAny(recipe, recipeKeywordGroups.sulfites);
                if (term.includes('аспартам')) return recipeHasAny(recipe, recipeKeywordGroups.aspartame);
                if (term.includes('мяс')) return recipeHasAny(recipe, recipeKeywordGroups.meat);
                if (term.includes('рыб') || term.includes('морепродукт') || term.includes('моллюск') || term.includes('ракообраз')) return recipeHasAny(recipe, recipeKeywordGroups.fish);
                if (term.includes('лакт') || term.includes('молок')) return recipeHasAny(recipe, recipeKeywordGroups.dairy);
                if (term.includes('глют') || term.includes('мук') || term.includes('муч')) return recipeHasAny(recipe, recipeKeywordGroups.gluten);
                if (term.includes('яйц')) return recipeHasAny(recipe, recipeKeywordGroups.eggs);
                if (term.includes('орех') || term.includes('арахис')) return recipeHasAny(recipe, recipeKeywordGroups.nuts);
                if (term.includes('соя') || term.includes('соев')) return recipeHasAny(recipe, recipeKeywordGroups.soy);
                if (term.includes('кунжут')) return recipeHasAny(recipe, recipeKeywordGroups.sesame);
                if (term.includes('горч')) return recipeHasAny(recipe, recipeKeywordGroups.mustard);
                if (term.includes('сельдер')) return recipeHasAny(recipe, recipeKeywordGroups.celery);
                if (term.includes('шокол') || term.includes('какао')) return recipeHasAny(recipe, recipeKeywordGroups.chocolate);
                if (term.includes('коф')) return recipeHasAny(recipe, recipeKeywordGroups.caffeine);
                if (term.includes('мёд') || term.includes('мед')) return recipeHasAny(recipe, recipeKeywordGroups.honey);
                if (term.includes('цитрус')) return recipeHasAny(recipe, recipeKeywordGroups.citrus);
                if (term.includes('гриб')) return recipeHasAny(recipe, recipeKeywordGroups.mushrooms);
                if (term.includes('томат') || term.includes('помид')) return recipeHasAny(recipe, recipeKeywordGroups.tomatoes);
                if (term.includes('чесн')) return recipeHasAny(recipe, recipeKeywordGroups.garlic);
                if (term.includes('лук')) return recipeHasAny(recipe, recipeKeywordGroups.onion);
                if (term.includes('остр')) return recipeHasAny(recipe, recipeKeywordGroups.spicy);
                return text.includes(term);
            }

            function recipePassesStopList(recipe, stopTerms) {
                return !stopTerms.some(term => recipeMatchesStopTerm(recipe, term));
            }

            function getPresetKind(presetName = '') {
                const name = presetName.toLowerCase();
                if (name.includes('спорт')) return 'sport';
                if (name.includes('вегет')) return 'vegetarian';
                if (name.includes('сем')) return 'family';
                if (name.includes('бюдж')) return 'budget';
                if (name.includes('быстр')) return 'fast';
                if (name.includes('вас')) return 'personal';
                return 'balanced';
            }

            function getRecommendationMode() {
                const activeMode = document.querySelector('.sm_recom_btn.active .sm_recom_title')?.innerText.trim().toLowerCase() || '';
                if (activeMode.includes('нов')) return 'new';
                if (activeMode.includes('прив')) return 'familiar';
                return 'mix';
            }

            function scoreRecipe(recipe, category, presetName, context = {}) {
                const presetKind = getPresetKind(presetName);
                const selectedCuisines = context.selectedCuisines || [];
                const recipeCuisine = String(recipe.cuisine || '').toLowerCase();
                const time = Number(recipe.cooking_time_min) || 0;
                const price = Number(recipe.price_per_serving) || 0;
                const calories = Number(recipe.calories) || 0;
                const protein = Number(recipe.protein) || 0;
                const fat = Number(recipe.fat) || 0;
                const carbs = Number(recipe.carbs) || 0;
                const servings = Number(recipe.servings) || 1;
                const text = getRecipeSearchText(recipe);
                const portions = context.portions || 1;
                const dailyBudget = context.dailyBudget || 0;
                const mealBudget = dailyBudget && context.mealsPerDay ? dailyBudget / context.mealsPerDay : 0;
                const recommendationMode = context.recommendationMode || 'mix';

                if (presetKind === 'vegetarian' && (recipeHasAny(recipe, recipeKeywordGroups.meat) || recipeHasAny(recipe, recipeKeywordGroups.fish))) {
                    return -Infinity;
                }

                let score = 100;

                score += selectedCuisines.includes(recipeCuisine) ? (presetKind === 'personal' ? 42 : 18) : 0;
                if (presetKind === 'personal' && selectedCuisines.length && !selectedCuisines.includes(recipeCuisine)) score -= 10;
                if (context.usedNames?.has(recipe.name)) score -= 90;
                score += Math.min(servings, portions + 2) * 3;
                if (servings < portions) score -= (portions - servings) * 8;

                if (context.noCookDay) {
                    score += Math.max(0, 40 - time) * 1.5;
                    if (recipeHasAny(recipe, recipeKeywordGroups.noCook)) score += 28;
                    if (time > 40) score -= 45;
                }

                if (mealBudget) {
                    const totalServingPrice = price * portions;
                    if (totalServingPrice > mealBudget) score -= Math.min(45, (totalServingPrice - mealBudget) / 12);
                    else score += Math.min(18, (mealBudget - totalServingPrice) / 25);
                }

                if (recommendationMode === 'new') {
                    if (!['русская', 'европейская'].includes(recipeCuisine)) score += 14;
                    if (time > 45) score += 4;
                }
                if (recommendationMode === 'familiar') {
                    if (['русская', 'европейская', 'украинская', 'белорусская', 'итальянская'].includes(recipeCuisine)) score += 16;
                    if (time <= 45) score += 8;
                    if (recipeHasAny(recipe, recipeKeywordGroups.spicy)) score -= 12;
                }

                if (presetKind === 'sport') {
                    score += protein * 9;
                    score += protein / Math.max(1, calories) * 180;
                    score -= carbs * 0.7;
                    score -= fat * 0.25;
                    if (protein >= 10) score += 22;
                    if (protein < 6) score -= 45;
                    if (category === 'breakfast' && protein >= 8) score += 26;
                    if (category === 'breakfast' && carbs > 16 && protein < 7) score -= 30;
                    if (category === 'snack' && protein >= 7) score += 10;
                } else if (presetKind === 'fast') {
                    score += Math.max(0, 75 - time) * 1.6;
                    if (time <= 20) score += 35;
                    if (recipeHasAny(recipe, recipeKeywordGroups.noCook)) score += 18;
                } else if (presetKind === 'budget') {
                    score += Math.max(0, 240 - price) * 0.55;
                    score += servings * 5;
                    score -= time * 0.08;
                } else if (presetKind === 'family') {
                    score += servings * 9;
                    if (['русская', 'европейская', 'украинская', 'белорусская', 'итальянская'].includes(recipeCuisine)) score += 25;
                    if (recipeHasAny(recipe, recipeKeywordGroups.spicy)) score -= 30;
                    if (time <= 80) score += 8;
                    if (price <= 190) score += 10;
                } else if (presetKind === 'vegetarian') {
                    score += protein * 4;
                    score += recipeHasAny(recipe, ['овощ', 'свек', 'капуст', 'картоф', 'брокколи', 'кабач', 'шпинат']) ? 28 : 0;
                    score -= price * 0.08;
                } else {
                    score += 30 - Math.abs(calories - 170) * 0.12;
                    score += 18 - Math.abs(protein - 8) * 1.4;
                    score -= Math.max(0, time - 45) * 0.22;
                    score -= Math.max(0, price - 170) * 0.12;
                }

                if (category === 'breakfast' && textHasAny(text, ['омлет', 'тост', 'овсян', 'блины', 'вафли', 'яйц'])) score += 10;
                if (category === 'lunch' && textHasAny(text, ['суп', 'салат', 'тортиль', 'сэндвич'])) score += 10;
                if (category === 'dinner' && textHasAny(text, ['запеч', 'паста', 'куриц', 'свини', 'котлет', 'плов', 'вареники'])) score += 10;
                if (category === 'snack' && textHasAny(text, ['сэндвич', 'тост', 'суфле', 'кекс', 'закуска', 'пирог'])) score += 10;

                return score;
            }

            function getDayBudgetTarget(dayIndex) {
                const day = typeof chartData !== 'undefined' ? chartData.budget.days[dayIndex] : null;
                const value = day ? (Number(day.baseVal) || Number(day.val) || 0) : 0;
                return value * ((typeof settingsState !== 'undefined' ? settingsState.portions : 4) / 4);
            }

            function pickRecipeForSlot(category, presetName, context = {}) {
                if (!recipeCatalog.length) return null;

                const stopTerms = getStopListTerms();
                const normalizedCategory = normalizeCatalogMealType(category);
                const selectedCuisines = getSelectedCuisines();
                const baseCandidates = recipeCatalog.filter(recipe => normalizeCatalogMealType(recipe.meal_type) === normalizedCategory);
                const safeCatalog = recipeCatalog.filter(recipe => recipePassesStopList(recipe, stopTerms));
                let candidates = baseCandidates.filter(recipe => recipePassesStopList(recipe, stopTerms));
                if (!candidates.length) candidates = safeCatalog;
                if (!candidates.length) candidates = baseCandidates;
                if (!candidates.length) candidates = recipeCatalog;

                const unusedCandidates = candidates.filter(recipe => !context.usedNames?.has(recipe.name));
                if (unusedCandidates.length) {
                    candidates = unusedCandidates;
                } else {
                    const unusedSafeCatalog = safeCatalog.filter(recipe => !context.usedNames?.has(recipe.name));
                    if (unusedSafeCatalog.length) candidates = unusedSafeCatalog;
                }

                const scoreContext = {
                    selectedCuisines,
                    recommendationMode: typeof settingsState !== 'undefined' ? settingsState.recommendationMode : getRecommendationMode(),
                    portions: typeof settingsState !== 'undefined' ? settingsState.portions : 4,
                    mealsPerDay: typeof settingsState !== 'undefined' ? settingsState.mealsPerDay : 3,
                    dailyBudget: getDayBudgetTarget(context.dayIndex || 0),
                    noCookDay: Boolean(context.noCookDay),
                    usedNames: context.usedNames
                };

                return candidates
                    .map(recipe => ({ recipe, score: scoreRecipe(recipe, normalizedCategory, presetName, scoreContext) }))
                    .filter(item => Number.isFinite(item.score))
                    .sort((a, b) => b.score - a.score)[0]?.recipe || candidates[0] || null;
            }

            document.querySelectorAll('.gm_meal_card').forEach(card => {
                if (card.querySelector('.gm_meal_card_inner')) {

                    const back = card.querySelector('.gm_meal_back');
                    if (back && !back.querySelector('.kbju_back_row')) {
                        const nameEl = card.querySelector('.gm_meal_title');
                        const mealName = nameEl ? nameEl.textContent.trim() : '';
                        const recipe = findRecipeByName(mealName);
                        const k = card.dataset.kcal || (recipe ? formatNutritionValue(recipe.calories) : defaultKbju[kbjuIdx % defaultKbju.length][0]);
                        const p = card.dataset.prot || (recipe ? formatNutritionValue(recipe.protein) : defaultKbju[kbjuIdx % defaultKbju.length][1]);
                        const f = card.dataset.fat || (recipe ? formatNutritionValue(recipe.fat) : defaultKbju[kbjuIdx % defaultKbju.length][2]);
                        const c = card.dataset.carb || (recipe ? formatNutritionValue(recipe.carbs) : defaultKbju[kbjuIdx % defaultKbju.length][3]);
                        const mealPrice = card.dataset.price || getRecipePrice(recipe, kbjuIdx);
                        back.innerHTML = makeKbjuHtml(k, p, f, c, mealName, mealPrice);
                        if (recipe) applyRecipeToCard(card, recipe, { updateTitle: false });
                        syncMealFrontNutrition(card);
                        kbjuIdx++;
                    }
                    syncMealFrontNutrition(card);
                    return;
                }

                const swap = card.querySelector('.gm_swap_icon');
                const nameEl = card.querySelector('.gm_meal_title');
                const mealName = nameEl ? nameEl.textContent.trim() : '';
                const recipe = findRecipeByName(mealName);
                const mealPrice = card.dataset.price || getRecipePrice(recipe, kbjuIdx);
                const kd = getRecipeKbju(recipe, kbjuIdx);
                kbjuIdx++;
                card.dataset.kcal = String(kd[0]);
                card.dataset.prot = String(kd[1]);
                card.dataset.fat = String(kd[2]);
                card.dataset.carb = String(kd[3]);
                card.dataset.price = String(mealPrice);

                const inner = document.createElement('div');
                inner.className = 'gm_meal_card_inner';

                const front = document.createElement('div');
                front.className = 'gm_meal_front';

                while (card.firstChild) front.appendChild(card.firstChild);

                if (swap) {
                    card.appendChild(swap);
                }

                const back = document.createElement('div');
                back.className = 'gm_meal_back';
                back.innerHTML = makeKbjuHtml(kd[0], kd[1], kd[2], kd[3], mealName, mealPrice);

                inner.appendChild(front);
                inner.appendChild(back);
                card.appendChild(inner);
                if (recipe) applyRecipeToCard(card, recipe, { updateTitle: false });
                syncMealFrontNutrition(card);
            });



            // модальное окно замены или добавления блюда
            const replaceModal = document.getElementById('replaceModal');
            const closeReplaceModal = document.getElementById('closeReplaceModal');
            const replaceSearchInput = document.querySelector('.replace_search_input');
            const replaceListContainer = document.querySelector('.replace_list_container');
            const replaceEmptyState = document.createElement('div');
            replaceEmptyState.className = 'replace_empty_state';
            replaceEmptyState.textContent = 'Ничего не нашли. Попробуйте другой запрос.';
            if (replaceListContainer) replaceListContainer.appendChild(replaceEmptyState);

            let activeActionType = null;
            let activeActionTarget = null;
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

                const col = target.closest('.gm_meal_col');
                const columnCategory = col ? col.getAttribute('data-category') : null;
                activeReplaceCategory = ['breakfast', 'lunch', 'dinner'].includes(columnCategory) ? columnCategory : null;
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

            function renderCatalogReplaceItems() {
                if (!replaceListContainer || !recipeCatalog.length) return;

                const fragment = document.createDocumentFragment();
                recipeCatalog.forEach(recipe => {
                    if (!recipe || !recipe.name) return;

                    const item = document.createElement('div');
                    item.className = 'replace_list_item';
                    item.dataset.category = normalizeCatalogMealType(recipe.meal_type);
                    item.dataset.recipeName = recipe.name;
                    item.innerHTML = `
                        <img src="${escapeHtml(getRecipeImagePath(recipe))}" alt="${escapeHtml(recipe.name)}">
                        <div class="replace_item_info">
                            <div class="replace_item_title">${escapeHtml(recipe.name)}</div>
                            <div class="replace_item_meta">
                                <span class="replace_meta_time">${clockIconSvg(12)} ${escapeHtml(getRecipeTimeText(recipe))}</span>
                                <span class="replace_meta_cuisine">· ${escapeHtml(recipe.cuisine || '')}</span>
                            </div>
                        </div>
                    `;
                    fragment.appendChild(item);
                });

                const firstStaticItem = replaceListContainer.querySelector('.replace_list_item');
                replaceListContainer.insertBefore(fragment, firstStaticItem || replaceEmptyState);
            }

            renderCatalogReplaceItems();

            // Обработчик клика по элементам списка в модальном окне
            document.querySelectorAll('.replace_list_item').forEach(item => {
                item.addEventListener('click', () => {
                    const title = item.querySelector('.replace_item_title').innerText.trim();
                    const recipe = findRecipeByName(item.dataset.recipeName || title);
                    const photo = recipe ? getRecipeImagePath(recipe) : item.querySelector('img').getAttribute('src');
                    const time = recipe ? getRecipeTimeText(recipe) : item.querySelector('.replace_meta_time').innerText.trim();
                    const kbju = getRecipeKbju(recipe, kbjuIdx);
                    const price = getRecipePrice(recipe, kbjuIdx);

                    const newCard = document.createElement('div');
                    newCard.className = 'gm_meal_card';
                    newCard.dataset.kcal = String(kbju[0]);
                    newCard.dataset.prot = String(kbju[1]);
                    newCard.dataset.fat = String(kbju[2]);
                    newCard.dataset.carb = String(kbju[3]);
                    newCard.dataset.price = String(price);
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
                                    kbju[0],
                                    kbju[1],
                                    kbju[2],
                                    kbju[3],
                                    title,
                                    price
                                )}
                            </div>
                        </div>
                    `;
                    if (recipe) applyRecipeToCard(newCard, recipe, { updateTitle: false });
                    syncMealFrontNutrition(newCard);
                    kbjuIdx++;

                    attachDragEvents(newCard);

                    if (activeActionType === 'replace' && activeActionTarget) {
                        activeActionTarget.replaceWith(newCard);
                    } else if (activeActionType === 'add' && activeActionTarget) {
                        activeActionTarget.parentNode.insertBefore(newCard, activeActionTarget);
                    }

                    syncMenuAfterRecipeChange();
                    replaceModal.style.display = 'none';
                });
            });

            // Добавить блюдо
            document.querySelectorAll('.gm_grid_row').forEach((row, dayIndex) => {
                row.dataset.dayIndex = String(dayIndex);
                const children = Array.from(row.children);
                const cards = children.filter(c => c.classList.contains('gm_meal_card'));

                cards.forEach((card, index) => {
                    const col = document.createElement('div');
                    col.className = 'gm_meal_col';
                    col.dataset.mealIndex = String(index);

                    const slot = getMealSlot(index);
                    col.setAttribute('data-category', slot.category);
                    col.setAttribute('data-label', slot.label);

                    row.insertBefore(col, card);
                    col.appendChild(card);

                    const addBtn = document.createElement('button');
                    addBtn.className = 'gm_add_dish_btn';
                    addBtn.innerHTML = '+ Добавить блюдо';
                    addBtn.addEventListener('click', () => openReplaceModal('add', addBtn));
                    col.appendChild(addBtn);
                });
            });

            // Логика перетаскивания карточек (убрали)
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
                    const row = card.closest('.gm_grid_row');
                    card.remove();
                    if (row && !row.querySelector('.gm_meal_card')) {
                        const dayIndex = Number(row.dataset.dayIndex);
                        if (Number.isFinite(dayIndex)) settingsState.menuOffDays.add(dayIndex);
                        setMenuDayOff(row, true, { animate: true });
                    }
                    syncMenuAfterRecipeChange();
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
                        syncMenuAfterRecipeChange();
                    }
                });
            }

            document.querySelectorAll('.gm_meal_card').forEach(attachDragEvents);

            const surveyStep1 = document.querySelector('.survey_step_wrapper');
            const surveyStep2 = document.querySelector('.survey_step_2_wrapper');
            const generatedMenu = document.querySelector('.generated_menu_wrapper');
            const settingsMenu = document.querySelector('.settings_menu_wrapper');
            const profilePage = document.getElementById('profilePage');

            const gmInfoBox = document.getElementById('gmInfoBox');
            const gmMiniSurveyBlock = document.getElementById('gmMiniSurveyBlock');
            const gmSavePrefsBox = document.getElementById('gmSavePrefsBox');

            const backBtn1 = document.getElementById('surveyBackBtn');
            const continueBtn1 = document.getElementById('surveyContinueBtn');
            const backBtn2 = document.getElementById('surveyBackBtn2');
            const finishBtn = document.getElementById('surveyFinishBtn');
            const headerLoginBtn = document.getElementById('headerLoginBtn');
            const headerLogoLink = document.querySelector('.header_logo__5ZQzq');
            const profileLogoutBtn = document.getElementById('profileLogoutBtn');
            const openSettingsBtn = document.getElementById('openSettingsBtn');
            const applySettingsBtn = document.getElementById('applySettingsBtn');
            const closeSettingsBtn = document.getElementById('closeSettingsBtn');
            const openSurveyFromGmBtn = document.getElementById('openSurveyFromGmBtn');
            const retakeSurveyBtn = document.getElementById('retakeSurveyBtn');
            const savePrefsLoginBtn = document.getElementById('savePrefsLoginBtn');
            const savePrefsLaterBtn = document.getElementById('savePrefsLaterBtn');
            const gmLoadMoreBtn = document.getElementById('gmLoadMoreBtn');
            const gmHideMoreBtn = document.getElementById('gmHideMoreBtn');
            const gmWrapper = document.querySelector('.generated_menu_wrapper');
            const gmPresetsWrapper = document.querySelector('.gm_presets_wrapper');

            const cards1 = document.querySelectorAll('.cuisine_card');
            const cards2 = document.querySelectorAll('.exclude_card');
            const preferencesStorageKey = 'food_menu_preferences_v1';
            const profileAuthStorageKey = 'food_profile_logged_in';

            function normalizePreferenceTerm(value) {
                return String(value || '').trim().toLowerCase();
            }

            function uniquePreferenceList(values) {
                const seen = new Set();
                return values
                    .map(value => String(value || '').trim())
                    .filter(value => {
                        const key = normalizePreferenceTerm(value);
                        if (!key || seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
            }

            const legacyDefaultExcludeTerms = new Set(['\u043b\u0430\u043a\u0442\u043e\u0437\u0430']);

            function getNormalizedStoredExcludes(stored) {
                return Array.isArray(stored.excludes)
                    ? stored.excludes.map(normalizePreferenceTerm).filter(Boolean)
                    : [];
            }

            function shouldClearLegacyDefaultExcludes(stored) {
                const excludes = getNormalizedStoredExcludes(stored);
                return !stored.stopListTouched
                    && !stored.legacyDefaultExcludesCleared
                    && excludes.length === 1
                    && legacyDefaultExcludeTerms.has(excludes[0]);
            }

            function migrateStoredPreferences(stored) {
                if (!shouldClearLegacyDefaultExcludes(stored)) return stored;

                return {
                    ...stored,
                    excludes: [],
                    legacyDefaultExcludesCleared: true
                };
            }

            function readStoredPreferences() {
                try {
                    const stored = JSON.parse(localStorage.getItem(preferencesStorageKey) || '{}') || {};
                    const migrated = migrateStoredPreferences(stored);

                    if (migrated !== stored) {
                        localStorage.setItem(preferencesStorageKey, JSON.stringify(migrated));
                    }

                    return migrated;
                } catch (error) {
                    return {};
                }
            }

            function savePreferenceState(overrides = {}) {
                const current = readStoredPreferences();
                const next = {
                    ...current,
                    cuisines: uniquePreferenceList(getSelectedTexts('.cuisine_card.selected', '.cuisine_card_title')),
                    excludes: uniquePreferenceList(getStopListTerms()),
                    stopListTouched: Boolean(current.stopListTouched || overrides.stopListTouched),
                    ...overrides,
                    updatedAt: Date.now()
                };

                try {
                    localStorage.setItem(preferencesStorageKey, JSON.stringify(next));
                } catch (error) {
                }
            }

            function restoreSurveySelectionsFromStorage() {
                const stored = readStoredPreferences();
                const savedCuisines = new Set((stored.cuisines || []).map(normalizePreferenceTerm));
                const savedExcludes = new Set((stored.excludes || []).map(normalizePreferenceTerm));

                cards1.forEach(card => {
                    const title = normalizePreferenceTerm(card.querySelector('.cuisine_card_title')?.innerText);
                    if (savedCuisines.has(title)) card.classList.add('selected');
                });

                cards2.forEach(card => {
                    const title = normalizePreferenceTerm(card.querySelector('.exclude_card_title')?.innerText);
                    if (savedExcludes.has(title)) card.classList.add('selected');
                });
            }

            function syncSurveyExcludesToSettings() {
                const surveyTerms = [
                    ...getSelectedTexts('.exclude_card.selected', '.exclude_card_title'),
                    ...Array.from(document.querySelectorAll('.custom_tag')).map(getPlainTagText)
                ];

                uniquePreferenceList(surveyTerms).forEach(term => {
                    if (typeof addSmStopTag === 'function') {
                        addSmStopTag(term, { silent: true });
                    }
                });
            }

            restoreSurveySelectionsFromStorage();

            const storedPreferencesOnStart = readStoredPreferences();
            const hasCompletedSurveyOnStart = false;

            if (storedPreferencesOnStart.surveyCompleted) {
                try {
                    localStorage.setItem(preferencesStorageKey, JSON.stringify({
                        ...storedPreferencesOnStart,
                        surveyCompleted: false
                    }));
                } catch (error) {
                }
            }

            surveyStep1.style.display = 'none';
            surveyStep2.style.display = 'none';
            settingsMenu.style.display = 'none';

            generatedMenu.style.display = 'block';
            if (gmInfoBox) gmInfoBox.style.display = hasCompletedSurveyOnStart ? 'flex' : 'none';
            if (gmMiniSurveyBlock) gmMiniSurveyBlock.style.display = hasCompletedSurveyOnStart ? 'none' : 'grid';
            if (gmSavePrefsBox) gmSavePrefsBox.style.display = 'none';
            if (profilePage) profilePage.style.display = 'none';

            function openSettingsModal() {
                settingsMenu.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }

            function closeSettingsModal() {
                settingsMenu.style.display = 'none';
                document.body.style.overflow = '';
            }

            function setHeaderLoggedIn(isLoggedIn) {
                if (!headerLoginBtn) return;
                headerLoginBtn.classList.toggle('is_logged_in', isLoggedIn);
                headerLoginBtn.setAttribute('aria-label', isLoggedIn ? 'Открыть личный кабинет' : 'Авторизоваться');
            }

            function showProfilePage() {
                if (!profilePage) return;
                generatedMenu.style.display = 'none';
                surveyStep1.style.display = 'none';
                surveyStep2.style.display = 'none';
                closeSettingsModal();
                profilePage.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            function showMenuPage() {
                if (profilePage) profilePage.style.display = 'none';
                surveyStep1.style.display = 'none';
                surveyStep2.style.display = 'none';
                closeSettingsModal();
                generatedMenu.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            const isProfileLoggedIn = localStorage.getItem(profileAuthStorageKey) === 'true';
            setHeaderLoggedIn(isProfileLoggedIn);
            if (isProfileLoggedIn) showProfilePage();

            function showSavePrefsPrompt() {
                if (gmSavePrefsBox) gmSavePrefsBox.style.display = 'flex';
            }

            function hideSavePrefsPrompt() {
                if (gmSavePrefsBox) gmSavePrefsBox.style.display = 'none';
            }

            function setPresetControlsHidden(hidden) {
                if (generatedMenu) generatedMenu.classList.toggle('presets_hidden', hidden);
                if (gmPresetsWrapper) gmPresetsWrapper.setAttribute('aria-hidden', hidden ? 'true' : 'false');
            }

            setPresetControlsHidden(hasCompletedSurveyOnStart);

            function openSurveyFlow(event) {
                if (event) event.preventDefault();
                generatedMenu.style.display = 'none';
                surveyStep2.style.display = 'none';
                surveyStep1.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            if (openSurveyFromGmBtn) {
                openSurveyFromGmBtn.addEventListener('click', openSurveyFlow);
            }

            if (retakeSurveyBtn) {
                retakeSurveyBtn.addEventListener('click', openSurveyFlow);
            }

            if (headerLogoLink) {
                headerLogoLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    showMenuPage();
                });
            }

            if (profileLogoutBtn) {
                profileLogoutBtn.addEventListener('click', () => {
                    localStorage.removeItem(profileAuthStorageKey);
                    setHeaderLoggedIn(false);
                    showMenuPage();
                });
            }

            backBtn1.addEventListener('click', () => {
                surveyStep1.style.display = 'none';
                generatedMenu.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            continueBtn1.addEventListener('click', () => {
                surveyStep1.style.display = 'none';
                surveyStep2.style.display = 'block';
            });

            backBtn2.addEventListener('click', () => {
                surveyStep2.style.display = 'none';
                surveyStep1.style.display = 'block';
            });

            const x5idAuthWrapper = document.getElementById('x5idAuthWrapper');
            const fakeSubmitBtn = document.getElementById('fake_submit_button');
            const closeX5Button = document.getElementById('close-x5-button');

            function openX5AuthModal() {
                if (!x5idAuthWrapper) return;
                x5idAuthWrapper.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }

            if (headerLoginBtn) {
                headerLoginBtn.addEventListener('click', () => {
                    if (localStorage.getItem(profileAuthStorageKey) === 'true') {
                        showProfilePage();
                        return;
                    }
                    openX5AuthModal();
                });
            }

            if (savePrefsLoginBtn) {
                savePrefsLoginBtn.addEventListener('click', openX5AuthModal);
            }

            if (savePrefsLaterBtn) {
                savePrefsLaterBtn.addEventListener('click', hideSavePrefsPrompt);
            }

            // Кнопка завершения опроса
            finishBtn.addEventListener('click', () => {
                surveyStep2.style.display = 'none';
                syncSurveyExcludesToSettings();
                savePreferenceState({
                    stopListTouched: getStopListTerms().length > 0,
                    surveyCompleted: true
                });

                generatedMenu.style.display = 'block';
                if (x5idAuthWrapper) {
                    x5idAuthWrapper.style.display = 'none';
                }
                document.body.style.overflow = '';

                if (gmInfoBox) gmInfoBox.style.display = 'flex';
                if (gmMiniSurveyBlock) gmMiniSurveyBlock.style.display = 'none';
                showSavePrefsPrompt();

                const forYouPreset = document.getElementById('gmPresetForYou');
                if (forYouPreset) {
                    forYouPreset.style.display = 'flex';
                    forYouPreset.click();
                }
                setPresetControlsHidden(true);

                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            if (closeX5Button) {
                closeX5Button.addEventListener('click', () => {
                    x5idAuthWrapper.style.display = 'none';
                    document.body.style.overflow = '';

                    if (gmInfoBox) gmInfoBox.style.display = 'flex';
                    if (gmMiniSurveyBlock) gmMiniSurveyBlock.style.display = 'none';
                });
            }

            if (fakeSubmitBtn) {
                fakeSubmitBtn.addEventListener('click', (e) => {
                    e.preventDefault();

                    const btnText = fakeSubmitBtn.querySelector('.submit-text');
                    if (btnText) btnText.innerText = 'Проверка...';
                    fakeSubmitBtn.style.opacity = '0.7';

                    setTimeout(() => {
                        if (btnText) btnText.innerText = 'Отправить код';
                        fakeSubmitBtn.style.opacity = '1';

                        x5idAuthWrapper.style.display = 'none';
                        document.body.style.overflow = '';

                        if (gmInfoBox) gmInfoBox.style.display = 'flex';
                        if (gmMiniSurveyBlock) gmMiniSurveyBlock.style.display = 'none';
                        hideSavePrefsPrompt();

                        const forYouPreset = document.getElementById('gmPresetForYou');
                        if (forYouPreset) {
                            forYouPreset.style.display = 'flex';
                            forYouPreset.click();
                        }
                        setPresetControlsHidden(true);
                        localStorage.setItem(profileAuthStorageKey, 'true');
                        setHeaderLoggedIn(true);
                        showProfilePage();
                    }, 1000);
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

            let activePresetName = '';

            function getPresetButtonName(btn) {
                return btn.textContent.replace(/[^\wА-Яа-яЁё -]/g, '').trim();
            }

            function animateRecipeCard(card) {
                card.style.transition = 'none';
                card.style.opacity = '0.3';
                card.style.transform = 'scale(0.96)';
                void card.offsetWidth;
                card.style.transition = 'all 0.4s ease';
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }

            function applyPresetToMenu(presetName, options = {}) {
                activePresetName = presetName || activePresetName || 'Сбалансированное';
                const animate = options.animate !== false;
                const rows = document.querySelectorAll('.gm_grid_row');
                const usedNames = new Set();

                rows.forEach((row, dayIndex) => {
                    const noCookDay = typeof settingsState !== 'undefined' && settingsState.noCookDays.has(dayIndex);

                    row.querySelectorAll('.gm_meal_col').forEach((col, mealIndex) => {
                        if (col.style.display === 'none') return;
                        const card = col.querySelector('.gm_meal_card');
                        if (!card) return;

                        const category = col.getAttribute('data-category') || getMealSlot(mealIndex).category;
                        const recipe = pickRecipeForSlot(category, activePresetName, {
                            dayIndex,
                            mealIndex,
                            noCookDay,
                            usedNames
                        });

                        if (recipe) {
                            applyRecipeToCard(card, recipe);
                            usedNames.add(recipe.name);
                        } else {
                            const fallbackCategories = { breakfast: 'b', lunch: 'l', dinner: 'd', snack: 'b' };
                            const presetData = menuPresets[activePresetName];
                            const fallbackList = presetData?.[fallbackCategories[category] || 'b'] || [];
                            const fallbackTitle = fallbackList[(dayIndex + mealIndex) % Math.max(1, fallbackList.length)];
                            if (fallbackTitle) {
                                card.querySelector('.gm_meal_title').innerText = fallbackTitle;
                                refreshCardNutrition(card, fallbackTitle, (dayIndex * 6) + mealIndex);
                            }
                        }

                        if (animate) animateRecipeCard(card);
                    });
                });
            }

            function applyActivePreset(options = {}) {
                const activeBtn = document.querySelector('.gm_preset_btn.active');
                const presetName = activePresetName || (activeBtn ? getPresetButtonName(activeBtn) : 'Сбалансированное');
                applyPresetToMenu(presetName, options);
            }

            const presetBtns = document.querySelectorAll('.gm_preset_btn');
            presetBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    presetBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    const presetName = getPresetButtonName(btn);
                    applyPresetToMenu(presetName);
                    applyNoCookDaysToMenu();
                    recalculateChartData();
                    updateDayNutritionSummaries();
                    updateMenuSummary();
                    if (chartContainer) renderChart(activeChartTab);
                });
            });

            applySettingsBtn.addEventListener('click', () => {
                closeSettingsModal();
                generatedMenu.style.display = 'block';

                if (gmInfoBox) gmInfoBox.style.display = 'flex';
                if (gmMiniSurveyBlock) gmMiniSurveyBlock.style.display = 'none';
                showSavePrefsPrompt();

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


            // Данные для графиков
            const chartData = {
                budget: {
                    title: "БЮДЖЕТ ПО ДНЯМ",
                    totalLabel: "Итого за неделю",
                    totalValue: "4 250 ₽",
                    days: [
                        { day: "ПН", val: 600, max: 1000, type: "cook" },
                        { day: "ВТ", val: 550, max: 1000, type: "ready" },
                        { day: "СР", val: 650, max: 1000, type: "cook" },
                        { day: "ЧТ", val: 550, max: 1000, type: "cook" },
                        { day: "ПТ", val: 600, max: 1000, type: "cook" },
                        { day: "СБ", val: 650, max: 1000, type: "ready" },
                        { day: "ВС", val: 650, max: 1000, type: "cook" },
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
                }
            };

            const chartContainer = document.getElementById('smChartContainer');
            const chartSection = document.getElementById('smChartSection');
            const chartTitle = document.getElementById('smChartTitle');
            const chartTotalLabel = document.getElementById('smChartTotalLabel');
            const chartTotalValue = document.getElementById('smChartTotalValue');
            const gmBannerSubtitle = document.querySelector('.gm_banner_subtitle');
            const cartBadges = document.querySelectorAll('.fab_cart_badge');
            const finalBuyBtn = document.getElementById('btnFinalBuy');
            const chartKeys = Object.keys(chartData);
            const settingsState = {
                mealsPerDay: 3,
                portions: 4,
                recommendationMode: getRecommendationMode(),
                noCookDays: new Set(
                    chartData.budget.days
                        .map((day, index) => day.type === 'ready' ? index : -1)
                        .filter(index => index >= 0)
                ),
                menuOffDays: new Set()
            };
            let activeChartTab = 'budget';
            const kbjuSettings = {
                calories: 2200,
                protein: 105,
                fat: 75,
                carbs: 275,
                touched: false
            };

            chartKeys.forEach(key => {
                chartData[key].days.forEach(day => {
                    day.baseVal = Number(day.val) || 0;
                });
            });

            function formatRub(value) {
                return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
            }

            function setFinalBuyButtonContent(priceText, labelText = 'ОФОРМИТЬ ЗАКАЗ') {
                if (!finalBuyBtn) return;

                const price = finalBuyBtn.querySelector('.btn_final_price');
                const label = finalBuyBtn.querySelector('.btn_final_label');

                if (price) price.innerText = priceText;
                if (label) label.innerText = labelText;
            }

            function formatMinutes(totalMinutes) {
                const minutes = Math.round(totalMinutes);
                const hours = Math.floor(minutes / 60);
                const rest = minutes % 60;

                if (!hours) return `${rest} мин`;
                return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
            }

            function getChartValueFactor(tabKey) {
                const mealsFactor = settingsState.mealsPerDay / 3;
                const portionsFactor = settingsState.portions / 4;
                return tabKey === 'time' ? mealsFactor : mealsFactor * portionsFactor;
            }

            function getChartTotalText(tabKey, data) {
                const total = data.days.reduce((sum, day) => sum + (Number(day.val) || 0), 0);

                if (tabKey === 'budget') return formatRub(total);
                if (tabKey === 'calories') return `${Math.round(total / data.days.length).toLocaleString('ru-RU')} ккал/день`;
                if (tabKey === 'protein') return `${Math.round(total / data.days.length).toLocaleString('ru-RU')} г/день`;
                if (tabKey === 'time') return formatMinutes(total);

                return data.totalValue;
            }

            function getCaloriesFromMacros(state = kbjuSettings) {
                return (Number(state.protein) || 0) * 4 + (Number(state.fat) || 0) * 9 + (Number(state.carbs) || 0) * 4;
            }

            function formatKbjuValue(value, key) {
                const number = Number(value) || 0;
                if (key === 'calories') return Math.round(number).toLocaleString('ru-RU');
                return number.toFixed(1).replace(/\.0$/, '').replace('.', ',');
            }

            function parseKbjuValue(value) {
                const normalized = String(value ?? '')
                    .replace(/\s/g, '')
                    .replace(',', '.');
                const number = Number(normalized);
                return Number.isFinite(number) ? number : NaN;
            }

            function getAverageMenuKbju() {
                const metrics = getMenuDayMetrics().filter(metric => metric.count > 0);
                if (!metrics.length) return null;

                const totals = metrics.reduce((acc, metric) => {
                    acc.calories += metric.calories;
                    acc.protein += metric.protein;
                    acc.fat += metric.fat;
                    acc.carbs += metric.carbs;
                    return acc;
                }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

                return {
                    calories: totals.calories / metrics.length,
                    protein: totals.protein / metrics.length,
                    fat: totals.fat / metrics.length,
                    carbs: totals.carbs / metrics.length
                };
            }

            function syncKbjuSettingsFromMenu() {
                if (kbjuSettings.touched) return;
                const average = getAverageMenuKbju();
                if (!average) return;

                kbjuSettings.protein = Math.max(40, Math.round(average.protein * 10) / 10);
                kbjuSettings.fat = Math.max(30, Math.round(average.fat * 10) / 10);
                kbjuSettings.carbs = Math.max(80, Math.round(average.carbs * 10) / 10);
                kbjuSettings.calories = Math.round(getCaloriesFromMacros(kbjuSettings));
            }

            function setKbjuSettingValue(key, value) {
                const constraints = {
                    calories: { min: 1200, max: 4500 },
                    protein: { min: 40, max: 240 },
                    fat: { min: 30, max: 220 },
                    carbs: { min: 80, max: 700 }
                };
                const clampMacro = (macroKey, macroValue) => {
                    const macroLimit = constraints[macroKey];
                    return Math.max(macroLimit.min, Math.min(macroLimit.max, Math.round(macroValue * 10) / 10));
                };
                const limit = constraints[key];
                const parsedValue = parseKbjuValue(value);
                const nextValue = Math.max(limit.min, Math.min(limit.max, Number.isFinite(parsedValue) ? parsedValue : limit.min));

                kbjuSettings.touched = true;

                if (key === 'calories') {
                    const currentCalories = getCaloriesFromMacros(kbjuSettings);
                    if (currentCalories > 0) {
                        const scale = nextValue / currentCalories;
                        kbjuSettings.protein = clampMacro('protein', kbjuSettings.protein * scale);
                        kbjuSettings.fat = clampMacro('fat', kbjuSettings.fat * scale);
                        kbjuSettings.carbs = clampMacro('carbs', kbjuSettings.carbs * scale);
                    } else {
                        kbjuSettings.protein = clampMacro('protein', nextValue * 0.25 / 4);
                        kbjuSettings.fat = clampMacro('fat', nextValue * 0.3 / 9);
                        kbjuSettings.carbs = clampMacro('carbs', nextValue * 0.45 / 4);
                    }
                } else {
                    kbjuSettings[key] = clampMacro(key, nextValue);
                }

                kbjuSettings.calories = Math.round(getCaloriesFromMacros(kbjuSettings));
                renderChart('kbju');
            }

            function changeKbjuSettingValue(key, delta) {
                const current = Number(kbjuSettings[key]) || 0;
                setKbjuSettingValue(key, current + delta);
            }

            function recalculateChartData() {
                const menuMetrics = getMenuDayMetrics();

                chartKeys.forEach(key => {
                    const factor = getChartValueFactor(key);
                    chartData[key].days.forEach((day, index) => {
                        const isNoCookDay = settingsState.noCookDays.has(index);
                        const isMenuOffDay = settingsState.menuOffDays.has(index);
                        const menuValue = menuMetrics[index]?.[key];
                        const hasMenuValue = menuMetrics[index]?.count > 0 && Number.isFinite(menuValue);
                        const hasEmptyMenuDay = menuMetrics[index]?.visibleSlots > 0 && menuMetrics[index]?.count === 0;
                        day.type = isNoCookDay || isMenuOffDay ? 'ready' : 'cook';
                        day.val = isMenuOffDay || hasEmptyMenuDay
                            ? 0
                            : key === 'time' && isNoCookDay
                            ? 0
                            : Math.round(hasMenuValue ? menuValue : ((Number(day.baseVal) || 0) * factor));
                    });
                });
            }

            function getVisibleMenuStats() {
                let recipesCount = 0;
                let total = 0;
                let visibleSlots = 0;
                let totalSlots = 0;

                document.querySelectorAll('.gm_grid_row .gm_meal_col').forEach(col => {
                    totalSlots++;
                    if (col.style.display === 'none') return;
                    visibleSlots++;
                    const card = col.querySelector('.gm_meal_card');
                    if (!card) return;

                    const price = Number(card.dataset.price) || 0;
                    recipesCount++;
                    total += price * settingsState.portions;
                });

                return { recipesCount, total, visibleSlots, totalSlots };
            }

            function updateMenuSummary() {
                const mealsFactor = settingsState.mealsPerDay / 3;
                const portionsFactor = settingsState.portions / 4;
                const menuStats = getVisibleMenuStats();
                const hasMenuSlots = menuStats.totalSlots > 0;
                const recipesCount = hasMenuSlots ? menuStats.recipesCount : (7 * settingsState.mealsPerDay);
                const cartTotal = Math.round(hasMenuSlots ? menuStats.total : (4250 * mealsFactor * portionsFactor));

                if (gmBannerSubtitle) {
                    gmBannerSubtitle.innerText = `${recipesCount} рецептов, ~${formatRub(cartTotal)}`;
                }
                cartBadges.forEach((badge) => {
                    badge.innerText = formatRub(cartTotal);
                });
                if (finalBuyBtn) {
                    finalBuyBtn.classList.remove('is_success', 'is_loading');
                    setFinalBuyButtonContent(formatRub(cartTotal));
                }
            }

            function syncMenuAfterRecipeChange() {
                recalculateChartData();
                updateDayNutritionSummaries();
                updateMenuSummary();
                if (chartContainer) renderChart(activeChartTab);

                const activeDrawer = document.getElementById('slDrawer');
                if (activeDrawer?.classList.contains('active')) {
                    renderRecipeCart();
                }
            }

            function parseTimeToMinutes(value) {
                const text = String(value || '').toLowerCase();
                const hours = Number(text.match(/(\d+)\s*ч/)?.[1] || 0);
                const minutes = Number(text.match(/(\d+)\s*мин/)?.[1] || 0);
                if (hours || minutes) return (hours * 60) + minutes;
                return Number(text.match(/\d+/)?.[0] || 0);
            }

            function getMenuDayMetrics() {
                return Array.from(document.querySelectorAll('.gm_grid_row')).map((row, dayIndex) => {
                    const metric = { budget: 0, calories: 0, protein: 0, fat: 0, carbs: 0, time: 0, count: 0, visibleSlots: 0 };
                    row.querySelectorAll('.gm_meal_col').forEach(col => {
                        if (col.style.display === 'none') return;
                        metric.visibleSlots++;
                        const card = col.querySelector('.gm_meal_card');
                        if (!card) return;

                        metric.count++;
                        metric.budget += (Number(card.dataset.price) || 0) * settingsState.portions;
                        metric.calories += (Number(card.dataset.kcal) || 0) * settingsState.portions;
                        metric.protein += (Number(card.dataset.prot) || 0) * settingsState.portions;
                        metric.fat += (Number(card.dataset.fat) || 0) * settingsState.portions;
                        metric.carbs += (Number(card.dataset.carb) || 0) * settingsState.portions;
                        metric.time += parseTimeToMinutes(card.querySelector('.gm_meal_time')?.innerText || '');
                    });

                    if (settingsState.noCookDays.has(dayIndex)) metric.time = 0;
                    return metric;
                });
            }

            function updateDayNutritionSummaries() {
                document.querySelectorAll('.gm_day_nutrition_summary').forEach(summary => summary.remove());
                return;

                const dayMetrics = getMenuDayMetrics();

                document.querySelectorAll('.gm_grid_row').forEach((row, dayIndex) => {
                    const label = row.querySelector('.gm_day_label');
                    if (!label) return;

                    let summary = label.querySelector('.gm_day_nutrition_summary');
                    const metric = dayMetrics[dayIndex];
                    const isOff = settingsState.menuOffDays.has(dayIndex) || row.classList.contains('day_off');

                    if (!metric || isOff || !metric.count) {
                        if (summary) summary.remove();
                        return;
                    }

                    if (!summary) {
                        summary = document.createElement('span');
                        summary.className = 'gm_day_nutrition_summary';
                        label.appendChild(summary);
                    }

                    summary.innerHTML = `
                        <span><b>${Math.round(metric.calories).toLocaleString('ru-RU')}</b> ккал</span>
                        <span>Б ${Math.round(metric.protein)} г</span>
                        <span>Ж ${Math.round(metric.fat)} г</span>
                        <span>У ${Math.round(metric.carbs)} г</span>
                    `;
                });
            }

            const generatedMealPool = {
                breakfast: [
                    { title: 'Йогурт с гранолой', time: '8 мин', photo: 'photos/oatmeal_berries_1777400142009.png' },
                    { title: 'Панкейки с сиропом', time: '20 мин', photo: 'photos/pancakes_syrup_breakfast_1777456550357.png' },
                    { title: 'Сырники', time: '25 мин', photo: 'photos/syrniki_breakfast_1777455437365.png' }
                ],
                lunch: [
                    { title: 'Тыквенный суп', time: '30 мин', photo: 'photos/pumpkin_soup_lunch_1777456536454.png' },
                    { title: 'Тефтели с пюре', time: '35 мин', photo: 'photos/meatballs_puree_lunch_1777456565692.png' },
                    { title: 'Борщ', time: '45 мин', photo: 'photos/borscht_soup_1777455454017.png' }
                ],
                dinner: [
                    { title: 'Стейк лосося', time: '25 мин', photo: 'photos/salmon_steak_dinner_1777456520970.png' },
                    { title: 'Запечённая рыба', time: '30 мин', photo: 'photos/baked_fish_dinner_1777455468531.png' },
                    { title: 'Курица с овощами', time: '35 мин', photo: 'photos/chicken_pasta_1777400175055.png' }
                ],
                snack: [
                    { title: 'Творог с ягодами', time: '5 мин', photo: 'photos/cottage_casserole_1777400189768.png' },
                    { title: 'Готовый боул', time: '0 мин', photo: 'photos/ready_meal_takeaway_1777455593511.png' },
                    { title: 'Суперфуд-перекус', time: '7 мин', photo: 'photos/media__1777401246229.png' }
                ]
            };

            function recipeToGeneratedMeal(recipe) {
                return {
                    title: recipe.name,
                    time: getRecipeTimeText(recipe),
                    photo: getRecipeImagePath(recipe),
                    recipe
                };
            }

            function getGeneratedMealPool(category) {
                const catalogMeals = recipeCatalog
                    .filter(recipe => normalizeCatalogMealType(recipe.meal_type) === category)
                    .map(recipeToGeneratedMeal);
                return catalogMeals.length ? catalogMeals : (generatedMealPool[category] || generatedMealPool.snack);
            }

            function createAddDishButton() {
                const addBtn = document.createElement('button');
                addBtn.className = 'gm_add_dish_btn';
                addBtn.innerHTML = '+ Добавить блюдо';
                addBtn.addEventListener('click', () => openReplaceModal('add', addBtn));
                return addBtn;
            }

            function createGeneratedMealCard(dayIndex, mealIndex) {
                const slot = getMealSlot(mealIndex);
                const pickedRecipe = pickRecipeForSlot(slot.category, activePresetName, {
                    dayIndex,
                    mealIndex,
                    noCookDay: typeof settingsState !== 'undefined' && settingsState.noCookDays.has(dayIndex),
                    usedNames: new Set()
                });
                const pool = getGeneratedMealPool(slot.category);
                const meal = pickedRecipe ? recipeToGeneratedMeal(pickedRecipe) : pool[(dayIndex + mealIndex) % pool.length];
                const recipe = meal.recipe || findRecipeByName(meal.title);
                const kd = getRecipeKbju(recipe, kbjuIdx);
                const price = getRecipePrice(recipe, kbjuIdx);
                kbjuIdx++;

                const card = document.createElement('div');
                card.className = 'gm_meal_card';
                card.dataset.generatedBySettings = 'true';
                card.dataset.kcal = String(kd[0]);
                card.dataset.prot = String(kd[1]);
                card.dataset.fat = String(kd[2]);
                card.dataset.carb = String(kd[3]);
                card.dataset.price = String(price);
                card.innerHTML = `
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
                                <div class="gm_meal_title">${meal.title}</div>
                                <div class="gm_meal_time">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg> ${meal.time}
                                </div>
                            </div>
                            <img src="${meal.photo}" class="gm_meal_photo" alt="">
                        </div>
                        <div class="gm_meal_back">
                            ${makeKbjuHtml(kd[0], kd[1], kd[2], kd[3], meal.title, price)}
                        </div>
                    </div>
                `;
                if (recipe) applyRecipeToCard(card, recipe, { updateTitle: false });
                syncMealFrontNutrition(card);
                attachDragEvents(card);
                return card;
            }

            function ensureMealColumns() {
                const count = settingsState.mealsPerDay;
                const header = document.querySelector('.gm_grid_header');

                if (header) {
                    header.style.setProperty('--meal-count', count);
                    header.innerHTML = `<div></div>${Array.from({ length: count }, (_, index) => `<div>${getMealSlot(index).label}</div>`).join('')}`;
                }

                document.querySelectorAll('.gm_grid_row').forEach((row, dayIndex) => {
                    row.style.setProperty('--meal-count', count);

                    for (let index = 0; index < count; index++) {
                        let col = row.querySelector(`.gm_meal_col[data-meal-index="${index}"]`);
                        const slot = getMealSlot(index);

                        if (!col) {
                            col = document.createElement('div');
                            col.className = 'gm_meal_col';
                            col.dataset.mealIndex = String(index);
                            col.appendChild(createGeneratedMealCard(dayIndex, index));
                            col.appendChild(createAddDishButton());
                            row.appendChild(col);
                        }

                        col.dataset.category = slot.category;
                        col.dataset.label = slot.label;
                        col.style.display = '';
                    }

                    row.querySelectorAll('.gm_meal_col').forEach(col => {
                        const index = Number(col.dataset.mealIndex);
                        if (index >= count) col.style.display = 'none';
                    });
                });
            }

            function applyNoCookDaysToMenu() {
                document.querySelectorAll('.gm_grid_row').forEach((row, dayIndex) => {
                    const isNoCookDay = settingsState.noCookDays.has(dayIndex);
                    row.classList.toggle('no_cook_day', isNoCookDay);
                    row.querySelectorAll('.gm_meal_card').forEach(card => {
                        card.classList.toggle('nocook_card', isNoCookDay);
                        syncMealFrontNutrition(card);
                    });
                });
            }

            function getDayOffButtonSvg(isOff) {
                if (isOff) {
                    return `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M5 12h14"></path>
                            <path d="M12 5v14"></path>
                        </svg>
                    `;
                }

                return `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                `;
            }

            function getRowDayText(row) {
                return row.querySelector('.gm_day_text')?.innerText.trim()
                    || row.querySelector('.gm_day_label')?.innerText.trim()
                    || '';
            }

            function updateDayOffButton(row) {
                const button = row.querySelector('.gm_day_off_btn');
                if (!button) return;

                const isOff = settingsState.menuOffDays.has(Number(row.dataset.dayIndex));
                const day = getRowDayText(row);
                button.innerHTML = getDayOffButtonSvg(isOff);
                button.setAttribute('aria-label', isOff ? `Вернуть рецепты на ${day}` : `Убрать рецепты на ${day}`);
                button.title = isOff ? 'Вернуть рецепты' : 'Убрать день';
            }

            function animateMenuRowHeight(row, updateDom) {
                if (!row || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    updateDom();
                    return;
                }

                const startHeight = row.getBoundingClientRect().height;
                row.style.height = `${startHeight}px`;
                row.style.overflow = 'hidden';
                row.style.transition = 'height 320ms ease, padding 320ms ease, box-shadow 320ms ease';
                row.offsetHeight;

                updateDom();

                const endHeight = row.scrollHeight;
                row.style.height = `${endHeight}px`;

                window.setTimeout(() => {
                    row.style.height = '';
                    row.style.overflow = '';
                    row.style.transition = '';
                }, 340);
            }

            function ensureDayOffControls() {
                document.querySelectorAll('.gm_grid_row').forEach((row, dayIndex) => {
                    row.dataset.dayIndex = String(dayIndex);

                    const label = row.querySelector('.gm_day_label');
                    if (!label) return;

                    if (!label.querySelector('.gm_day_text')) {
                        const dayText = dayFullNames[dayIndex] || label.textContent.trim();
                        label.textContent = '';

                        const text = document.createElement('span');
                        text.className = 'gm_day_text';
                        text.textContent = dayText;
                        label.appendChild(text);
                    } else {
                        const dayText = label.querySelector('.gm_day_text');
                        dayText.textContent = dayFullNames[dayIndex] || dayText.textContent.trim();
                    }

                    if (!label.querySelector('.gm_day_off_btn')) {
                        const button = document.createElement('button');
                        button.className = 'gm_day_off_btn';
                        button.type = 'button';
                        button.addEventListener('click', (event) => {
                            event.stopPropagation();
                            toggleMenuDayOff(row);
                        });
                        label.appendChild(button);
                    }

                    label.querySelector('.gm_scroll_hint_btn')?.remove();
                    let hint = label.querySelector('.gm_scroll_hint_text');
                    const nextDayName = dayFullNames[dayIndex + 1] || '';
                    if (nextDayName) {
                        if (!hint) {
                            hint = document.createElement('span');
                            hint.className = 'gm_scroll_hint_text';
                            label.appendChild(hint);
                        }
                        hint.innerHTML = `
                            <span>${nextDayName}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M5 12h13"></path>
                                <path d="M13 6l6 6-6 6"></path>
                            </svg>
                        `;
                    } else if (hint) {
                        hint.remove();
                    }

                    updateDayOffButton(row);
                });
            }

            function setMenuDayOff(row, isOff, options = {}) {
                const dayIndex = Number(row.dataset.dayIndex);

                const updateDom = () => {
                    row.classList.toggle('day_off', isOff);

                    let note = row.querySelector('.gm_day_off_note');
                    if (isOff) {
                        row.querySelectorAll('.gm_meal_card').forEach(card => card.remove());
                        row.querySelectorAll('.gm_meal_col').forEach(col => {
                            col.style.display = 'none';
                        });

                        if (!note) {
                            note = document.createElement('div');
                            note.className = 'gm_day_off_note';
                            row.appendChild(note);
                        }
                        note.innerHTML = `
                            <div class="gm_day_off_card">
                                <div class="gm_day_off_text">
                                    <strong>День без готовки</strong>
                                    <span>Рецепты на этот день убраны. Можно отдохнуть или вернуть меню одним нажатием.</span>
                                </div>
                                <button class="gm_day_off_restore" type="button">Вернуть рецепты</button>
                            </div>
                        `;
                        note.querySelector('.gm_day_off_restore')?.addEventListener('click', (event) => {
                            event.stopPropagation();
                            settingsState.menuOffDays.delete(dayIndex);
                            setMenuDayOff(row, false, { restoreRecipes: true, animate: true });
                            applyNoCookDaysToMenu();
                            syncMenuAfterRecipeChange();
                        });
                    } else {
                        if (note) note.remove();

                        row.querySelectorAll('.gm_meal_col').forEach(col => {
                            const mealIndex = Number(col.dataset.mealIndex);
                            if (mealIndex >= settingsState.mealsPerDay) return;

                            col.style.display = '';
                            if (options.restoreRecipes && !col.querySelector('.gm_meal_card')) {
                                const addButton = col.querySelector('.gm_add_dish_btn');
                                col.insertBefore(createGeneratedMealCard(dayIndex, mealIndex), addButton || null);
                            }
                        });
                    }

                    updateDayOffButton(row);
                };

                if (options.animate) {
                    animateMenuRowHeight(row, updateDom);
                } else {
                    updateDom();
                }
            }

            function applyMenuOffDaysToRows() {
                ensureDayOffControls();
                document.querySelectorAll('.gm_grid_row').forEach((row, dayIndex) => {
                    setMenuDayOff(row, settingsState.menuOffDays.has(dayIndex), { restoreRecipes: false });
                });
            }

            function toggleMenuDayOff(row) {
                const dayIndex = Number(row.dataset.dayIndex);
                const isOff = settingsState.menuOffDays.has(dayIndex);

                if (isOff) {
                    settingsState.menuOffDays.delete(dayIndex);
                    setMenuDayOff(row, false, { restoreRecipes: true, animate: true });
                    applyNoCookDaysToMenu();
                } else {
                    settingsState.menuOffDays.add(dayIndex);
                    setMenuDayOff(row, true, { animate: true });
                }

                syncMenuAfterRecipeChange();
            }

            function applySettingsToConstructor() {
                ensureMealColumns();
                applyActivePreset({ animate: false });
                applyNoCookDaysToMenu();
                applyMenuOffDaysToRows();
                recalculateChartData();
                updateDayNutritionSummaries();
                updateMenuSummary();
                if (chartContainer) renderChart(activeChartTab);
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
                    bar.style.backgroundColor = budgetData[index].type === 'cook' ? '#398829' : '#d9d9d9';
                });

                const total = budgetData.reduce((sum, day) => sum + (Number(day.val) || 0), 0);
                chartTotalValue.innerText = formatRub(total);
            }

            function renderKbjuSettings() {
                syncKbjuSettingsFromMenu();
                if (!chartContainer) return;

                chartTitle.innerText = 'КБЖУ НА ДЕНЬ';
                chartTotalLabel.innerText = 'Калории';
                chartTotalValue.innerText = `${formatKbjuValue(kbjuSettings.calories, 'calories')} ккал`;
                chartSection?.classList.add('kbju_mode');

                const controls = [
                    { key: 'calories', label: 'Калории', unit: 'ккал', min: 1200, max: Math.max(4500, kbjuSettings.calories + 300), step: 10, delta: 10 },
                    { key: 'carbs', label: 'Углеводы', unit: 'г', min: 80, max: 700, step: 0.1, delta: 1 },
                    { key: 'fat', label: 'Жиры', unit: 'г', min: 30, max: 220, step: 0.1, delta: 1 },
                    { key: 'protein', label: 'Белки', unit: 'г', min: 40, max: 240, step: 0.1, delta: 1 }
                ];

                chartContainer.innerHTML = `
                    <div class="sm_kbju_panel">
                        <div class="sm_kbju_intro">Вы можете изменить либо калории, либо БЖУ. Они связаны по формуле:</div>
                        <div class="sm_kbju_formula">
                            <span>Калории =</span>
                            <strong>(белки × 4) + (жиры × 9) + (углеводы × 4)</strong>
                        </div>
                        <div class="sm_kbju_lines">
                            ${controls.map(control => {
                                const value = Number(kbjuSettings[control.key]) || 0;
                                const percent = Math.max(0, Math.min(100, ((value - control.min) / (control.max - control.min)) * 100));
                                return `
                                    <div class="sm_kbju_line" data-key="${control.key}">
                                        <div class="sm_kbju_line_top">
                                            <span class="sm_kbju_label">${control.label}</span>
                                            <label class="sm_kbju_value">
                                                <input class="sm_kbju_number" type="text" inputmode="decimal" autocomplete="off"
                                                    value="${formatKbjuValue(value, control.key)}"
                                                    aria-label="${control.label}">
                                                <span>${control.unit}</span>
                                                <svg class="sm_kbju_edit_icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                                    <path d="M12 20h9"></path>
                                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                                                </svg>
                                            </label>
                                        </div>
                                        <div class="sm_kbju_control">
                                            <button class="sm_kbju_step" type="button" data-action="minus" aria-label="Уменьшить ${control.label}">−</button>
                                            <input class="sm_kbju_range" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${value}" style="--kbju-progress:${percent}%">
                                            <button class="sm_kbju_step" type="button" data-action="plus" aria-label="Увеличить ${control.label}">+</button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;

                chartContainer.querySelectorAll('.sm_kbju_line').forEach(row => {
                    const key = row.dataset.key;
                    const control = controls.find(item => item.key === key);
                    const range = row.querySelector('.sm_kbju_range');
                    const numberInput = row.querySelector('.sm_kbju_number');

                    const commitNumberInput = () => {
                        if (!numberInput.value.trim()) {
                            numberInput.value = formatKbjuValue(Number(kbjuSettings[key]) || control.min, key);
                            return;
                        }
                        setKbjuSettingValue(key, numberInput.value);
                    };

                    range?.addEventListener('change', () => setKbjuSettingValue(key, range.value));
                    numberInput?.addEventListener('change', commitNumberInput);
                    numberInput?.addEventListener('focus', () => numberInput.select());
                    numberInput?.addEventListener('keydown', (e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        numberInput.blur();
                    });
                    row.querySelector('[data-action="minus"]')?.addEventListener('click', () => changeKbjuSettingValue(key, -control.delta));
                    row.querySelector('[data-action="plus"]')?.addEventListener('click', () => changeKbjuSettingValue(key, control.delta));
                });
            }

            function renderChart(tabKey) {
                if (tabKey === 'kbju') {
                    activeChartTab = 'kbju';
                    renderKbjuSettings();
                    return;
                }

                activeChartTab = chartData[tabKey] ? tabKey : 'budget';
                tabKey = activeChartTab;
                recalculateChartData();

                const data = chartData[tabKey];
                if (!data) return;

                chartSection?.classList.remove('kbju_mode');
                chartTitle.innerText = data.title;
                chartTotalLabel.innerText = data.totalLabel;
                chartTotalValue.innerText = getChartTotalText(tabKey, data);

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
                            const factor = getChartValueFactor('budget');
                            const value = Math.max(0, Number(input.value) || 0);
                            chartData.budget.days[index].baseVal = value / factor;
                            chartData.budget.days[index].val = value;
                            applyActivePreset({ animate: false });
                            recalculateChartData();
                            refreshBudgetChartHeights();
                            updateMenuSummary();
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
                    parent.querySelector('.sm_custom_count')?.classList.remove('active');
                    btn.classList.add('active');
                    const customInput = parent.querySelector('.sm_custom_count input');
                    if (customInput) customInput.value = '';

                    const setting = parent.dataset.setting;
                    const value = Number(btn.dataset.value || btn.textContent.trim());
                    if (btn.classList.contains('sm_recom_btn')) {
                        settingsState.recommendationMode = getRecommendationMode();
                        applySettingsToConstructor();
                        return;
                    }
                    if (setting === 'meals' && value) {
                        settingsState.mealsPerDay = Math.min(12, Math.max(1, value));
                        applySettingsToConstructor();
                    }
                    if (setting === 'portions' && value) {
                        settingsState.portions = Math.min(20, Math.max(1, value));
                        applySettingsToConstructor();
                    }
                });
            });

            function commitCustomSetting(input) {
                const row = input.closest('.sm_btn_row');
                if (!row) return;

                const value = Math.max(Number(input.min) || 1, Math.min(Number(input.max) || 99, Number(input.value) || Number(input.min) || 1));
                input.value = value;

                row.querySelectorAll('.sm_simple_btn_js').forEach(btn => btn.classList.remove('active'));
                row.querySelector('.sm_custom_count')?.classList.add('active');

                if (row.dataset.setting === 'meals') {
                    settingsState.mealsPerDay = value;
                    applySettingsToConstructor();
                }
                if (row.dataset.setting === 'portions') {
                    settingsState.portions = value;
                    applySettingsToConstructor();
                }
            }

            document.querySelectorAll('.sm_custom_count input').forEach(input => {
                input.addEventListener('focus', () => {
                    input.closest('.sm_btn_row')?.querySelectorAll('.sm_simple_btn_js').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    input.closest('.sm_custom_count')?.classList.add('active');
                    if (input.value === '') {
                        input.value = input.placeholder || input.min || '';
                        commitCustomSetting(input);
                    }
                });
                input.addEventListener('input', () => {
                    if (input.value !== '' && Number(input.value) < Number(input.min)) input.value = input.min;
                    input.closest('.sm_btn_row')?.querySelectorAll('.sm_simple_btn_js').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    commitCustomSetting(input);
                });
            });

            const dayBtns = document.querySelectorAll('.sm_day_js');
            function syncNoCookDaysFromButtons() {
                settingsState.noCookDays = new Set();

                dayBtns.forEach((btn, index) => {
                    const dayKey = btn.textContent.trim().toLowerCase();
                    const dayIndex = dayIndexesByShortName[dayKey] ?? index;
                    if (btn.classList.contains('active')) settingsState.noCookDays.add(dayIndex);
                });

                applySettingsToConstructor();
            }

            dayBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.classList.toggle('active');
                    syncNoCookDaysFromButtons();
                });
            });

            syncNoCookDaysFromButtons();

            function syncMealsButtons(value) {
                const mealsRow = document.querySelector('.sm_btn_row[data-setting="meals"]');
                if (!mealsRow) return;
                const customWrap = mealsRow.querySelector('.sm_custom_count');
                const customInput = customWrap?.querySelector('input');
                let matched = false;

                mealsRow.querySelectorAll('.sm_simple_btn_js').forEach(btn => {
                    const isActive = Number(btn.dataset.value) === value;
                    btn.classList.toggle('active', isActive);
                    if (isActive) matched = true;
                });

                if (customWrap && customInput) {
                    customWrap.classList.toggle('active', !matched);
                    customInput.value = matched ? '' : value;
                }
            }

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

                    const withSnacks = check.classList.contains('checked');
                    settingsState.mealsPerDay = withSnacks
                        ? Math.max(settingsState.mealsPerDay, 4)
                        : Math.min(settingsState.mealsPerDay, 3);
                    syncMealsButtons(settingsState.mealsPerDay);
                    applySettingsToConstructor();
                });
            });

            // Логика выбора карточек (опрос)
            function updateCuisineContinueState(forceActive = false) {
                const hasSelected = document.querySelectorAll('.cuisine_card.selected').length > 0;
                continueBtn1.classList.toggle('active', forceActive || hasSelected);
            }
            updateCuisineContinueState();

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
                    savePreferenceState();
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
                    savePreferenceState();
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
                    savePreferenceState({ stopListTouched: true });
                    renderCustomExcludeSuggestions();
                });
            });

            const customInput = document.querySelector('.custom_exclude_input');
            const addCustomBtn = document.querySelector('.btn_add_custom');
            const customTagsWrap = document.getElementById('customExcludeTags');
            const customExcludeSuggestions = document.getElementById('customExcludeSuggestions');

            function addCustomExcludeTag(value, options = {}) {
                const val = String(value || '').trim();
                if (!val || !customTagsWrap) return;

                const exists = Array.from(customTagsWrap.querySelectorAll('.custom_tag'))
                    .some(tag => normalizePreferenceTerm(getPlainTagText(tag)) === normalizePreferenceTerm(val));
                if (exists) return;

                const tag = document.createElement('div');
                tag.className = 'custom_tag';
                tag.innerHTML = `
                ${val}
                <div class="custom_tag_remove" style="cursor: pointer; display: flex; align-items: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            `;
                tag.querySelector('.custom_tag_remove').addEventListener('click', () => {
                    tag.remove();
                    savePreferenceState({ stopListTouched: true });
                    applyActivePreset({ animate: false });
                    renderCustomExcludeSuggestions();
                });
                customTagsWrap.appendChild(tag);
                if (!options.silent) savePreferenceState({ stopListTouched: true });
            }

            const addTag = (e) => {
                if (e) e.preventDefault();
                addCustomExcludeTag(customInput.value);
                customInput.value = '';
                renderCustomExcludeSuggestions();
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

            const surveyExcludePresetTerms = new Set(Array.from(cards2).map(card => normalizePreferenceTerm(card.querySelector('.exclude_card_title')?.innerText)));
            (readStoredPreferences().excludes || [])
                .filter(term => !surveyExcludePresetTerms.has(normalizePreferenceTerm(term)))
                .forEach(term => addCustomExcludeTag(term, { silent: true }));

            const smStopInput = document.querySelector('.sm_stop_input');
            const smStopAddBtn = document.querySelector('.sm_stop_add_btn');
            const smStopTagsWrap = document.querySelector('.sm_stop_tags');
            const smStopHint = document.getElementById('smStopHint');
            const smStopSuggestions = document.getElementById('smStopSuggestions');

            function getIngredientSuggestionName(value) {
                return String(value || '').split(/[—-]/)[0].trim();
            }

            const commonAllergenSuggestions = [
                'Глютен', 'Лактоза', 'Молоко', 'Яйца', 'Орехи', 'Морепродукты',
                'Рыба', 'Мясо', 'Соя', 'Кунжут', 'Горчица', 'Сельдерей',
                'Чеснок', 'Лук', 'Томаты', 'Острое', 'Кофеин', 'Шоколад',
                'Мед', 'Цитрусовые', 'Грибы'
            ];

            const foodExclusionSuggestions = [
                'Творог', 'Субпродукты', 'Полуфабрикаты', 'Супы', 'Мясо красное', 'Мясо любое',
                'Аспартам', 'Диоксид серы (сульфиты)', 'Свинина', 'Картофель', 'Гречка',
                'Помидоры', 'Свекла', 'Курица', 'Макароны', 'Перец', 'Изюм', 'Рис',
                'Продукты с лактозой', 'Добавленный сахар', 'Мучное', 'Арахис',
                'Моллюски', 'Ракообразные', 'Молоко (молочный белок)',
                'Баклажаны', 'Бобовые', 'Дрожжи', 'Пасленовые'
            ];

            const stopSuggestionItems = uniquePreferenceList([
                ...commonAllergenSuggestions,
                ...foodExclusionSuggestions,
                ...recipeCatalog.flatMap(recipe => Array.isArray(recipe.ingredients)
                    ? recipe.ingredients.map(getIngredientSuggestionName)
                    : [])
            ]).sort((a, b) => a.localeCompare(b, 'ru'));

            function getCurrentSurveyExcludeTermsSet() {
                const selectedCards = Array.from(document.querySelectorAll('.exclude_card.selected .exclude_card_title'))
                    .map(item => normalizePreferenceTerm(item.innerText));
                const customTags = Array.from(document.querySelectorAll('.custom_tag'))
                    .map(tag => normalizePreferenceTerm(getPlainTagText(tag)));

                return new Set([...selectedCards, ...customTags].filter(Boolean));
            }

            function renderCustomExcludeSuggestions() {
                if (!customExcludeSuggestions || !customInput) return;

                const query = normalizePreferenceTerm(customInput.value);
                const selectedTerms = getCurrentSurveyExcludeTermsSet();
                const popularLimit = query ? 12 : 10;
                const visibleItems = stopSuggestionItems
                    .filter(item => !selectedTerms.has(normalizePreferenceTerm(item)))
                    .filter(item => !query || normalizePreferenceTerm(item).includes(query))
                    .slice(0, popularLimit);

                customExcludeSuggestions.innerHTML = visibleItems.map(item => (
                    `<button class="custom_exclude_suggestion" type="button" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`
                )).join('');
                customExcludeSuggestions.classList.toggle('visible', visibleItems.length > 0);

                customExcludeSuggestions.querySelectorAll('.custom_exclude_suggestion').forEach(btn => {
                    btn.addEventListener('click', () => {
                        addCustomExcludeTag(btn.dataset.value);
                        customInput.value = '';
                        customInput.focus();
                        renderCustomExcludeSuggestions();
                    });
                });
            }

            if (customInput && customExcludeSuggestions) {
                customInput.addEventListener('focus', renderCustomExcludeSuggestions);
                customInput.addEventListener('input', renderCustomExcludeSuggestions);
                customInput.addEventListener('blur', () => {
                    setTimeout(() => customExcludeSuggestions.classList.remove('visible'), 120);
                });
            }

            function getCurrentStopTermsSet() {
                return new Set(Array.from(document.querySelectorAll('.sm_stop_tag')).map(tag => normalizePreferenceTerm(getPlainTagText(tag))));
            }

            function renderStopSuggestions() {
                if (!smStopSuggestions || !smStopInput) return;

                const query = normalizePreferenceTerm(smStopInput.value);
                const selectedTerms = getCurrentStopTermsSet();
                const popularLimit = query ? 12 : 10;
                const visibleItems = stopSuggestionItems
                    .filter(item => !selectedTerms.has(normalizePreferenceTerm(item)))
                    .filter(item => !query || normalizePreferenceTerm(item).includes(query))
                    .slice(0, popularLimit);

                smStopSuggestions.innerHTML = visibleItems.map(item => (
                    `<button class="sm_stop_suggestion" type="button" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`
                )).join('');
                smStopSuggestions.classList.toggle('visible', visibleItems.length > 0);

                smStopSuggestions.querySelectorAll('.sm_stop_suggestion').forEach(btn => {
                    btn.addEventListener('click', () => {
                        addSmStopTag(btn.dataset.value);
                        smStopInput.focus();
                        renderStopSuggestions();
                    });
                });
            }

            function refreshStopListEmptyState() {
                if (!smStopTagsWrap) return;
                const hasTags = smStopTagsWrap.querySelectorAll('.sm_stop_tag').length > 0;
                let emptyState = smStopTagsWrap.querySelector('.sm_stop_empty');

                if (!hasTags && !emptyState) {
                    emptyState = document.createElement('div');
                    emptyState.className = 'sm_stop_empty';
                    emptyState.textContent = 'Исключения не выбраны';
                    smStopTagsWrap.appendChild(emptyState);
                }

                if (emptyState) emptyState.style.display = hasTags ? 'none' : 'block';
            }

            function showStopHint(message) {
                if (!smStopHint) return;
                smStopHint.textContent = message;
                smStopHint.classList.add('visible');
            }

            function addSmStopTag(valueOrEvent, options = {}) {
                if (valueOrEvent && typeof valueOrEvent.preventDefault === 'function') valueOrEvent.preventDefault();
                const val = typeof valueOrEvent === 'string'
                    ? valueOrEvent.trim()
                    : smStopInput.value.trim();
                if (!val) {
                    showStopHint('Сначала введите продукт, например: свинина, грибы или лук.');
                    smStopInput.focus();
                    return;
                }

                const exists = Array.from(smStopTagsWrap.querySelectorAll('.sm_stop_tag'))
                    .some(tag => normalizePreferenceTerm(getPlainTagText(tag)) === normalizePreferenceTerm(val));
                if (exists) {
                    smStopInput.value = '';
                    renderStopSuggestions();
                    return;
                }

                const tag = document.createElement('div');
                tag.className = 'sm_stop_tag';
                tag.innerHTML = `${escapeHtml(val)} <span class="sm_stop_tag_remove" style="cursor: pointer;">✕</span>`;

                tag.querySelector('.sm_stop_tag_remove').addEventListener('click', () => {
                    tag.remove();
                    refreshStopListEmptyState();
                    savePreferenceState({ stopListTouched: true });
                    renderStopSuggestions();
                    applySettingsToConstructor();
                });

                smStopTagsWrap.appendChild(tag);
                smStopInput.value = '';
                if (smStopHint) smStopHint.classList.remove('visible');
                refreshStopListEmptyState();
                if (!options.silent) savePreferenceState({ stopListTouched: true });
                renderStopSuggestions();
                applySettingsToConstructor();
            }

            if (smStopAddBtn && smStopInput) {
                smStopAddBtn.addEventListener('click', addSmStopTag);
                smStopInput.addEventListener('focus', () => {
                    showStopHint('Введите продукт и нажмите «+» или Enter.');
                    renderStopSuggestions();
                });
                smStopInput.addEventListener('input', () => {
                    if (smStopHint) smStopHint.classList.toggle('visible', smStopInput.value.trim().length > 0);
                    renderStopSuggestions();
                });
                smStopInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addSmStopTag();
                    }
                });
            }

            (readStoredPreferences().excludes || []).forEach(term => addSmStopTag(term, { silent: true }));

            document.querySelectorAll('.sm_stop_tag_remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.target.closest('.sm_stop_tag').remove();
                    refreshStopListEmptyState();
                    savePreferenceState({ stopListTouched: true });
                    renderStopSuggestions();
                    applySettingsToConstructor();
                });
            });
            refreshStopListEmptyState();
            renderStopSuggestions();
            // логика корзины
            const slDrawer = document.getElementById('slDrawer');
            const slOverlay = document.getElementById('slOverlay');
            const slContent = document.getElementById('slContent') || document.querySelector('.sl_content');

            const recipeIngredients = {
                'Овсянка с ягодами': ['Овсяные хлопья 80 г', 'Молоко 200 мл', 'Ягоды 70 г', 'Мёд 1 ч. л.'],
                'Куриный суп с лапшой': ['Куриное филе 180 г', 'Лапша 60 г', 'Морковь 1 шт', 'Лук 1 шт', 'Зелень'],
                'Паста с курицей': ['Паста 90 г', 'Куриное филе 160 г', 'Сливки 80 мл', 'Сыр 30 г'],
                'Творожная запеканка': ['Творог 200 г', 'Яйцо 1 шт', 'Манка 25 г', 'Сметана 30 г'],
                'Гречка с грибами': ['Гречка 90 г', 'Шампиньоны 160 г', 'Лук 1 шт', 'Масло 1 ст. л.'],
                'Котлета по-киевски с пюре': ['Котлета по-киевски 1 шт', 'Картофельное пюре 180 г', 'Соус 30 г'],
                'Сырники': ['Творог 200 г', 'Яйцо 1 шт', 'Мука 35 г', 'Сметана 40 г'],
                'Борщ': ['Говядина 150 г', 'Свёкла 1 шт', 'Капуста 120 г', 'Картофель 2 шт', 'Сметана'],
                'Запечённая рыба': ['Филе рыбы 180 г', 'Лимон 1/4 шт', 'Овощи 180 г', 'Зелень'],
                'Рисовая каша': ['Рис 80 г', 'Молоко 220 мл', 'Сливочное масло 10 г', 'Сахар'],
                'Тефтели с пюре': ['Фарш 180 г', 'Рис 35 г', 'Картофель 250 г', 'Сливки 60 мл'],
                'Салат Цезарь': ['Куриное филе 150 г', 'Салат романо 80 г', 'Сухарики 30 г', 'Соус цезарь', 'Пармезан'],
                'Яичница с беконом': ['Яйца 2 шт', 'Бекон 60 г', 'Помидоры 80 г', 'Зелень'],
                'Тыквенный суп': ['Тыква 250 г', 'Сливки 80 мл', 'Лук 1 шт', 'Сухарики'],
                'Стейк лосося': ['Лосось 180 г', 'Лимон 1/4 шт', 'Рис 80 г', 'Брокколи 120 г'],
                'Панкейки': ['Мука 100 г', 'Яйцо 1 шт', 'Молоко 150 мл', 'Сироп 30 мл'],
                'Лазанья': ['Листы лазаньи 80 г', 'Фарш 180 г', 'Томатный соус 120 г', 'Сыр 50 г'],
                'Курица с овощами': ['Куриное филе 180 г', 'Брокколи 100 г', 'Перец 80 г', 'Рис 70 г'],
                'Творог с медом': ['Творог 180 г', 'Мёд 20 г', 'Орехи 20 г'],
                'Йогурт с гранолой': ['Йогурт 180 г', 'Гранола 50 г', 'Ягоды 60 г'],
                'Творог с ягодами': ['Творог 180 г', 'Ягоды 70 г', 'Мёд 15 г'],
                'Готовый боул': ['Готовый боул 1 шт', 'Соус 1 порция'],
                'Суперфуд-перекус': ['Йогурт 120 г', 'Орехи 25 г', 'Семена 10 г', 'Фрукты 80 г']
            };

            function escapeHtml(value) {
                return String(value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }

            function inferIngredients(title, category, isReadyMeal) {
                const catalogRecipe = findRecipeByName(title);
                if (catalogRecipe) return getRecipeIngredients(catalogRecipe);
                if (recipeIngredients[title]) return recipeIngredients[title];
                if (isReadyMeal) return [`${title} 1 порция`, 'Соус/гарнир по рецепту'];

                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('суп') || lowerTitle.includes('борщ')) {
                    return ['Бульон 300 мл', 'Овощи 200 г', 'Зелень', 'Специи'];
                }
                if (lowerTitle.includes('каша') || lowerTitle.includes('овсян')) {
                    return ['Крупа 80 г', 'Молоко 200 мл', 'Сливочное масло 10 г'];
                }
                if (lowerTitle.includes('салат')) {
                    return ['Салатная смесь 120 г', 'Белковая основа 120 г', 'Соус 40 г'];
                }
                if (lowerTitle.includes('паста') || lowerTitle.includes('макарон') || lowerTitle.includes('лазан')) {
                    return ['Паста 90 г', 'Соус 120 г', 'Сыр 30 г', 'Белковая основа 150 г'];
                }
                if (category === 'breakfast') return ['Основной продукт 180 г', 'Молочный продукт 150 г', 'Топпинг 40 г'];
                if (category === 'snack') return ['Перекус 1 порция', 'Фрукты/ягоды 80 г'];
                return ['Белковая основа 180 г', 'Гарнир 120 г', 'Овощи 150 г'];
            }

            function getVisibleMenuRecipes() {
                const recipes = [];

                document.querySelectorAll('.gm_grid_row').forEach(row => {
                    const day = row.querySelector('.gm_day_text')?.innerText.trim()
                        || row.querySelector('.gm_day_label')?.innerText.trim()
                        || '';

                    row.querySelectorAll('.gm_meal_col').forEach((col, colIndex) => {
                        if (col.style.display === 'none') return;

                        const card = col.querySelector('.gm_meal_card');
                        const title = card?.querySelector('.gm_meal_title')?.innerText.trim();
                        if (!card || !title) return;
                        const recipeLookupName = card.dataset.recipeName || title;

                        const category = col.getAttribute('data-category') || '';
                        const label = col.getAttribute('data-label') || getMealSlot(colIndex).label;
                        const time = card.querySelector('.gm_meal_time')?.innerText.trim() || card.querySelector('.gm_meal_subtitle')?.innerText.trim() || '';
                        const isReadyMeal = card.classList.contains('nocook_card') || row.classList.contains('no_cook_day');

                        recipes.push({
                            title,
                            day,
                            label,
                            time,
                            category,
                            isReadyMeal,
                            ingredients: inferIngredients(recipeLookupName, category, isReadyMeal)
                        });
                    });
                });

                return recipes;
            }

            function renderRecipeCart() {
                if (!slContent) return;

                const recipes = getVisibleMenuRecipes();
                if (recipes.length === 0) {
                    slContent.innerHTML = '<div class="sl_empty">В меню пока нет рецептов для корзины.</div>';
                    return;
                }

                slContent.innerHTML = recipes.map((recipe, index) => `
                    <section class="sl_recipe_group">
                        <div class="sl_recipe_head">
                            <div class="sl_recipe_text">
                                <div class="sl_recipe_meta">${escapeHtml(recipe.day)} · ${escapeHtml(recipe.label.toLowerCase())}${recipe.time ? ` · ${escapeHtml(recipe.time)}` : ''}</div>
                                <div class="sl_recipe_title">${escapeHtml(recipe.title)}</div>
                            </div>
                            <div class="sl_recipe_actions">
                                <button class="sl_recipe_toggle" type="button" aria-label="Свернуть рецепт" aria-expanded="true">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="m6 9 6 6 6-6"></path>
                                    </svg>
                                </button>
                                <div class="sl_recipe_count">${recipe.ingredients.length}</div>
                            </div>
                        </div>
                        <div class="sl_recipe_items">
                            ${recipe.ingredients.map((ingredient, ingredientIndex) => `
                                <div class="sl_item checked" data-recipe-index="${index}" data-ingredient-index="${ingredientIndex}">
                                    <div class="sl_checkbox"></div>
                                    <div>
                                        <div class="sl_item_name">${escapeHtml(ingredient)}</div>
                                        <div class="sl_item_desc">${escapeHtml(recipe.title)}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                `).join('');
            }

            function openChecklist() {
                if (finalBuyBtn) {
                    updateMenuSummary();
                }
                renderRecipeCart();
                slOverlay.style.display = 'block';
                setTimeout(() => slDrawer.classList.add('active'), 10);
            }

            document.querySelectorAll('#openChecklistBtn').forEach((button) => {
                button.addEventListener('click', openChecklist);
            });

            // Закрытие списка
            const closeSl = () => {
                slDrawer.classList.remove('active');
                setTimeout(() => slOverlay.style.display = 'none', 300);
            };
            document.getElementById('closeSl').addEventListener('click', closeSl);
            slOverlay.addEventListener('click', closeSl);

            // Клик по товарам (галочки)
            slContent.addEventListener('click', (e) => {
                const toggle = e.target.closest('.sl_recipe_toggle');
                if (toggle) {
                    const group = toggle.closest('.sl_recipe_group');
                    if (!group) return;
                    const isCollapsed = group.classList.toggle('collapsed');
                    toggle.setAttribute('aria-expanded', String(!isCollapsed));
                    toggle.setAttribute('aria-label', isCollapsed ? 'Развернуть рецепт' : 'Свернуть рецепт');
                    return;
                }

                const item = e.target.closest('.sl_item');
                if (!item) return;
                item.classList.toggle('checked');
            });

            document.getElementById('btnFinalBuy').addEventListener('click', function () {
                const priceText = this.querySelector('.btn_final_price')?.innerText || '';
                this.classList.remove('is_success');
                this.classList.add('is_loading');
                setFinalBuyButtonContent(priceText, 'ОФОРМЛЯЕМ...');
                setTimeout(() => {
                    this.classList.remove('is_loading');
                    this.classList.add('is_success');
                    setFinalBuyButtonContent(priceText, 'ЗАКАЗ ОФОРМЛЕН');
                    setTimeout(() => {
                        closeSl();
                        this.classList.remove('is_success');
                        setFinalBuyButtonContent(priceText);
                    }, 1000);
                }, 800);
            });

            // навигация по дням стрелками
            const gridWrapper = document.querySelector('.gm_grid_wrapper');
            const gridPrev = document.getElementById('gmGridPrev');
            const gridPrevNext = document.getElementById('gmGridNext');
            if (gridWrapper && gridPrev && gridPrevNext) {
                const getStep = () => {
                    const row = gridWrapper.querySelector('.gm_grid_row');
                    if (!row) return gridWrapper.clientWidth;
                    const rect = row.getBoundingClientRect();
                    const gap = parseFloat(getComputedStyle(gridWrapper).gap) || 0;
                    return rect.width + gap;
                };
                const updateNavState = () => {
                    const max = gridWrapper.scrollWidth - gridWrapper.clientWidth;
                    gridPrev.disabled = gridWrapper.scrollLeft <= 4;
                    gridPrevNext.disabled = gridWrapper.scrollLeft >= max - 4;
                };
                gridPrev.addEventListener('click', () => {
                    gridWrapper.scrollBy({ left: -getStep(), behavior: 'smooth' });
                });
                gridPrevNext.addEventListener('click', () => {
                    gridWrapper.scrollBy({ left: getStep(), behavior: 'smooth' });
                });
                gridWrapper.addEventListener('scroll', updateNavState, { passive: true });
                window.addEventListener('resize', updateNavState);
                updateNavState();
            }
        });
