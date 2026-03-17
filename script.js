const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

class GameState {
    constructor() {
        this.coins = 1000; // Для теста
        this.multiplier = 1;
        this.afkActive = false;
        this.afkLevel = 1;
        this.afkBaseGain = 1;
        this.randomBoostActive = false;
        this.clickCount = 0;
        this.powerBoost = 0;
        this.luckBoost = 0;
        this.superAfkActive = false;
        this.magnetActive = false;
        this.maxEnergy = 100;
        this.currentEnergy = 100;
        this.energyLevel = 1;
        this.energyMultiplier = 2;
        this.load();
    }

    load() {
        const saved = localStorage.getItem('pzkNeonState');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.coins = data.coins || 0;
                this.multiplier = data.multiplier || 1;
                this.afkActive = data.afkActive || false;
                this.afkLevel = data.afkLevel || 1;
                this.afkBaseGain = data.afkBaseGain || 1;
                this.randomBoostActive = data.randomBoostActive || false;
                this.clickCount = data.clickCount || 0;
                this.powerBoost = data.powerBoost || 0;
                this.luckBoost = data.luckBoost || 0;
                this.superAfkActive = data.superAfkActive || false;
                this.magnetActive = data.magnetActive || false;
                this.energyLevel = data.energyLevel || 1;
                this.energyMultiplier = data.energyMultiplier || 2;
                
                this.updateMaxEnergy();
                this.currentEnergy = data.currentEnergy !== undefined ? data.currentEnergy : this.maxEnergy;
                if (this.currentEnergy > this.maxEnergy) this.currentEnergy = this.maxEnergy;
            } catch (e) {
                console.error('Load error', e);
            }
        }
    }

    updateMaxEnergy() {
        this.maxEnergy = 100 * Math.pow(this.energyMultiplier, this.energyLevel - 1);
    }

    save() {
        this.updateMaxEnergy();
        const data = {
            coins: this.coins,
            multiplier: this.multiplier,
            afkActive: this.afkActive,
            afkLevel: this.afkLevel,
            afkBaseGain: this.afkBaseGain,
            randomBoostActive: this.randomBoostActive,
            clickCount: this.clickCount,
            powerBoost: this.powerBoost,
            luckBoost: this.luckBoost,
            superAfkActive: this.superAfkActive,
            magnetActive: this.magnetActive,
            energyLevel: this.energyLevel,
            energyMultiplier: this.energyMultiplier,
            currentEnergy: this.currentEnergy,
            maxEnergy: this.maxEnergy
        };
        localStorage.setItem('pzkNeonState', JSON.stringify(data));
    }

    useEnergy(amount) {
        if (this.currentEnergy >= amount) {
            this.currentEnergy -= amount;
            this.save();
            return true;
        }
        return false;
    }

    chargeEnergy(percent) {
        const cost = Math.floor(this.maxEnergy * percent * 0.1);
        if (this.coins >= cost) {
            this.coins -= cost;
            this.currentEnergy = Math.min(this.currentEnergy + Math.floor(this.maxEnergy * percent), this.maxEnergy);
            this.save();
            return true;
        }
        return false;
    }

    upgradeEnergy() {
        const cost = this.getEnergyUpgradeCost();
        if (this.coins >= cost && this.energyLevel < 10) {
            this.coins -= cost;
            this.energyLevel++;
            this.updateMaxEnergy();
            this.currentEnergy = this.maxEnergy;
            this.save();
            return true;
        }
        return false;
    }

    getEnergyUpgradeCost() {
        return 300 * Math.pow(2, this.energyLevel - 1);
    }

    getAfkGain() {
        let gain = this.afkBaseGain;
        if (this.superAfkActive) gain += 3;
        if (this.magnetActive) gain = Math.floor(gain * 1.1);
        return gain * this.afkLevel;
    }

    upgradeAfk() {
        if (this.afkLevel < 10) {
            this.afkLevel++;
            this.save();
            return true;
        }
        return false;
    }
}

class Boost {
    constructor(price, gameState) {
        this.price = price;
        this.gameState = gameState;
    }
    buy() {
        if (this.gameState.coins >= this.price) {
            this.gameState.coins -= this.price;
            const result = this.apply();
            this.gameState.save();
            return result;
        }
        return false;
    }
    apply() {
        throw new Error('Apply method required');
    }
}

class AfkBoost extends Boost {
    constructor(gameState) {
        super(10 * Math.pow(2, gameState.afkLevel - 1), gameState);
    }
    apply() {
        if (!this.gameState.afkActive) {
            this.gameState.afkActive = true;
        }
        const upgraded = this.gameState.upgradeAfk();
        this.startAfkInterval();
        return upgraded;
    }
    startAfkInterval() {
        if (!window.afkInterval) {
            window.afkInterval = setInterval(() => {
                if (this.gameState.afkActive) {
                    const gain = this.gameState.getAfkGain();
                    this.gameState.coins += gain;
                    createFloatingNumber(gain);
                    this.gameState.save();
                    updateUI();
                }
            }, 1000);
        }
    }
}

class DoubleBoost extends Boost {
    constructor(gameState) {
        super(50, gameState);
    }
    apply() {
        this.gameState.multiplier *= 2;
        return true;
    }
}

class RandomBoost extends Boost {
    constructor(gameState) {
        super(100, gameState);
    }
    apply() {
        this.gameState.randomBoostActive = true;
        return true;
    }
}

class PowerBoost extends Boost {
    constructor(gameState) {
        super(200, gameState);
    }
    apply() {
        this.gameState.powerBoost += 2;
        return true;
    }
}

class LuckBoost extends Boost {
    constructor(gameState) {
        super(300, gameState);
    }
    apply() {
        this.gameState.luckBoost += 5;
        return true;
    }
}

class SuperAfkBoost extends Boost {
    constructor(gameState) {
        super(500, gameState);
    }
    apply() {
        this.gameState.superAfkActive = true;
        return true;
    }
}

class EnergyUpgradeBoost extends Boost {
    constructor(gameState) {
        super(gameState.getEnergyUpgradeCost(), gameState);
    }
    apply() {
        return this.gameState.upgradeEnergy();
    }
}

class MagnetBoost extends Boost {
    constructor(gameState) {
        super(1500, gameState);
    }
    apply() {
        this.gameState.magnetActive = true;
        return true;
    }
}

const gameState = new GameState();

const boosts = {
    afk: new AfkBoost(gameState),
    double: new DoubleBoost(gameState),
    random: new RandomBoost(gameState),
    power: new PowerBoost(gameState),
    luck: new LuckBoost(gameState),
    superAfk: new SuperAfkBoost(gameState),
    energyUpgrade: new EnergyUpgradeBoost(gameState),
    magnet: new MagnetBoost(gameState)
};

const coinBalanceEl = document.getElementById('coinBalance');
const clickableCoin = document.getElementById('clickableCoin');
const coinWrapper = document.getElementById('coinWrapper');
const floatingContainer = document.getElementById('floatingNumbers');
const energyDisplay = document.getElementById('energyDisplay');
const energyFill = document.getElementById('energyFill');
const afkLevelEl = document.getElementById('afkLevel');
const afkIncomeEl = document.getElementById('afkIncome');
const multiplierDisplay = document.getElementById('multiplierDisplay');
const afkGainEl = document.getElementById('afkGain');
const afkPriceEl = document.getElementById('afkPrice');
const doublePriceEl = document.getElementById('doublePrice');
const randomPriceEl = document.getElementById('randomPrice');
const powerPriceEl = document.getElementById('powerPrice');
const luckPriceEl = document.getElementById('luckPrice');
const superAfkPriceEl = document.getElementById('superAfkPrice');
const energyLevelEl = document.getElementById('energyLevel');
const energyMultEl = document.getElementById('energyMult');
const energyUpgradePriceEl = document.getElementById('energyUpgradePrice');
const magnetPriceEl = document.getElementById('magnetPrice');
const buyButtons = document.querySelectorAll('.neon-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const basicWheel = document.getElementById('basicWheel');
const vipWheel = document.getElementById('vipWheel');
const spinBasicBtn = document.getElementById('spinBasic');
const spinVipBtn = document.getElementById('spinVip');
const basicResult = document.getElementById('basicResult');
const vipResult = document.getElementById('vipResult');
const chargeHalfBtn = document.getElementById('chargeHalf');
const chargeFullBtn = document.getElementById('chargeFull');

let noEnergyMessage = null;

function createFloatingNumber(value) {
    const num = document.createElement('div');
    num.className = 'floating-number';
    num.textContent = `+${value}`;
    
    const x = Math.random() * 80 + 10 + '%';
    const y = Math.random() * 50 + 25 + '%';
    
    num.style.left = x;
    num.style.top = y;
    
    floatingContainer.appendChild(num);
    
    setTimeout(() => {
        num.remove();
    }, 1000);
}

function showNoEnergyMessage() {
    if (noEnergyMessage) return;
    
    noEnergyMessage = document.createElement('div');
    noEnergyMessage.className = 'no-energy-message';
    noEnergyMessage.textContent = '⚡ НЕТ ЭНЕРГИИ ⚡';
    coinWrapper.appendChild(noEnergyMessage);
    
    setTimeout(() => {
        if (noEnergyMessage) {
            noEnergyMessage.remove();
            noEnergyMessage = null;
        }
    }, 1500);
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    });
});

function updateUI() {
    coinBalanceEl.textContent = gameState.coins;
    
    gameState.updateMaxEnergy();
    const energyPercent = (gameState.currentEnergy / gameState.maxEnergy) * 100;
    energyDisplay.textContent = `${gameState.currentEnergy}/${Math.floor(gameState.maxEnergy)}`;
    energyFill.style.width = `${energyPercent}%`;
    
    if (gameState.currentEnergy <= 0) {
        coinWrapper.classList.add('disabled');
    } else {
        coinWrapper.classList.remove('disabled');
    }
    
    if (afkLevelEl) afkLevelEl.textContent = gameState.afkLevel;
    if (afkIncomeEl) afkIncomeEl.textContent = `${gameState.getAfkGain()}/сек`;
    if (multiplierDisplay) multiplierDisplay.textContent = `${gameState.multiplier}x`;
    if (afkGainEl) afkGainEl.textContent = gameState.getAfkGain();
    
    boosts.afk.price = 10 * Math.pow(2, gameState.afkLevel - 1);
    boosts.energyUpgrade.price = gameState.getEnergyUpgradeCost();
    
    if (afkPriceEl) afkPriceEl.textContent = boosts.afk.price;
    if (doublePriceEl) doublePriceEl.textContent = boosts.double.price;
    if (randomPriceEl) randomPriceEl.textContent = boosts.random.price;
    if (powerPriceEl) powerPriceEl.textContent = boosts.power.price;
    if (luckPriceEl) luckPriceEl.textContent = boosts.luck.price;
    if (superAfkPriceEl) superAfkPriceEl.textContent = boosts.superAfk.price;
    if (energyLevelEl) energyLevelEl.textContent = gameState.energyLevel;
    if (energyMultEl) energyMultEl.textContent = gameState.energyMultiplier;
    if (energyUpgradePriceEl) energyUpgradePriceEl.textContent = boosts.energyUpgrade.price;
    if (magnetPriceEl) magnetPriceEl.textContent = boosts.magnet.price;
    
    buyButtons.forEach(btn => {
        const boostType = btn.dataset.boost;
        if (!boostType) return;
        let price = 0;
        let canBuy = true;
        
        if (boostType === 'afk') {
            price = boosts.afk.price;
            canBuy = gameState.afkLevel < 10;
        }
        if (boostType === 'double') price = boosts.double.price;
        if (boostType === 'random') price = boosts.random.price;
        if (boostType === 'power') price = boosts.power.price;
        if (boostType === 'luck') price = boosts.luck.price;
        if (boostType === 'superAfk') {
            price = boosts.superAfk.price;
            canBuy = !gameState.superAfkActive;
        }
        if (boostType === 'energyUpgrade') {
            price = boosts.energyUpgrade.price;
            canBuy = gameState.energyLevel < 10;
        }
        if (boostType === 'magnet') {
            price = boosts.magnet.price;
            canBuy = !gameState.magnetActive;
        }
        
        btn.disabled = gameState.coins < price || !canBuy;
    });

    if (chargeHalfBtn) {
        const halfCost = Math.floor(gameState.maxEnergy * 0.5 * 0.1);
        chargeHalfBtn.textContent = `🔋 ЗАРЯДИТЬ 50% (${halfCost} PZK)`;
    }
    if (chargeFullBtn) {
        const fullCost = Math.floor(gameState.maxEnergy * 0.1);
        chargeFullBtn.textContent = `⚡ ЗАРЯДИТЬ 100% (${fullCost} PZK)`;
    }
}

clickableCoin.addEventListener('click', () => {
    if (gameState.currentEnergy <= 0) {
        showNoEnergyMessage();
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    
    clickableCoin.classList.add('coin-animate');
    setTimeout(() => clickableCoin.classList.remove('coin-animate'), 300);

    let gain = 1 * gameState.multiplier;
    gain += gameState.powerBoost;
    
    if (gameState.useEnergy(1)) {
        gameState.coins += gain;
        createFloatingNumber(gain);
        
        if (gameState.randomBoostActive) {
            gameState.clickCount++;
            if (gameState.clickCount >= 50) {
                const bonus = Math.floor(Math.random() * 21) + 5;
                gameState.coins += bonus;
                createFloatingNumber(bonus);
                gameState.clickCount = 0;
                tg.HapticFeedback.impactOccurred('medium');
            }
        }
    }

    gameState.save();
    updateUI();
});

buyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const boostType = e.target.dataset.boost;
        if (!boostType) return;
        const boost = boosts[boostType];
        if (boost && boost.buy()) {
            tg.HapticFeedback.notificationOccurred('success');
            updateUI();
        } else {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
});

if (chargeHalfBtn) {
    chargeHalfBtn.addEventListener('click', () => {
        if (gameState.chargeEnergy(0.5)) {
            tg.HapticFeedback.notificationOccurred('success');
            updateUI();
        } else {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
}

if (chargeFullBtn) {
    chargeFullBtn.addEventListener('click', () => {
        if (gameState.chargeEnergy(1)) {
            tg.HapticFeedback.notificationOccurred('success');
            updateUI();
        } else {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
}

function spinRoulette(type) {
    let cost, wheel, resultEl;
    const luckBonus = gameState.luckBoost;
    
    if (type === 'basic') {
        cost = 150;
        wheel = basicWheel;
        resultEl = basicResult;
    } else {
        cost = 1000;
        wheel = vipWheel;
        resultEl = vipResult;
    }

    if (gameState.coins < cost) {
        if (resultEl) resultEl.textContent = '❌ НЕДОСТАТОЧНО МОНЕТ';
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    gameState.coins -= cost;
    updateUI();
    
    wheel.style.transform = 'rotate(0deg)';
    setTimeout(() => {
        const spins = Math.floor(Math.random() * 5) + 8;
        const degrees = spins * 360 + Math.floor(Math.random() * 360);
        wheel.style.transform = `rotate(${degrees}deg)`;
    }, 10);

    setTimeout(() => {
        let winAmount;
        const chance = Math.random() * 100;
        
        if (type === 'basic') {
            if (chance < 5 + luckBonus) winAmount = 1000;
            else if (chance < 15 + luckBonus) winAmount = 750;
            else if (chance < 30 + luckBonus) winAmount = 500;
            else if (chance < 50 + luckBonus) winAmount = 300;
            else if (chance < 75 + luckBonus) winAmount = 200;
            else if (chance < 90 + luckBonus) winAmount = 100;
            else winAmount = 50;
        } else {
            if (chance < 5 + luckBonus) winAmount = 5000;
            else if (chance < 15 + luckBonus) winAmount = 4500;
            else if (chance < 30 + luckBonus) winAmount = 4000;
            else if (chance < 50 + luckBonus) winAmount = 3500;
            else if (chance < 70 + luckBonus) winAmount = 3000;
            else if (chance < 85 + luckBonus) winAmount = 2500;
            else winAmount = 2000;
        }

        gameState.coins += winAmount;
        gameState.save();
        
        if (resultEl) resultEl.textContent = `🎉 ВЫ ВЫИГРАЛИ ${winAmount} PZK!`;
        createFloatingNumber(winAmount);
        tg.HapticFeedback.notificationOccurred('success');
        updateUI();
    }, 3100);
}

if (spinBasicBtn) {
    spinBasicBtn.addEventListener('click', () => spinRoulette('basic'));
}

if (spinVipBtn) {
    spinVipBtn.addEventListener('click', () => spinRoulette('vip'));
}

// Инициализация
updateUI();

// Запуск AFK интервала если активен
if (gameState.afkActive && !window.afkInterval) {
    new AfkBoost(gameState).startAfkInterval();
}

// Обновление UI каждые 100мс
setInterval(() => {
    updateUI();
}, 100);
