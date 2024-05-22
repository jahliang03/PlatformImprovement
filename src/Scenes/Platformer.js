class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 300;
        this.DRAG = 300;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1400;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 10;
        this.SCALE = 2.0;   

    }

    create() {

        // update instruction text
        document.getElementById('description').innerHTML = '<h2>Mushroom Collector Platform<br>left arrow - move left, right arrow - move right, up arrow - jump <br>Collect all the mushrooms to beat game!</h2>'
        
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);
        
        // load out
        this.coinText = this.add.text(this.cameras.main.scrollX + 10, this.cameras.main.scrollY + 60, 'Coins: 0', { fontSize: '10px', fill: '#4169E1' });
        //this.coinText.setScrollFactor(0); 
        this.mushroomText = this.add.text(this.cameras.main.scrollX + 10, this.cameras.main.scrollY + 75, 'Mushrooms: 0', { fontSize: '10px', fill: '#4169E1' });
        //this.mushroomText.setScrollFactor(0); 
        this.coinText.setDepth(100);
        this.mushroomText.setDepth(100);

        // load sound 
        this.collectSound = this.sound.add('collectSound', { volume: 0.5 });
        
        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");
        this.farmset = this.map.addTilesetImage("kenny_tilemap_packed_farm", "tilemap_tiles");
        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
    
        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // TODO: Add createFromObjects here
        // Find coins in the "Objects" layer in Phaser
        this.coinsCollected = 0; 
        this.mushroomsCollected = 0; 

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.mushrooms = this.map.createFromObjects("mushrooms", {
            name: "mushroom",
            key: "tilemap_sheet",
            frame: 128
        });

        // Enemy setup
        this.enemy = this.physics.add.sprite(900, 200, 'platformer_characters', 'tile_0008.png');
        this.enemy.setCollideWorldBounds(true);
        this.enemy.setVelocityX(100);  // Initial horizontal velocity
        this.enemy.body.maxVelocity.x = 100;  // Max horizontal velocity

        // Define movement boundaries for the enemy
        this.enemy.minX = 800;  // Minimum x position
        this.enemy.maxX = 1000; // Maximum x position

        // Collider with ground
        this.physics.add.collider(this.enemy, this.groundLayer);

        // Collider with player that triggers game over
        this.physics.add.collider(this.enemy, my.sprite.player, this.gameOver, null, this);

        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        this.physics.world.enable(this.mushrooms, Phaser.Physics.Arcade.STATIC_BODY);
        
        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        this.mushroomGroup = this.add.group(this.mushrooms);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0004.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        this.physics.add.collider(my.sprite.player, this.waterLayer, this.handleWaterCollision, null, this);
     
        // Handle collision detection with coins
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            this.coinsCollected += 1; // increment coins collected
            this.coinText.setText('Coins: ' + this.coinsCollected); // update coin text
            this.collectSound.play();
        });

        this.physics.add.overlap(my.sprite.player, this.mushroomGroup, (obj1, obj2) => {
            obj2.destroy();  // Remove the mushroom from the game
            this.mushroomsCollected += 1;  // Correctly increment the count
            this.mushroomText.setText('Mushrooms: ' + this.mushroomsCollected);  // Update the display text
            this.collectSound.play();
            if (this.mushroomsCollected >= 13) {  // Check if 10 mushrooms have been collected
                this.winGame();  // Trigger the win condition
            }
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // TODO: Add movement vfx here
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_01.png', 'smoke_09.png'],
            // TODO: Try: add random: true
            scale: {start: 0.02, end: 0.04},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 350,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();
        
        // add camera code here
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    winGame() {
        // Display win message and restart game option
        let winText = this.add.text(this.cameras.main.centerX - 150, this.cameras.main.centerY - 170, 'You Win! Press R to Restart', {
            fontSize: '25px',
            fill: '#00FF01'
        }).setOrigin(0.5);

        this.rKey.on('down', () => {
            this.scene.restart();
        });
    }

    gameOver(player, enemy) {
        this.physics.pause(); // Stops all physics activity
        player.setTint(0xff0000); // Change player color to red on game over
        let gameOverText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Game Over! Press R to Restart', {
            fontSize: '32px',
            fill: '#FF0000'
        }).setOrigin(0.5);
        this.rKey.on('down', () => {
            this.scene.restart(); // Restart the scene
        });
    }

    update() {

        if (this.enemy.x >= 1000 || this.enemy.x <= 800) {
            this.enemy.setVelocityX(-this.enemy.body.velocity.x);
        }
        
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-4, my.sprite.player.displayHeight/2-1, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0.5);

            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/8-9, my.sprite.player.displayHeight/2-3, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0.5);

            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }
    
}