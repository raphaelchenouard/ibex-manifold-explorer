# IBEX (http://ibex-lib.org/) Manifold Explorer

Simple and interactive explorer for manifold of solutions produced by IBEX solver based on:

- d3.js (https://d3js.org/)
- crossfilter.js (https://github.com/crossfilter/crossfilter)

Supported version of manifold format is: 2

## How to run it:

The easiest way is just to open main.html in your favorite web browser.

You can also host it on a web server if you want and access it remotely, but also the javascript code will execute on the client side.

## Major functions:

- load a manifold binary file
- plot a 2D view of a manifold
- selection of dimensions to plot (default: the 2 first)
- selection of status of solutions to plot (default: inner)
- manual rectangular selection to restrict solutions to plot even if dimensions change
- resetting current manual selection
