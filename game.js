// Безопасная инициализация Telegram WebApp
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
}

// Ждем полной загрузки HTML-страницы, чтобы скрипт точно увидел кнопку ИГРАТЬ
document.addEventListener("DOMContentLoaded", () => {
    
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

    // Глобальный профиль игрока по умолчанию
    let userAccount = {
        lvl: 1,
        xp: 0,
        gold: 0,
        gems: 0,
        eventChips: 0,
        energy: 7
    };

    // Текущий рюкзак рейда
    let currentRucksack = {
        xp: 0,
        gold: 0,
        gems: 0,
        eventChips: 0
    };

    let roomStep = 1;
    let isDeadInThisRoom = false;
    let canClickDoor = true;

    // Таблица дропа
    function getRoomReward() {
        const chance = Math.random();
        const multiplier = 1 + (roomStep * 0.15); 
        const xpGained = Math.floor((Math.random() * 10 + 5) * multiplier);

        if (chance < 0.60) {
            const goldGained = Math.floor((Math.random() * 80 + 40) * multiplier);
            return { type: 'gold', amount: goldGained, xp: xpGained, emoji: '💰', name: 'Монеты' };
        } else if (chance < 0.85) {
            const gemsGained = Math.floor((Math.random() * 2 + 1) * multiplier);
            return { type: 'gems', amount: gemsGained, xp: xpGained, emoji: '💎', name: 'Кристаллы' };
        } else {
            const eventGained = 1;
            return { type: 'eventChips', amount: eventGained, xp: xpGained, emoji: '👾', name: 'Чип Ивента' };
        }
    }

    function checkLevelUp() {
        let xpNeeded = userAccount.lvl * 300;
        while (userAccount.xp >= xpNeeded) {
            userAccount.xp -= xpNeeded;
            userAccount.lvl++;
            xpNeeded = userAccount.lvl * 300;
            alert(`🎉 СУПЕР! Твой уровень повышен до: ${userAccount.lvl}`);
        }
    }

    // Клик по кнопке играть
    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (userAccount.energy <= 0) {
                alert("Недостаточно энергии! ⚡");
                return;
            }

            userAccount.energy--;
            
            currentRucksack.xp = 0;
            currentRucksack.gold = 0;
            currentRucksack.gems = 0;
            currentRucksack.eventChips = 0;
            roomStep = 1;

            saveData();
            updateUI();
            resetDoors();

            if (mainMenu && gameScreen) {
                mainMenu.classList.add('hidden');
                gameScreen.classList.remove('hidden');
            }
        });
    }

    // Выбор двери
    doors.forEach(door => {
        door.addEventListener('click', () => {
            if (!canClickDoor) return;
            canClickDoor = false;

            const deathDoor = Math.floor(Math.random() * 3);
            const clickedId = parseInt(door.getAttribute('data-id'));

            door.style.transform = "scale(0.85) rotateY(90deg)";
            door.style.transition = "transform 0.25s ease";

            setTimeout(() => {
                if (clickedId === deathDoor) {
                    isDeadInThisRoom = true;
                    currentRucksack.xp = 0;
                    currentRucksack.gold = 0;
                    currentRucksack.gems = 0;
                    currentRucksack.eventChips = 0;

                    door.innerText = '💥';
                    resultEmoji.innerText = '💀';
                    resultText.innerText = `МИНА! Ты взорвался в комнате №${roomStep}.\nВсе ресурсы потеряны!`;
                    btnContinue.innerText = "В МЕНЮ";
                } else {
                    isDeadInThisRoom = false;
                    const reward = getRoomReward();

                    currentRucksack.xp += reward.xp;
                    currentRucksack[reward.type] += reward.amount;
                    roomStep++;

                    door.innerText = reward.emoji;
                    resultEmoji.innerText = reward.emoji;
                    resultText.innerText = `БЕЗОПАСНО!\nТы нашел: +${reward.amount} ${reward.name}\nОпыт: +${reward.xp} XP`;
                    btnContinue.innerText = `В КОМНАТУ ${roomStep}`;
                }

                setTimeout(() => {
                    if (resultOverlay) resultOverlay.classList.remove('hidden');
                }, 400);

            }, 250);
        });
    });

    if (btnContinue) {
        btnContinue.addEventListener('click', () => {
            if (resultOverlay) resultOverlay.classList.add('hidden');
            resetDoors();
            canClickDoor = true;

            if (isDeadInThisRoom) {
                if (gameScreen) gameScreen.classList.add('hidden');
                if (mainMenu) mainMenu.classList.remove('hidden');
            }
            updateUI();
        });
    }

    if (btnCashout) {
        btnCashout.addEventListener('click', () => {
            if (currentRucksack.xp === 0 && currentRucksack.gold === 0 && currentRucksack.gems === 0) {
                alert("Рюкзак пуст! Пройди хотя бы одну комнату.");
                return;
            }

            userAccount.xp += currentRucksack.xp;
            userAccount.gold += currentRucksack.gold;
            userAccount.gems += currentRucksack.gems;
            userAccount.eventChips += currentRucksack.eventChips;

            checkLevelUp();

            alert(`💸 Успешный побег! Забрано:\n🌟 Опыт: +${currentRucksack.xp} XP\n💰 Монеты: +${currentRucksack.gold}\n💎 Кристаллы: +${currentRucksack.gems}`);

            currentRucksack.xp = 0;
            currentRucksack.gold = 0;
            currentRucksack.gems = 0;
            currentRucksack.eventChips = 0;

            saveData();

            if (gameScreen) gameScreen.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
            updateUI();
        });
    }

    function updateUI() {
        if(accLvlEl) accLvlEl.innerText = userAccount.lvl;
        if(accXpEl) accXpEl.innerText = userAccount.xp;
        if(accGoldEl) accGoldEl.innerText = userAccount.gold;
        if(accGemsEl) accGemsEl.innerText = userAccount.gems;
        if(accEventEl) accEventEl.innerText = userAccount.eventChips;

        if(energyEl) energyEl.innerText = userAccount.energy;
        if(roomEl) roomEl.innerText = roomStep;
        if(lootSummaryEl) lootSummaryEl.innerText = `✨${currentRucksack.xp} XP | 💰${currentRucksack.gold} | 💎${currentRucksack.gems} | 👾${currentRucksack.eventChips}`;
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

        // Безопасное сохранение в Облако ТГ, только если оно реально доступно
        if (tg && tg.CloudStorage) {
            try {
                tg.CloudStorage.setItem('user_save_v2', dataStr, (err) => {
                    if (err) console.error("Ошибка CloudStorage:", err);
                });
            } catch(e) { console.log("ТГ Облако недоступно в этом браузере"); }
        }
    }

    function loadData() {
        const localData = localStorage.getItem('roulette_save_v2');
        if (localData) {
            userAccount = JSON.parse(localData);
        }

        // Пытаемся взять из ТГ облака
        if (tg && tg.CloudStorage) {
            try {
                tg.CloudStorage.getItem('user_save_v2', (err, value) => {
                    if (!err && value) {
                        userAccount = JSON.parse(value);
                        updateUI();
                    }
                });
            } catch(e) { console.log("ТГ Облако недоступно"); }
        }
        updateUI();
    }

    // Регенерация энергии
    setInterval(() => {
        if (userAccount.energy < 7) {
            userAccount.energy++;
            saveData();
            updateUI();
        }
    }, 3600000);

    // Первичная загрузка при старте
    loadData();
});