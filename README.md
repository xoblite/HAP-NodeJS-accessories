## xoblite/HAP-NodeJS-accessories

_(Nb. I started working on [HAP-NodeJS](https://github.com/KhaosT/HAP-NodeJS) accessory plugins a few months back and will be uploading stuff here continuously. This readme will therefore also be updated continuously, however the code itself should hopefully be somewhat self-explainable as well...  :wink: )_

_(image to be added)_

**SuperSnap_accessory.js**: A multi-purpose tool to deliver snapshot photos and/or images via the HomeKit camera interface. Building off a merge and modification of the original HAP-NodeJS camera accessory code, this plugin provides integration with the [Raspberry Pi Camera Module](https://www.raspberrypi.org/products/camera-module-v2/) as well as to "random image" services like [Picsum Photos](https://picsum.photos/), [LoremFlickr](https://loremflickr.com/) and [PlaceIMG](https://placeimg.com/) for various testing purposes. More information to be added here later.

<img src="http://xoblite.net/images/homekit-plugin-unicorn-phat.png" width="10%" height="10%">

**Unicorn_pHAT_accessory.js**: Regular light, but also a CPU load+history meter, Fire, Swirl and Rainbow summoner, Mood indicator, and more! That is, quite advanced HomeKit integration for the [Pimoroni Unicorn pHAT](https://shop.pimoroni.com/products/unicorn-phat) for [Raspberry Pi Zero](https://www.raspberrypi.org/products/raspberry-pi-zero-w/). Uses the [rpi-ws281x-native](https://www.npmjs.com/package/rpi-ws281x-native) module to control the Unicorn pHAT, and [needs to run as root](https://www.npmjs.com/package/rpi-ws281x-native#needs-to-run-as-root) since this in turn needs to configure e.g. DMA and PWM to do this. More information will be added here later.

_Hint: Brightness selects display mode:
<br>1 CPU Load. 2 CPU History. 3 Fire. 4 Swirl. 5 Rainbow. 9 (subject to change) Icons. >10 Regular Light. For now... ;)_

<img src="http://xoblite.net/images/homekit-plugin-zero-cpu.png" width="10%" height="10%"> <img src="http://xoblite.net/images/homekit-plugin-zero-temp.png" width="10%" height="10%">

**Pi_Zero_CPU_statistics_accessory.js**: CPU Load Meter (via a spoofed humidity sensor showing the non-idle 3 second average load in %) and Temperature Sensor. Reads the current values periodically (with adaptive frequency) from the [Raspberry Pi Zero](https://www.raspberrypi.org/products/raspberry-pi-zero-w/) and reports it back to HomeKit. It also supports optional exposure to [Prometheus](https://prometheus.io/) (on port 9999 by default), and can thereby easily also be monitored beautifully by [Grafana](https://grafana.com/) (based on exposed metrics such as _raspberry_pi_zero_cpu_load_non_idle_, _raspberry_pi_zero_cpu_temperature_, and a few others).

<img src="http://xoblite.net/images/homekit-plugin-keba-p30.png" width="10%" height="10%">

**KEBA_P30_accessory.js**: High level integration of the [KEBA KeContact P30 series](https://www.keba.com/en/emobility/products/product-overview/product_overview) wallbox charging stations for electric cars (via a spoofed fan accessory showing the charging/plugged state as well as the power output in percentage of the HW/SW configured maximum). Reads the current values periodically (10 seconds interleaving) from the wallbox using its [UDP based API](https://www.keba.com/en/emobility/service-support/downloads/Downloads) (note that your wallbox IP address must be configured on line 11), and reports back to HomeKit. It also supports optional exposure of these and other parameters to [Prometheus](https://prometheus.io/) (on port 11521, cf. K=11, E=5, B=2, A=1, by default), see above.

**Coming soon...**

<img src="http://xoblite.net/images/homekit-plugin-awlob.png" width="10%" height="10%"> <img src="http://xoblite.net/images/homekit-plugin-sounds-like-home.png" width="10%" height="10%">

Enjoy! :sunglasses:

BR//KHH \[xoblite\]
