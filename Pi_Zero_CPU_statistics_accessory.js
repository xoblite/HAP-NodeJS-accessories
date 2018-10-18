// ================================================================================
// Raspberry Pi Zero CPU statistics HomeKit accessory plugin for HAP-NodeJS
// v0.9.3 - October 2018 - Karl-Henrik Henriksson - http://homekit.xoblite.net/
// ================================================================================

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

const os = require('os');
const { performance } = require('perf_hooks');
const { execSync } = require('child_process');

// ================================================================================

var PiZeroSensors = {
  name: "Pi Zero CPU statistics", // Name of accessory (changeable by the user)
  pincode: "031-45-154", // Pin code of accessory -> "Default" HAP-NodeJS accessory pin code
  username: "5C:24:EB:97:46:7E", // MAC like address used by HomeKit to differentiate accessories
  manufacturer: "homekit.xoblite.net", // Manufacturer (optional)
  model: "Pi Zero CPU statistics", // Model (optional, not changeable by the user)
//  hardwareRevision: "1.0", // Hardware version (optional)
  firmwareRevision: "18.10.2", // Firmware version (optional)
  serialNumber: "HAP-NodeJS", // Serial number (optional)

  cpuLoadCurrent: 0.0, // Latest calculcated CPU load (3 second average)
  cpuLoadIdleTime: 0, // Last CPU idle time measurement, used when calculating the current CPU load
  cpuLoadTimeStamp: 0, // Last millisecond time stamp, used when calculating the current CPU load
  cpuTemperature: 0.0, // Latest read temperature
  counter: 10, // Counter used by the adaptive update frequency mechanism (see below)
  updateIntervalObject: null, // Later saved setInterval() object
  exposure: false, // Allow exposure of temperature data to Prometheus?
  exposurePort: 9999, // Port exposed to Prometheus (when enabled)
  outputLogs: true, // Enable logging to the console?

  // ====================

  getCPUload: function() { // Get CPU temperature
    // NOTE: Because this function is not only called directly but also spawned continuously through setInterval(),
    // we can not use this.xxx references in here, but need to address directly using PiZeroSensors.xxx .

    var currentIdleTime = 0;
    for (var n = 0; n < os.cpus().length; n++) {
      currentIdleTime += (os.cpus()[n].times.idle / 10);
    }
    var currentTimeStamp = performance.now();

    if (PiZeroSensors.cpuLoadTimeStamp == 0) PiZeroSensors.cpuLoadCurrent = 0;
    else
    {
      PiZeroSensors.cpuLoadCurrent = 1 - ((currentIdleTime - PiZeroSensors.cpuLoadIdleTime) / (currentTimeStamp - PiZeroSensors.cpuLoadTimeStamp));
      if (PiZeroSensors.outputLogs) console.log("%s -> GET -> CPU load -> %s%%.", PiZeroSensors.name, (PiZeroSensors.cpuLoadCurrent*100).toFixed(1));
    }
    PiZeroSensors.cpuLoadIdleTime = currentIdleTime;
    PiZeroSensors.cpuLoadTimeStamp = currentTimeStamp;

    return Math.round(PiZeroSensors.cpuLoadCurrent*100); // HomeKit wants an integer percentage value (nb. we're spoofing a humidity sensor... =] )
 },

  // ====================
  
  getCPUtemperature: function() { // Get CPU temperature
    // NOTE: Because this function is not only called directly but also spawned continuously through setInterval(),
    // we can not use this.xxx references in here, but need to address directly using PiZeroSensors.xxx .

    var degrees = execSync('cat /sys/class/thermal/thermal_zone0/temp', (err, stdout, stderr) => {
      if (err) {
        if (PiZeroSensors.outputLogs) console.log("%s -> ERROR -> CPU temperature could not be read!", PiZeroSensors.name);
        return 0;
      }
    });

    // Extract temperature including one decimal (nb. this will be averaged by the *Home app* to the nearest .5 degrees, but not by HomeKit itself).
    PiZeroSensors.cpuTemperature = Math.round(parseFloat(degrees) / 100) / 10;
    if (PiZeroSensors.outputLogs) console.log("%s -> GET -> CPU temperature -> %s degrees C.", PiZeroSensors.name, PiZeroSensors.cpuTemperature);
    return PiZeroSensors.cpuTemperature;
  },

  // ====================

  identify: function() { // Identify the accessory
    if (this.outputLogs) console.log("%s -> IDENTIFY -> Hello world! :)", this.name);
  }
}

// ================================================================================

if (PiZeroSensors.outputLogs) console.log("%s -> INFO -> Starting: Running on HomeCore (HAP-NodeJS) %s / Node.js %s.", PiZeroSensors.name, require('../package.json').version, process.version);

var sensorUUID = uuid.generate('hap-nodejs:accessories:sensor' + PiZeroSensors.name);
var sensorAccessory = exports.accessory = new Accessory(PiZeroSensors.name, sensorUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js when starting HAP-NodeJS)
sensorAccessory.username = PiZeroSensors.username;
sensorAccessory.pincode = PiZeroSensors.pincode;
if (PiZeroSensors.outputLogs) console.log("%s -> INFO -> If not bridged, the HomeKit pincode for this accessory is \x1b[44m\x1b[37m %s \x1b[0m.", PiZeroSensors.name, PiZeroSensors.pincode);

sensorAccessory
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, PiZeroSensors.manufacturer)
    .setCharacteristic(Characteristic.Model, PiZeroSensors.model)
//    .setCharacteristic(Characteristic.HardwareRevision, PiZeroSensors.hardwareRevision)
    .setCharacteristic(Characteristic.FirmwareRevision, PiZeroSensors.firmwareRevision)
    .setCharacteristic(Characteristic.SerialNumber, PiZeroSensors.serialNumber);

sensorAccessory.on('identify', function(paired, callback) {
  PiZeroSensors.identify();
  callback();
});

// ====================

sensorAccessory
  .addService(Service.HumiditySensor, "Pi Zero CPU load")
  .getCharacteristic(Characteristic.CurrentRelativeHumidity)
  .on('get', function(callback) {
    if (!PiZeroSensors.exposure && (PiZeroSensors.counter == 0))
    {
      // We just received a GET request, set update frequency to 3 seconds.. (see updateStatistics() below)
      if (PiZeroSensors.outputLogs) console.log("%s -> INFO -> Switching to 3 second updates...", PiZeroSensors.name);
      PiZeroSensors.counter = 10;
      clearInterval(PiZeroSensors.updateIntervalObject);
      PiZeroSensors.updateIntervalObject = setInterval(updateStatistics, 3000);
    }
    callback(null, PiZeroSensors.getCPUload());
  });

  sensorAccessory
  .addService(Service.TemperatureSensor, "Pi Zero CPU temperature")
  .getCharacteristic(Characteristic.CurrentTemperature)
  .on('get', function(callback) {
//    if (!PiZeroSensors.exposure && (PiZeroSensors.counter == 0))
//    {
//      // We just received a GET request, set update frequency to 3 seconds.. (see updateStatistics() below)
//      if (PiZeroSensors.outputLogs) console.log("%s -> INFO -> Switching to 3 second updates...", PiZeroSensors.name);
//      PiZeroSensors.counter = 10;
//      clearInterval(PiZeroSensors.updateIntervalObject);
//      PiZeroSensors.updateIntervalObject = setInterval(updateStatistics, 3000);
//    }
    callback(null, PiZeroSensors.getCPUtemperature());
  });

// ================================================================================

// Apart from the manual update on GET, we will automatically update the temperature reading
// every 3 seconds (for ~30 seconds after a GET) or every 30 seconds (afterwards) and report back to HomeKit...
function updateStatistics() {
  sensorAccessory
    .getService(Service.HumiditySensor)
    .setCharacteristic(Characteristic.CurrentRelativeHumidity, PiZeroSensors.getCPUload());
  sensorAccessory
    .getService(Service.TemperatureSensor)
    .setCharacteristic(Characteristic.CurrentTemperature, PiZeroSensors.getCPUtemperature());

    // Here we reduce the update frequency after 10 readings (i.e. 3x10 = 30 seconds),
    // which should be enough for a normal glance at the readings in the Home app (which typically triggers a GET),
    // but only if we're *not* also exposing the data to Prometheus, since you'll want consistent readings in that case.
    if (!PiZeroSensors.exposure && (PiZeroSensors.counter > 0))
    {
      PiZeroSensors.counter--;
      if (PiZeroSensors.counter == 0)
      {
        if (PiZeroSensors.outputLogs) console.log("%s -> INFO -> Switching to 30 second updates...", PiZeroSensors.name);
        clearInterval(PiZeroSensors.updateIntervalObject);
        PiZeroSensors.updateIntervalObject = setInterval(updateStatistics, 30000);
      }
    }
};

PiZeroSensors.updateIntervalObject = setInterval(updateStatistics, 3000);

// ================================================================================

// Exposure of temperature data to Prometheus?
if (PiZeroSensors.exposure)
{
  if (PiZeroSensors.outputLogs) console.log("%s -> INFO -> Starting: \x1b[7m Prometheus exposure server listening on port %s \x1b[0m.", PiZeroSensors.name, PiZeroSensors.exposurePort);
  var http = require('http');
  http.createServer(function (request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    var kv = 'raspberry_pi_zero_cpu_load_non_idle ' + PiZeroSensors.cpuLoadCurrent.toFixed(3) + '\n';
    response.write(kv);
    kv = 'raspberry_pi_zero_cpu_temperature ' + PiZeroSensors.cpuTemperature.toFixed(1) + '\n';
    response.write(kv);
    // Bonus feature: Let's expose the Pi Zero W's WLAN interface (wlan0) total RX/TX packets & bytes as well... =]
    kv = 'raspberry_pi_zero_net_wlan0_packets_rx ' + execSync('cat /sys/class/net/wlan0/statistics/rx_packets', (err, stdout, stderr) => {});
    response.write(kv);
    kv = 'raspberry_pi_zero_net_wlan0_packets_tx ' + execSync('cat /sys/class/net/wlan0/statistics/tx_packets', (err, stdout, stderr) => {});
    response.write(kv);
    kv = 'raspberry_pi_zero_net_wlan0_bytes_rx ' + execSync('cat /sys/class/net/wlan0/statistics/rx_bytes', (err, stdout, stderr) => {});
    response.write(kv);
    kv = 'raspberry_pi_zero_net_wlan0_bytes_tx ' + execSync('cat /sys/class/net/wlan0/statistics/tx_bytes', (err, stdout, stderr) => {});
    response.write(kv);
    response.end();
  }).listen(PiZeroSensors.exposurePort);  
}

// ================================================================================

// Anything to clean up before exit?
// process.on('exit', (code) => {
//  if (PiZeroSensors.exposure)
//  {
//    if (PiZeroSensors.outputLogs) console.log(`%s -> INFO -> Exiting [${code}]: Stopping Prometheus exposure server.`, PiZeroSensors.name);
//      xxxxxxxxx
//  }
//});

// ================================================================================
