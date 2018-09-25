// ================================================================================
// *Apple HomeKit* integration for the Pimoroni ***Unicorn pHAT***
// based on *HAP-NodeJS* (including its accessory examples) and *rpi-ws281x-native*
// v1.0 - October 2018 - Karl-Henrik Henriksson - http://homekit.xoblite.net/
// ================================================================================

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

// ================================================================================

const os = require('os');
const { performance } = require('perf_hooks');
const driver = require('../node_modules/rpi-ws281x-native'); // -> https://www.npmjs.com/package/rpi-ws281x-native
const numLeds = 32; // Number of LEDs on the Unicorn pHAT (also matching the length of all related arrays elsewhere in the code)
const numCols = 8, numRows = 4; // Number of columns and rows of the LED display (cf. 8x4 = 32 LEDs as per above)

// Default dynamic Unicorn pHAT colour array -> 8x4 pixels, all white LEDs ("white light")
var leds =
[ 0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,
  0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,
  0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,
  0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff ];

// Static Unicorn pHAT colour arrays for the "icon" mode -> 8x4 pixels, with varying RGB colours

const iconDefault =
[ 0x0000ff, 0x000000, 0x000000, 0x0000ff, 0xcc0000, 0xcc0000, 0xcc0000, 0x000000,
  0x0000ff, 0x000000, 0x000000, 0x0000ff, 0xcc0000, 0x000000, 0x000000, 0xcc0000,
  0x0000ff, 0x000000, 0x000000, 0x0000ff, 0xcc0000, 0xcc0000, 0xcc0000, 0x000000,
  0x000000, 0x0000ff, 0x0000ff, 0x000000, 0xcc0000, 0x000000, 0x000000, 0x000000 ];

const icon10percent =
[ 0xaa66ff, 0x006666, 0x006633, 0x006600, 0x336600, 0x666600, 0x663300, 0x660000,
  0xaa66ff, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
  0xaa66ff, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
  0xaa66ff, 0x006666, 0x006633, 0x006600, 0x336600, 0x666600, 0x663300, 0x660000 ];

const icon20percent =
[ 0xaa66ff, 0x00aaaa, 0x006633, 0x006600, 0x336600, 0x666600, 0x663300, 0x660000,
  0xaa66ff, 0x00aaaa, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
  0xaa66ff, 0x00aaaa, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
  0xaa66ff, 0x00aaaa, 0x006633, 0x006600, 0x336600, 0x666600, 0x663300, 0x660000 ];

const icon30percent =
[ 0xaa66ff, 0x00aaaa, 0x00cc66, 0x006600, 0x336600, 0x666600, 0x663300, 0x660000,
  0x000000, 0x00aaaa, 0x00cc66, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
  0x000000, 0x00aaaa, 0x00cc66, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
  0xaa66ff, 0x00aaaa, 0x00cc66, 0x006600, 0x336600, 0x666600, 0x663300, 0x660000 ];

const icon40percent =
[ 0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x336600, 0x666600, 0x663300, 0x660000,
  0x000000, 0x000000, 0x00cc66, 0x00cc00, 0x000000, 0x000000, 0x000000, 0x000000,
  0x000000, 0x000000, 0x00cc66, 0x00cc00, 0x000000, 0x000000, 0x000000, 0x000000,
  0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x336600, 0x666600, 0x663300, 0x660000 ];

const icon50percent =
[ 0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0x666600, 0x663300, 0x660000,
  0x000000, 0x000000, 0x000000, 0x00cc00, 0x66cc00, 0x000000, 0x000000, 0x000000,
  0x000000, 0x000000, 0x000000, 0x00cc00, 0x66cc00, 0x000000, 0x000000, 0x000000,
  0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0x666600, 0x663300, 0x660000 ];

const icon60percent =
[ 0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0xcccc00, 0x663300, 0x660000,
  0x000000, 0x000000, 0x000000, 0x000000, 0x66cc00, 0xcccc00, 0x000000, 0x000000,
  0x000000, 0x000000, 0x000000, 0x000000, 0x66cc00, 0xcccc00, 0x000000, 0x000000,
  0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0xcccc00, 0x663300, 0x660000 ];

const icon70percent =
[ 0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0xcccc00, 0xcc6600, 0x660000,
  0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0xcccc00, 0xcc6600, 0x000000,
  0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0xcccc00, 0xcc6600, 0x000000,
  0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0xcccc00, 0xcc6600, 0x660000 ];

const icon80percent =
[ 0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0xcccc00, 0xcc6600, 0xff0000,
  0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0xcc6600, 0xff0000,
  0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0xcc6600, 0xff0000,
  0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0xcccc00, 0xcc6600, 0xff0000 ];

const icon90percent =
[ 0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0xcccc00, 0xcc6600, 0xff0000,
  0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0xff0000,
  0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0xff0000,
  0xaa66ff, 0x00aaaa, 0x00cc66, 0x00cc00, 0x66cc00, 0xcccc00, 0xcc6600, 0xff0000 ];

const iconHappy =
[ 0x008800, 0x008800, 0xffffff, 0x008800, 0x008800, 0xffffff, 0x008800, 0x008800,
  0x008800, 0x008800, 0x008800, 0x008800, 0x008800, 0x008800, 0x008800, 0x008800,
  0x008800, 0xffffff, 0x008800, 0x008800, 0x008800, 0x008800, 0xffffff, 0x008800,
  0x008800, 0x008800, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0x008800, 0x008800 ];

const iconMeh =
[ 0x888800, 0x888800, 0xffffff, 0x888800, 0x888800, 0xffffff, 0x888800, 0x888800,
  0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800,
  0x888800, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0x888800,
  0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800 ];

const iconSad =
[ 0x880000, 0x880000, 0xffffff, 0x880000, 0x880000, 0xffffff, 0x880000, 0x880000,
  0x880000, 0x880000, 0x880000, 0x880000, 0x880000, 0x880000, 0x880000, 0x880000,
  0x880000, 0x880000, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0x880000, 0x880000,
  0x880000, 0xffffff, 0x880000, 0x880000, 0x880000, 0x880000, 0xffffff, 0x880000 ];

const iconSkull =
[ 0xffffff, 0xffffff, 0x991111, 0xffffff, 0xffffff, 0x991111, 0xffffff, 0xffffff,
  0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff,
  0xffffff, 0x333333, 0x666666, 0x333333, 0x666666, 0x666666, 0x333333, 0xffffff,
  0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff ];

const iconPacMan =
[ 0x000000, 0xaaaa00, 0xaaaa00, 0x666600, 0xaaaa00, 0x000000, 0x000000, 0x000000,
  0xaaaa00, 0xaaaa00, 0xaaaa00, 0xaaaa00, 0xaaaa00, 0xaaaa00, 0x000000, 0x000000,
  0xaaaa00, 0xaaaa00, 0xaaaa00, 0x000000, 0x000000, 0x660000, 0x000066, 0x660000,
  0x000000, 0xaaaa00, 0xaaaa00, 0xaaaa00, 0xaaaa00, 0x000000, 0x000000, 0x000000 ];

const iconHeart =
[ 0xaa6666, 0xbb7777, 0xff4444, 0xaa6666, 0xff4444, 0xaa6666, 0xbb7777, 0xcc8888,
  0xcc8888, 0xff4444, 0xff4444, 0xff4444, 0xff4444, 0xff4444, 0xcc8888, 0xbb7777,
  0xaa6666, 0xcc8888, 0xff4444, 0xff4444, 0xff4444, 0xbb7777, 0xbb7777, 0xaa6666,
  0xbb7777, 0xaa6666, 0xbb7777, 0xff4444, 0xaa6666, 0xcc8888, 0xaa6666, 0xcc8888 ];

const iconCake =
[ 0xaaaa00, 0x000000, 0x996600, 0x000000, 0xaaaa00, 0x000000, 0x996600, 0x000000,
  0xcccccc, 0x000000, 0xcccccc, 0x000000, 0xcccccc, 0x000000, 0xcccccc, 0x000000,
  0x888888, 0x660000, 0x888888, 0x662200, 0x888888, 0x660000, 0x888888, 0x000000,
  0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x000000 ];

const iconMail =
[ 0x000000, 0x886600, 0xaaaa00, 0xaaaa00, 0xaaaa00, 0x886600, 0x000000, 0x000000,
  0x000000, 0xaaaa00, 0x886600, 0xaaaa00, 0x886600, 0xaaaa00, 0x000000, 0x000000,
  0x000000, 0xaaaa00, 0xaaaa00, 0x886600, 0xaaaa00, 0xaaaa00, 0x000000, 0x000000,
  0x000000, 0xaaaa00, 0xaaaa00, 0xaaaa00, 0xaaaa00, 0xaaaa00, 0x000000, 0x000000 ];

const iconQuestionMark =
[ 0x000000, 0x000000, 0x000000, 0x000000, 0x00ff00, 0x000000, 0x000000, 0x00ff00,
  0x00ff00, 0x00ff00, 0x000000, 0x00ff00, 0x000000, 0x00ff00, 0x000000, 0x00ff00,
  0x00ff00, 0x00ff00, 0x000000, 0x00ff00, 0x000000, 0x00ff00, 0x000000, 0x00ff00,
  0x000000, 0x000000, 0x000000, 0x00ff00, 0x000000, 0x000000, 0x00ff00, 0x000000 ];

const iconExclamationMark =
[ 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
  0xff0000, 0xff0000, 0x000000, 0xff0000, 0xff0000, 0xff0000, 0xff0000, 0xff0000,
  0xff0000, 0xff0000, 0x000000, 0xff0000, 0xff0000, 0xff0000, 0xff0000, 0xff0000,
  0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000 ];

const iconRightUp =
[ 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000099, 0x000000,
  0x000066, 0x000066, 0x000077, 0x000077, 0x000088, 0x000088, 0x000099, 0x0000aa,
  0x000066, 0x000066, 0x000077, 0x000077, 0x000088, 0x000088, 0x000099, 0x0000aa,
  0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000099, 0x000000 ];

const iconLeftDown =
[ 0x000000, 0x000099, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
  0x0000aa, 0x000099, 0x000088, 0x000088, 0x000077, 0x000077, 0x000066, 0x000066,
  0x0000aa, 0x000099, 0x000088, 0x000088, 0x000077, 0x000077, 0x000066, 0x000066,
  0x000000, 0x000099, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000 ];

const iconSweden =
[ 0x000088, 0x000088, 0x000088, 0x888800, 0x888800, 0x000088, 0x000088, 0x000088,
  0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800,
  0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800, 0x888800,
  0x000088, 0x000088, 0x000088, 0x888800, 0x888800, 0x000088, 0x000088, 0x000088 ];

const iconNorway =
[ 0x880000, 0x880000, 0x880000, 0x888888, 0x000088, 0x880000, 0x880000, 0x880000,
  0x888888, 0x888888, 0x888888, 0x888888, 0x000088, 0x888888, 0x888888, 0x888888,
  0x000088, 0x000088, 0x000088, 0x888888, 0x000088, 0x000088, 0x000088, 0x000088,
  0x880000, 0x880000, 0x880000, 0x000088, 0x888888, 0x880000, 0x880000, 0x880000 ]

const iconDenmark =
[ 0x880000, 0x880000, 0x880000, 0x888888, 0x888888, 0x880000, 0x880000, 0x880000,
  0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888,
  0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888,
  0x880000, 0x880000, 0x880000, 0x888888, 0x888888, 0x880000, 0x880000, 0x880000 ];

const iconFinland =
[ 0x888888, 0x888888, 0x888888, 0x000088, 0x000088, 0x888888, 0x888888, 0x888888,
  0x000088, 0x000088, 0x000088, 0x000088, 0x000088, 0x000088, 0x000088, 0x000088,
  0x000088, 0x000088, 0x000088, 0x000088, 0x000088, 0x000088, 0x000088, 0x000088,
  0x888888, 0x888888, 0x888888, 0x000088, 0x000088, 0x888888, 0x888888, 0x888888 ];

const iconIceland =
[ 0x000088, 0x000088, 0x000088, 0x888888, 0x880000, 0x000088, 0x000088, 0x000088,
  0x888888, 0x888888, 0x888888, 0x888888, 0x880000, 0x880000, 0x880000, 0x880000,
  0x880000, 0x880000, 0x880000, 0x880000, 0x888888, 0x888888, 0x888888, 0x888888,
  0x000088, 0x000088, 0x000088, 0x880000, 0x888888, 0x000088, 0x000088, 0x000088 ]

const iconUK =
[ 0x888888, 0x000088, 0x000088, 0x888888, 0x880000, 0x000088, 0x000088, 0x880000,
  0x880000, 0x888888, 0x888888, 0x888888, 0x880000, 0x880000, 0x880000, 0x888888,
  0x888888, 0x880000, 0x880000, 0x880000, 0x888888, 0x888888, 0x888888, 0x880000,
  0x880000, 0x000088, 0x000088, 0x880000, 0x888888, 0x000088, 0x000088, 0x888888 ]

const iconUSA =
[ 0x000088, 0x888888, 0x000088, 0x880000, 0x880000, 0x880000, 0x880000, 0x880000,
  0x000088, 0x888888, 0x000088, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888,
  0x880000, 0x880000, 0x880000, 0x880000, 0x880000, 0x880000, 0x880000, 0x880000,
  0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888 ]

// ================================================================================

var LightController = {
  name: "Unicorn pHAT", // Name of accessory (changeable by the user)
  pincode: "031-45-154", // Pin code of accessory -> "Default" HAP-NodeJS accessory pin code
  username: "FA:3C:ED:5A:1A:1C", // MAC like address used by HomeKit to differentiate accessories
  manufacturer: "HAP-NodeJS", // Manufacturer (optional)
  model: "Unicorn pHAT", // Model (optional, not changeable by the user)
  serialNumber: "homekit.xoblite.net", // Serial number (optional)

  power: true, // Default power status
  brightness: 9, // Default brightness
  hue: 0, // Default hue
  saturation: 10, // Default saturation

  outputLogs: true, // Enable logging to the console?

  cpuLoadMode: false, // CPU load mode enabled?
  cpuLoadModeInterval: null, // Pointer to a setInterval object when CPU load mode has been enabled
  cpuLoadModeIdleTime: 0, // Last CPU idle time measurement, used when calculating the current CPU load
  cpuLoadModeTimeStamp: 0, // Last millisecond time stamp, used when calculating the current CPU load
  rainbowModeInterval: null, // Pointer to a setInterval object when Rainbow mode has been enabled
  rainbowModeParam: 0.0, // Dynamic variable used by the Rainbow mode animation function

  // ====================
  
  // Update Unicorn pHAT display based on accessory parameters (power + HSV) and/or selected display mode...
  updateUnicorn: function() {
    // if (this.outputLogs) console.log("%s -> INFO -> Updating LED display...", this.name);

    if ((this.brightness == 9) && (this.hue == 0)) // CPU load display mode
    {
      if (this.power)
      {
        if (!this.cpuLoadMode)
        {
          if (this.outputLogs) console.log("%s -> MODE -> Enabling CPU load display mode.", this.name);
          this.cpuLoadModeIdleTime = this.cpuLoadModeTimeStamp = 0;
          this.cpuLoadMode = true;
          this.cpuloadavgUnicorn();
          this.cpuLoadModeInterval = setInterval(this.cpuloadavgUnicorn, 3000);
        }
      }
      else
      {
        if (this.cpuLoadMode)
        {
          clearInterval(this.cpuLoadModeInterval);
          this.cpuLoadMode = false;
          if (this.outputLogs) console.log("%s -> MODE -> Disabling CPU load display mode.", this.name);
        }
        driver.setBrightness(0);
      }
    }
    else // Regular, Status and Icons display modes
    {
      if (this.cpuLoadMode)
      {
        clearInterval(this.cpuLoadModeInterval);
        this.cpuLoadMode = false;
        if (this.outputLogs) console.log("%s -> MODE -> Disabling CPU load display mode.", this.name);
      }

      // Calculate output RGB from input HSV...
      var h = (this.hue / 360), s = (this.saturation / 100), v = 1; // Nb. Use full brightness (v) for these calculations; actual LED brightness applied later.
      var r, g, b, i, f, p, q, t;

      if (s == 0) {
        r = g = b = v;
      }
      else
      {
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
      }

      // Merge calculated r,g,b to RBG... (0xrrggbb)
      r = Math.round(r * 255) * 256 * 256;
      g = Math.round(g * 255) * 256;
      b = Math.round(b * 255);
      var rgb = r+g+b;
//      var rgb = ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);

      if (this.brightness >= 10) // Regular display mode
      {
        if (this.outputLogs) console.log("%s -> INFO -> Regular light mode.", this.name);
        for (var n = 0; n < numLeds; n++) {
          leds[n] = rgb;
        }
        // var unicornBrightness = Math.round(this.brightness * 2.55); // The Unicorn pHAT takes values 0-255, HomeKit uses percentages 0-100%
        // if (this.power && (this.brightness > 0)) driver.setBrightness(unicornBrightness);
        if (this.power && (this.brightness > 0)) driver.setBrightness(this.brightness);
        else driver.setBrightness(0);
        driver.render(leds);
      }
      else
      {
        // 1-8 -> Status display mode, indicators 1-8
        if (this.brightness < 9)
        {
//          var offset = (this.brightness - 1) * 2;
//          if (this.brightness > 4) offset += 8; // Lower row of status indicators (i.e. indicators 5-8)
//          leds[offset] = leds[offset+1] = leds[offset+8] = leds[offset+9] = rgb;
//          if (this.power) driver.setBrightness(10);
//          else driver.setBrightness(0);
//          driver.render(leds);

          this.rainbowModeParam = 0.0;
          this.rainbowUnicorn();
          this.rainbowModeInterval = setInterval(this.rainbowUnicorn, 200);
        }
        else // 9 (and hue>0) -> Icon display mode
        {
          if (this.power)
          {
            if (this.outputLogs) console.log("%s -> INFO -> Displaying icon #%s.", this.name, this.hue);
            var minBrightness = this.saturation;
            if (this.saturation < 10) minBrightness = 10;
            driver.setBrightness(minBrightness);  

            switch (this.hue)
            {
              case 360: driver.render(iconSweden); break;
              case 359: driver.render(iconNorway); break;
              case 358: driver.render(iconDenmark); break;
              case 357: driver.render(iconFinland); break;
              case 356: driver.render(iconIceland); break;
              case 355: driver.render(iconUK); break;
              case 354: driver.render(iconUSA); break;
  
              case 201: driver.render(iconMail); break;
  
              case 111: driver.render(iconCake); break;
              case 110: driver.render(iconHeart); break;
              case 105: driver.render(iconPacMan); break;
              case 104: driver.render(iconSkull); break;
              case 103: driver.render(iconSad); break;
              case 102: driver.render(iconMeh); break;
              case 101: driver.render(iconHappy); break;
  
              case 14: driver.render(iconRightUp); break;
              case 13: driver.render(iconLeftDown); break;
              case 12: driver.render(iconExclamationMark); break;
              case 11: driver.render(iconQuestionMark); break;
  
              case 9: driver.render(icon90percent); break;
              case 8: driver.render(icon80percent); break;
              case 7: driver.render(icon70percent); break;
              case 6: driver.render(icon60percent); break;
              case 5: driver.render(icon50percent); break;
              case 4: driver.render(icon40percent); break;
              case 3: driver.render(icon30percent); break;
              case 2: driver.render(icon20percent); break;
              case 1: driver.render(icon10percent); break;
  
              default: driver.render(iconDefault);
            }
          }
          else
          {
            driver.setBrightness(0);
            driver.render(iconDefault);
          }
        }
      }
    }
  },

  // ====================

  cpuloadavgUnicorn: function() {
      var minBrightness = this.saturation;
      if (this.saturation < 10) minBrightness = 10;
//      if (this.power) driver.setBrightness(minBrightness);
//      else driver.setBrightness(0);
      driver.setBrightness(10);

     // Calculate CPU load as 3 second average... (cf. top's update frequency, see also setInterval() @ 3000 msec above)
      var currentIdleTime = 0;
      for (var n = 0; n < os.cpus().length; n++) {
        currentIdleTime += (os.cpus()[n].times.idle / 10);
      }
      var currentTimeStamp = performance.now();

      if (this.cpuLoadModeTimeStamp == 0) driver.render(icon10percent);
      else
      {
        var load = 1 - ((currentIdleTime - this.cpuLoadModeIdleTime) / (currentTimeStamp - this.cpuLoadModeTimeStamp));
        this.cpuLoadModeIdleTime = currentIdleTime;
        this.cpuLoadModeTimeStamp = currentTimeStamp;
  
        if (load < 0.15) driver.render(icon10percent);
        else if (load < 0.25) driver.render(icon20percent);
        else if (load < 0.35) driver.render(icon30percent);
        else if (load < 0.45) driver.render(icon40percent);
        else if (load < 0.55) driver.render(icon50percent);
        else if (load < 0.65) driver.render(icon60percent);
        else if (load < 0.75) driver.render(icon70percent);
        else if (load < 0.85) driver.render(icon80percent);
        else driver.render(icon90percent);  
      }
  },

  // ====================

  // NOTE: The following function is a mostly direct port to this framework
  // of the rainbow.py Unicorn pHAT example file by Pimoroni. Thanks guys... :)
  rainbowUnicorn: function() {
//    var minBrightness = this.saturation;
//    if (this.saturation < 10) minBrightness = 10;
//      if (this.power) driver.setBrightness(minBrightness);
//      else driver.setBrightness(0);
    driver.setBrightness(50);

    this.rainbowModeParam += 0.3;
    const offset = 30;
    for (var y = 0; y < numRows; y++)
    {
      for (var x = 0; x < numCols; x++)
      {
        var r = 0, g = 0, b = 0;
        r = (Math.cos((x+this.rainbowModeParam)/2.0) + Math.cos((y+this.rainbowModeParam)/2.0)) * 64.0 + 128.0;
        g = (Math.sin((x+this.rainbowModeParam)/1.5) + Math.sin((y+this.rainbowModeParam)/2.0)) * 64.0 + 128.0;
        b = (Math.sin((x+this.rainbowModeParam)/2.0) + Math.cos((y+this.rainbowModeParam)/1.5)) * 64.0 + 128.0;
        r = Math.max(0, Math.min(255, r + offset));
        g = Math.max(0, Math.min(255, g + offset));
        b = Math.max(0, Math.min(255, b + offset));
        leds[x+(y*8)] = ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
      }
    }

    if (this.outputLogs) console.log("%s -> INFO -> Updating rainbow...", this.name);
    driver.render(leds);
},
  
  // ====================

  setPower: function(status) { // Set power state
    if (this.power != status)
    {
      if (this.outputLogs) console.log("%s -> SET -> Power -> %s.", this.name, status ? "On" : "Off");
      this.power = status;
      this.updateUnicorn();
    }
  },

  getPower: function() { // Get power state
    if (this.outputLogs) console.log("%s -> GET -> Power -> %s.", this.name, this.power ? "On" : "Off");
    return this.power;
  },

  setBrightness: function(brightness) { // Set brightness
    if (this.brightness != brightness)
    {
      if (this.outputLogs) console.log("%s -> SET -> Brightness -> %s.", this.name, brightness);
      this.brightness = brightness;
      if (this.power) this.updateUnicorn();
    }
  },

  getBrightness: function() { // Get brightness
    if (this.outputLogs) console.log("%s -> GET -> Brightness -> %s.", this.name, this.brightness);
    return this.brightness;
  },

  setSaturation: function(saturation) { // Set saturation
    if (this.saturation != saturation)
    {
      if (this.outputLogs) console.log("%s -> SET -> Saturation -> %s.", this.name, saturation);
      this.saturation = saturation;
      if (this.power) this.updateUnicorn();  
    }
  },

  getSaturation: function() { // Get saturation
    if (this.outputLogs) console.log("%s -> GET -> Saturation -> %s.", this.name, this.saturation);
    return this.saturation;
  },

  setHue: function(hue) { // Set hue
    if (this.hue != hue)
    {
      if (this.outputLogs) console.log("%s -> SET -> Hue -> %s.", this.name, hue);
      this.hue = hue;
      if (this.power) this.updateUnicorn();
    }
  },

  getHue: function() { // Get hue
    if (this.outputLogs) console.log("%s -> GET -> Hue -> %s.", this.name, this.hue);
    return this.hue;
  },

  identify: function() { // Identify the accessory
    if (this.outputLogs) console.log("%s -> IDENTIFY -> Hello world! :)", this.name);
  }
}

// ================================================================================

// Initialize the Unicorn pHAT to our default state at startup...
if (LightController.outputLogs) console.log("%s -> INFO -> Starting: Initializing the pHAT HW.", LightController.name);
driver.init(numLeds);
LightController.updateUnicorn();

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "light".
var lightUUID = uuid.generate('hap-nodejs:accessories:light' + LightController.name);

// This is the Accessory that we'll return to HAP-NodeJS that represents our light.
var lightAccessory = exports.accessory = new Accessory(LightController.name, lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
lightAccessory.username = LightController.username;
lightAccessory.pincode = LightController.pincode;

// Set some basic properties (these values are arbitrary and setting them is optional)
lightAccessory
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, LightController.manufacturer)
    .setCharacteristic(Characteristic.Model, LightController.model)
    .setCharacteristic(Characteristic.SerialNumber, LightController.serialNumber);

// Listen for the "identify" event for this Accessory
lightAccessory.on('identify', function(paired, callback) {
  LightController.identify();
  callback();
});

// Add the actual Lightbulb Service and listen for change events from HomeKit.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
lightAccessory
  .addService(Service.Lightbulb, LightController.name) // Services exposed to the user should have "names"
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    LightController.setPower(value);

    // Our light is synchronous - this value has been successfully set
    // Invoke the callback when you finished processing the request
    // If it's going to take more than 1s to finish the request, try to invoke the callback
    // after getting the request instead of after finishing it. This avoids blocking other
    // requests from HomeKit.
    callback();
  })
  // We want to intercept requests for our current power state so we can query the hardware itself instead of
  // allowing HAP-NodeJS to return the cached Characteristic.value.
  .on('get', function(callback) {
    callback(null, LightController.getPower());
  });

// To inform HomeKit about changes occurred outside of HomeKit (like user physically turn on the light)
// Please use Characteristic.updateValue
// 
// lightAccessory
//   .getService(Service.Lightbulb)
//   .getCharacteristic(Characteristic.On)
//   .updateValue(true);

// Also add an "optional" Characteristic for Brightness.
lightAccessory
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Brightness)
  .on('set', function(value, callback) {
    LightController.setBrightness(value);
    callback();
  })
  .on('get', function(callback) {
    callback(null, LightController.getBrightness());
  });

// Also add an "optional" Characteristic for Saturation.
lightAccessory
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Saturation)
  .on('set', function(value, callback) {
    LightController.setSaturation(value);
    callback();
  })
  .on('get', function(callback) {
    callback(null, LightController.getSaturation());
  });

// Also add an "optional" Characteristic for Hue.
lightAccessory
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Hue)
  .on('set', function(value, callback) {
    LightController.setHue(value);
    callback();
  })
  .on('get', function(callback) {
    callback(null, LightController.getHue());
  });

// ================================================================================

// Clean up by resetting the Unicorn pHAT hardware if the process is terminated... (i.e. through SIGTERM, SIGINT)
process.on('exit', (code) => {
  if (LightController.outputLogs) console.log(`%s -> INFO -> Exiting [${code}]: Resetting the pHAT HW.`, LightController.name);
  driver.reset();
});

// ================================================================================
