// Add inputs to update the graphic
function create_controls(node) {
    // Since manifold format does not contains names for dimensions, define some generic ones
    var dim_names = [];
    for (var i = 0; i < nb_var; i++) {
        dim_names.push("x" + i);
    }
    node.selectAll("*").remove();

    // Add a list selection for dimension of x axis
    var selX = node.append('select')
        .attr("id", "selX")
        .style("font-size", "14")
        .attr('class', 'select')
        .on('change', onchangeX);
    selX.selectAll("option")
        .data(dim_names).enter()
        .append('option')
        .property('selected', function (d) {
            return d === "x0";
        })
        .text(function (d) {
            return d;
        })
    // Add a list selection for dimension of y axis
    var selY = node.append('select')
        .attr("id", "selY")
        .attr('class', 'select')
        .on('change', onchangeY);
    selY.selectAll("option")
        .data(dim_names).enter()
        .append('option')
        .property('selected', function (d) {
            return d === "x1";
        })
        .text(function (d) {
            return d;
        });

    // Add a list selection for the status of solutions to plot
    var selStatus = node.append('select')
        .attr("id", "selStatus")
        .attr('class', 'select')
        .on('change', onchangeStatus);
    selStatus.selectAll("option")
        .data(status_names).enter()
        .append('option')
        .property('selected', function (d) {
            return d === "Inner";
        })
        .text(function (d) {
            return d;
        });

    var grpBtn = node.append('div').attr("class", 'input-group margin-bottom-sm');


    var crop = grpBtn.append('span')
        .attr('id', 'crop')
        .attr('title', 'Make a rectangular selection')
        .attr('type', 'button')
        //.attr('value', '&#f125')
        .on('click', crop)
        .append('i')
        .attr('class', 'fas fa-crop fa-2x fa-border');

    var zoomIn = grpBtn.append('span')
        .attr('id', 'zoomIn')
        .attr('title', 'Zoom in')
        .on('click', zoom_in)
        .append('i')
        .attr('class', 'fas fa-search-plus fa-2x fa-border');
    var zoomOut = grpBtn.append('span')
        .attr('id', 'zoomOut')
        .attr('title', 'Zoom out')
        .on('click', zoom_out)
        .append('i')
        .attr('class', 'fas fa-search-minus fa-2x fa-border');

    var resSel = grpBtn.append('span')
        .attr('id', 'resBtn')
        .attr('title', 'Reset current selection or zoom')
        .on('click', reset_selection)
        .append('i')
        .attr('class', 'fas fa-undo fa-2x fa-border');

    var expImg = grpBtn.append('span')
        .attr('id', 'expImg')
        .attr('title', 'Export current graphic as image')
        .on('click', export_image)
        .append('i')
        .attr('class', 'fas fa-image fa-2x fa-border');

    var expMnf = grpBtn.append('span')
        .attr('id', 'expMnf')
        .attr('title', 'Export current boxes as manifold')
        .on('click', export_manifold)
        .append('i')
        .attr('class', 'fas fa-save fa-2x fa-border');


    // function called when dimension for x axis change
    function onchangeX() {
        var selectValue = d3.select('#selX').property('value');
        // get the number corresponding to the selection
        curXDim = parseInt(selectValue.substring(1));

        var minAcc = function (d) {
            return d.lowers[curXDim];
        };
        var maxAcc = function (d) {
            return d.uppers[curXDim];
        };
        x_dom[0] = d3.extent(plotted_sols, minAcc)[0];
        x_dom[1] = d3.extent(plotted_sols, maxAcc)[1];

        //reset_selection();
        // add new data relating to new selected dimension
        update_plot_info();

        drawBoxes(plotted_sols);
        drawAxis(canvas);
    };

    // function called when dimension for y axis change
    function onchangeY() {
        var selectValue = d3.select('#selY').property('value');
        // get the number corresponding to the selection
        curYDim = parseInt(selectValue.substring(1));

        var minAcc = function (d) {
            return d.lowers[curYDim];
        };
        var maxAcc = function (d) {
            return d.uppers[curYDim];
        };
        y_dom[0] = d3.extent(plotted_sols, minAcc)[0];
        y_dom[1] = d3.extent(plotted_sols, maxAcc)[1];

        //reset_selection();
        // add new data relating to new selected dimension
        update_plot_info();

        drawBoxes(plotted_sols);
        drawAxis(canvas);
    };

    // function called when status change
    function onchangeStatus() {
        var selectValue = d3.select('#selStatus').property('value');
        if (selectValue === "All") {
            // remove current filter from selected solutions
            filter_by_status.filterAll();
        } else {
            // filter solutions on selected status
            filter_by_status.filterExact(status_codes[selectValue]);
        }
        // update the set of solution to plot
        plotted_sols = filter_by_status.top(Infinity);
        //d3.select("#info").html(plotted_sols.length + " solutions displayed");

        var minAcc = function (d) {
            return d.lowers[curXDim];
        };
        var maxAcc = function (d) {
            return d.uppers[curXDim];
        };
        x_dom[0] = d3.extent(plotted_sols, minAcc)[0];
        x_dom[1] = d3.extent(plotted_sols, maxAcc)[1];

        //reset_selection();
        // add new data relating to new selected status
        update_plot_info();

        drawBoxes(plotted_sols);
        drawAxis(canvas);
    };


    function crop() {
        // TODO

    }




}
