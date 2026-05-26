import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// --- КОНФИГУРАЦИЯ FIREBASE ---
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userAccount = null;
let userDocRef = null;

// ==========================================
// НОВАЯ СИСТЕМА ЦЕННОСТЕЙ И РЕДКОСТЕЙ
// ==========================================
const ITEMS_DATABASE = {
    // common - не больше 10
    "healer_card": { 
        name: "Healer's Card", icon: "🃏", rarity: "common", chance: 0.35, price: 10, sailable: true,
        desc: "The soul of an ancient doctor is inside. Whispers tips on how to survive."
    },
    // rare - не больше 30
    "all_seeing_eye": { 
        name: "All-Seeing Eye", icon: "👁️‍🗨️", rarity: "rare", chance: 0.25, price: 30, sailable: true,
        desc: "Stares into the depths of reality. It can sense trap doors from a mile away."
    },
    // epic - не больше 75
    "killer_candy": { 
        name: "Xmas Candy-Slayer", icon: "🍭", rarity: "epic", chance: 0.15, price: 75, sailable: true,
        desc: "EVENT ITEM! This candy cane has sharp teeth. Do not put it in your pocket."
    },
    // mythic - не больше 150
    "void_stone": { 
        name: "Void Core", icon: "🔮", rarity: "mythic", chance: 0.11, price: 145, sailable: true,
        desc: "A pulsating stone recovered from Room 999. It warps gravity."
    },
    // legendary - не больше 500
    "shadow_reaper": { 
        name: "Shadow Reaper", icon: "👥", rarity: "legendary", chance: 0.08, price: 500, sailable: true,
        desc: "A dark entity following your reflection. Feeds on explosions."
    },
    // imaginary - не больше 600
    "santa_spirit": { 
        name: "Spirit of Santa", icon: "🎅", rarity: "imaginary", chance: 0.04, price: 580, sailable: false,
        desc: "WINTER MAGIC! An entity that exists only as long as you believe in it."
    },
    // complex - не больше 800
    "cyber_chimera": { 
        name: "Cyber Chimera", icon: "🦁", rarity: "complex", chance: 0.017, price: 790, sailable: true,
        desc: "A beast woven from forbidden code and lost player memories."
    },
    // universal - не больше 1000
    "infinity_key": { 
        name: "The Chronos Key", icon: "🔑", rarity: "universal", chance: 0.003, price: 1000, sailable: false,
        desc: "An absolute cosmic artifact. Grants total control over architecture."
    }
};

const defaultProfile = {
    telegram_id: "",
    username: "Unknown",
    xp: 0, gold: 0, gems: 0, energy: 7,
    lastEnergyUpdate: Date.now(),
    inventory: [],
    shopData: { lastRefresh: 0, currentItems: [] }
};

let updateUI = null;

async function saveData() {
    if (!userDocRef || !userAccount) return;
    try {
        await setDoc(userDocRef, userAccount, { merge: true });
        console.log("Firestore sync success.");
    } catch (error) {
        console.error("Error saving progress:", error);
    }
}

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
                telegramUsername = tg.initDataUnsafe.user.username || "No Username";
            }
        }

        userDocRef = doc(db, "users", telegramUserId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            userAccount = docSnap.data();
            
            if (!userAccount.telegram_id) userAccount.telegram_id = telegramUserId;
            if (userAccount.username !== telegramUsername) userAccount.username = telegramUsername;
            if (!userAccount.inventory) userAccount.inventory = [];
            if (!userAccount.shopData) userAccount.shopData = { lastRefresh: 0, currentItems: [] };
            
            calculateOfflineEnergy();
            checkAndRefreshShop();
        } else {
            userAccount = { ...defaultProfile, telegram_id: telegramUserId, username: telegramUsername };
            generateNewShopItems();
            await setDoc(userDocRef, userAccount);
        }

        if (typeof updateUI === "function") updateUI();

    } catch (error) {
        console.error("AUTH ERROR:", error.message);
        userAccount = { ...defaultProfile, telegram_id: "error", username: "Error" };
        if (typeof updateUI === "function") updateUI();
    }
}

function calculateOfflineEnergy() {
    if (!userAccount || userAccount.energy >= 7) return;
    const now = Date.now();
    const lastUpdate = userAccount.lastEnergyUpdate || now;
    const msPassed = now - lastUpdate;
    const energyToRecover = Math.floor(msPassed / 3600000);

    if (energyToRecover > 0) {
        userAccount.energy = Math.min(7, userAccount.energy + energyToRecover);
        userAccount.lastEnergyUpdate = lastUpdate + (energyToRecover * 3600000);
        saveData();
    }
}

function checkAndRefreshShop() {
    if (!userAccount) return;
    const now = Date.now();
    // Обновление раз в 24 часа
    if (now - userAccount.shopData.lastRefresh >= 86400000) {
        generateNewShopItems();
        saveData();
    }
}

function generateNewShopItems() {
    const chosenIds = [];
    const itemIds = Object.keys(ITEMS_DATABASE);

    for (let i = 0; i < 2; i++) {
        let rand = Math.random();
        let selectedId = itemIds[0];

        for (const id of itemIds) {
            if (rand < ITEMS_DATABASE[id].chance) {
                selectedId = id;
                break;
            }
            rand -= ITEMS_DATABASE[id].chance;
        }
        chosenIds.push(selectedId);
    }
    userAccount.shopData.currentItems = chosenIds;
    userAccount.shopData.lastRefresh = Date.now();
}

// ОТРИСОВКА МАГАЗИНА (Цены берутся напрямую из конфига!)
function renderShop() {
    const container = document.getElementById('shop-items-container');
    if (!container || !userAccount) return;
    container.innerHTML = "";

    userAccount.shopData.currentItems.forEach((itemId, index) => {
        const item = ITEMS_DATABASE[itemId];
        if (!item) return;

        const card = document.createElement('div');
        card.className = `item-card rarity-${item.rarity}`;
        card.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-desc">"${item.desc}"</div>
            <div class="item-price">💎 ${item.price}</div>
            <button class="btn-buy" id="buy-btn-${index}">Summon</button>
        `;
        container.appendChild(card);

        const buyBtn = document.getElementById(`buy-btn-${index}`);
        if (userAccount.gems < item.price) {
            buyBtn.disabled = true;
            buyBtn.innerText = "No Gems";
        }

        buyBtn.addEventListener('click', async () => {
            // Перепроверка цены динамически
            const actualPrice = ITEMS_DATABASE[itemId].price;
            if (userAccount.gems >= actualPrice) {
                userAccount.gems -= actualPrice;
                userAccount.inventory.push(itemId);
                await saveData();
                updateUI();
                renderShop();
                alert(`You have summoned: ${item.name}!`);
            }
        });
    });
}

function renderInventory() {
    const container = document.getElementById('inventory-container');
    if (!container || !userAccount) return;
    container.innerHTML = "";

    if (userAccount.inventory.length === 0) {
        container.innerHTML = `<p style="color:#554466; text-align:center; grid-column: 1/-1; padding-top:40px;">Your inventory is empty.<br>Go to Customs Shop to summon entities.</p>`;
        return;
    }

    userAccount.inventory.forEach((itemId) => {
        const item = ITEMS_DATABASE[itemId];
        if (!item) return;

        const card = document.createElement('div');
        card.className = `item-card rarity-${item.rarity}`;
        
        const saleStatus = item.sailable 
            ? `<span style="color:#00ffaa; font-size:11px;">📦 Market Tradable</span>` 
            : `<span style="color:#ff0055; font-size:11px;">🔒 Soulbound</span>`;

        card.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-desc">"${item.desc}"</div>
            <div style="margin-top:auto; padding-top:5px; width:100%; border-top:1px solid rgba(255,255,255,0.05);">${saleStatus}</div>
        `;
        container.appendChild(card);
    });
}

function updateShopTimer() {
    const timerEl = document.getElementById('shop-timer');
    if (!timerEl || !userAccount) return;

    setInterval(() => {
        const now = Date.now();
        const diff = (userAccount.shopData.lastRefresh + 86400000) - now;

        if (diff <= 0) {
            generateNewShopItems();
            saveData();
            renderShop();
            return;
        }

        const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        timerEl.innerText = `${hours}:${minutes}:${seconds}`;
    }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const customsScreen = document.getElementById('customs-screen');
    const inventoryScreen = document.getElementById('inventory-screen');
    const resultOverlay = document.getElementById('result-overlay');

    const btnPlay = document.getElementById('btn-play');
    const btnCashout = document.getElementById('btn-cashout');
    const btnContinue = document.getElementById('btn-continue');
    const btnCustoms = document.getElementById('btn-customs');
    const btnInventory = document.getElementById('btn-inventory');
    const btnCloseCustoms = document.getElementById('btn-close-customs');
    const btnCloseInventory = document.getElementById('btn-close-inventory');
    const doors = document.querySelectorAll('.door');

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

    updateUI = function() {
        if (!userAccount) return; 
        if (accIdEl) accIdEl.innerText = userAccount.telegram_id;
        if (accUsernameEl) {
            accUsernameEl.innerText = userAccount.username === "No Username" || userAccount.username === "LocalHost"
                ? userAccount.username : "@" + userAccount.username;
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
    updateShopTimer();

    if (btnCustoms) {
        btnCustoms.addEventListener('click', () => {
            mainMenu.classList.add('hidden');
            customsScreen.classList.remove('hidden');
            renderShop();
        });
    }
    if (btnCloseCustoms) {
        btnCloseCustoms.addEventListener('click', () => {
            customsScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        });
    }
    if (btnInventory) {
        btnInventory.addEventListener('click', () => {
            mainMenu.classList.add('hidden');
            inventoryScreen.classList.remove('hidden');
            renderInventory();
        });
    }
    if (btnCloseInventory) {
        btnCloseInventory.addEventListener('click', () => {
            inventoryScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        });
    }

    function getRoomReward() {
        const multiplier = 1 + (roomStep * 0.15); 
        const xpGained = Math.floor((Math.random() * 10 + 5) * multiplier);
        if (Math.random() < 0.60) {
            const goldGained = Math.floor((Math.random() * 80 + 40) * multiplier);
            return { type: 'gold', amount: goldGained, xp: xpGained, emoji: '💰', name: 'Gold' };
        } else {
            const gemsGained = Math.floor((Math.random() * 2 + 1) * multiplier);
            return { type: 'gems', amount: gemsGained, xp: xpGained, emoji: '💎', name: 'Gems' };
        }
    }

    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (!userAccount || userAccount.energy <= 0) return;
            if (userAccount.energy === 7) userAccount.lastEnergyUpdate = Date.now();

            userAccount.energy--;
            currentRucksack.xp = 0; currentRucksack.gold = 0; currentRucksack.gems = 0;
            roomStep = 1;

            saveData(); updateUI(); resetDoors();
            mainMenu.classList.add('hidden');
            gameScreen.classList.remove('hidden');
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
                    currentRucksack.xp = 0; currentRucksack.gold = 0; currentRucksack.gems = 0;
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
                setTimeout(() => { if (resultOverlay) resultOverlay.classList.remove('hidden'); }, 400);
            }, 250);
        });
    });

    if (btnContinue) {
        btnContinue.addEventListener('click', () => {
            if (resultOverlay) resultOverlay.classList.add('hidden');
            resetDoors(); canClickDoor = true;
            if (isDeadInThisRoom) {
                gameScreen.classList.add('hidden');
                mainMenu.classList.remove('hidden');
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
            currentRucksack.xp = 0; currentRucksack.gold = 0; currentRucksack.gems = 0;

            await saveData();
            gameScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
            updateUI();
        });
    }

    function resetDoors() {
        doors.forEach(door => { door.innerText = '🚪'; door.style.transform = "none"; });
    }

    setInterval(() => {
        if (!userAccount) return;
        if (userAccount.energy >= 7) { userAccount.lastEnergyUpdate = Date.now(); return; }
        const now = Date.now();
        if (now - userAccount.lastEnergyUpdate >= 3600000) {
            userAccount.energy++;
            userAccount.lastEnergyUpdate += 3600000;
            saveData(); updateUI();
        }
    }, 60000);
});
                    
