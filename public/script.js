// --- Инициализация Telegram WebApp ---
const tg = window.Telegram.WebApp;
tg.ready(); // Говорим Telegram, что приложение готово
tg.expand(); // Разворачиваем на весь экран

// --- Состояние игры (синглтон) ---
class GameState {
    constructor() {
        this.coins = 0;
        this.multiplier = 1; // Множитель за удвоение
        this.afkActive = false; // Активен ли AFK кликер
        this.randomBoostActive = false; // Куплен ли рандомный буст
        this.clickCount = 0; // Счётчик для рандомного буста
        this.load();
    }

    // Загрузка из localStorage
    load() {
        const saved = localStorage.getItem('pzkGameState');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.coins = data.coins || 0;
                this.multiplier = data.multiplier || 1;
                this.afkActive = data.afkActive || false;
                this.randomBoostActive = data.randomBoostActive || false;
                this.clickCount = data.clickCount || 0;
            } catch (e) {
                console.error('Ошибка загрузки состояния', e);
            }
        }
    }

    // Сохранение в localStorage
    save() {
        const data = {
            coins: this.coins,
            multiplier: this.multiplier,
            afkActive: this.afkActive,
            randomBoostActive: this.randomBoostActive,
            clickCount: this.clickCount,
        };
        localStorage.setItem('pzkGameState', JSON.stringify(data));
    }

    // Сброс (не используется, но может пригодиться)
    reset() {
        this.coins = 0;
        this.multiplier = 1;
        this.afkActive = false;
        this.randomBoostActive = false;
        this.clickCount = 0;
        this.save();
    }
}

// --- Классы бустов (Стратегия) ---

class Boost {
    constructor(price, gameState) {
        this.price = price;
        this.gameState = gameState;
    }
    // Метод для покупки
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
        throw new Error('Метод apply должен быть реализован');
    }
}

class AfkBoost extends Boost {
    constructor(gameState) {
        super(10, gameState); // Начальная цена 10
    }
    apply() {
        if (!this.gameState.afkActive) {
            this.gameState.afkActive = true;
            // Запускаем интервал (в реальном коде лучше управлять интервалами централизованно)
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

// --- Основной контроллер приложения ---
const gameState = new GameState();

// Экземпляры бустов
const boosts = {
    afk: new AfkBoost(gameState),
    double: new DoubleBoost(gameState),
    random: new RandomBoost(gameState)
};

// --- Элементы DOM ---
const coinBalanceEl = document.getElementById('coinBalance');
const clickableCoin = document.getElementById('clickableCoin');
const afkPriceEl = document.getElementById('afkPrice');
const doublePriceEl = document.getElementById('doublePrice');
const randomPriceEl = document.getElementById('randomPrice');
const buyButtons = document.querySelectorAll('.buy-btn');

// --- Функции обновления UI ---
function updateUI() {
    coinBalanceEl.textContent = gameState.coins;
    
    // Блокировка кнопок, если не хватает денег
    buyButtons.forEach(btn => {
        const boostType = btn.dataset.boost;
        let price = 0;
        if (boostType === 'afk') price = boosts.afk.price;
        if (boostType === 'double') price = boosts.double.price;
        if (boostType === 'random') price = boosts.random.price;
        
        if (gameState.coins < price) {
            btn.disabled = true;
        } else {
            btn.disabled = false;
        }
    });
    
    // Можно добавить индикацию купленных бустов
    if (gameState.afkActive) {
        document.getElementById('boostAfk').style.opacity = '0.7';
    }
}

// --- Обработчики событий ---

// Клик по монете
clickableCoin.addEventListener('click', () => {
    // Анимация
    clickableCoin.classList.add('coin-animate');
    setTimeout(() => clickableCoin.classList.remove('coin-animate'), 300);

    // Начисление монет с учётом множителя
    gameState.coins += 1 * gameState.multiplier;
    
    // Счётчик для рандомного буста
    if (gameState.randomBoostActive) {
        gameState.clickCount++;
        if (gameState.clickCount >= 50) {
            // Рандомное число монет от 5 до 25
            const bonus = Math.floor(Math.random() * 21) + 5; 
            gameState.coins += bonus;
            gameState.clickCount = 0; // Сброс счётчика
            // Визуальное оповещение (можно через tg.showPopup)
            tg.HapticFeedback.impactOccurred('medium'); // Вибрация
        }
    }

    gameState.save();
    updateUI();
});

// Покупка бустов
buyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const boostType = e.target.dataset.boost;
        const boost = boosts[boostType];
        if (boost && boost.buy()) {
            // Успешная покупка
            tg.HapticFeedback.notificationOccurred('success');
            updateUI();
            // Если это AFK и он стал активным, обновим цену в UI (для простоты цену не меняем)
        } else {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
});

// --- Инициализация при загрузке ---
updateUI();

// --- Обработка закрытия приложения (опционально) ---
tg.onEvent('mainButtonClicked', () => {
    tg.sendData(JSON.stringify({ coins: gameState.coins }));
});

// Запускаем AFK интервал, если он уже был активен
if (gameState.afkActive && !window.afkInterval) {
    window.afkInterval = setInterval(() => {
        gameState.coins += 1;
        gameState.save();
        updateUI();
    }, 1000);
}   