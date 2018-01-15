# IBEX (http://ibex-lib.org/) Manifold Explorer

Simple and interactive explorer for manifold of solutions produced by IBEX solver based on:

- d3.js (https://d3js.org/)
- crossfilter.js (https://github.com/crossfilter/crossfilter)

Supported version of manifold format is: 2

## How to run it:

- install nodejs for your platform
- put main.js and main html in the same directory
- in this directory run this command:

~~~bash
node main.js
~~~

You should be able to access it using a web browser. Default port is 8080, but it can be easily changed in main.js.

If you run it locally, you just have to browse http://localhost:8080, but you can run it on a remote server, thus replace localhost by your server ip and check that port 8080 is not blocked.