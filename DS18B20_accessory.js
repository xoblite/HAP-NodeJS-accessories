// =====================================================================================
// DS18B20 digital (12-bit) temperature sensor - HomeKit accessory plugin for HAP-NodeJS
// (c) 2018 Karl-Henrik Henriksson - homekit@xoblite.net - http://homekit.xoblite.net/
// =====================================================================================

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

const { execSync } = require('child_process');
const TEMP_INDOORS = 1, TEMP_OUTDOORS = 2;

// Identity of the DS18B20 1-Wire sensor device(s) we're interested in
// (nb. each sensor has a unique 28-xxxxxxxxxxxx serial number ~ ID string,
// for further information see e.g. https://pinout.xyz/pinout/1_wire )
var ds18b20_indoors = '28-01183392d2ff';
var ds18b20_outdoors = '28-011833915dff';

// ================================================================================

var DS18B20 = {
  name: "DS18B20", // Name of accessory (changeable by the user)
  pincode: "031-45-154", // Pin code of accessory -> "Default" HAP-NodeJS accessory pin code
  username: "4F:38:A2:9E:65:B1", // MAC like address used by HomeKit to differentiate accessories
  manufacturer: "homekit.xoblite.net", // Manufacturer (optional)
  model: "DS18B20", // Model (optional, not changeable by the user)
//  hardwareRevision: "1.0", // Hardware version (optional)
  firmwareRevision: "18.12.30", // Firmware version (optional)
  serialNumber: "HAP-NodeJS", // Serial number (optional)

  temperatureIndoors: 0.0,
  temperatureOutdoors: 0.0,
  outputLogs: true, // Enable logging to the console?

  // ====================

  getTemperature: function(sensor) // Get the current temperature from a DS18B20 sensor...
  {
    var cmd = '';
    if (sensor == TEMP_OUTDOORS) cmd = 'cat /sys/bus/w1/devices/' + ds18b20_outdoors + '/w1_slave';
    else cmd = 'cat /sys/bus/w1/devices/' + ds18b20_indoors + '/w1_slave';

    var data = execSync(cmd, (err, stdout, stderr) => {
        if (err) {
          if (DS18B20.outputLogs) console.log("%s -> ERROR -> \x1b[31mTemperature could not be read from %s!\x1b[0m", DS18B20.name, cmd);
          return 0;
        }
    });

    var str = data.toString(); // Convert Buffer to String
    var n = str.indexOf(' t=') + 3; // Find the temperature in the output
    var value = str.substring(n).trim(); // Trim any trailing whitespaces etc
    var degrees = parseInt(value) / 1000; // Parse value to temperature (float)

    // Apply some minor adjustments roughly matching the typical error /
    // performance curve included in the DS18B20 datasheet
    // See https://datasheets.maximintegrated.com/en/ds/DS18B20.pdf ,
    // page 3 figure 1 (nb figure 17 in older revisions of the datasheet)
    if (degrees <= 0) degrees += 0.1;
    else if (degrees < 10) degrees += 0.15;
    else if (degrees < 30) degrees += 0.2;
    else if (degrees < 40) degrees += 0.15;
    else if (degrees < 50) degrees += 0.10;
    else if (degrees < 60) degrees += 0.05;
    else if (degrees >= 60) degrees -= 0.05;

    if (sensor == TEMP_OUTDOORS)
    {
      // Extract temperature including one decimal (nb. this will be averaged by
      // the *Home app* to the nearest .5 degrees, but not by HomeKit itself).
      DS18B20.temperatureOutdoors = degrees.toFixed(1);
      if (DS18B20.outputLogs) console.log("%s -> GET -> %s -> Outdoors temperature -> \x1b[97;104m %s °C \x1b[0m.", DS18B20.name, ds18b20_outdoors, DS18B20.temperatureOutdoors);
      return DS18B20.temperatureOutdoors;
    }
    else // TEMP_INDOORS
    {
      // Extract temperature including one decimal (nb. this will be averaged by
      // the *Home app* to the nearest .5 degrees, but not by HomeKit itself).
      DS18B20.temperatureIndoors = degrees.toFixed(1);
      if (DS18B20.outputLogs) console.log("%s -> GET -> %s -> Indoors temperature -> \x1b[97;104m %s °C \x1b[0m.", DS18B20.name, ds18b20_indoors, DS18B20.temperatureIndoors);
      return DS18B20.temperatureIndoors;
    }
  },

  // ====================

  identify: function() { // Identify the accessory
    if (this.outputLogs) console.log("%s -> IDENTIFY -> Hello world! :)", this.name);
  }
}

// ================================================================================

console.log("%s -> INFO -> Starting: Version %s, running on HomeCore (HAP-NodeJS) %s / Node.js %s.", DS18B20.name, DS18B20.firmwareRevision, require('../package.json').version, process.version);

if (ds18b20_indoors.length == 0 && ds18b20_outdoors.length == 0)
{
  console.log("%s -> ERROR -> \x1b[31mNo DS18B20 sensor(s) configured!\x1b[0m (check your .js file)", DS18B20.name);
  return 0;
}

var sensorUUID = uuid.generate('hap-nodejs:accessories:sensor' + DS18B20.name);
var sensorAccessory = exports.accessory = new Accessory(DS18B20.name, sensorUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js when starting HAP-NodeJS)
sensorAccessory.username = DS18B20.username;
sensorAccessory.pincode = DS18B20.pincode;
console.log("%s -> INFO -> If not bridged, the HomeKit pincode for this accessory is \x1b[44m\x1b[37m %s \x1b[0m.", DS18B20.name, DS18B20.pincode);

sensorAccessory
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, DS18B20.manufacturer)
    .setCharacteristic(Characteristic.Model, DS18B20.model)
//    .setCharacteristic(Characteristic.HardwareRevision, DS18B20.hardwareRevision)
    .setCharacteristic(Characteristic.FirmwareRevision, DS18B20.firmwareRevision)
    .setCharacteristic(Characteristic.SerialNumber, DS18B20.serialNumber);

sensorAccessory.on('identify', function(paired, callback) {
  DS18B20.identify();
  callback();
});

// ====================

if (ds18b20_indoors.length > 0)
{
  sensorAccessory
  .addService(Service.TemperatureSensor, "DS18B20 Indoors", TEMP_INDOORS)
  .getCharacteristic(Characteristic.CurrentTemperature)
  .on('get', function(callback) {
    callback(null, DS18B20.getTemperature(TEMP_INDOORS));
  });
}

if (ds18b20_outdoors.length > 0)
{
  sensorAccessory
  .addService(Service.TemperatureSensor, "DS18B20 Outdoors", TEMP_OUTDOORS)
  .getCharacteristic(Characteristic.CurrentTemperature)
  .on('get', function(callback) {
    callback(null, DS18B20.getTemperature(TEMP_OUTDOORS));
  });
}

// ================================================================================

// Anything to clean up before exit?
// process.on('exit', (code) => {
//  if (DS18B20.xxxxxxxx)
//  {
//    if (DS18B20.outputLogs) console.log(`%s -> INFO -> Exiting [${code}]: Stopping xxxxxxxx.`, DS18B20.name);
//      xxxxxxxxx
//  }
//});

// ================================================================================
