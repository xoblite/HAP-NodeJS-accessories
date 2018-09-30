// ================================================================================
// Apple HomeKit integration for the Pimoroni Unicorn pHAT (for RPi Zero)
// based on HAP-NodeJS (including its accessory examples) and rpi-ws281x-native
// v0.8.4 - October 2018 - Karl-Henrik Henriksson - http://homekit.xoblite.net/
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
  firmwareRevision: "0.8.4", // Firmware version (optional)

  power: true, // Default power status
  brightness: 1, // Default brightness (>=10) or display mode (<10), where 1 -> CPU load display mode
  hue: 0, // Default hue
  saturation: 10, // Default saturation

  outputLogs: true, // Enable logging to the console?

  currentDisplayMode: 0, // Current display mode, e.g. Regular Light (0), CPU load (1), Rainbow (2) ...
  currentDisplayModeInterval: null, // Pointer to a setInterval object when any dynamic/animated display mode has been enabled
  cpuLoadModeIdleTime: 0, // Last CPU idle time measurement, used when calculating the current CPU load
  cpuLoadModeTimeStamp: 0, // Last millisecond time stamp, used when calculating the current CPU load
  rainbowModeParam: 0.0, // Dynamic variable used by the Rainbow display mode animation function

  // ====================
  
  // Update Unicorn pHAT display...
  updateUnicorn: function(updateDisplayMode) {

//    if (updateDisplayMode)
    {
      // Stop any previously running dynamic (e.g. CPU load) or animated (e.g. Rainbow) display modes...
      if (this.currentDisplayMode > 0)
      {
        if (this.outputLogs) 
        {
          if (this.currentDisplayMode == 1) console.log("%s -> MODE -> Disabling CPU load display mode.", this.name);
          else if (this.currentDisplayMode == 2) console.log("%s -> MODE -> Disabling Rainbow display mode.", this.name);
          else if (this.currentDisplayMode == 3) console.log("%s -> MODE -> Disabling Fire display mode.", this.name);
        }
        clearInterval(this.currentDisplayModeInterval);
        this.currentDisplayModeInterval = null;
      }

      // Switch to the newly selected display mode...
      if (this.power && (this.brightness > 0))
      {
        if (this.brightness == 1) // CPU load display mode
        {
          if (this.outputLogs) console.log("%s -> MODE -> Enabling CPU load display mode.", this.name);
          this.currentDisplayMode = 1;
          this.cpuLoadModeIdleTime = this.cpuLoadModeTimeStamp = 0;
          this.cpuloadavgUnicorn();
          this.currentDisplayModeInterval = setInterval(this.cpuloadavgUnicorn, 3000);
        }
        else if (this.brightness == 2) // Rainbow display mode
        {
          if (this.outputLogs) console.log("%s -> MODE -> Enabling Rainbow display mode.", this.name);
          this.currentDisplayMode = 2;
          driver.setBrightness(50);
          this.rainbowModeParam = 0.0;
          this.rainbowUnicorn();
          this.currentDisplayModeInterval = setInterval(this.rainbowUnicorn, 20); // -> 50 FPS... ;)
        }
        else if (this.brightness == 3) // Fire display mode
        {
          if (this.outputLogs) console.log("%s -> MODE -> Enabling Fire display mode.", this.name);
          this.currentDisplayMode = 3;
          driver.setBrightness(25);
          this.fireUnicorn();
          this.currentDisplayModeInterval = setInterval(this.fireUnicorn, 250);
        }
        else if (this.brightness == 9) // Icons display mode
        {
          if (this.outputLogs) console.log("%s -> MODE -> Icons display mode -> Displaying icon #%s.", this.name, this.hue);
          this.currentDisplayMode = 0; // -> This is a non-animated display mode

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
        else // Regular Light display mode
        {
          if (this.outputLogs) console.log("%s -> MODE -> Regular Light display mode.", this.name);
          this.currentDisplayMode = 0; // -> This is a non-animated display mode

          // Calculate output RGB from input HSV...
          // (Nb. We're using full brightness (v) for these calculations; actual LED brightness applied later.)
          var h = (this.hue / 360), s = (this.saturation / 100), v = 1;
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
          // var rgb = ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);

          for (var n = 0; n < numLeds; n++) {
            leds[n] = rgb;
          }
          // var unicornBrightness = Math.round(this.brightness * 2.55); // The Unicorn pHAT takes values 0-255, HomeKit uses percentages 0-100%
          // if (this.power && (this.brightness > 0)) driver.setBrightness(unicornBrightness);
          driver.setBrightness(this.brightness);
          driver.render(leds);
        }
      }
      else // Power off display
      {
        if (this.outputLogs) console.log("%s -> INFO -> Powering off display.", this.name);
        this.currentDisplayMode = 0;
        driver.setBrightness(0);
        driver.render(iconDefault);
      }
    }
  },

  // ====================

  cpuloadavgUnicorn: function() {
      // NOTE: Because this function is not only called directly but also spawned continuously through setInterval(),
      // we can not use this.xxx references in here, but need to address directly using LightController.xxx .

      var minBrightness = LightController.saturation;
      if (LightController.saturation < 10) minBrightness = 10;
      driver.setBrightness(minBrightness);

      // if (LightController.outputLogs) console.log("%s -> DEBUG -> Calculating CPU load...", this.name);

     // Calculate CPU load as 3 second average... (cf. top's update frequency, see also setInterval() @ 3000 msec above)
      var currentIdleTime = 0;
      for (var n = 0; n < os.cpus().length; n++) {
        currentIdleTime += (os.cpus()[n].times.idle / 10);
      }
      var currentTimeStamp = performance.now();

      if (LightController.cpuLoadModeTimeStamp == 0) driver.render(icon10percent);
      else
      {
        var load = 1 - ((currentIdleTime - LightController.cpuLoadModeIdleTime) / (currentTimeStamp - LightController.cpuLoadModeTimeStamp));
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

      LightController.cpuLoadModeIdleTime = currentIdleTime;
      LightController.cpuLoadModeTimeStamp = currentTimeStamp;
    },

  // ====================

  // NOTE: The following function is a mostly direct port to this framework
  // of the rainbow.py Unicorn pHAT python example code by Pimoroni. Thanks guys... :)

  rainbowUnicorn: function() {
    // NOTE: Because this function is not only called directly but also spawned continuously through setInterval(),
    // we can not use this.xxx references in here, but need to address directly using LightController.xxx .
    
//    var minBrightness = this.saturation;
//    if (LightController.saturation < 10) minBrightness = 10;
//    driver.setBrightness(minBrightness);

    LightController.rainbowModeParam += 0.3;
    var offset = 30;
    var r = 0, g = 0, b = 0;
    for (var y = 0; y < numRows; y++) {
      for (var x = 0; x < numCols; x++) {
        r = (Math.cos((x+LightController.rainbowModeParam)/2.0) + Math.cos((y+LightController.rainbowModeParam)/2.0)) * 64.0 + 128.0;
        g = (Math.sin((x+LightController.rainbowModeParam)/1.5) + Math.sin((y+LightController.rainbowModeParam)/2.0)) * 64.0 + 128.0;
        b = (Math.sin((x+LightController.rainbowModeParam)/2.0) + Math.cos((y+LightController.rainbowModeParam)/1.5)) * 64.0 + 128.0;
        r = Math.max(0, Math.min(255, r + offset));
        g = Math.max(0, Math.min(255, g + offset));
        b = Math.max(0, Math.min(255, b + offset));
        leds[x+(y*8)] = ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
      }
    }
    // if (LightController.outputLogs) console.log("%s -> DEBUG -> Updating Rainbow...", LightController.name);
    driver.render(leds);
  },
  
  // ====================

  // NOTE: The following function is a adapted and modified port to this framework
  // of the random_blinky.py Unicorn pHAT python example code by Pimoroni. Thanks guys... :)

  fireUnicorn: function() {
    // NOTE: Because this function is not only called directly but also spawned continuously through setInterval(),
    // we can not use this.xxx references in here, but need to address directly using LightController.xxx .
    
//    var minBrightness = this.saturation;
//    if (LightController.saturation < 10) minBrightness = 10;
//    driver.setBrightness(minBrightness);

    var r = 0, g = 0, b = 0, h = 0, s = 0, v = 0, rndm = 0, i, f, p, q, t;
    for (var y = 0; y < numRows; y++) {
      for (var x = 0; x < numCols; x++) {
        rndm = Math.random();
        h = 0.1 * rndm;
        s = 0.8;
//        v = rndm;
        v = 0.2 + (0.8 * rndm);
//        h = (LightController.hue / 360) * rndm;
//        s = (LightController.saturation / 100); // 0.8;
//        v = 1;

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

        r = Math.round(r * 255) * 256 * 256;
        g = Math.round(g * 255) * 256;
        b = Math.round(b * 255);
        var rgb = r+g+b;
        leds[x+(y*8)] = rgb;
      }
    }
    // if (LightController.outputLogs) console.log("%s -> DEBUG -> Updating Fire...", LightController.name);
    driver.render(leds);
  },

  // ====================

  setPower: function(status) { // Set power state
    if (this.power != status)
    {
      if (this.outputLogs) console.log("%s -> SET -> Power -> %s.", this.name, status ? "On" : "Off");
      this.power = status;
      this.updateUnicorn(true);
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
      this.newModeSelected = true; // Brightness has changed <-> Display mode (multiplexed into brightness) has changed
      if (this.power) this.updateUnicorn(true);
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
      if (this.power) this.updateUnicorn(false);  
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
      if (this.power) this.updateUnicorn(false);
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
if (LightController.outputLogs) console.log("%s -> INFO -> Starting: Running on Node.js %s. Initializing the pHAT HW.", LightController.name, process.version);
driver.init(numLeds);
LightController.updateUnicorn(true);

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "light".
var lightUUID = uuid.generate('hap-nodejs:accessories:light' + LightController.name);

// This is the Accessory that we'll return to HAP-NodeJS that represents our light.
var lightAccessory = exports.accessory = new Accessory(LightController.name, lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
lightAccessory.username = LightController.username;
lightAccessory.pincode = LightController.pincode;

if (LightController.outputLogs) console.log("%s -> INFO -> If not bridged, the HomeKit pincode for this accessory is \x1b[41m\x1b[37m %s \x1b[0m.", LightController.name, LightController.pincode);

// Set some basic properties (these values are arbitrary and setting them is optional)
lightAccessory
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, LightController.manufacturer)
    .setCharacteristic(Characteristic.Model, LightController.model)
    .setCharacteristic(Characteristic.SerialNumber, LightController.serialNumber)
    .setCharacteristic(Characteristic.FirmwareRevision, LightController.firmwareRevision);

// ====================

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

// Clean up by resetting the Unicorn pHAT hardware if the process is terminated...
process.on('exit', (code) => {
  if (LightController.outputLogs) console.log(`%s -> INFO -> Exiting [${code}]: Resetting the pHAT HW.`, LightController.name);
  driver.reset();
});

// ================================================================================
