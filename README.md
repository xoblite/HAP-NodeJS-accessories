# xoblite/HAP-NodeJS-accessories

_(Nb. I started working on [HAP-NodeJS](https://github.com/KhaosT/HAP-NodeJS) accessory plugins a few weeks back and will start uploading the first public ones here shortly. This readme will be continuously updated, however the code itself should hopefully be somewhat self-explainable... ;) )_

**Unicorn_pHAT_accessory.js**
<br>Regular light, but also a CPU load sensor, Rainbow and Fire summoner, Mood indicator, and more! That is, quite advanced HomeKit integration for the [Pimoroni Unicorn pHAT](https://shop.pimoroni.com/products/unicorn-phat) for [Raspberry Pi Zero](https://www.raspberrypi.org/products/raspberry-pi-zero-w/). Uses the [rpi-ws281x-native](https://www.npmjs.com/package/rpi-ws281x-native) module to control the Unicorn pHAT, and [needs to run as root](https://www.npmjs.com/package/rpi-ws281x-native#needs-to-run-as-root) since this in turn needs to configure e.g. DMA and PWM to do this. More information will be added here later... :)

_Hint: Brightness selects display mode. >10 Regular Light. 1 CPU Load. 2 Rainbow. 3 Fire. 9 (subject to change) Icons. For now... ;)_

**Pi_Zero_CPU_temperature_accessory.js**
<br>Temperature sensor. Reads the [Raspberry Pi Zero](https://www.raspberrypi.org/products/raspberry-pi-zero-w/) CPU temperature periodically (with adaptive frequency) and reports it back to HomeKit.

Enjoy! :D

BR//KHH \[xoblite\]
