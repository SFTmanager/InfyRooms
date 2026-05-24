// Старт ТГ WebApp
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// Экраны
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const resultOverlay = document.getElementById('result-overlay');

// Элементы управления
const btnPlay = document.getElementById('btn-play');
const btnCashout = document.getElementById('btn-cashout');
const btnContinue = document.getElementById('btn-continue');
const doors = document.querySelectorAll('.door');

// Элементы аккаунта в меню
const accLvlEl = document.getElementById('account-lvl');
const accXpEl = document.getElementById('account-xp');
const accGoldEl = document.getElementById('account-gold');
const accGemsEl = document.getElementById('account-gems');
const accEventEl = document.getElementById('account-event');

// Элементы рейда на игровом экране
const energyEl = document.getElementById('energy-val');
const roomEl = document.getElementById('room-step');
const lootSummaryEl = document.getElementById('loot-summary');
const resultEmoji = document.getElementById('result-emoji');
const resultText = document.getElementById('result-text');

// ==========================================
// ГЛОБАЛЬНЫЙ ПРОФИЛЬ ИГРОКА (ДАННЫЕ)
// ==========================================
let userAccount = {
    lvl: 1,
    xp: 0,
    gold: 0,
    gems: 0,
    eventChips: 0, // Ивентовая херня
    energy: 7
};

// ТЕКУЩИЙ РЮКЗАК РЕЙДА
let currentRucksack = {
    xp: 0,
    gold: 0,
    gems: 0,
    eventChips: 0
};

let roomStep = 1;
let isDeadInThisRoom = false;
let canClickDoor = true;

// ==========================================
// ТAБЛИЦА ДРОПА (РАСПРЕДЕЛЕНИЕ ШAНСОВ)
// ==========================================
function getRoomReward() {
    const chance = Math.random();
    // Базовый множитель наград от номера комнаты
    const multiplier = 1 + (roomStep * 0.15); 
    
    // Каждая комната гарантированно дает немного опыта (ХР)
    const xpGained = Math.floor((Math.random() * 10 + 5) * multiplier);

    if (chance < 0.60) {
        // 60% — Золото
        const goldGained = Math.floor((Math.random() * 80 + 40) * multiplier);
        return { type: 'gold', amount: goldGained, xp: xpGained, emoji: '💰', name: 'Монеты' };
    } else if (chance < 0.85) {
        // 25% — Кристаллы
        const gemsGained = Math.floor((Math.random() * 2 + 1) * multiplier);
        return { type: 'gems', amount: gemsGained, xp: xpGained, emoji: '💎', name: 'Кристаллы' };
    } else {
        // 15% — Ивентовая херня (Секретный чип)
        const eventGained = 1;
        return { type: 'eventChips', amount: eventGained, xp: xpGained, emoji: '👾', name: 'Чип Ивента' };
    }
}

// Расчет уровней на основе XP (Каждый уровень требует на 300 XP больше)
function checkLevelUp() {
    let xpNeeded = userAccount.lvl * 300;
    while (userAccount.xp >= xpNeeded) {
        userAccount.xp -= xpNeeded;
        userAccount.lvl++;
        xpNeeded = userAccount.lvl * 300;
        alert(`🎉 СУПЕР! Ты повысил свой уровень! Теперь твой уровень: ${userAccount.lvl}`);
    }
}

// ==========================================
// ИГРОВОЙ ЦИКЛ
// ==========================================

// Клик по кнопке играть
btnPlay.addEventListener('click', () => {
    if (userAccount.energy <= 0) {
        alert("Недостаточно энергии! ⚡ Попытки восстанавливаются автоматически.");
        return;
    }

    userAccount.energy--;
    
    // Очищаем рюкзак
    currentRucksack.xp = 0;
    currentRucksack.gold = 0;
    currentRucksack.gems = 0;
    currentRucksack.eventChips = 0;
    roomStep = 1;

    saveData();
    updateUI();
    resetDoors();

    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
});

// Выбор двери (1/3 шанс подорваться)
doors.forEach(door => {
    door.addEventListener('click', () => {
        if (!canClickDoor) return;
        canClickDoor = false;

        const deathDoor = Math.floor(Math.random() * 3);
        const clickedId = parseInt(door.getAttribute('data-id'));

        // Анимация раскрытия двери
        door.style.transform = "scale(0.85) rotateY(90deg)";
        door.style.transition = "transform 0.25s ease";

        setTimeout(() => {
            if (clickedId === deathDoor) {
                // СМЕРТЬ: Весь рюкзак сгорает
                isDeadInThisRoom = true;
                currentRucksack.xp = 0;
                currentRucksack.gold = 0;
                currentRucksack.gems = 0;
                currentRucksack.eventChips = 0;

                door.innerText = '💥';
                resultEmoji.innerText = '💀';
                resultText.innerText = `МИНА! Ты взорвался в комнате №${roomStep}.\nВсе собранные ресурсы уничтожены!`;
                btnContinue.innerText = "В МЕНЮ";
            } else {
                // ВЫЖИЛ: Начисляем лут в рюкзак
                isDeadInThisRoom = false;
                const reward = getRoomReward();

                currentRucksack.xp += reward.xp;
                currentRucksack[reward.type] += reward.amount;
                roomStep++;

                door.innerText = reward.emoji;
                resultEmoji.innerText = reward.emoji;
                resultText.innerText = `БЕЗОПАСНО!\nТы нашел: +${reward.amount} ${reward.name}\nБонус опыта: +${reward.xp} XP`;
                btnContinue.innerText = `В КОМНАТУ ${roomStep}`;
            }

            setTimeout(() => {
                resultOverlay.classList.remove('hidden');
            }, 400);

        }, 250);
    });
});

// Кнопка продолжения на всплывающем окне результатов
btnContinue.addEventListener('click', () => {
    resultOverlay.classList.add('hidden');
    resetDoors();
    canClickDoor = true;

    if (isDeadInThisRoom) {
        gameScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    }
    updateUI();
});

// Кнопка "ЗАБРАТЬ БАНК"
btnCashout.addEventListener('click', () => {
    if (currentRucksack.xp === 0 && currentRucksack.gold === 0 && currentRucksack.gems === 0) {
        alert("Рюкзак пуст! Пройди хотя бы одну комнату.");
        return;
    }

    // Переносим всё из рюкзака в сейф профиля
    userAccount.xp += currentRucksack.xp;
    userAccount.gold += currentRucksack.gold;
    userAccount.gems += currentRucksack.gems;
    userAccount.eventChips += currentRucksack.eventChips;

    // Проверяем левелап от полученного опыта
    checkLevelUp();

    alert(`💸 Сейф заперт! На базу доставлено:\n🌟 Опыт: +${currentRucksack.xp} XP\n💰 Монеты: +${currentRucksack.gold}\n💎 Кристаллы: +${currentRucksack.gems}\n👾 Ивент-чипы: +${currentRucksack.eventChips}`);

    currentRucksack.xp = 0;
    currentRucksack.gold = 0;
    currentRucksack.gems = 0;
    currentRucksack.eventChips = 0;

    saveData();

    gameScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    updateUI();
});

// ==========================================
// ИНТЕРФЕЙС И КЛАУД СЕЙВ
// ==========================================

function updateUI() {
    // Вывод в меню
    accLvlEl.innerText = userAccount.lvl;
    accXpEl.innerText = userAccount.xp;
    accGoldEl.innerText = userAccount.gold;
    accGemsEl.innerText = userAccount.gems;
    accEventEl.innerText = userAccount.eventChips;

    // Вывод в игре
    energyEl.innerText = userAccount.energy;
    roomEl.innerText = roomStep;
    lootSummaryEl.innerText = `✨${currentRucksack.xp} XP | 💰${currentRucksack.gold} | 💎${currentRucksack.gems} | 👾${currentRucksack.eventChips}`;
}

function resetDoors() {
    doors.forEach(door => {
        door.innerText = '🚪';
        door.style.transform = "none";
    });
}

function saveData() {
    const dataStr = JSON.stringify(userAccount);
    localStorage.setItem('roulette_save_v2', dataStr);

    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
        window.Telegram.WebApp.CloudStorage.setItem('user_save_v2', dataStr, (err) => {
            if (err) console.error("Ошибка сохранения в облако TG", err);
        });
    }
}

function loadData() {
    const localData = localStorage.getItem('roulette_save_v2');
    if (localData) {
        userAccount = JSON.parse(localData);
        updateUI();
    }

    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
        window.Telegram.WebApp.CloudStorage.getItem('user_save_v2', (err, value) => {
            if (!err && value) {
                userAccount = JSON.parse(value);
                updateUI();
            }
        });
    }
}

// Восстановление энергии (+1 каждые 60 минут, лимит 7)
setInterval(() => {
    if (userAccount.energy < 7) {
        userAccount.energy++;
        saveData();
        updateUI();
    }
}, 3600000);

loadData();