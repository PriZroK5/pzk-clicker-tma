const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

class GameState {
    constructor() {
        this.coins = 0;
        this.multiplier = 1;
        this.afkActive = false;
        this.randomBoostActive = false;
        this.clickCount = 0;
        this.powerBoost = 0;
        this.luckBoost = 0;
        this.superAfkActive = false;
        this.magnetActive = false;
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
                this.randomBoostActive = data.randomBoostActive || false;
                this.clickCount = data.clickCount || 0;
                this.powerBoost = data.powerBoost || 0;
                this.luckBoost = data.luckBoost || 0;
                this.superAfkActive = data.superAfkActive || false;
                this.magnetActive = data.magnetActive || false;
            } catch (e) {
                console.error('Load error', e);
            }
        }
    }

    save() {
        const data = {
            coins: this.coins,
            multiplier: this.multiplier,
            afkActive: this.afkActive,
            randomBoostActive: this.randomBoostActive,
            clickCount: this.clickCount,
            powerBoost: this.powerBoost,
            luckBoost: this.luckBoost,
            superAfkActive: this.superAfkActive,
            magnetActive: this.magnetActive
        };
        localStorage.setItem('pzkNeonState', JSON.stringify(data));
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
            this.apply();
            this.gameState.save();
            return true;
        }
        return false;
    }
    apply() {
        throw new Error('Apply method required');
    }
}

class AfkBoost extends Boost {
    constructor(gameState) {
        super(10, gameState);
    }
    apply() {
        if (!this.gameState.afkActive) {
            this.gameState.afkActive = true;
            this.startAfkInterval();
        }
    }
    startAfkInterval() {
        if (!window.afkInterval) {
            window.afkInterval = setInterval(() => {
                let gain = 1;
                if (this.gameState.superAfkActive) gain += 3;
                if (this.gameState.magnetActive) gain = Math.floor(gain * 1.1);
                this.gameState.coins += gain;
                this.gameState.save();
                updateUI();
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
    }
}

class RandomBoost extends Boost {
    constructor(gameState) {
        super(100, gameState);
    }
    apply() {
        this.gameState.randomBoostActive = true;
    }
}

class PowerBoost extends Boost {
    constructor(gameState) {
        super(200, gameState);
    }
    apply() {
        this.gameState.powerBoost += 2;
    }
}

class LuckBoost extends Boost {
    constructor(gameState) {
        super(300, gameState);
    }
    apply() {
        this.gameState.luckBoost += 5;
    }
}

class SuperAfkBoost extends Boost {
    constructor(gameState) {
        super(500, gameState);
    }
    apply() {
        this.gameState.superAfkActive = true;
        if (this.gameState.afkActive) {
            clearInterval(window.afkInterval);
            window.afkInterval = null;
            new AfkBoost(this.gameState).startAfkInterval();
        }
    }
}

class MagnetBoost extends Boost {
    constructor(gameState) {
        super(1000, gameState);
    }
    apply() {
        this.gameState.magnetActive = true;
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
    magnet: new MagnetBoost(gameState)
};

const coinBalanceEl = document.getElementById('coinBalance');
const clickableCoin = document.getElementById('clickableCoin');
const coinWrapper = document.getElementById('coinWrapper');
const floatingContainer = document.getElementById('floatingNumbers');
const afkPriceEl = document.getElementById('afkPrice');
const doublePriceEl = document.getElementById('doublePrice');
const randomPriceEl = document.getElementById('randomPrice');
const powerPriceEl = document.getElementById('powerPrice');
const luckPriceEl = document.getElementById('luckPrice');
const superAfkPriceEl = document.getElementById('superAfkPrice');
const magnetPriceEl = document.getElementById('magnetPrice');
const buyButtons = document.querySelectorAll('.neon-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const selectBasicBtn = document.getElementById('selectBasic');
const selectVipBtn = document.getElementById('selectVip');
const basicRoulette = document.getElementById('basicRoulette');
const vipRoulette = document.getElementById('vipRoulette');
const basicWheel = document.getElementById('basicWheel');
const vipWheel = document.getElementById('vipWheel');
const spinBasicBtn = document.getElementById('spinBasic');
const spinVipBtn = document.getElementById('spinVip');
const rouletteResult = document.getElementById('rouletteResult');

function createFloatingNumber(value) {
    const num = document.createElement('div');
    num.className = 'floating-number';
    num.textContent = `+${value}`;
    
    const x = Math.random() * 100 + '%';
    const y = Math.random() * 50 + 25 + '%';
    
    num.style.left = x;
    num.style.top = y;
    
    floatingContainer.appendChild(num);
    
    setTimeout(() => {
        num.remove();
    }, 1000);
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

if (selectBasicBtn && selectVipBtn) {
    selectBasicBtn.addEventListener('click', () => {
        selectBasicBtn.classList.add('active');
        selectVipBtn.classList.remove('active');
        basicRoulette.classList.add('active');
        vipRoulette.classList.remove('active');
    });

    selectVipBtn.addEventListener('click', () => {
        selectVipBtn.classList.add('active');
        selectBasicBtn.classList.remove('active');
        vipRoulette.classList.add('active');
        basicRoulette.classList.remove('active');
    });
}

function updateUI() {
    coinBalanceEl.textContent = gameState.coins;
    
    if (afkPriceEl) afkPriceEl.textContent = boosts.afk.price;
    if (doublePriceEl) doublePriceEl.textContent = boosts.double.price;
    if (randomPriceEl) randomPriceEl.textContent = boosts.random.price;
    if (powerPriceEl) powerPriceEl.textContent = boosts.power.price;
    if (luckPriceEl) luckPriceEl.textContent = boosts.luck.price;
    if (superAfkPriceEl) superAfkPriceEl.textContent = boosts.superAfk.price;
    if (magnetPriceEl) magnetPriceEl.textContent = boosts.magnet.price;
    
    buyButtons.forEach(btn => {
        const boostType = btn.dataset.boost;
        if (!boostType) return;
        let price = 0;
        if (boostType === 'afk') price = boosts.afk.price;
        if (boostType === 'double') price = boosts.double.price;
        if (boostType === 'random') price = boosts.random.price;
        if (boostType === 'power') price = boosts.power.price;
        if (boostType === 'luck') price = boosts.luck.price;
        if (boostType === 'superAfk') price = boosts.superAfk.price;
        if (boostType === 'magnet') price = boosts.magnet.price;
        
        btn.disabled = gameState.coins < price;
    });
}

clickableCoin.addEventListener('click', () => {
    clickableCoin.classList.add('coin-animate');
    setTimeout(() => clickableCoin.classList.remove('coin-animate'), 300);

    let gain = 1 * gameState.multiplier;
    gain += gameState.powerBoost;
    
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

function spinRoulette(type) {
    let cost, wheel, minChance, maxChance;
    const luckBonus = gameState.luckBoost;
    
    if (type === 'basic') {
        cost = 150;
        wheel = basicWheel;
    } else {
        cost = 1000;
        wheel = vipWheel;
    }

    if (gameState.coins < cost) {
        rouletteResult.textContent = '❌ НЕДОСТАТОЧНО МОНЕТ';
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
        
        rouletteResult.textContent = `🎉 ВЫ ВЫИГРАЛИ ${winAmount} PZK!`;
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

updateUI();

if (gameState.afkActive && !window.afkInterval) {
    new AfkBoost(gameState).startAfkInterval();
}
