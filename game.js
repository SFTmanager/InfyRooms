import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// --- КОНФИГУРАЦИЯ INFYROOMS ---
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

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Состояние профиля
let userAccount = null;
let userDocRef = null;

// ДЕФОЛТНЫЙ ПРОФИЛЬ
const defaultProfile = {
    telegram_id: "",
    username: "Unknown",
    xp: 0,
    gold: 0,
    gems: 0,
    energy: 7,
    lastEnergyUpdate: Date.now()
};

let updateUI = null;

// Сохранение прогресса
async function saveData() {
    if (!userDocRef || !userAccount) return;
    try {
        await setDoc(userDocRef, userAccount, { merge: true });
        console.log("Progress saved to Firestore!");
    } catch (error) {
        console.error("Error saving data:", error);
    }
}

// Авторизация и загрузка данных игрока
async function handleUserLogin() {
    try {
        let telegramUserId = "test_player_infy"; 
        let telegramUsername = "LocalHost";

        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            if (tg.initDataUnsafe?.user) {
                telegramUserId = String(tg.initDataUnsafe.user.id);
                // Забираем username, если он настроен в ТГ (без знака @, его добавим при выводе)
                telegramUsername = tg.initDataUnsafe.user.username || "No Username";
            }
        }

        userDocRef = doc(db, "users", telegramUserId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            userAccount = docSnap.data();
            
            // Если у старого игрока нет полей ID или Username, либо имя изменилось — обновляем в базе
            let needUpdate = false;
            if (!userAccount.telegram_id) { userAccount.telegram_id = telegramUserId; needUpdate = true; }
            if (userAccount.username !== telegramUsername) { userAccount.username = telegramUsername; needUpdate = true; }
            
            if (needUpdate) {
                await saveData();
            }
            
            calculateOfflineEnergy();
        } else {
            // Для нового игрока создаем профиль со всеми данными
            userAccount = { 
                ...defaultProfile,
                telegram_id: telegramUserId,
                username: telegramUsername
            };
            await setDoc(userDocRef, userAccount);
        }

        if (typeof updateUI === "function") {
            updateUI();
        }

    } catch (error) {
        console.error("FIREBASE CRITICAL ERROR:", error.message);
        userAccount = { ...defaultProfile, telegram_id: "error", username: "Error" };
        if (typeof updateUI === "function") {
            updateUI();
        }
    }
}

// Регенерация энергии (1 ед. в час)
function calculateOfflineEnergy() {
    if (!userAccount) return;
    if (userAccount.energy >= 7) return;

    const now = Date.now();
    const lastUpdate = userAccount.lastEnergyUpdate || now;
    const msPassed = now - lastUpdate;
    
    const energyPerHour = 3600000; 
    const energyToRecover = Math.floor(msPassed / energyPerHour);

    if (energyToRecover > 0) {
        const oldEnergy = userAccount.energy;
        userAccount.energy = Math.min(7, userAccount.energy + energyToRecover);
        userAccount.lastEnergyUpdate = lastUpdate + (energyToRecover * energyPerHour);
        saveData();
    }
}

// Игровая логика
document.addEventListener("DOMContentLoaded", () => {
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const resultOverlay = document.getElementById('result-overlay');

    const btnPlay = document.getElementById('btn-play');
    const btnCashout = document.getElementById('btn-cashout');
    const btnContinue = document.getElementById('btn-continue');
    const doors = document.querySelectorAll('.door');

    // Переменные для новых полей на экране
    const accIdEl = document.getElementById('account-id');
    const accUsernameEl = document.getElementById('account-username');

    const accXpEl = document.getElementById('account-xp');
    const accGoldEl = document.getElementById('account-gold');
    const accGemsEl = document.getElementById('account-gems');
    const energyEl = document.getElementById('energy-val');
    
    const roomEl = document.getElementById('room-step');
    const lootSummaryEl = document.getElementById('loot-summary');
    const resultEmoji = document.getElementById('result-emoji');
    const resultText = document.getElementById('result-text');

    let currentRucksack = { xp: 0, gold: 0, gems: 0 };
    let roomStep = 1;
    let isDeadInThisRoom = false;
    let canClickDoor = true;

    // Синхронизация данных с версткой
    updateUI = function() {
        if (!userAccount) return; 

        // Выводим ID и Username (если это юзернейм, подставляем красивую @)
        if (accIdEl) accIdEl.innerText = userAccount.telegram_id;
        if (accUsernameEl) {
            accUsernameEl.innerText = userAccount.username === "No Username" || userAccount.username === "LocalHost"
                ? userAccount.username 
                : "@" + userAccount.username;
        }

        if (accXpEl) accXpEl.innerText = userAccount.xp;
        if (accGoldEl) accGoldEl.innerText = userAccount.gold;
        if (accGemsEl) accGemsEl.innerText = userAccount.gems;
        if (energyEl) energyEl.innerText = userAccount.energy;

        if (roomEl) roomEl.innerText = roomStep;
        if (lootSummaryEl) {
            lootSummaryEl.innerText = `✨${currentRucksack.xp} XP | 💰${currentRucksack.gold} | 💎${currentRucksack.gems}`;
        }
    }

    handleUserLogin();

    function getRoomReward() {
        const chance = Math.random();
        const multiplier = 1 + (roomStep * 0.15); 
        const xpGained = Math.floor((Math.random() * 10 + 5) * multiplier);

        if (chance < 0.60) {
            const goldGained = Math.floor((Math.random() * 80 + 40) * multiplier);
            return { type: 'gold', amount: goldGained, xp: xpGained, emoji: '💰', name: 'Gold' };
        } else {
            const gemsGained = Math.floor((Math.random() * 2 + 1) * multiplier);
            return { type: 'gems', amount: gemsGained, xp: xpGained, emoji: '💎', name: 'Gems' };
        }
    }

    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (!userAccount) return;
            if (userAccount.energy <= 0) return;

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
                    if (resultText) resultText.innerText = `BOOM! You exploded in room №${roomStep}.\nAll items lost!`;
                    if (btnContinue) btnContinue.innerText = "To Menu";
                } else {
                    isDeadInThisRoom = false;
                    const reward = getRoomReward();

                    currentRucksack.xp += reward.xp;
                    currentRucksack[reward.type] += reward.amount;
                    roomStep++;

                    door.innerText = reward.emoji;
                    if (resultEmoji) resultEmoji.innerText = reward.emoji;
                    if (resultText) resultText.innerText = `SAFE!\nYou found: +${reward.amount} ${reward.name}\nXP: +${reward.xp}`;
                    if (btnContinue) btnContinue.innerText = `Enter Room ${roomStep}`;
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
            if (currentRucksack.xp === 0 && currentRucksack.gold === 0 && currentRucksack.gems === 0) return;

            userAccount.xp += currentRucksack.xp;
            userAccount.gold += currentRucksack.gold;
            userAccount.gems += currentRucksack.gems;

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
            saveData();
            updateUI();
        }
    }, 60000);
    // Эффект манящих частиц из двери
});
