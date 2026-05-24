// Переключение экранов
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const resultOverlay = document.getElementById('result-overlay');

// Кнопки
const btnPlay = document.getElementById('btn-play');
const btnCashout = document.getElementById('btn-cashout');
const btnContinue = document.getElementById('btn-continue');
const doors = document.querySelectorAll('.door');

// Текстовые элементы UI
const energyEl = document.getElementById('energy-val');
const lootEl = document.getElementById('current-loot');
const roomEl = document.getElementById('room-step');
const resultEmoji = document.getElementById('result-emoji');
const resultText = document.getElementById('result-text');

// СОСТОЯНИЕ ИГРЫ
let energy = 7;
let currentLoot = 0;
let roomStep = 1;
let isDeadInThisRoom = false; 

// Награды, которые могут выпасть
const lootPool = [100, 250, 500, 1000, 2500, 5000];
const emojiPool = ['💰', '💎', '👑', '✨', '🏆'];

// Переход из меню в игру
btnPlay.addEventListener('click', () => {
    if (energy <= 0) {
        alert("У тебя кончилась энергия! Подожди пока восстановится или задонать (шутка).");
        return;
    }
    // Снимаем 1 энергию за вход в рейд
    energy--;
    saveGameState();
    updateUI();
    
    currentLoot = 0;
    roomStep = 1;
    
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
});

// Клик по двери
doors.forEach(door => {
    door.addEventListener('click', () => {
        // Рандомим, какая именно дверь будет смертельной (от 0 до 2)
        const deathDoor = Math.floor(Math.random() * 3);
        const clickedDoorId = parseInt(door.getAttribute('data-id'));

        if (clickedDoorId === deathDoor) {
            // ИГРОК СДОХ
            isDeadInThisRoom = true;
            currentLoot = 0; // Теряет всё
            
            resultEmoji.innerText = '💥';
            resultText.innerText = `За дверью была бомба! Ты потерял всё накопленное богатство на уровне ${roomStep}!`;
            btnContinue.innerText = "ВЕРНУТЬСЯ В МЕНЮ";
        } else {
            // ИГРОК ВЫЖИЛ
            isDeadInThisRoom = false;
            // Рассчитываем награду (чем дальше комната, тем жирнее куш)
            const baseLoot = lootPool[Math.min(roomStep - 1, lootPool.length - 1)];
            const randomBonus = Math.floor(Math.random() * 50);
            const reward = baseLoot + randomBonus;
            
            currentLoot += reward;
            roomStep++;
            
            const randomEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
            resultEmoji.innerText = randomEmoji;
            resultText.innerText = `Чисто! Ты нашел +${reward} монет!`;
            btnContinue.innerText = `ИДТИ В КОМНАТУ ${roomStep}`;
        }

        // Показываем оверлей с результатом
        resultOverlay.classList.remove('hidden');
    });
});

// Кнопка на оверлее (продолжить или выйти)
btnContinue.addEventListener('click', () => {
    resultOverlay.classList.add('hidden');
    
    if (isDeadInThisRoom) {
        // Если умер — выкидывает в меню
        gameScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    }
    updateUI();
});

// Кнопка "ЗАБРАТЬ БАНК" (Игрок решил не рисковать)
btnCashout.addEventListener('click', () => {
    if (currentLoot === 0) {
        alert("Ты еще ничего не нафармил, уносить нечего!");
        return;
    }
    alert(`Умный ход! Ты сохранил и унес с собой ${currentLoot} монет!`);
    
    // Тут в будущем будет прибавление к общему балансу аккаунта
    currentLoot = 0;
    
    gameScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    updateUI();
});

// Обновление цифр на экране
function updateUI() {
    energyEl.innerText = energy;
    lootEl.innerText = currentLoot;
    roomEl.innerText = roomStep;
}

// Заглушка для сохранения (чтобы при обновлении страницы данные не терялись)
function saveGameState() {
    localStorage.setItem('roulette_energy', energy);
}

// Попытка загрузить энергию из памяти браузера при старте
if(localStorage.getItem('roulette_energy') !== null) {
    energy = parseInt(localStorage.getItem('roulette_energy'));
}

// ИМИТАЦИЯ РЕГЕНЕРАЦИИ ЭНЕРГИИ КAЖДЫЙ ЧАС
// Для теста можно уменьшить интервал, но по правилам:
setInterval(() => {
    if (energy < 7) {
        energy++;
        saveGameState();
        updateUI();
    }
}, 3600000); // 3600000 мс = 1 час

updateUI();