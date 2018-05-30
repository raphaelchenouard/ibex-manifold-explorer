function init_filtering(sols) {
    var c_filter = new Object();
    
    // Initialize crossfilter with read solutions
    c_filter.cf = crossfilter(sols);

    // create filters
    c_filter.filter_sol = c_filter.cf.dimension(function (d) {
        return d;
    });
    c_filter.filter_by_status = c_filter.cf.dimension(function (d) {
        return d.status;
    });
    // start with inner solutions only
    c_filter.filter_by_status.filterExact(0);
    
    return c_filter;
}
