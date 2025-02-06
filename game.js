// Game Configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 360,
    height: 640,
    backgroundColor: '#1a1a1a',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Game State
let game;
let flame;
let flameEmitter;
let obstacles;
let coins;
let powerUps;
let score = 0;
let coinsCollected = parseInt(localStorage.getItem('coins')) || 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let difficulty = 1;
let isShieldActive = false;
let scoreText;
let coinText;
let shopOpen = false;

// Shop Configuration
const FLAME_COLORS = {
    classic: { price: 0, hex: 0xff4500 },
    blue: { price: 100, hex: 0x00bfff },
    purple: { price: 150, hex: 0x9b59b6 },
    neon: { price: 200, hex: 0x00ff00 },
    golden: { price: 300, hex: 0xffd700 },
    rainbow: { price: 500, hex: 'rainbow' }
};

let currentFlame = localStorage.getItem('currentFlame') || 'classic';

// Phaser Lifecycle Functions
function preload() {
    this.load.image('particle', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==');
}

function create() {
    // Flame Setup
    flame = this.physics.add.sprite(180, 600, 'particle').setScale(1.5);
    flame.body.setCircle(25);
    updateFlameAppearance();

    // Obstacles
    obstacles = this.physics.add.group();
    this.time.addEvent({
        delay: 1500,
        callback: () => spawnObstacle(this),
        loop: true
    });

    // Collectibles
    coins = this.physics.add.group();
    powerUps = this.physics.add.group();
    this.time.addEvent({
        delay: 2500,
        callback: () => spawnCollectible(this),
        loop: true
    });

    // HUD
    scoreText = this.add.text(20, 20, `Score: 0`, {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 2
    });

    coinText = this.add.text(20, 60, `Coins: ${coinsCollected}`, {
        fontSize: '20px',
        fill: '#ffd700',
        fontFamily: 'Arial'
    });

    this.add.text(20, 100, `High Score: ${highScore}`, {
        fontSize: '20px',
        fill: '#2ecc71',
        fontFamily: 'Arial'
    });

    // Shop Button
    const shopButton = this.add.rectangle(320, 50, 40, 40, 0x3498db)
        .setInteractive()
        .on('pointerdown', () => openShop(this));
    this.add.text(305, 35, '🛒', { fontSize: '24px' });

    // Touch Controls
    this.input.on('pointermove', (pointer) => {
        if (!shopOpen) {
            flame.x = Phaser.Math.Clamp(pointer.x, 30, 330);
            flame.y = Phaser.Math.Clamp(pointer.y, 30, 610);
        }
    });
}

function update() {
    if (this.gameOver) return;

    // Difficulty progression
    difficulty += 0.002;
    score += Math.floor(difficulty * 10);
    scoreText.setText(`Score: ${score}`);

    // Collision checks
    this.physics.overlap(flame, obstacles, handleObstacleCollision, null, this);
    this.physics.overlap(flame, coins, handleCoinCollection, null, this);
    this.physics.overlap(flame, powerUps, handlePowerUpCollection, null, this);
}

// Game Logic
function spawnObstacle(scene) {
    const obstacleTypes = ['static', 'moving', 'rotating'];
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    const obstacle = scene.physics.add.sprite(
        Phaser.Math.Between(50, 310),
        -100,
        'particle'
    ).setTint(0x666666);

    switch(type) {
        case 'moving':
            obstacle.body.velocity.x = Phaser.Math.Between(-100, 100);
            break;
        case 'rotating':
            obstacle.setAngularVelocity(Phaser.Math.Between(-200, 200));
            break;
    }

    obstacle.body.velocity.y = 200 * difficulty;
    obstacle.setScale(Phaser.Math.FloatBetween(0.5, 1.2));
    obstacles.add(obstacle);
}

function spawnCollectible(scene) {
    // Coins
    const coin = scene.physics.add.sprite(
        Phaser.Math.Between(50, 310),
        -50,
        'particle'
    ).setTint(0xffd700)
     .setScale(0.8)
     .setData('type', 'coin');
    coin.body.velocity.y = 150;
    coins.add(coin);

    // Power-ups
    if (Math.random() < 0.25) {
        const powerUp = scene.physics.add.sprite(
            Phaser.Math.Between(50, 310),
            -100,
            'particle'
        ).setTint(0x00ff00)
         .setScale(1.2)
         .setData('type', 'shield');
        powerUp.body.velocity.y = 120;
        powerUps.add(powerUp);
    }
}

// Collision Handlers
function handleCoinCollection(player, coin) {
    coin.destroy();
    coinsCollected += 10;
    coinText.setText(`Coins: ${coinsCollected}`);
    localStorage.setItem('coins', coinsCollected);
    this.cameras.main.shake(50, 0.005);
}

function handlePowerUpCollection(player, powerUp) {
    powerUp.destroy();
    isShieldActive = true;
    this.time.delayedCall(5000, () => isShieldActive = false);
    
    // Shield effect
    this.add.particles('particle').createEmitter({
        x: player.x,
        y: player.y,
        speed: 100,
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        tint: 0x00ff00,
        lifespan: 1000,
        frequency: 50,
        follow: player
    });
}

function handleObstacleCollision(player, obstacle) {
    if (!isShieldActive) {
        gameOver(this);
    }
    obstacle.destroy();
}

function gameOver(scene) {
    scene.gameOver = true;
    scene.physics.pause();
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    
    scene.cameras.main.flash(500, 255, 0, 0);
    scene.add.rectangle(180, 320, 300, 200, 0x000000).setAlpha(0.9);
    scene.add.text(100, 300, 'GAME OVER', { 
        fontSize: '32px', 
        fill: '#ff0000',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 4
    });
    
    scene.input.once('pointerdown', () => location.reload());
}

// Shop System
function openShop(scene) {
    shopOpen = true;
    scene.scene.pause();
    document.getElementById('shop').style.display = 'block';
    updateShopDisplay();
}

function closeShop() {
    shopOpen = false;
    document.getElementById('shop').style.display = 'none';
    game.scene.resume();
}

function updateShopDisplay() {
    const container = document.getElementById('color-buttons');
    container.innerHTML = '';
    
    Object.entries(FLAME_COLORS).forEach(([name, data]) => {
        const isUnlocked = localStorage.getItem(`color_${name}`) === 'true' || name === 'classic';
        const isSelected = currentFlame === name;
        
        const btn = document.createElement('div');
        btn.className = `color-btn ${isSelected ? 'selected' : ''}`;
        btn.style.background = typeof data.hex === 'number' 
            ? `#${data.hex.toString(16)}` 
            : 'linear-gradient(45deg, #ff0000, #ff9900, #ffff00, #00ff00, #0099ff, #9900ff)';
        btn.innerHTML = `
            <div style="font-weight: bold;">${name.toUpperCase()}</div>
            ${!isUnlocked ? `<div>🪙 ${data.price}</div>` : '<div>UNLOCKED</div>'}
        `;
        
        btn.onclick = () => handleColorSelection(name, data, isUnlocked);
        container.appendChild(btn);
    });
    
    document.getElementById('coins-display').textContent = `🪙 ${coinsCollected}`;
}

function handleColorSelection(name, data, isUnlocked) {
    if (!isUnlocked) {
        if (coinsCollected >= data.price) {
            coinsCollected -= data.price;
            localStorage.setItem(`color_${name}`, 'true');
            localStorage.setItem('coins', coinsCollected);
        } else {
            alert('Not enough coins!');
            return;
        }
    }
    
    currentFlame = name;
    localStorage.setItem('currentFlame', name);
    updateFlameAppearance();
    updateShopDisplay();
}

function updateFlameAppearance() {
    if (flameEmitter) flameEmitter.stop();
    
    const colors = FLAME_COLORS[currentFlame].hex === 'rainbow'
        ? [0xff0000, 0xff9900, 0xffff00, 0x00ff00, 0x0099ff, 0x9900ff]
        : [FLAME_COLORS[currentFlame].hex];

    flameEmitter = game.scene.scenes[0].add.particles('particle').createEmitter({
        x: flame.x,
        y: flame.y,
        speed: { min: -30, max: 30 },
        angle: { min: 260, max: 280 },
        scale: { start: 0.6, end: 0 },
        blendMode: 'ADD',
        alpha: { start: 1, end: 0 },
        tint: colors,
        lifespan: 600,
        frequency: 30,
        follow: flame,
        followOffset: { x: 0, y: 10 }
    });
}

game = new Phaser.Game(config);