# xoblite/HAP-NodeJS-accessories

_(Nb. I started working on [HAP-NodeJS](https://github.com/KhaosT/HAP-NodeJS) accessory plugins a few weeks back and will start uploading the first public ones here shortly. This readme will be continuously updated, however the code itself should hopefully be somewhat self-explainable... ;) )_

**Unicorn_pHAT_accessory.js**

<img src="http://xoblite.net/images/homekit-plugin-unicorn-phat.png" width="10%" height="10%">

Regular light, but also a CPU load meter, Fire, Swirl and Rainbow summoner, Mood indicator, and more! That is, quite advanced HomeKit integration for the [Pimoroni Unicorn pHAT](https://shop.pimoroni.com/products/unicorn-phat) for [Raspberry Pi Zero](https://www.raspberrypi.org/products/raspberry-pi-zero-w/). Uses the [rpi-ws281x-native](https://www.npmjs.com/package/rpi-ws281x-native) module to control the Unicorn pHAT, and [needs to run as root](https://www.npmjs.com/package/rpi-ws281x-native#needs-to-run-as-root) since this in turn needs to configure e.g. DMA and PWM to do this. More information will be added here later... :)

_Hint: Brightness selects display mode:
<br>1 CPU Load. 2 CPU History. 3 Fire. 4 Swirl. 5 Rainbow. 9 (subject to change) Icons. >10 Regular Light. For now... ;)_

**Pi_Zero_CPU_statistics_accessory.js**

<img src="http://xoblite.net/images/homekit-plugin-zero-cpu.png" width="10%" height="10%"> <img src="http://xoblite.net/images/homekit-plugin-zero-temp.png" width="10%" height="10%">

CPU Load Meter (via a spoofed humidity sensor showing the non-idle 3 second average load in %) and Temperature Sensor. Reads the current values periodically (with adaptive frequency) from the [Raspberry Pi Zero](https://www.raspberrypi.org/products/raspberry-pi-zero-w/) and reports it back to HomeKit. It also supports optional exposure to [Prometheus](https://prometheus.io/) (on port 9999 by default), and can thereby easily also be monitored beautifully by [Grafana](https://grafana.com/) (based on exposed metrics such as _raspberry_pi_zero_cpu_load_non_idle_, _raspberry_pi_zero_cpu_temperature_, and a few others).

**KEBA_P30_accessory.js**

High level integration of the [KEBA KeContact P30 series](https://www.keba.com/en/emobility/products/product-overview/product_overview) wallbox charging stations for electric cars (via a spoofed fan accessory showing the charging/plugged state as well as the power output in percentage of the HW/SW configured maximum). Reads the current values periodically (10 seconds interleaving) from the wallbox using its [UDP based API](https://www.keba.com/en/emobility/service-support/downloads/Downloads), and reports back to HomeKit. It also supports optional exposure to [Prometheus](https://prometheus.io/) (on port 11521, cf. K=11, E=5, B=2, A=1 by default), see above. _PS. May add a one or two more features before it's done, haven't decided yet... :)_

**Coming soon...**

<img src="http://xoblite.net/images/homekit-plugin-awlob.png" width="10%" height="10%"> <img src="http://xoblite.net/images/homekit-plugin-sounds-like-home.png" width="10%" height="10%">

Enjoy! :D

BR//KHH \[xoblite\]
