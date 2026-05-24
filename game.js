// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ПОДКЛЮЧЕНИЕ TELEGRAM
// ==========================================
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// Получаем элементы экранов
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const resultOverlay = document.getElementById('result-overlay');

// Получаем кнопки управления
const btnPlay = document.getElementById('btn-play');
const btnCashout = document.getElementById('btn-cashout');
const btnContinue = document.getElementById('btn-continue');
const doors = document.querySelectorAll('.door');

// Элементы статистики и плашек
const energyEl = document.getElementById('energy-val');
const lootEl = document.getElementById('current-loot');
const roomEl = document.getElementById('room-step');
const resultEmoji = document.getElementById('result-emoji');
const resultText = document.getElementById('result-text');

// ==========================================
// 2. СОСТОЯНИЕ ИГРЫ (БАЛАНС И ХАРАКТЕРИСТИКИ)
// ==========================================
let energy = 7;
let currentLoot = 0;
let roomStep = 1;
let isDeadInThisRoom = false; 
let canClickDoor = true; // Блокиратор спам-кликов во время анимации

const lootPool = [100, 250, 500, 1000, 2500, 5000, 10000];
const emojiPool = ['💰', '💎', '👑', '✨', '🏆', '🎰'];

// ==========================================
// 3. ЛОГИКА ПЕРЕХОДОВ И КЛИКОВ
// ==========================================

// Клик по кнопке ИГРАТЬ в главном меню
btnPlay.addEventListener('click', () => {
    if (energy <= 0) {
        alert("У тебя кончилась энергия!⚡ Попытки восстанавливаются каждый час.");
        return;
    }
    
    // Снимаем энергию, сбрасываем показатели сессии
    energy--;
    currentLoot = 0;
    roomStep = 1;
    
    saveGameState();
    updateUI();
    resetDoors(); // Возвращаем дверям закрытый вид 🚪
    
    // Переключаем экраны
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
});

// Логика выбора дверей (Та самая рулетка 1/3)
doors.forEach(door => {
    door.addEventListener('click', () => {
        // Если кликать временно нельзя (идет анимация) — игнорируем
        if (!canClickDoor) return;
        canClickDoor = false;

        // Генерируем ловушку: случайное число от 0 до 2
        const deathDoor = Math.floor(Math.random() * 3);
        const clickedDoorId = parseInt(door.getAttribute('data-id'));

        // Анимация «приоткрытия» двери перед показом оверлея
        door.style.transform = "scale(0.9) rotateY(90deg)";
        door.style.transition = "transform 0.3s ease";

        setTimeout(() => {
            if (clickedDoorId === deathDoor) {
                // ИГРОК ВЗОРВАЛСЯ
                isDeadInThisRoom = true;
                currentLoot = 0; // Обнуляем всё накопленное за рейд
                
                door.innerText = '💥'; // Дверь превращается во взрыв
                
                resultEmoji.innerText = '💀';
                resultText.innerText = `БАЗЗЗ! На комнате ${roomStep} ты наткнулся на мину. Весь куш сгорел!`;
                btnContinue.innerText = "В МЕНЮ";
            } else {
                // ИГРОК УГАДАЛ И ВЫЖИЛ
                isDeadInThisRoom = false;
                
                // Считаем награду: базовая сумма уровня + случайный бонус
                const baseLoot = lootPool[Math.min(roomStep - 1, lootPool.length - 1)];
                const reward = baseLoot + Math.floor(Math.random() * (roomStep * 10));
                
                currentLoot += reward;
                roomStep++;
                
                const randomEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
                door.innerText = randomEmoji; // Дверь показывает лут
                
                resultEmoji.innerText = randomEmoji;
                resultText.innerText = `Чисто! За дверью было пусто. Ты забираешь +${reward} очков!`;
                btnContinue.innerText = `ИДТИ В КОМНАТУ ${roomStep}`;
            }

            // Через полсекунды после открытия двери выкатываем финальный экран
            setTimeout(() => {
                resultOverlay.classList.remove('hidden');
            }, 500);

        }, 300); // Тайминг разворота двери
    });
});

// Кнопка ДАЛЬШЕ на всплывающем окне
btnContinue.addEventListener('click', () => {
    resultOverlay.classList.add('hidden');
    resetDoors(); // Возвращаем дверям исходный вид
    canClickDoor = true; // Разрешаем кликать снова

    if (isDeadInThisRoom) {
        // Если подорвался — пинком отправляем в главное меню
        gameScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    }
    updateUI();
});

// Кнопка ЗАБРАТЬ БАНК (Фиксация прибыли)
btnCashout.addEventListener('click', () => {
    if (currentLoot === 0) {
        alert("Ты еще ничего не выиграл в этом рейде! Выбери хотя бы одну дверь.");
        return;
    }
    
    alert(`💸 Отличная интуиция! Ты вовремя остановился и забрал ${currentLoot} очков.`);
    
    // Здесь будет логика сохранения очков на постоянный баланс аккаунта
    currentLoot = 0;
    
    gameScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    updateUI();
});

// ==========================================
// 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

// Сброс визуального состояния дверей к дефолту
function resetDoors() {
    doors.forEach(door => {
        door.innerText = '🚪';
        door.style.transform = "none";
    });
}

// Обновление цифр на интерфейсе
function updateUI() {
    energyEl.innerText = energy;
    lootEl.innerText = currentLoot;
    roomEl.innerText = roomStep;
}

// Сохранение энергии в память, чтобы не скидывалась при перезапуске WebApp
function saveGameState() {
    localStorage.setItem('tg_casino_energy', energy);
}

// Загрузка сохраненной энергии
if(localStorage.getItem('tg_casino_energy') !== null) {
    energy = parseInt(localStorage.getItem('tg_casino_energy'));
}

// Регенерация энергии: +1 энергия каждые 60 минут (макс 7)
setInterval(() => {
    if (energy < 7) {
        energy++;
        saveGameState();
        updateUI();
    }
}, 3600000);

// Первичный запуск отрисовки данных
updateUI();