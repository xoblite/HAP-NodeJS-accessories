// ===================================================================================
// KEBA KeContact P30 wallbox charger HomeKit accessory plugin for HAP-NodeJS
// (c) 2018 Karl-Henrik Henriksson - homekit@xoblite.net - http://homekit.xoblite.net/
// ===================================================================================

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

var wallboxIP = '192.168.1.23'; // KEBA wallbox IP address

// ================================================================================

var Wallbox = {
  name: "KEBA P30 Wallbox", // Name of accessory (changeable by the user)
  pincode: "031-45-154", // Pin code of accessory -> "Default" HAP-NodeJS accessory pin code
  username: "B4:9D:1A:4C:92:D0", // MAC like address used by HomeKit to differentiate accessories
  manufacturer: "homekit.xoblite.net", // Manufacturer (optional)
  model: "KEBA P30 Wallbox", // Model (optional, not changeable by the user)
  // hardwareRevision: "1.0", // Hardware version (optional)
  firmwareRevision: "18.10.23", // Firmware version (optional)
  serialNumber: "HAP-NodeJS", // Serial number (optional)

  pluggedIn: false, // Is any electric vehicle plugged into the wallbox?
  outputPowerInPercent: 0, // Wallbox power output in percentage of maximum configured in HW
  maxAllowedCurrent: 16000, // Maximum allowed current in mA (user configurable), used for calculating the power output as percentage of maximum
  updateIntervalObject: null, // Later saved setInterval() object
  exposure: true, // Allow exposure of wallbox statistics to Prometheus?
  exposurePort: 11521, // Port exposed to Prometheus (when enabled) [cf. K=11, E=5, B=2, A=1 :) ]
  outputLogs: true, // Enable logging to the console?
}

// ================================================================================

if (Wallbox.outputLogs) console.log("%s -> INFO -> Starting: Running on HomeCore (HAP-NodeJS) %s / Node.js %s.", Wallbox.name, require('../package.json').version, process.version);

var sensorUUID = uuid.generate('hap-nodejs:accessories:fan' + Wallbox.name);
var sensorAccessory = exports.accessory = new Accessory(Wallbox.name, sensorUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js when starting HAP-NodeJS)
sensorAccessory.username = Wallbox.username;
sensorAccessory.pincode = Wallbox.pincode;
if (Wallbox.outputLogs) console.log("%s -> INFO -> If not bridged, the HomeKit pincode for this accessory is \x1b[44m\x1b[37m %s \x1b[0m.", Wallbox.name, Wallbox.pincode);

sensorAccessory
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, Wallbox.manufacturer)
    .setCharacteristic(Characteristic.Model, Wallbox.model)
//    .setCharacteristic(Characteristic.HardwareRevision, Wallbox.hardwareRevision)
    .setCharacteristic(Characteristic.FirmwareRevision, Wallbox.firmwareRevision)
    .setCharacteristic(Characteristic.SerialNumber, Wallbox.serialNumber);

sensorAccessory.on('identify', function(paired, callback) {
  if (Wallbox.outputLogs) console.log("%s -> IDENTIFY -> Hello world! :)", Wallbox.name);
  callback();
});

sensorAccessory
  .addService(Service.Fan, "KEBA P30 Wallbox")
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    callback(null, Wallbox.pluggedIn);
  })
  .on('set', function(value, callback) {
    callback(); // We don't really care... ;)
  });

sensorAccessory
  .getService(Service.Fan)
  .addCharacteristic(Characteristic.RotationSpeed)
  .on('get', function(callback) {
    callback(null, Wallbox.outputPowerInPercent);
  })
  .on('set', function(value, callback) {
    callback(); // We don't really care... ;)
  });

// ================================================================================

var objID2 = Object.create({}), objID3 = Object.create({});

var dgram = require('dgram');
var server = dgram.createSocket('udp4');
server.bind(7090);

server.on('listening', function () {
  var address = server.address();
  if (Wallbox.outputLogs) console.log("%s -> INFO -> Starting:\n\n     \x1b[7m Wallbox monitoring server listening on port %s. \x1b[0m\n", Wallbox.name, address.port);
});

server.on('message', function (message, remote) {
  const buffer = Buffer.from(message);
  if (buffer.indexOf('{') == 0) // JSON (the wallbox also sends a few non-JSON messages that we're not interested in)
  {
    var obj = JSON.parse(message);

    // ====================

    if (obj.ID == 2) // Report 2
    {
      objID2 = Object.assign({}, obj); // Store these statistics for possible re-use later...
//      Wallbox.maxAllowedCurrent = Math.min(obj["Curr HW"], obj["Curr user"]);
      Wallbox.maxAllowedCurrent = obj["Curr HW"];

      if (Wallbox.outputLogs)
      {
        console.log("%s -> INFO -> Message received from %s:%s (parsed from JSON):\n", Wallbox.name, remote.address, remote.port);
        if (obj.State == 0) console.log('   \x1b[32m--> State: \x1b[7m Starting \x1b[0m\n');
        if (obj.State == 1) console.log('   \x1b[32m--> State: \x1b[7m Unplugged \x1b[0m \x1b[32m(not ready)\x1b[0m\n');
        if (obj.State == 2) console.log('   \x1b[32m--> State: \x1b[7m Plugged \x1b[0m \x1b[32m(not charging)\x1b[0m\n');
        if (obj.State == 3) console.log('   \x1b[32m--> State: \x1b[7m Charging \x1b[0m\n');
        if (obj.State == 4) console.log('   \x1b[32m--> State: \x1b[7m Error \x1b[0m\n');
        if (obj.State == 5) console.log('   \x1b[32m--> State: \x1b[7m Interrupted \x1b[0m\n');

        console.log('   \x1b[32m--> Max current (HW restriction) : %s A\x1b[0m', obj["Curr HW"] / 1000);
        console.log('   \x1b[32m--> Max current (SW configured)  : %s A\x1b[0m\n', obj["Curr user"] / 1000);
      }

      // ...and report applicable readings back to HomeKit...

      if ((obj.Plug == 7) && (obj.State = 3 || obj.State == 2)) // Charging [State=3] or Plugged (i.e. not charging [State=2] but cable plugged in and locked at both ends [Plug=7])
      {
        Wallbox.pluggedIn = true;
        sensorAccessory
        .getService(Service.Fan)
        .setCharacteristic(Characteristic.On, true);

        if (Wallbox.outputPowerInPercent > 0) // -> Plugged in and Charging (nb. included here too [cf. below] for possibly faster updates in the Home app)
        {
          sensorAccessory
          .getService(Service.Fan)
          .setCharacteristic(Characteristic.RotationSpeed, Wallbox.outputPowerInPercent);
        }
      }
      else // Unplugged ("not ready"), Error, Interrupted or Starting
      {
        Wallbox.pluggedIn = false;
        sensorAccessory
        .getService(Service.Fan)
        .setCharacteristic(Characteristic.On, false);
      }
    }

    // ====================

    else if (obj.ID == 3) // Report 3
    {
      objID3 = Object.assign({}, obj); // Store these statistics for possible re-use later...
      var pwr = (obj.P/1000000).toFixed(2);
      Wallbox.outputPowerInPercent = Math.round((Math.max(obj.I1, obj.I2, obj.I3) / Wallbox.maxAllowedCurrent) * 100);
      var kWh = (obj["E pres"] / 10000).toFixed(2);

      if (Wallbox.outputLogs)
      {
        console.log("%s -> INFO -> Message received from %s:%s (parsed from JSON):\n", Wallbox.name, remote.address, remote.port);
        console.log(`   \x1b[32m--> Voltage: ${obj.U1} / ${obj.U2} / ${obj.U3} V\x1b[0m`);
        console.log(`   \x1b[32m--> Current: ${obj.I1/1000} / ${obj.I2/1000} / ${obj.I3/1000} A\x1b[0m`);
        console.log('   \x1b[32m--> Power: ' + pwr + ' kW\x1b[0m');
        console.log("   \x1b[32m--> Power in % of maximum: \x1b[7m " + Wallbox.outputPowerInPercent + "% \x1b[0m\n");
        console.log("   \x1b[32m--> Energy transferred: \x1b[7m " + kWh + " kWh \x1b[0m\n");
      }

      // ...and report applicable readings back to HomeKit...

      sensorAccessory
        .getService(Service.Fan)
        .setCharacteristic(Characteristic.RotationSpeed, Wallbox.outputPowerInPercent);

      if (Wallbox.outputPowerInPercent > 0) // -> Plugged in and Charging (nb. included here too [cf. above] for possibly faster updates in the Home app)
      {
        Wallbox.pluggedIn = true;
        sensorAccessory
        .getService(Service.Fan)
        .setCharacteristic(Characteristic.On, true);
      }
    }
  }
});

// ================================================================================

var everyOther = false;

// Apart from the manual update on GET, we will automatically update the wallbox power output and
// plugged-in-or-not status readings every (other) 10 seconds, followed by a report back to HomeKit...
function updateStatistics() {
  if (everyOther)
  {
    if (server) server.send('report 3', 7090, wallboxIP, function(err, bytes) {
      if (err) throw err;
    });
    everyOther = false;
  }
  else
  {
    if (server) server.send('report 2', 7090, wallboxIP, function(err, bytes) {
      if (err) throw err;
    });
    everyOther = true;
  }
};

Wallbox.updateIntervalObject = setInterval(updateStatistics, 10000);

// ================================================================================

// Exposure of wallbox statistics to Prometheus?
if (Wallbox.exposure)
{
  if (Wallbox.outputLogs) console.log("%s -> INFO -> Starting:\n\n     \x1b[7m Prometheus exposure server listening on port %s. \x1b[0m\n", Wallbox.name, Wallbox.exposurePort);

  var http = require('http');
  http.createServer(function (request, response) {

    response.writeHead(200, {'Content-Type': 'text/plain'});
    var kv = 'keba_p30_power_output_in_percent_of_maximum ' + Wallbox.outputPowerInPercent + '\n';
    response.write(kv);

    if ('ID' in objID2)
    {
      kv = 'keba_p30_report2_state ' + objID2.State + '\n';
      response.write(kv);
      kv = 'keba_p30_report2_plug ' + objID2.Plug + '\n';
      response.write(kv);
      kv = 'keba_p30_report2_curr_hw ' + objID2["Curr HW"] + '\n';
      response.write(kv);
      kv = 'keba_p30_report2_curr_user ' + objID2["Curr user"] + '\n';
      response.write(kv);
    }

    if ('ID' in objID3)
    {
      kv = 'keba_p30_report3_u1 ' + objID3.U1 + '\n';
      response.write(kv);
      kv = 'keba_p30_report3_u2 ' + objID3.U2 + '\n';
      response.write(kv);
      kv = 'keba_p30_report3_u3 ' + objID3.U3 + '\n';
      response.write(kv);
      kv = 'keba_p30_report3_i1 ' + objID3.I1 + '\n';
      response.write(kv);
      kv = 'keba_p30_report3_i2 ' + objID3.I2 + '\n';
      response.write(kv);
      kv = 'keba_p30_report3_i3 ' + objID3.I3 + '\n';
      response.write(kv);
      kv = 'keba_p30_report3_p ' + objID3.P + '\n';
      response.write(kv);
      kv = 'keba_p30_report3_e_pres ' + objID3["E pres"] + '\n';
      response.write(kv);
    }

    response.end();
  }).listen(Wallbox.exposurePort);  
}

// ================================================================================

// Anything to clean up before exit?
// process.on('exit', (code) => {
//  if (Wallbox.exposure)
//  {
//    if (Wallbox.outputLogs) console.log(`%s -> INFO -> Exiting [${code}]: Stopping Prometheus exposure server.`, Wallbox.name);
//      xxxxxxxxx
//  }
//});

// ================================================================================
