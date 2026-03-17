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
            if (!window.afkInterval) {
                window.afkInterval = setInterval(() => {
                    if (this.gameState.afkActive) {
                        this.gameState.coins += 1;
                        this.gameState.save();
                        updateUI();
                    }
                }, 1000);
            }
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

const gameState = new GameState();

const boosts = {
    afk: new AfkBoost(gameState),
    double: new DoubleBoost(gameState),
    random: new RandomBoost(gameState)
};

const coinBalanceEl = document.getElementById('coinBalance');
const clickableCoin = document.getElementById('clickableCoin');
const afkPriceEl = document.getElementById('afkPrice');
const doublePriceEl = document.getElementById('doublePrice');
const randomPriceEl = document.getElementById('randomPrice');
const buyButtons = document.querySelectorAll('.neon-btn');

function updateUI() {
    coinBalanceEl.textContent = gameState.coins;
    
    afkPriceEl.textContent = boosts.afk.price;
    doublePriceEl.textContent = boosts.double.price;
    randomPriceEl.textContent = boosts.random.price;
    
    buyButtons.forEach(btn => {
        const boostType = btn.dataset.boost;
        let price = 0;
        if (boostType === 'afk') price = boosts.afk.price;
        if (boostType === 'double') price = boosts.double.price;
        if (boostType === 'random') price = boosts.random.price;
        
        btn.disabled = gameState.coins < price;
    });
}

clickableCoin.addEventListener('click', () => {
    clickableCoin.classList.add('coin-animate');
    setTimeout(() => clickableCoin.classList.remove('coin-animate'), 300);

    gameState.coins += 1 * gameState.multiplier;
    
    if (gameState.randomBoostActive) {
        gameState.clickCount++;
        if (gameState.clickCount >= 50) {
            const bonus = Math.floor(Math.random() * 21) + 5;
            gameState.coins += bonus;
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
        const boost = boosts[boostType];
        if (boost && boost.buy()) {
            tg.HapticFeedback.notificationOccurred('success');
            updateUI();
        } else {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
});

updateUI();

if (gameState.afkActive && !window.afkInterval) {
    window.afkInterval = setInterval(() => {
        gameState.coins += 1;
        gameState.save();
        updateUI();
    }, 1000);
}
