// ==========================================================================================
// SuperSnap - a multi-purpose camera-like HomeKit accessory plugin for HAP-NodeJS
// (c) 2018 Karl-Henrik Henriksson - homekit@xoblite.net - http://homekit.xoblite.net/
// Contains merged+modified camera code originally by the author(s) of the HAP-NodeJS project
// ==========================================================================================

//'use strict';

var Accessory = require('../').Accessory;
//var Camera = require('../').Camera;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var StreamController = require('../').StreamController;
var uuid = require('../').uuid;

var crypto = require('crypto');
var fs = require('fs');
var ip = require('ip');

const { execSync } = require('child_process');
var spawn = require('child_process').spawn;

// ================================================================================

var SuperSnap = {
  name: "SuperSnap", // Name of accessory (changeable by the user)
  pincode: "031-45-154", // Pin code of accessory -> "Default" HAP-NodeJS accessory pin code
  username: "xx:xx:xx:xx:xx:xx", // Dynamically defined (see below) MAC like address used by HomeKit to differentiate accessories
  manufacturer: "homekit.xoblite.net", // Manufacturer (optional)
  model: "SuperSnap", // Model (optional, not changeable by the user)
  // hardwareRevision: "1.0", // Hardware version (optional)
  firmwareRevision: "18.11.28", // Firmware version (optional)
  serialNumber: "HAP-NodeJS", // Serial number (optional)

  updateIntervalObject: null, // Later saved setInterval() object
  snapshotSource: 1, // 0 -> Pi Camera (using raspistill),
                     // 1 -> Random image from Picsum Photos (using wget),
                     // 2 -> Random image from LoremFlickr (using wget),
                     // 3 -> Random image from PlaceIMG (using wget)
  snapshotsBlocked: false, // New snapshots currently blocked?
  snapshotsFolder: "/home/pi", // Folder where the periodic snapshot photo/image will be stored
  outputLogs: true, // Enable logging to the console?
}

// ================================================================================

function Camera() {
  this.services = [];
  this.streamControllers = [];

  this.pendingSessions = {};
  this.ongoingSessions = {};

  let options = {
    proxy: false, // Requires RTP/RTCP MUX Proxy
    disable_audio_proxy: false, // If proxy = true, you can opt out audio proxy via this
    srtp: true, // Supports SRTP AES_CM_128_HMAC_SHA1_80 encryption
    video: {
      resolutions: [
        [1920, 1080, 30], // Width, height, framerate
        [320, 240, 15], // Apple Watch requires this configuration
        [1280, 960, 30],
        [1280, 720, 15],
        [1280, 720, 30],
        [1024, 768, 30],
        [640, 480, 30],
        [640, 360, 30],
        [480, 360, 30],
        [480, 270, 30],
        [320, 240, 30],
        [320, 180, 30]
      ],
      codec: {
        profiles: [0, 1, 2], // Enum, please refer StreamController.VideoCodecParamProfileIDTypes
        levels: [0, 1, 2] // Enum, please refer StreamController.VideoCodecParamLevelTypes
      }
    },
    audio: {
      comfort_noise: false,
      codecs: [
        {
          type: "OPUS", // Audio Codec
          samplerate: 24 // 8, 16, 24 KHz
        },
        {
          type: "AAC-eld",
          samplerate: 16
        }
      ]
    }
  }

  var controlService = new Service.CameraControl();
  // <Upstream>: Developer can add control characteristics like rotation, night vision at here.
  this.services.push(controlService);

  var maxStreams = 1;
  for (var i = 0; i < maxStreams; i++) {
    var streamController = new StreamController(i, options, this);
    this.services.push(streamController.service);
    this.streamControllers.push(streamController);
  }
}

// ================================================================================

Camera.prototype.handleCloseConnection = function(connectionID) {
  this.streamControllers.forEach(function(controller) {
    if (SuperSnap.outputLogs) console.log("%s -> INFO -> Closing connection %s.", SuperSnap.name, connectionID);
    controller.handleCloseConnection(connectionID);
  });
}

// ================================================================================

function snapshotsBlockedTimer() {
  clearInterval(SuperSnap.updateIntervalObject);
  SuperSnap.snapshotsBlocked = false;
}

Camera.prototype.handleSnapshotRequest = function(request, callback) { // Snapshot image request: {width: number, height: number}

  if (SuperSnap.outputLogs) console.log("%s -> INFO -> %sx%s pixel snapshot requested...", SuperSnap.name, request.width, request.height);

  var snapshotCommand = '', snapshotFile = '';

  if (SuperSnap.snapshotSource == 1) snapshotFile = SuperSnap.snapshotsFolder + '/picsumphotos.jpg';
  else if (SuperSnap.snapshotSource == 2) snapshotFile = SuperSnap.snapshotsFolder + '/loremflickr.jpg';
  else if (SuperSnap.snapshotSource == 3) snapshotFile = SuperSnap.snapshotsFolder + '/placeimg.jpg';
  else snapshotFile = SuperSnap.snapshotsFolder + '/camera.jpg';

  if (!SuperSnap.snapshotsBlocked)
  {
    if (SuperSnap.snapshotSource == 1) // -> Fetch a random image from Picsum Photos
    {
      if (SuperSnap.outputLogs) console.log("%s -> INFO -> ...fetching a new random image from picsum.photos.", SuperSnap.name);
      snapshotCommand = 'wget https://picsum.photos/' + request.width + '/' + request.height + '/?random -q -O ' + snapshotFile;
      SuperSnap.snapshotsBlocked = true;
      SuperSnap.updateIntervalObject = setInterval(snapshotsBlockedTimer, 30000); // Throttling -> Let a minimum of 30 seconds pass before we will fetch a new image
    }
    else if (SuperSnap.snapshotSource == 2) // -> Fetch a random image from LoremFlickr
    {
      if (SuperSnap.outputLogs) console.log("%s -> INFO -> ...fetching a new random image from loremflickr.com.", SuperSnap.name);
      snapshotCommand = 'wget https://loremflickr.com/' + request.width + '/' + request.height + '/all -q -O ' + snapshotFile;
      SuperSnap.snapshotsBlocked = true;
      SuperSnap.updateIntervalObject = setInterval(snapshotsBlockedTimer, 30000); // Throttling -> Let a minimum of 30 seconds pass before we will fetch a new image
    }    
    else if (SuperSnap.snapshotSource == 3) // -> Fetch a random image from PlaceIMG
    {
      if (SuperSnap.outputLogs) console.log("%s -> INFO -> ...fetching a new random image from placeimg.com.", SuperSnap.name);
      snapshotCommand = 'wget https://placeimg.com/' + request.width + '/' + request.height + '/nature -q -O ' + snapshotFile;
      SuperSnap.snapshotsBlocked = true;
      SuperSnap.updateIntervalObject = setInterval(snapshotsBlockedTimer, 30000); // Throttling -> Let a minimum of 30 seconds pass before we will fetch a new image
    }    
    else // -> Take a snapshot photo using the Raspberry Pi Camera
    {
      if (SuperSnap.outputLogs) console.log("%s -> INFO -> ...taking a new snapshot photo using the Raspberry Pi Camera.", SuperSnap.name);
      snapshotCommand = 'raspistill -t 1 -w ' + request.width + ' -h ' + request.height + ' -ex auto -ev 3 -mm matrix -awb auto -drc low -a 4 -a "%Y-%m-%d %X" -ae 20 -q 95 -o ' + snapshotFile;
    }

    execSync(snapshotCommand, (err, stdout, stderr) => {
      if (err) {
        if (SuperSnap.outputLogs) console.log("%s -> ERROR -> Could not fetch new snapshot photo/image!", SuperSnap.name);
      }
    });
  }
  else if (SuperSnap.outputLogs) console.log("%s -> INFO -> ...responding with recently cached image.", SuperSnap.name);

  var snapshotResponse = fs.readFileSync(snapshotFile);
  callback(undefined, snapshotResponse);
}

// ================================================================================

Camera.prototype.prepareStream = function(request, callback) {

  if (SuperSnap.outputLogs)
  {
    console.log("%s -> INFO -> Stream preparation requested:\n\x1b[32m", SuperSnap.name);
    console.log(request);
    console.log('\x1b[0m');
  }

  var sessionInfo = {};

  let sessionID = request["sessionID"];
  let targetAddress = request["targetAddress"];
  sessionInfo["address"] = targetAddress;

  var response = {};

  // ========== VIDEO ==========

  let videoInfo = request["video"];
  if (videoInfo)
  {
    let targetPort = videoInfo["port"];
    let srtp_key = videoInfo["srtp_key"];
    let srtp_salt = videoInfo["srtp_salt"];

    let ssrcSource = crypto.randomBytes(4);
    ssrcSource[0] = 0;
    let ssrc = ssrcSource.readInt32BE(0, true); // SSRC is a 32 bit integer that is unique per stream

    let videoResp = {
      port: targetPort,
      ssrc: ssrc,
      srtp_key: srtp_key,
      srtp_salt: srtp_salt
    };

    response["video"] = videoResp;

    sessionInfo["video_port"] = targetPort;
    sessionInfo["video_srtp"] = Buffer.concat([srtp_key, srtp_salt]);
    sessionInfo["video_ssrc"] = ssrc; 
  }

  // ========== AUDIO ==========

  let audioInfo = request["audio"];
  if (audioInfo)
  {
    let targetPort = audioInfo["port"];
    let srtp_key = audioInfo["srtp_key"];
    let srtp_salt = audioInfo["srtp_salt"];

    let ssrcSource = crypto.randomBytes(4);
    ssrcSource[0] = 0;
    let ssrc = ssrcSource.readInt32BE(0, true); // SSRC is a 32 bit integer that is unique per stream

    let audioResp = {
      port: targetPort,
      ssrc: ssrc,
      srtp_key: srtp_key,
      srtp_salt: srtp_salt
    };

    response["audio"] = audioResp;

    sessionInfo["audio_port"] = targetPort;
    sessionInfo["audio_srtp"] = Buffer.concat([srtp_key, srtp_salt]);
    sessionInfo["audio_ssrc"] = ssrc; 
  }

  // ========== NETWORKING ==========

  let currentAddress = ip.address();
  var addressResp = {
    address: currentAddress
  };

  if (ip.isV4Format(currentAddress)) addressResp["type"] = "v4";
  else addressResp["type"] = "v6";

  response["address"] = addressResp;

  // ========== REPORT BACK ==========

  this.pendingSessions[uuid.unparse(sessionID)] = sessionInfo;

  if (SuperSnap.outputLogs)
  {
    console.log("%s -> INFO -> Stream preparation finished:\n\x1b[32m", SuperSnap.name);
    console.log(response);
    console.log('\x1b[0m');
  }

  callback(response);
}

// ================================================================================

Camera.prototype.handleStreamRequest = function(request) {

  if (SuperSnap.outputLogs)
  {
    console.log("%s -> INFO -> Stream control event requested:\n\x1b[32m", SuperSnap.name);
    console.log(request);
    console.log('\x1b[0m');
  }

  // ========== CONTROL EVENT (start/stop/reconfigure) ==========

  var sessionID = request["sessionID"];
  var requestType = request["type"];
  
  if (sessionID)
  {
    let sessionIdentifier = uuid.unparse(sessionID);

    if (requestType == "start")
    {
      var sessionInfo = this.pendingSessions[sessionIdentifier];
      if (sessionInfo)
      {
        // Fallback default video settings:
        // 1280x720 @ 30 fps & 300 kbps
        var width = 1280;
        var height = 720;
        var fps = 30;
        var bitrate = 300;

        let videoInfo = request["video"];
        if (videoInfo)
        {
          width = videoInfo["width"];
          height = videoInfo["height"];

          let expectedFPS = videoInfo["fps"];
          if (expectedFPS < fps) fps = expectedFPS;

          bitrate = videoInfo["max_bit_rate"];
        }

        let targetAddress = sessionInfo["address"];
        let targetVideoPort = sessionInfo["video_port"];
        let videoKey = sessionInfo["video_srtp"];
        let videoSsrc = sessionInfo["video_ssrc"];

        if (SuperSnap.snapshotSource == 0) // -> Provide a video stream from the Raspberry Pi Camera
        {
          if (SuperSnap.outputLogs) console.log("%s -> INFO -> Starting video stream...", SuperSnap.name);
  //        let ffmpegCommand = '-re -f avfoundation -r 29.970000 -i 0:0 -threads 0 -vcodec libx264 -an -pix_fmt yuv420p -r '+ fps +' -f rawvideo -tune zerolatency -vf scale='+ width +':'+ height +' -b:v '+ bitrate +'k -bufsize '+ bitrate +'k -payload_type 99 -ssrc '+ videoSsrc +' -f rtp -srtp_out_suite AES_CM_128_HMAC_SHA1_80 -srtp_out_params '+videoKey.toString('base64')+' srtp://'+targetAddress+':'+targetVideoPort+'?rtcpport='+targetVideoPort+'&localrtcpport='+targetVideoPort+'&pkt_size=1378';
          let ffmpegCommand = `-f video4linux2 -input_format h264 -video_size ${width}x${height} -framerate ${fps} -i /dev/video0 -vcodec copy -an -payload_type 99 -ssrc ${videoSsrc} -f rtp -srtp_out_suite AES_CM_128_HMAC_SHA1_80 -srtp_out_params ${videoKey} srtp://${targetAddress}:${targetVideoPort}?rtcpport=${targetVideoPort}&localrtcpport=${targetVideoPort}&pkt_size=1378`;
          this.ongoingSessions[sessionIdentifier] = spawn('ffmpeg', ffmpegCommand.split(' '), {env: process.env});
        }
        else this.ongoingSessions[sessionIdentifier] = null;
      }
      delete this.pendingSessions[sessionIdentifier];
    }
    else if (requestType == "stop")
    {
      var ffmpegProcess = this.ongoingSessions[sessionIdentifier];
      if (ffmpegProcess)
      {
        if (SuperSnap.outputLogs) console.log("%s -> INFO -> Stopping video stream...", SuperSnap.name);
        ffmpegProcess.kill('SIGKILL');
      }
      delete this.ongoingSessions[sessionIdentifier];
    }
  }
}

// ================================================================================

// main()
// First, we dynamically set the name as well as the MAC-like "username"
// of our virtual accessory based on the chosen plugin mode...

if (SuperSnap.snapshotSource == 1) // -> Picsum Photos mode
{
  SuperSnap.name = 'SuperSnap Picsum Photos';
  SuperSnap.username = "7A:B3:15:C8:9A:F2";
}
else if (SuperSnap.snapshotSource == 2) // -> LoremFlickr mode
{
  SuperSnap.name = 'SuperSnap LoremFlickr';
  SuperSnap.username = "C9:5A:FB:83:EC:72";
}
else if (SuperSnap.snapshotSource == 3) // -> PlaceIMG mode
{
  SuperSnap.name = 'SuperSnap PlaceIMG';
  SuperSnap.username = "D9:2F:48:9A:0D:AC";
}
else // -> Pi Camera mode
{
  SuperSnap.name = 'SuperSnap Pi Camera';
  SuperSnap.username = "A2:5C:83:4D:A5:9F";
}

console.log("%s -> INFO -> Starting: Running on HomeCore (HAP-NodeJS) %s / Node.js %s.", SuperSnap.name, require('../package.json').version, process.version);

var cameraUUID = uuid.generate('hap-nodejs:accessories:camera' + SuperSnap.name);
var cameraAccessory = exports.accessory = new Accessory(SuperSnap.name, cameraUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js when starting HAP-NodeJS)
cameraAccessory.username = SuperSnap.username;
cameraAccessory.pincode = SuperSnap.pincode;
console.log("%s -> INFO -> If not bridged, the HomeKit pincode for this accessory is \x1b[44m\x1b[37m %s \x1b[0m.", SuperSnap.name, SuperSnap.pincode);

cameraAccessory
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, SuperSnap.manufacturer)
    .setCharacteristic(Characteristic.Model, SuperSnap.model)
//    .setCharacteristic(Characteristic.HardwareRevision, SuperSnap.hardwareRevision)
    .setCharacteristic(Characteristic.FirmwareRevision, SuperSnap.firmwareRevision)
    .setCharacteristic(Characteristic.SerialNumber, SuperSnap.serialNumber);

cameraAccessory.on('identify', function(paired, callback) {
  if (SuperSnap.outputLogs) console.log("%s -> IDENTIFY -> Hello world! :)", SuperSnap.name);
  callback();
});

var cameraSource = new Camera();
cameraAccessory.category = Accessory.Categories.CAMERA;
cameraAccessory.configureCameraSource(cameraSource);

// ================================================================================

// Anything to clean up before exit?
// process.on('exit', (code) => {
//  if (SuperSnap.exposure)
//  {
//    if (SuperSnap.outputLogs) console.log(`%s -> INFO -> Exiting [${code}]: Stopping xxxxxxxx.`, SuperSnap.name);
//      xxxxxxxxx
//  }
//});

// ================================================================================
