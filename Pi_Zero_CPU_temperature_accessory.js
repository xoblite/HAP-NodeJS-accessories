// ================================================================================
// Raspberry Pi Zero CPU temperature HomeKit accessory plugin for HAP-NodeJS
// v0.9.2 - October 2018 - Karl-Henrik Henriksson - http://homekit.xoblite.net/
// ================================================================================

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

const { execSync } = require('child_process');

// ================================================================================

var TemperatureSensor = {
  name: "Pi Zero CPU temperature", // Name of accessory (changeable by the user)
  pincode: "031-45-154", // Pin code of accessory -> "Default" HAP-NodeJS accessory pin code
  username: "5C:24:EB:97:46:7E", // MAC like address used by HomeKit to differentiate accessories
  manufacturer: "HAP-NodeJS", // Manufacturer (optional)
  model: "Pi Zero CPU temperature", // Model (optional, not changeable by the user)
//  hardwareRevision: "1.0", // Hardware version (optional)
  firmwareRevision: "0.9.2", // Firmware version (optional)
  serialNumber: "homekit.xoblite.net", // Serial number (optional)

  temperature: 0.0, // Latest read temperature
  counter: 10, // Counter used by the adaptive update frequency mechanism (see below)
  exposure: false, // Allow exposure of temperature data to Prometheus?
  exposurePort: 9999, // Port exposed to Prometheus (when enabled)
  outputLogs: true, // Enable logging to the console?

  // ====================
  
  getTemperature: function() { // Get CPU temperature
    // NOTE: Because this function is not only called directly but also spawned continuously through setInterval(),
    // we can not use this.xxx references in here, but need to address directly using TemperatureSensor.xxx .

    var degrees = execSync('cat /sys/class/thermal/thermal_zone0/temp', (err, stdout, stderr) => {
      if (err) {
        if (TemperatureSensor.outputLogs) console.log("%s -> ERROR -> Temperature could not be read!", TemperatureSensor.name);
        return 0;
      }
    });

    // Extract temperature including one decimal (nb. this will be averaged by the *Home app* to the nearest .5 degrees, but not by HomeKit itself).
    TemperatureSensor.temperature = Math.round(parseFloat(degrees) / 100) / 10;
    if (TemperatureSensor.outputLogs) console.log("%s -> GET -> Temperature -> %s degrees C.", TemperatureSensor.name, TemperatureSensor.temperature);
    return TemperatureSensor.temperature;
},

  identify: function() { // Identify the accessory
    if (this.outputLogs) console.log("%s -> IDENTIFY -> Hello world! :)", this.name);
  }
}

// ================================================================================

var sensorUUID = uuid.generate('hap-nodejs:accessories:sensor' + TemperatureSensor.name);
var sensorAccessory = exports.accessory = new Accessory(TemperatureSensor.name, sensorUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js when starting HAP-NodeJS)
sensorAccessory.username = TemperatureSensor.username;
sensorAccessory.pincode = TemperatureSensor.pincode;
if (TemperatureSensor.outputLogs) console.log("%s -> INFO -> If not bridged, the HomeKit pincode for this accessory is \x1b[41m\x1b[37m %s \x1b[0m.", TemperatureSensor.name, TemperatureSensor.pincode);

sensorAccessory
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, TemperatureSensor.manufacturer)
    .setCharacteristic(Characteristic.Model, TemperatureSensor.model)
//    .setCharacteristic(Characteristic.HardwareRevision, TemperatureSensor.hardwareRevision)
    .setCharacteristic(Characteristic.FirmwareRevision, TemperatureSensor.firmwareRevision)
    .setCharacteristic(Characteristic.SerialNumber, TemperatureSensor.serialNumber);

sensorAccessory.on('identify', function(paired, callback) {
  TemperatureSensor.identify();
  callback();
});

sensorAccessory
  .addService(Service.TemperatureSensor, TemperatureSensor.name)
  .getCharacteristic(Characteristic.CurrentTemperature)
  .on('get', function(callback) {
    if (TemperatureSensor.counter == 0)
    {
      // We just received a GET request, set update frequency to 3 seconds.. (see updateTemperature() below)
      if (TemperatureSensor.outputLogs) console.log("%s -> INFO -> Switching to 3 second updates...", TemperatureSensor.name);
      TemperatureSensor.counter = 10;
      clearInterval(TemperatureSensor.updateInterval);
      TemperatureSensor.updateInterval = setInterval(updateTemperature, 3000);
    }
    callback(null, TemperatureSensor.getTemperature());
  });

// ================================================================================

// Apart from the manual update on GET, we will automatically update the temperature reading
// every 3 seconds (for ~30 seconds after a GET) or every 30 seconds and report back to HomeKit...
function updateTemperature() {
  sensorAccessory
    .getService(Service.TemperatureSensor)
    .setCharacteristic(Characteristic.CurrentTemperature, TemperatureSensor.getTemperature());

    if (TemperatureSensor.counter > 0)
    {
      TemperatureSensor.counter--;
      if (TemperatureSensor.counter == 0)
      {
        if (TemperatureSensor.outputLogs) console.log("%s -> INFO -> Switching to 30 second updates...", TemperatureSensor.name);
        clearInterval(TemperatureSensor.updateInterval);
        TemperatureSensor.updateInterval = setInterval(updateTemperature, 30000);
      }
    }
};

TemperatureSensor.updateInterval = setInterval(updateTemperature, 3000);

// ================================================================================

// Exposure of temperature data to Prometheus?
if (TemperatureSensor.exposure)
{
  if (TemperatureSensor.outputLogs) console.log("%s -> INFO -> Starting: \x1b[7m Prometheus exposure server listening on port %s \x1b[0m.", TemperatureSensor.name, TemperatureSensor.exposurePort);
  var http = require('http');
  http.createServer(function (request, response) {
    var kv = 'raspberry_pi_zero_cpu_temperature ' + TemperatureSensor.temperature.toFixed(1) + '\n';
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write(kv);
    response.end();
  }).listen(TemperatureSensor.exposurePort);  
}

// ================================================================================

// Anything to clean up before exit?
// process.on('exit', (code) => {
//  if (TemperatureSensor.exposure)
//  {
//    if (TemperatureSensor.outputLogs) console.log(`%s -> INFO -> Exiting [${code}]: Stopping Prometheus exposure server.`, TemperatureSensor.name);
//      xxxxxxxxx
// }
});

// ================================================================================
