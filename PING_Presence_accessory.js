// ====================================================================================
// PING Presence - a simple presence monitoring HomeKit accessory plugin for HAP-NodeJS
// (c) 2018 Karl-Henrik Henriksson - homekit@xoblite.net - http://homekit.xoblite.net/
// ====================================================================================

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

var spawn = require('child_process').spawn;

var checkPresenceIP = '172.16.1.51'; // IP address of the device we want to monitor

// ================================================================================

var PresenceSensor = {
  name: "PING Presence", // Name of accessory (changeable by the user)
  pincode: "031-45-154", // Pin code of accessory -> "Default" HAP-NodeJS accessory pin code
  username: "15:D3:5F:B7:BA:38", // MAC like address used by HomeKit to differentiate accessories
  manufacturer: "homekit.xoblite.net", // Manufacturer (optional)
  model: "PING Presence", // Model (optional, not changeable by the user)
  // hardwareRevision: "1.0", // Hardware version (optional)
  firmwareRevision: "18.11.28", // Firmware version (optional)
  serialNumber: "HAP-NodeJS", // Serial number (optional)

  presenceDetected: false, // Presence status of the device we are monitoring
  updateIntervalObject: null, // Later saved setInterval() object
  outputLogs: true, // Enable logging to the console?
}

// ================================================================================

console.log("%s -> INFO -> Starting: Running on HomeCore (HAP-NodeJS) %s / Node.js %s.", PresenceSensor.name, require('../package.json').version, process.version);

var sensorUUID = uuid.generate('hap-nodejs:accessories:fan' + PresenceSensor.name);
var sensorAccessory = exports.accessory = new Accessory(PresenceSensor.name, sensorUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js when starting HAP-NodeJS)
sensorAccessory.username = PresenceSensor.username;
sensorAccessory.pincode = PresenceSensor.pincode;
console.log("%s -> INFO -> If not bridged, the HomeKit pincode for this accessory is \x1b[44m\x1b[37m %s \x1b[0m.", PresenceSensor.name, PresenceSensor.pincode);

sensorAccessory
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, PresenceSensor.manufacturer)
    .setCharacteristic(Characteristic.Model, PresenceSensor.model)
//    .setCharacteristic(Characteristic.HardwareRevision, PresenceSensor.hardwareRevision)
    .setCharacteristic(Characteristic.FirmwareRevision, PresenceSensor.firmwareRevision)
    .setCharacteristic(Characteristic.SerialNumber, PresenceSensor.serialNumber);

sensorAccessory.on('identify', function(paired, callback) {
  if (PresenceSensor.outputLogs) console.log("%s -> IDENTIFY -> Hello world! :)", PresenceSensor.name);
  callback();
});

sensorAccessory
  .addService(Service.OccupancySensor, "PING Presence - " + checkPresenceIP)
  .getCharacteristic(Characteristic.OccupancyDetected)
  .on('get', function(callback) {
    if (PresenceSensor.presenceDetected) callback(null, 1); // Elvis is in the building...
    else callback(null, 0); // Elvis is not in the building...
  });

// ================================================================================

var deviceNotPresentCounter = 0;

function checkPresence() {

    var cp = spawn('ping', ['-q', '-n', '-c 1', '-W 1', checkPresenceIP]);
    cp.on('exit', function(code) {
        if (code == 0)
        {
            if (!PresenceSensor.presenceDetected) // Elvis has *entered* the building... (i.e. presence status has changed)
            {
                deviceNotPresentCounter = 0;
                PresenceSensor.presenceDetected = true;
                sensorAccessory
                    .getService(Service.OccupancySensor)
                    .setCharacteristic(Characteristic.OccupancyDetected, 1);
                if (PresenceSensor.outputLogs) console.log("%s -> INFO -> \x1b[32m%s\x1b[0m is alive and kicking! :)", PresenceSensor.name, checkPresenceIP);
            }
        }
        else
        {
            if (PresenceSensor.presenceDetected) // Elvis has *left* the building... (i.e. presence status has changed)
            {
                deviceNotPresentCounter++;
                if (deviceNotPresentCounter == 18) // ...but we try looking for him 18 times (i.e. for 18x10 seconds == 3 minutes) first to make sure... ;)
                {
                    PresenceSensor.presenceDetected = false;
                    sensorAccessory
                        .getService(Service.OccupancySensor)
                        .setCharacteristic(Characteristic.OccupancyDetected, 0);
                    if (PresenceSensor.outputLogs) console.log("%s -> INFO -> \x1b[31m%s\x1b[0m is nowhere to be found... :(", PresenceSensor.name, checkPresenceIP);
                }
            }
        }
    });
};

PresenceSensor.updateIntervalObject = setInterval(checkPresence, 10000);

// ================================================================================

// Anything to clean up before exit?
// process.on('exit', (code) => {
//  if (PresenceSensor.exposure)
//  {
//    if (PresenceSensor.outputLogs) console.log(`%s -> INFO -> Exiting [${code}]: Stopping xxxxxxxx.`, PresenceSensor.name);
//      xxxxxxxxx
//  }
//});

// ================================================================================
