// Gift Snipe Game - Pure JavaScript Implementation

class GiftSnipeGame {
    constructor() {
        this.isPlaying = false;
        this.gifts = [];
        this.stats = {
            score: 0,
            giftCount: 0,
            currentGPS: 0,
            averageGPS: 0,
            peakGPS: 0,
            gameTime: 0
        };
        
        this.settings = {
            difficulty: 'medium',
            mode: 'click',
            giftSize: 50,
            // Custom mode settings
            customSpawnRate: 1000,
            customDespawnTime: 3000,
            customDespawnEnabled: true,
            customEmojis: ['🎁', '🎀', '📦', '🎊', '✨'],
            hoverAnimations: true,
            clickAnimations: true,
            spawnAnimations: true,
            collectAnimations: true,
            soundEnabled: false,
            particleEffects: true,
            screenShake: false,
            backgroundEffects: true,
            // Advanced customization
            minSize: 30,
            maxSize: 80,
            randomSizes: false,
            neonGlow: true,
            rainbowMode: false,
            gravity: 0,
            bounce: 0,
            floating: false,
            multiCollect: false,
            comboMode: false,
            invertedControls: false,
            stealthMode: false
        };

        this.gameStartTime = 0;
        this.lastSecondGifts = [];
        this.spawnInterval = null;
        this.gameInterval = null;
        this.despawnTimeouts = new Map();
        
        this.difficultyConfig = {
            easy: { spawnRate: 1500, despawnTime: null },
            medium: { spawnRate: 1000, despawnTime: null },
            hard: { spawnRate: 700, despawnTime: 4000 },
            impossible: { spawnRate: 400, despawnTime: 2000 },
            custom: { spawnRate: this.settings.customSpawnRate, despawnTime: this.settings.customDespawnEnabled ? this.settings.customDespawnTime : null }
        };

        this.giftEmojis = ['🎁', '🎀', '📦', '🎊', '✨'];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateUI();
        this.updateCustomSettings();
        console.log('Gift Snipe Game initialized');
    }

    bindEvents() {
        // Game control buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('stop-btn').addEventListener('click', () => this.stopGame());

        // Mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isPlaying) return;
                
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.mode = btn.dataset.mode;
                this.updateUI();
            });
        });

        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isPlaying) return;
                
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.difficulty = btn.dataset.difficulty;
                this.updateCustomSettings();
                this.updateUI();
            });
        });

        // Size slider
        const sizeSlider = document.getElementById('size-slider');
        sizeSlider.addEventListener('input', (e) => {
            if (this.isPlaying) return;
            
            this.settings.giftSize = parseInt(e.target.value);
            this.updateSizePreview();
            document.getElementById('size-value').textContent = this.settings.giftSize;
        });

        // Custom settings event listeners
        this.bindCustomSettingsEvents();
    }

    startGame() {
        if (this.isPlaying) return;
        
        console.log('Starting game with settings:', this.settings);
        
        this.isPlaying = true;
        this.gameStartTime = Date.now();
        this.lastSecondGifts = [];
        this.gifts = [];
        this.stats = {
            score: 0,
            giftCount: 0,
            currentGPS: 0,
            averageGPS: 0,
            peakGPS: 0,
            gameTime: 0
        };

        // Clear any existing intervals
        this.clearIntervals();

        // Update UI
        this.updateUI();
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('waiting-screen').style.display = 'flex';
        document.getElementById('start-btn').style.display = 'none';
        document.getElementById('stop-btn').style.display = 'block';

        this.showToast('Game Started!', `Mode: ${this.settings.mode} | Difficulty: ${this.settings.difficulty}`);

        // Start spawning gifts
        const config = this.getSpawnConfig();
        console.log('Using spawn config:', config);
        
        this.spawnInterval = setInterval(() => {
            this.spawnGift();
        }, config.spawnRate);

        // Start game timer and GPS calculations
        this.gameInterval = setInterval(() => {
            this.updateGameStats();
        }, 100);

        // Spawn first gift immediately for testing
        setTimeout(() => {
            this.spawnGift();
        }, 500);
    }

    stopGame() {
        console.log('Stopping game');
        
        this.isPlaying = false;
        this.clearIntervals();
        this.clearAllGifts();

        // Update UI
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('waiting-screen').style.display = 'none';
        document.getElementById('start-btn').style.display = 'block';
        document.getElementById('stop-btn').style.display = 'none';

        this.showToast('Game Stopped', `Final Score: ${this.stats.score.toLocaleString()} | Peak GPS: ${this.stats.peakGPS}`);
    }

    clearIntervals() {
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        
        // Clear all despawn timeouts
        this.despawnTimeouts.forEach(timeout => clearTimeout(timeout));
        this.despawnTimeouts.clear();
    }

    spawnGift() {
        if (!this.isPlaying) return;
        
        console.log('Spawning gift...');
        
        const gameArea = document.getElementById('game-area');
        const rect = gameArea.getBoundingClientRect();
        const margin = this.settings.giftSize;
        
        const emojis = this.settings.difficulty === 'custom' ? this.settings.customEmojis : this.giftEmojis;
        const giftSize = this.settings.randomSizes ? 
            Math.random() * (this.settings.maxSize - this.settings.minSize) + this.settings.minSize :
            this.settings.giftSize;
            
        const gift = {
            id: Math.random().toString(36).substr(2, 9),
            x: Math.random() * (gameArea.offsetWidth - giftSize * 2) + giftSize,
            y: Math.random() * (gameArea.offsetHeight - giftSize * 2) + giftSize,
            size: giftSize,
            spawnTime: Date.now(),
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            velocityY: this.settings.gravity > 0 ? 0 : null,
            velocityX: this.settings.floating ? (Math.random() - 0.5) * 2 : 0
        };
        
        this.gifts.push(gift);
        this.createGiftElement(gift);
        
        // Hide waiting screen if this is the first gift
        if (this.gifts.length === 1) {
            document.getElementById('waiting-screen').style.display = 'none';
        }
        
        // Set despawn timeout for hard/impossible/custom difficulties
        const config = this.getSpawnConfig();
        if (config.despawnTime) {
            const timeout = setTimeout(() => {
                this.removeGift(gift.id);
            }, config.despawnTime);
            
            this.despawnTimeouts.set(gift.id, timeout);
        }
        
        console.log('Gift spawned:', gift.id, 'Total gifts:', this.gifts.length);
    }

    createGiftElement(gift) {
        const giftElement = document.createElement('div');
        
        // Build class list based on settings
        let classList = 'gift';
        if (this.settings.spawnAnimations) classList += ' spawning';
        if (!this.settings.hoverAnimations) classList += ' no-hover';
        if (!this.settings.clickAnimations) classList += ' no-click';
        if (this.settings.rainbowMode) classList += ' rainbow-mode';
        if (this.settings.stealthMode) classList += ' stealth-mode';
        if (this.settings.floating) classList += ' floating';
        
        giftElement.className = classList;
        giftElement.id = `gift-${gift.id}`;
        giftElement.style.left = `${gift.x - gift.size / 2}px`;
        giftElement.style.top = `${gift.y - gift.size / 2}px`;
        giftElement.style.width = `${gift.size}px`;
        giftElement.style.height = `${gift.size}px`;
        giftElement.style.fontSize = `${gift.size * 0.8}px`;
        
        const giftInner = document.createElement('div');
        giftInner.className = 'gift-inner';
        giftInner.textContent = gift.emoji;
        giftElement.appendChild(giftInner);
        
        // Add event listeners based on mode
        if (this.settings.mode === 'click') {
            giftElement.addEventListener('click', () => this.collectGift(gift.id));
        } else if (this.settings.mode === 'hover') {
            giftElement.addEventListener('mouseenter', () => this.collectGift(gift.id));
        }
        
        document.getElementById('game-area').appendChild(giftElement);
        
        // Remove spawning class after animation
        if (this.settings.spawnAnimations) {
            setTimeout(() => {
                giftElement.classList.remove('spawning');
            }, 300);
        }
    }

    collectGift(giftId) {
        const gift = this.gifts.find(g => g.id === giftId);
        if (!gift) return;
        
        console.log('Collecting gift:', giftId);
        
        // Clear despawn timeout
        const timeout = this.despawnTimeouts.get(giftId);
        if (timeout) {
            clearTimeout(timeout);
            this.despawnTimeouts.delete(giftId);
        }
        
        // Remove from gifts array
        this.gifts = this.gifts.filter(g => g.id !== giftId);
        
        // Add to GPS tracking
        const now = Date.now();
        this.lastSecondGifts.push(now);
        this.lastSecondGifts = this.lastSecondGifts.filter(time => time > now - 1000);
        
        // Update stats
        this.stats.score += 10;
        this.stats.giftCount += 1;
        
        // Animate and remove element
        const giftElement = document.getElementById(`gift-${giftId}`);
        if (giftElement) {
            if (this.settings.collectAnimations) {
                giftElement.classList.add('collecting');
                setTimeout(() => {
                    if (giftElement.parentNode) {
                        giftElement.parentNode.removeChild(giftElement);
                    }
                }, 200);
            } else {
                if (giftElement.parentNode) {
                    giftElement.parentNode.removeChild(giftElement);
                }
            }
        }
        
        this.updateUI();
    }

    removeGift(giftId) {
        console.log('Removing gift (despawn):', giftId);
        
        this.gifts = this.gifts.filter(g => g.id !== giftId);
        this.despawnTimeouts.delete(giftId);
        
        const giftElement = document.getElementById(`gift-${giftId}`);
        if (giftElement && giftElement.parentNode) {
            giftElement.parentNode.removeChild(giftElement);
        }
    }

    clearAllGifts() {
        this.gifts = [];
        this.despawnTimeouts.forEach(timeout => clearTimeout(timeout));
        this.despawnTimeouts.clear();
        
        // Remove all gift elements
        document.querySelectorAll('.gift').forEach(gift => {
            if (gift.parentNode) {
                gift.parentNode.removeChild(gift);
            }
        });
    }

    updateGameStats() {
        if (!this.isPlaying) return;
        
        const now = Date.now();
        this.stats.gameTime = Math.floor((now - this.gameStartTime) / 1000);
        
        // Calculate current GPS (gifts in last second)
        const oneSecondAgo = now - 1000;
        const recentGifts = this.lastSecondGifts.filter(time => time > oneSecondAgo);
        this.stats.currentGPS = recentGifts.length;
        
        // Calculate average GPS
        this.stats.averageGPS = this.stats.gameTime > 0 ? 
            Number((this.stats.giftCount / this.stats.gameTime).toFixed(2)) : 0;
        
        // Update peak GPS
        this.stats.peakGPS = Math.max(this.stats.peakGPS, this.stats.currentGPS);
        
        this.updateUI();
    }

    updateUI() {
        // Update stats
        document.getElementById('score').textContent = this.stats.score.toLocaleString();
        document.getElementById('gifts').textContent = this.stats.giftCount;
        document.getElementById('time').textContent = this.formatTime(this.stats.gameTime);
        document.getElementById('current-gps').textContent = `${this.stats.currentGPS}/s`;
        document.getElementById('average-gps').textContent = `${this.stats.averageGPS}/s`;
        document.getElementById('peak-gps').textContent = `${this.stats.peakGPS}/s`;
        
        // Update current mode/difficulty display
        document.getElementById('current-mode').textContent = this.settings.mode;
        document.getElementById('current-difficulty').textContent = this.settings.difficulty;
    }

    updateSizePreview() {
        const preview = document.getElementById('preview-gift');
        preview.style.width = `${this.settings.giftSize}px`;
        preview.style.height = `${this.settings.giftSize}px`;
        preview.style.fontSize = `${this.settings.giftSize * 0.8}px`;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showToast(title, message) {
        const toast = document.getElementById('toast');
        document.getElementById('toast-title').textContent = title;
        document.getElementById('toast-message').textContent = message;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Custom settings methods
    updateCustomSettings() {
        const isCustom = this.settings.difficulty === 'custom';
        const customSection = document.getElementById('custom-settings');
        if (customSection) {
            customSection.style.display = isCustom ? 'block' : 'none';
        }
        
        if (isCustom) {
            // Update custom config
            this.difficultyConfig.custom.spawnRate = this.settings.customSpawnRate;
            this.difficultyConfig.custom.despawnTime = this.settings.customDespawnEnabled ? this.settings.customDespawnTime : null;
        }
    }

    getSpawnConfig() {
        return this.settings.difficulty === 'custom' ? 
            this.difficultyConfig.custom : 
            this.difficultyConfig[this.settings.difficulty];
    }

    bindCustomSettingsEvents() {
        // Spawn rate slider
        const spawnSlider = document.getElementById('spawn-rate-slider');
        if (spawnSlider) {
            spawnSlider.addEventListener('input', (e) => {
                if (this.isPlaying) return;
                this.settings.customSpawnRate = parseInt(e.target.value);
                document.getElementById('spawn-rate-value').textContent = this.settings.customSpawnRate;
                this.updateCustomSettings();
            });
        }

        // Despawn rate slider
        const despawnSlider = document.getElementById('despawn-rate-slider');
        if (despawnSlider) {
            despawnSlider.addEventListener('input', (e) => {
                if (this.isPlaying) return;
                this.settings.customDespawnTime = parseInt(e.target.value);
                document.getElementById('despawn-rate-value').textContent = this.settings.customDespawnTime;
                this.updateCustomSettings();
            });
        }

        // Despawn toggle
        const despawnToggle = document.getElementById('despawn-toggle');
        if (despawnToggle) {
            despawnToggle.addEventListener('change', (e) => {
                if (this.isPlaying) return;
                this.settings.customDespawnEnabled = e.target.checked;
                this.updateCustomSettings();
            });
        }

        // Emoji input - fixed functionality
        const emojiInput = document.getElementById('emoji-input');
        if (emojiInput) {
            emojiInput.addEventListener('input', (e) => {
                if (this.isPlaying) return;
                const input = e.target.value;
                // Better emoji detection and splitting
                const emojis = [...input].filter(char => {
                    // Enhanced emoji regex
                    return char.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/u);
                });
                console.log('Custom emojis parsed:', emojis);
                if (emojis.length > 0) {
                    this.settings.customEmojis = [...new Set(emojis)]; // Remove duplicates
                    console.log('Updated custom emojis:', this.settings.customEmojis);
                } else {
                    // Fallback to default if no valid emojis
                    this.settings.customEmojis = ['🎁', '🎀', '📦', '🎊', '✨'];
                }
            });
        }

        // All toggles and advanced controls
        const controls = [
            // Animation toggles
            { id: 'hover-animations-toggle', key: 'hoverAnimations' },
            { id: 'click-animations-toggle', key: 'clickAnimations' },
            { id: 'spawn-animations-toggle', key: 'spawnAnimations' },
            { id: 'collect-animations-toggle', key: 'collectAnimations' },
            { id: 'particle-effects-toggle', key: 'particleEffects' },
            { id: 'background-effects-toggle', key: 'backgroundEffects' },
            { id: 'neon-glow-toggle', key: 'neonGlow' },
            { id: 'rainbow-mode-toggle', key: 'rainbowMode' },
            // Size controls
            { id: 'random-sizes-toggle', key: 'randomSizes' },
            // Physics controls
            { id: 'floating-toggle', key: 'floating' },
            // Gameplay modifiers
            { id: 'multi-collect-toggle', key: 'multiCollect' },
            { id: 'combo-mode-toggle', key: 'comboMode' },
            { id: 'inverted-controls-toggle', key: 'invertedControls' },
            { id: 'stealth-mode-toggle', key: 'stealthMode' }
        ];

        controls.forEach(({ id, key }) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.settings[key] = e.target.checked;
                    this.updateAnimationClasses();
                });
            }
        });

        // Advanced size controls
        const minSizeSlider = document.getElementById('min-size-slider');
        if (minSizeSlider) {
            minSizeSlider.addEventListener('input', (e) => {
                if (this.isPlaying) return;
                this.settings.minSize = parseInt(e.target.value);
                document.getElementById('min-size-value').textContent = this.settings.minSize;
                // Ensure max is always greater than min
                if (this.settings.maxSize <= this.settings.minSize) {
                    this.settings.maxSize = this.settings.minSize + 10;
                    document.getElementById('max-size-slider').value = this.settings.maxSize;
                    document.getElementById('max-size-value').textContent = this.settings.maxSize;
                }
            });
        }

        const maxSizeSlider = document.getElementById('max-size-slider');
        if (maxSizeSlider) {
            maxSizeSlider.addEventListener('input', (e) => {
                if (this.isPlaying) return;
                this.settings.maxSize = parseInt(e.target.value);
                document.getElementById('max-size-value').textContent = this.settings.maxSize;
                // Ensure min is always less than max
                if (this.settings.minSize >= this.settings.maxSize) {
                    this.settings.minSize = this.settings.maxSize - 10;
                    document.getElementById('min-size-slider').value = this.settings.minSize;
                    document.getElementById('min-size-value').textContent = this.settings.minSize;
                }
            });
        }

        // Physics controls
        const gravitySlider = document.getElementById('gravity-slider');
        if (gravitySlider) {
            gravitySlider.addEventListener('input', (e) => {
                if (this.isPlaying) return;
                this.settings.gravity = parseFloat(e.target.value);
                document.getElementById('gravity-value').textContent = this.settings.gravity;
            });
        }

        const bounceSlider = document.getElementById('bounce-slider');
        if (bounceSlider) {
            bounceSlider.addEventListener('input', (e) => {
                if (this.isPlaying) return;
                this.settings.bounce = parseFloat(e.target.value);
                document.getElementById('bounce-value').textContent = this.settings.bounce;
            });
        }

        // Random emoji button
        const randomEmojisBtn = document.getElementById('random-emojis-btn');
        if (randomEmojisBtn) {
            randomEmojisBtn.addEventListener('click', () => {
                if (this.isPlaying) return;
                const randomEmojis = ['🎁', '🎀', '📦', '🎊', '✨', '🎂', '🍰', '🧁', '🍭', '🍬', '🚀', '🌟', '⭐', '💎', '🔥', '❤️', '🎯', '🏆', '👑', '💫', '🌈', '🦄', '🎪', '🎨', '🎭', '🎬', '🎮', '🎲', '🃏', '🎺', '🎸', '🥳', '🤩', '😎', '🤖', '👾', '🔮', '💝', '🎟️', '🏅'];
                const randomSelection = [];
                for (let i = 0; i < 8; i++) {
                    randomSelection.push(randomEmojis[Math.floor(Math.random() * randomEmojis.length)]);
                }
                const uniqueSelection = [...new Set(randomSelection)];
                this.settings.customEmojis = uniqueSelection;
                document.getElementById('emoji-input').value = uniqueSelection.join('');
            });
        }

        // Preset buttons
        const presetChaos = document.getElementById('preset-chaos-btn');
        if (presetChaos) {
            presetChaos.addEventListener('click', () => this.applyPreset('chaos'));
        }

        const presetZen = document.getElementById('preset-zen-btn');
        if (presetZen) {
            presetZen.addEventListener('click', () => this.applyPreset('zen'));
        }

        const presetSpeed = document.getElementById('preset-speed-btn');
        if (presetSpeed) {
            presetSpeed.addEventListener('click', () => this.applyPreset('speed'));
        }

        const presetRandom = document.getElementById('preset-random-btn');
        if (presetRandom) {
            presetRandom.addEventListener('click', () => this.applyPreset('random'));
        }
    }

    updateAnimationClasses() {
        const gameArea = document.getElementById('game-area');
        if (!gameArea) return;

        // Update gift hover animations
        const gifts = gameArea.querySelectorAll('.gift');
        gifts.forEach(gift => {
            if (this.settings.hoverAnimations) {
                gift.classList.remove('no-hover');
            } else {
                gift.classList.add('no-hover');
            }

            // Update other visual effects
            if (this.settings.rainbowMode) {
                gift.classList.add('rainbow-mode');
            } else {
                gift.classList.remove('rainbow-mode');
            }

            if (this.settings.stealthMode) {
                gift.classList.add('stealth-mode');
            } else {
                gift.classList.remove('stealth-mode');
            }

            if (this.settings.floating) {
                gift.classList.add('floating');
            } else {
                gift.classList.remove('floating');
            }
        });

        // Update game area classes for background effects
        if (this.settings.backgroundEffects) {
            gameArea.classList.add('bg-effects');
        } else {
            gameArea.classList.remove('bg-effects');
        }
    }

    applyPreset(preset) {
        if (this.isPlaying) return;

        switch (preset) {
            case 'chaos':
                this.settings.customSpawnRate = 100;
                this.settings.customDespawnTime = 800;
                this.settings.customDespawnEnabled = true;
                this.settings.randomSizes = true;
                this.settings.minSize = 15;
                this.settings.maxSize = 100;
                this.settings.rainbowMode = true;
                this.settings.floating = true;
                this.settings.gravity = 2;
                this.settings.multiCollect = true;
                break;

            case 'zen':
                this.settings.customSpawnRate = 2000;
                this.settings.customDespawnEnabled = false;
                this.settings.randomSizes = false;
                this.settings.giftSize = 60;
                this.settings.rainbowMode = false;
                this.settings.floating = true;
                this.settings.gravity = 0;
                this.settings.stealthMode = false;
                break;

            case 'speed':
                this.settings.customSpawnRate = 50;
                this.settings.customDespawnTime = 500;
                this.settings.customDespawnEnabled = true;
                this.settings.randomSizes = true;
                this.settings.minSize = 20;
                this.settings.maxSize = 40;
                this.settings.gravity = 3;
                break;

            case 'random':
                this.settings.customSpawnRate = Math.random() * 2000 + 100;
                this.settings.customDespawnTime = Math.random() * 5000 + 500;
                this.settings.customDespawnEnabled = Math.random() > 0.5;
                this.settings.randomSizes = Math.random() > 0.5;
                this.settings.minSize = Math.random() * 30 + 10;
                this.settings.maxSize = Math.random() * 50 + 60;
                this.settings.rainbowMode = Math.random() > 0.7;
                this.settings.floating = Math.random() > 0.5;
                this.settings.gravity = Math.random() * 3;
                this.settings.stealthMode = Math.random() > 0.8;
                break;
        }

        this.updateCustomSettingsUI();
        this.updateCustomSettings();
        this.showToast(`${preset.charAt(0).toUpperCase() + preset.slice(1)} Mode Applied!`, 'Settings have been randomized');
    }

    updateCustomSettingsUI() {
        // Update all UI elements to reflect current settings
        document.getElementById('spawn-rate-slider').value = this.settings.customSpawnRate;
        document.getElementById('spawn-rate-value').textContent = this.settings.customSpawnRate;
        
        document.getElementById('despawn-rate-slider').value = this.settings.customDespawnTime;
        document.getElementById('despawn-rate-value').textContent = this.settings.customDespawnTime;
        document.getElementById('despawn-toggle').checked = this.settings.customDespawnEnabled;
        
        document.getElementById('min-size-slider').value = this.settings.minSize;
        document.getElementById('min-size-value').textContent = this.settings.minSize;
        document.getElementById('max-size-slider').value = this.settings.maxSize;
        document.getElementById('max-size-value').textContent = this.settings.maxSize;
        
        document.getElementById('gravity-slider').value = this.settings.gravity;
        document.getElementById('gravity-value').textContent = this.settings.gravity;
        
        // Update checkboxes
        document.getElementById('random-sizes-toggle').checked = this.settings.randomSizes;
        document.getElementById('rainbow-mode-toggle').checked = this.settings.rainbowMode;
        document.getElementById('floating-toggle').checked = this.settings.floating;
        document.getElementById('stealth-mode-toggle').checked = this.settings.stealthMode;
        document.getElementById('multi-collect-toggle').checked = this.settings.multiCollect;
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    window.game = new GiftSnipeGame();
});