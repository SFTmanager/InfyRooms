import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import { 
    getAuth 
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import { 
    getFirestore, doc, getDoc, setDoc          
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// --- НАСТОЯЩАЯ КОНФИГУРАЦИЯ INFYROOMS ---
const firebaseConfig = {
    apiKey: "AIzaSyBjWcfCKWQzO1uZSwzI-ram9rwEzqRfBrs",
    authDomain: "infyrooms-b0196.firebaseapp.com",
    databaseURL: "https://infyrooms-b0196-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "infyrooms-b0196",
    storageBucket: "infyrooms-b0196.firebasestorage.app",
    messagingSenderId: "864579505879",
    appId: "1:864579505879:web:9f934561001879f799ea92",
    measurementId: "G-5ZCLKGWWMN"
};

// Инициализация сервисов под наш проект
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Глобальные переменные профиля
let userAccount = null;
let userDocRef = null;

// ДЕФОЛТНЫЙ ПРОФИЛЬ
const defaultProfile = {
    xp: 0,
    gold: 0,
    gems: 0,
    energy: 7,
    lastEnergyUpdate: Date.now()
};

// Глобальная ссылка на функцию обновления UI
let updateUI = null;

// Функция сохранения в Firebase Firestore
async function saveData() {
    if (!userDocRef || !userAccount) return;
    try {
        await setDoc(userDocRef, userAccount, { merge: true });
        console.log("Прогресс успешно сохранен в Firestore!");
    } catch (error) {
        console.error("Ошибка сохранения в Firestore:", error);
    }
}

// Проверка и загрузка при входе
async function handleUserLogin() {
    try {
        let telegramUserId = "test_player_infy"; 

        // Проверяем, запущены ли мы внутри Телеграма
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            // Тестовый детальный вывод данных на экран телефона
            const rawData = JSON.stringify(tg.initDataUnsafe);
            alert("Telegram WebApp найден!\nСырые данные initDataUnsafe: " + rawData);

            if (tg.initDataUnsafe?.user) {
                telegramUserId = String(tg.initDataUnsafe.user.id);
            }
        } else {
            alert("Внимание: Скрипт Телеграма не обнаружен в окне браузера. Включен дефолтный игрок.");
        }

        alert("Итоговый ID, который отправлен в Firestore: " + telegramUserId);

        // Настраиваем ссылку на документ на основе полученного ID
        userDocRef = doc(db, "users", telegramUserId);

        // Получаем документ из базы
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            userAccount = docSnap.data();
            console.log("Игрок найден в базе! Данные загружены:", userAccount);
            calculateOfflineEnergy();
        } else {
            console.log("Новый игрок! Регистрируем в Firestore...");
            userAccount = { ...defaultProfile };
            await setDoc(userDocRef, userAccount);
        }

        if (typeof updateUI === "function") {
            updateUI();
        }

    } catch (error) {
        alert("КРИТИЧЕСКАЯ ОШИБКА FIREBASE:\n" + error.message);
        userAccount = { ...defaultProfile };
        if (typeof updateUI === "function") {
            updateUI();
        }
    }
}

// Расчет оффлайн-энергии через таймстампы
function calculateOfflineEnergy() {
    if (!userAccount) return;
    if (userAccount.energy >= 7) return;

    const now = Date.now();
    const lastUpdate = userAccount.lastEnergyUpdate || now;
    const msPassed = now - lastUpdate;
    
    const energyPerHour = 3600000; // 1 час в мс
    const energyToRecover = Math.floor(msPassed / energyPerHour);

    if (energyToRecover > 0) {
        const oldEnergy = userAccount.energy;
        userAccount.energy = Math.min(7, userAccount.energy + energyToRecover);
        userAccount.lastEnergyUpdate = lastUpdate + (energyToRecover * energyPerHour);
        
        console.log(`⏳ Оффлайн регенерация энергии: +${userAccount.energy - oldEnergy}`);
        saveData();
    }
}

// Ждем загрузки DOM дерева интерфейса
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
    const accXpEl = document.getElementById('account-xp');
    const accGoldEl = document.getElementById('account-gold');
    const accGemsEl = document.getElementById('account-gems');

    // Элементы рейда на игровом экране
    const energyEl = document.getElementById('energy-val');
    const roomEl = document.getElementById('room-step');
    const lootSummaryEl = document.getElementById('loot-summary');
    const resultEmoji = document.getElementById('result-emoji');
    const resultText = document.getElementById('result-text');

    // Текущий рюкзак сессии
    let currentRucksack = { xp: 0, gold: 0, gems: 0 };
    let roomStep = 1;
    let isDeadInThisRoom = false;
    let canClickDoor = true;

    // Переписываем глобальную функцию отрисовки интерфейса
    updateUI = function() {
        if (!userAccount) return; 

        if (accXpEl) accXpEl.innerText = userAccount.xp;
        if (accGoldEl) accGoldEl.innerText = userAccount.gold;
        if (accGemsEl) accGemsEl.innerText = userAccount.gems;

        if (energyEl) energyEl.innerText = userAccount.energy;
        if (roomEl) roomEl.innerText = roomStep;
        if (lootSummaryEl) {
            lootSummaryEl.innerText = `✨${currentRucksack.xp} XP | 💰${currentRucksack.gold} | 💎${currentRucksack.gems}`;
        }
    }

    // Запускаем авторизацию, когда UI полностью готов
    handleUserLogin();

    // Генерация наград комнат
    function getRoomReward() {
        const chance = Math.random();
        const multiplier = 1 + (roomStep * 0.15); 
        const xpGained = Math.floor((Math.random() * 10 + 5) * multiplier);

        if (chance < 0.60) {
            const goldGained = Math.floor((Math.random() * 80 + 40) * multiplier);
            return { type: 'gold', amount: goldGained, xp: xpGained, emoji: '💰', name: 'Монеты' };
        } else {
            const gemsGained = Math.floor((Math.random() * 2 + 1) * multiplier);
            return { type: 'gems', amount: gemsGained, xp: xpGained, emoji: '💎', name: 'Кристаллы' };
        }
    }

    // Клик по кнопке играть
    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (!userAccount) return;
            if (userAccount.energy <= 0) {
                alert("Недостаточно энергии! ⚡");
                return;
            }

            // Начинаем отсчет регенерации, если тратим максимальную энергию
            if (userAccount.energy === 7) {
                userAccount.lastEnergyUpdate = Date.now();
            }

            userAccount.energy--;
            
            currentRucksack.xp = 0;
            currentRucksack.gold = 0;
            currentRucksack.gems = 0;
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

    // Логика выбора дверей
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

                    door.innerText = '💥';
                    if (resultEmoji) resultEmoji.innerText = '💀';
                    if (resultText) resultText.innerText = `МИНА! Ты взорвался в комнате №${roomStep}.\nВсе ресурсы потеряны!`;
                    if (btnContinue) btnContinue.innerText = "В МЕНЮ";
                } else {
                    isDeadInThisRoom = false;
                    const reward = getRoomReward();

                    currentRucksack.xp += reward.xp;
                    currentRucksack[reward.type] += reward.amount;
                    roomStep++;

                    door.innerText = reward.emoji;
                    if (resultEmoji) resultEmoji.innerText = reward.emoji;
                    if (resultText) resultText.innerText = `БЕЗОПАСНО!\nТы нашел: +${reward.amount} ${reward.name}\nОпыт: +${reward.xp} XP`;
                    if (btnContinue) btnContinue.innerText = `В КОМНАТУ ${roomStep}`;
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
        btnCashout.addEventListener('click', async () => {
            if (!userAccount) return;
            if (currentRucksack.xp === 0 && currentRucksack.gold === 0 && currentRucksack.gems === 0) {
                alert("Рюкзак пуст! Пройди хотя бы одну комнату.");
                return;
            }

            userAccount.xp += currentRucksack.xp;
            userAccount.gold += currentRucksack.gold;
            userAccount.gems += currentRucksack.gems;

            alert(`💸 Успешный побег! Забрано:\n🌟 Опыт: +${currentRucksack.xp} XP\n💰 Монеты: +${currentRucksack.gold}\n💎 Кристаллы: +${currentRucksack.gems}`);

            currentRucksack.xp = 0;
            currentRucksack.gold = 0;
            currentRucksack.gems = 0;

            await saveData();

            if (gameScreen) gameScreen.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
            updateUI();
        });
    }

    function resetDoors() {
        doors.forEach(door => {
            door.innerText = '🚪';
            door.style.transform = "none";
        });
    }

    // Фоновая регенерация энергии раз в час, пока игра на экране телефона
    setInterval(() => {
        if (!userAccount) return;

        if (userAccount.energy >= 7) {
            userAccount.lastEnergyUpdate = Date.now();
            return;
        }

        const now = Date.now();
        const energyPerHour = 3600000;

        if (now - userAccount.lastEnergyUpdate >= energyPerHour) {
            userAccount.energy++;
            userAccount.lastEnergyUpdate += energyPerHour;
            
            console.log("⚡ Энергия восстановилась на 1 ед. во время игры!");
            saveData();
            updateUI();
        }
    }, 60000); // Проверка каждую минуту
});
