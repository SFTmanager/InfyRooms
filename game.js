import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    getDoc, 
    runTransaction, 
    updateDoc, 
    addDoc, 
    setDoc,          
    serverTimestamp,  
    increment,
    arrayUnion
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
const db = getFirestore(app); // Подключаем Firestore для infyrooms

// 1. Получаем ID пользователя из Telegram WebApp
let telegramUserId = "test_player_infy"; 

if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    
    if (tg.initDataUnsafe?.user) {
        telegramUserId = String(tg.initDataUnsafe.user.id);
    }
}

// 2. Ссылка на документ юзера в Firestore
const userDocRef = doc(db, "users", telegramUserId);

// Глобальный объект профиля
let userAccount = null;

// ДЕФОЛТНЫЙ ПРОФИЛЬ (Без левелов и ивентов, как ты и просил)
const defaultProfile = {
    xp: 0,
    gold: 0,
    gems: 0,
    energy: 7,
    lastEnergyUpdate: Date.now()
};

// Глобальная ссылка на функцию обновления UI, чтобы handleUserLogin видел её
let updateUI = null;

// Функция сохранения в Firebase Firestore
async function saveData() {
    if (!userAccount) return;
    try {
        userAccount.lastEnergyUpdate = Date.now();
        await setDoc(userDocRef, userAccount, { merge: true });
        console.log("Прогресс успешно сохранен в Firestore!");
    } catch (error) {
        console.error("Ошибка сохранения в Firestore:", error);
    }
}

// Проверка и загрузка при входе
async function handleUserLogin() {
    try {
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            userAccount = docSnap.data();
            calculateOfflineEnergy();
        } else {
            userAccount = { ...defaultProfile };
            await setDoc(userDocRef, userAccount);
            // Если всё ок, телефон выдаст это окно:
            alert("Успешная регистрация в Firestore!"); 
        }

        if (typeof updateUI === "function") { updateUI(); }

    } catch (error) {
        // ВОТ СЮДА ДОБАВЛЯЕМ ALERT
        // Если база закрыта или есть баг, ты увидишь точный текст ошибки при входе
        alert("КРИТИЧЕСКАЯ ОШИБКА БАЗЫ: " + error.message); 
        
        userAccount = { ...defaultProfile };
        if (typeof updateUI === "function") { updateUI(); }
    }
}

// Расчет оффлайн-энергии
function calculateOfflineEnergy() {
    if (!userAccount) return;
    if (userAccount.energy >= 7) return;

    const now = Date.now();
    const lastUpdate = userAccount.lastEnergyUpdate || now;
    const msPassed = now - lastUpdate;
    
    // 1 час = 3 600 000 миллисекунд
    const energyPerHour = 3600000; 
    const energyToRecover = Math.floor(msPassed / energyPerHour);

    if (energyToRecover > 0) {
        // Добавляем энергию, но не больше лимита (7)
        const oldEnergy = userAccount.energy;
        userAccount.energy = Math.min(7, userAccount.energy + energyToRecover);
        
        // Передвигаем метку времени вперед ровно на столько часов, сколько восстановили
        userAccount.lastEnergyUpdate = lastUpdate + (energyToRecover * energyPerHour);
        
        console.log(`⏳ Пока тебя не было, восстановилось энергии: +${userAccount.energy - oldEnergy}`);
        saveData();
    }
}

// Ждем загрузки DOM
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

    // Элементы аккаунта в меню (Оставили только нужные)
    const accXpEl = document.getElementById('account-xp');
    const accGoldEl = document.getElementById('account-gold');
    const accGemsEl = document.getElementById('account-gems');

    // Элементы рейда на игровом экране
    const energyEl = document.getElementById('energy-val');
    const roomEl = document.getElementById('room-step');
    const lootSummaryEl = document.getElementById('loot-summary');
    const resultEmoji = document.getElementById('result-emoji');
    const resultText = document.getElementById('result-text');

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

    // Запускаем авторизацию, так как UI готов к приему данных
    handleUserLogin();

    // Текущий рюкзак игры
    let currentRucksack = {
        xp: 0,
        gold: 0,
        gems: 0
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

            // ЕСЛИ энергия была полной, фиксируем время начала регенерации прямо сейчас!
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

    // Логика дверей
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

            // Добавляем лут в профиль
            userAccount.xp += currentRucksack.xp;
            userAccount.gold += currentRucksack.gold;
            userAccount.gems += currentRucksack.gems;

            alert(`💸 Успешный побег! Забрано:\n🌟 Опыт: +${currentRucksack.xp} XP\n💰 Монеты: +${currentRucksack.gold}\n💎 Кристаллы: +${currentRucksack.gems}`);

            currentRucksack.xp = 0;
            currentRucksack.gold = 0;
            currentRucksack.gems = 0;

            // Ждем сохранения в облако Firestore
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
    setInterval(() => {
        if (!userAccount) return;

        // Если энергия полная, постоянно двигаем таймер за собой, чтобы регенерация начиналась ровно в момент траты
        if (userAccount.energy >= 7) {
            userAccount.lastEnergyUpdate = Date.now();
            return;
        }

        const now = Date.now();
        const energyPerHour = 3600000;

        // Если с момента последнего обновления прошел 1 час или больше
        if (now - userAccount.lastEnergyUpdate >= energyPerHour) {
            userAccount.energy++;
            userAccount.lastEnergyUpdate += energyPerHour; // Сдвигаем счетчик ровно на час вперед
            
            console.log("⚡ Энергия восстановилась на 1 ед. во время игры!");
            saveData();
            updateUI();
        }
    }, 60000); // 60000 мс = 1 минута
});