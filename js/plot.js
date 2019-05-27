// Create the initial drawing with default values
function create_plot(w = 800, h = 600, marg = null) {
    // Define margins for the graphic to place axis
    if (marg == null) {
        margin = {
            top: 10,
            right: 20,
            bottom: 50,
            left: 50
        };
    } else {
        margin = marg;
    }
    width = w - margin.left - margin.right;
    height = h - margin.top - margin.bottom;

    platform = Stardust.platform("webgl-2d", canvas.node(), width, height);
    //canvas.attr("transform","translate(" + margin.left + "," + margin.top + ")");

    var svg = d3.select("#svg_axis").attr("width", w).attr("height", h);

    // Initialize scale objects
    //xscale = Stardust.scale.linear().range([margin.left, margin.left + width]);
    xscale = Stardust.scale.linear().range([0, width]);
    //yscale = Stardust.scale.linear().range([height + margin.top, margin.top]);
    yscale = Stardust.scale.linear().range([height, 0]);
    // Initial current domain to min and max  of each dimension
    x_dom = [mins[curXDim], maxs[curXDim]];
    y_dom = [mins[curYDim], maxs[curYDim]];

    x_sc = d3.scaleLinear().range(xscale.range()).domain(xscale.domain());
    y_sc = d3.scaleLinear().range(yscale.range()).domain(yscale.domain());

    // Initialize axis objects left and bottom
    xAxis = d3.axisBottom(x_sc).ticks(20);
    yAxis = d3.axisLeft(y_sc).ticks(20);
    // Add the x Axis
    gX = svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
        .call(xAxis);
    // Add the y Axis
    gY = svg.append("g")
        .attr("class", "axis axis--y")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(yAxis);

    // text label for the x axis
    svg.append("text")
        .attr("id", "legend_x")
        .attr("transform",
            "translate(" + (w -margin.left) + " ," +
            (height + margin.top-2) + ")")
        .style("text-anchor", "middle")
        .text("x" + curXDim);
    // text label for the y axis
    svg.append("text")
        .attr("id", "legend_y")
        //.attr("transform", "rotate(-90)")
        .attr("x", margin.left / 2)
        .attr("y", margin.top/2)//h / 2)
        .style("text-anchor", "middle")
        .text("x" + curYDim);

    axis = Stardust.mark.create(Stardust.mark.line(), platform);
    axis.attr("width", 1)
        .attr("color", [0., 0., 0., 0.7])
        .attr("p1", Stardust.scale.Vector2(d => d.x1, d => d.y1))
        .attr("p2", Stardust.scale.Vector2(d => d.x2, d => d.y2));


    let boxMark = Stardust.mark.rect();
    boxes = Stardust.mark.create(boxMark, platform);
    boxes2 = Stardust.mark.create(boxMark, platform);

    boxes.attr("p1", Stardust.scale.Vector2(xscale(d => d.lowers[curXDim]), yscale(d => d.uppers[curYDim])));
    boxes.attr("p2", Stardust.scale.Vector2(xscale(d => d.uppers[curXDim]), yscale(d => d.lowers[curYDim])));
    boxes.attr("color", d => canvas_color[d.status]);

    boxes2.attr("p1", Stardust.scale.Vector2(xscale(d => d.lowers[curXDim]), yscale(d => d.uppers[curYDim])));
    boxes2.attr("p2", Stardust.scale.Vector2(xscale(d => d.uppers[curXDim]), yscale(d => d.lowers[curYDim])));
    boxes2.attr("color", [25, 25, 25, 1]);


    canvas.node().onmousemove = e => {
        let bounds = canvas.node().getBoundingClientRect();
        var x = e.clientX - bounds.left;
        var y = e.clientY - bounds.top;
        var p = platform.getPickingPixel(x * 2, y * 2);
        if (p) {
            focus = true;
            platform.clear();
            boxes.render();
            axis.render();
            boxes2.attr("color", [245 / 255., 110 / 255., 15 / 255., 0.75]);
            boxes2.data([plotted_sols[p[1]]]);
            boxes2.render();
            d3.select('#tooltip')
                .style('opacity', 0.8)
                .style('top', e.pageY + 5 + 'px')
                .style('left', e.pageX + 5 + 'px')
                .html(printsol(plotted_sols[p[1]]));
        } else {
            // Hide the tooltip when the mouse doesn't find a plotted box.
            if (focus) {
                focus = false;
                platform.clear();
                boxes.render();
                axis.render();
            }
            d3.select('#tooltip').style('opacity', 0);
        }
    }

    zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .on("zoom", zoomed);
    // Inner Drawing Space
    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    //.call(zoom);
    svg.call(zoom)
        .on("wheel", function () {
            d3.event.preventDefault();
        });
    canvas.call(zoom)
        .on("wheel", function () {
            d3.event.preventDefault();
        });

    //console.log(d3.zoomTransform(canvas.node()));

    function zoomed() {
        console.log("zoomed: " + JSON.stringify(d3.event.transform));
        var k = d3.event.transform.k;
        d3.event.transform.k = 1 + (k - k_last);
        console.log(k_last + " -> " + k + " : " + d3.event.transform.k);
        k_last = d3.event.transform.k;
        /*if (k_last - d3.event.transform.k < 0) {
            k_last = d3.event.transform.k;
            d3.event.transform.k = 1 + k_zoom;
        } else if (k_last - d3.event.transform.k > 0) {
            k_last = d3.event.transform.k;
            d3.event.transform.k = 1 - k_zoom;
        }*/

        /*var mid_x = -canvas.attr('width') / 2 - margin.left;
        var mid_y = -canvas.attr('height') / 2 - margin.top;
        console.log(mid_x + "," + mid_y);
        var x = x_sc.invert(d3.event.transform.x-mid_x)-mins[curXDim];
        var y = y_sc.invert(d3.event.transform.x-mid_y)-mins[curYDim];*/
        //d3.event.transform.k=1;

        x_sc = d3.event.transform.rescaleX(x_sc);
        y_sc = d3.event.transform.rescaleY(y_sc);
        console.log("Previous domains:" + x_dom + ", " + y_dom);
        //x_dom = [Math.max(x_sc.domain()[0], mins[curXDim]), Math.min(x_sc.domain()[1], maxs[curXDim])];
        //y_dom = [Math.max(y_sc.domain()[0], mins[curYDim]), Math.min(y_sc.domain()[1], maxs[curYDim])];
        x_dom = x_sc.domain();
        y_dom = y_sc.domain();
        console.log("New domains:" + x_dom + ", " + y_dom);

        xscale.domain(x_dom);
        yscale.domain(y_dom);

        filter_sol.filterFunction(function (d) {
            return ((d.lowers[curXDim] >= x_dom[0] && d.lowers[curXDim] <= x_dom[1]) ||
                    (d.uppers[curXDim] <= x_dom[1] && d.uppers[curXDim] >= x_dom[0])) &&
                ((d.lowers[curYDim] >= y_dom[0] && d.lowers[curYDim] <= y_dom[1]) ||
                    (d.uppers[curYDim] <= y_dom[1] && (d.uppers[curYDim] >= y_dom[0])));
        });

        // update the set of solution to plot
        plotted_sols = filter_sol.top(Infinity);

        //d3.select("#svg_axis").attr("transform", t);

        update_plot_info();
        drawBoxes(plotted_sols);
        //drawAxis(canvas);
        updateAxis();
    }

    update_plot_info();
    platform.clear();
    drawBoxes(plotted_sols);
    //drawAxis(canvas);
    updateAxis();

    d3.timer(function () {
        fps.update();
    });
}



function updateAxis(){
    
    x_sc.domain(xscale.domain());
    y_sc.domain(yscale.domain());

    /*xAxis = d3.axisBottom(x_sc).ticks(grid_size);
    yAxis = d3.axisLeft(y_sc).ticks(grid_size);
    gX.call(xAxis);
    gY.call(yAxis);*/
    xAxis.scale(x_sc);
    yAxis.scale(y_sc);
}

function drawAxis(canvas, grid_size = 20) {
    //var ctx = canvas_axis.node().getContext('2d');
    //var ctx = canvas.node().getContext('webgl');
    //ctx.clearRect(-margin.left, -margin.top, canvas.node().width + margin.left, canvas.node().height + margin.top); // Clear the canvas.
    //ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw each individual custom element with their properties.

    x_sc.domain(xscale.domain());
    y_sc.domain(yscale.domain());

    xAxis = d3.axisBottom(x_sc).ticks(grid_size);
    yAxis = d3.axisLeft(y_sc).ticks(grid_size);
    gX.call(xAxis);
    gY.call(yAxis);

    var padding = 2;
    var tickCount;
    var tickSize = 6;
    var ticks_x = x_sc.ticks(tickCount);
    var ticks_y = y_sc.ticks(tickCount);

    var lines = [];
    // x axis
    // draw axis line
    lines.push({
        x1: margin.left - 2 * padding,
        y1: margin.top + height + padding + tickSize / 2.,
        x2: margin.left + width + 1,
        y2: margin.top + height + padding + tickSize / 2.
    });
    ticks_x.forEach(function (d) {
        /* ctx.moveTo(x_sc(d), height + padding - tickSize / 2);
         ctx.lineTo(x_sc(d), height + padding + tickSize / 2);*/

        lines.push({
            x1: x_sc(d),
            y1: margin.top + height + padding - tickSize / 2.,
            x2: x_sc(d),
            y2: margin.top + height + padding + tickSize / 2.
        });
    });
    //draw legend
    /*ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ticks_x.forEach(function(d) {
        ctx.fillText(d, x_sc(d), height + padding + tickSize + 1);
    });*/

    // y axis
    // draw axis line
    lines.push({
        x1: margin.left - padding - tickSize / 2.,
        y1: margin.top - 1,
        x2: margin.left - padding - tickSize / 2.,
        y2: margin.top + height + 3 * padding
    });
    // draw ticks
    ticks_y.forEach(function (d) {
        /*ctx.moveTo(tickSize / 2, y_sc(d));
        ctx.lineTo(-tickSize / 2, y_sc(d));*/
        lines.push({
            x1: margin.left - padding + tickSize / 2.,
            y1: y_sc(d),
            x2: margin.left - padding - tickSize / 2,
            y2: y_sc(d)
        });
    });
    // draw legend
    /*ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ticks_y.forEach(function(d) {
        ctx.fillText(d, -2 * padding - tickSize, y_sc(d));
    });

    ctx.font = "bold 12px sans-serif";
    ctx.fillText("x" + curXDim, width, margin.top + height + margin.bottom / 2);
    ctx.fillText("y" + curYDim, -margin.left / 2, margin.top + tickSize);*/
    axis.data(lines);
    axis.render();
}

function drawBoxes(data_plot) {
    platform.clear();

    boxes.data(data_plot);
    boxes.render();

    platform.beginPicking(canvas.node().width, canvas.node().height);
    boxes.render();
    platform.endPicking();
    fps.update();
}
