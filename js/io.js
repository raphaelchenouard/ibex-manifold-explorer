// return a solution set object from a buffer, ie. a binary mnf file
function parse_data_ibex_v2(buffer) {
    try {
        // initialize solutions data arrays
        var sols = []; // list of solutions
        var mins = []; // list of minimums, i.e. lower bounds
        var maxs = []; // list of maximums, i.e. upper bounds

        sol_set = new Object(); // object to store all data about the solution set

        // use standard js TextDecoder to process binary data
        var dec = new TextDecoder();
        // The file starts with a signature on 20 bytes which should look like: IBEX MANIFOLD FILE  2
        // 2 is a number corresponding to the current version of this format
        // start to read the 19 first bytes
        const signature = dec.decode(buffer.slice(0, 19));
        // use of standard js DataView to convert bytes to numbers (float or integer) or strings
        // we start the view to byte 20 to avoid considering the 19 first bytes
        const view = new DataView(buffer.slice(20));
        // initialization of current cursor in the view
        var cursor = 0;
        // read the current version of the format
        const ver = view.getUint32(cursor, true);
        // Uint32 are stored on 4 bytes
        cursor += 4;
        console.log(signature + ver);
        sol_set.version = ver;

        // read the number of dimensions (ie. variables) of the manifold
        nb_var = view.getUint32(cursor, true);
        cursor += 4;
        sol_set.nb_var = nb_var;

        // read the number of equations in the problem from which this manifold come from
        const nb_eq = view.getUint32(cursor, true);
        cursor += 4;
        sol_set.nb_eq = nb_eq;
        // read the number of inequations in the problem from which this manifold come from
        const nb_ineq = view.getUint32(cursor, true);
        cursor += 4;
        sol_set.nb_ineq = nb_ineq;
        console.log(nb_var + " variables, " + nb_eq + " equalities and " + nb_ineq + " inequalities");

        // read the solving status that ended with this manifold (see ibex doc for that)
        const result_status = view.getUint32(cursor, true);
        cursor += 4;
        console.log("Result status: " + result_status);
        sol_set.status = result_status;

        // read the number of inner boxes
        const nb_inner = view.getUint32(cursor, true);
        cursor += 4;
        sol_set.nb_inner = nb_inner;
        // read the number of boundary boxes
        const nb_boundary = view.getUint32(cursor, true);
        cursor += 4;
        sol_set.nb_boundary = nb_boundary;
        // read the number of unknown boxes
        const nb_unknown = view.getUint32(cursor, true);
        cursor += 4;
        sol_set.nb_unknown = nb_unknown;
        // read the number of pending boxes
        const nb_pending = view.getUint32(cursor, true);
        cursor += 4;
        sol_set.nb_pending = nb_pending;
        console.log("inner: " + nb_inner + ", boundary: " + nb_boundary + ", unknown: " + nb_unknown + ", pending: " + nb_pending);

        // read the solving time
        const solving_time = view.getFloat64(cursor, true);
        // Float64 (double) are stored on 8 bytes
        cursor += 8;
        sol_set.solving_time = solving_time;
        // Number of cells used to perform the solving process
        const nb_cells = view.getUint32(cursor, true);
        cursor += 4;
        sol_set.nb_cells = nb_cells;
        console.log("Solving time: " + solving_time + "s, number of cells: " + nb_cells);

        // read all the solutions
        for (var i = 0; i < nb_inner + nb_pending + nb_unknown + nb_boundary; i++) {
            // create a new object to manipulate solutions
            var sol = new Object();
            // storing lower and upper bound separately
            sol.lowers = [];
            sol.uppers = [];
            // storing the width of each interval
            sol.width = [];
            // read all dimension values
            for (var j = 0; j < nb_var; j++) {
                // read the lower bound
                var low = view.getFloat64(cursor, true);
                cursor += 8;
                // read the upper bound
                var up = view.getFloat64(cursor, true);
                cursor += 8;
                sol.lowers.push(low);
                sol.uppers.push(up);
                // compute the width
                sol.width.push(up - low);
                // search for the min and max values for each dimension
                if (i == 0) {
                    mins.push(low);
                    maxs.push(up);
                } else {
                    if (mins[j] > low) {
                        mins[j] = low;
                    }
                    if (maxs[j] < up) {
                        maxs[j] = up;
                    }
                }
            }
            // read the solution status: 0=inner, 1=boundary, 2=unknown, 3=pending
            sol.status = view.getUint32(cursor, true);
            cursor += 4;

            // read data about the number of constants values to achieve proof of solution
            //var nb_proof = view.getUint32(cursor, true); // unused
            //cursor += 4;

            var nb_proof = Math.max(nb_var - nb_eq, 0);
            if (nb_proof > 0) {
                sol.proof = [];
                for (var k = 0; k < nb_proof; k++) {
                    sol.proof.push(view.getUint32(cursor, true)); // unused
                    cursor += 4;
                }

            }

            if (sol.status > 4 || sol.status < 0) {
                console.log("ERROR: Wrong status(" + sol.status + ") for current solution(" + i + "): " + sol2string(sol));
            } else {
                // adding current solution to the list of all solutions used in further steps
                sols.push(sol);
            }
        }
        console.log(sols.length + " solutions read using " + cursor + " Bytes!");
        sol_set.sols = sols;
        sol_set.mins = mins;
        sol_set.maxs = maxs;
        return sol_set;
    } catch (err) {
        console.log(`There was an error: ${err}`);
        return null;
    }
}

function downloadURL(data, fileName) {
    var a;
    a = document.createElement('a');
    a.href = data;
    a.download = fileName;
    document.body.appendChild(a);
    a.style = 'display: none';
    a.click();
    a.remove();
};

function export_image() {
    var img = d3.select("#canvas_plot").node().toDataURL("image/png");
    downloadURL(img, "plot.png");
}

function export_manifold() {
    var sig_str = "IBEX MANIFOLD FILE ";
    var nb_proof = solution_set.nb_var - solution_set.nb_eq;
    var n_int = 11 + plotted_sols.length*(1+nb_proof);
    var n_dbl = 1 + 2 * plotted_sols.length * plotted_sols[0].lowers.length;
    var n_bytes = sig_str.length + 4 * n_int + 8 * n_dbl;
    var buffer = new ArrayBuffer(n_bytes);
    var view = new DataView(buffer);

    var cursor = 0;
    for (var i = 0; i < sig_str.length; i++) {
        view.setUint8(i, sig_str.charCodeAt(i))
    }
    cursor = sig_str.length + 1;

    view.setUint32(cursor, solution_set.version >>> 0, true); // mnf ver
    cursor += 4;
    view.setUint32(cursor, solution_set.nb_var >>> 0, true); // nb var
    cursor += 4;
    view.setUint32(cursor, solution_set.nb_eq >>> 0, true); // nb eq
    cursor += 4;
    view.setUint32(cursor, solution_set.nb_ineq >>> 0, true); // nb ineq
    cursor += 4;
    view.setUint32(cursor, solution_set.status >>> 0, true); // search status
    cursor += 4;
    view.setUint32(cursor, 0 >>> 0, true); // TODO: nb inner
    cursor += 4;
    view.setUint32(cursor, 0 >>> 0, true); // TODO: nb boundary
    cursor += 4;
    view.setUint32(cursor, plotted_sols.length >>> 0, true); // TODO: nb unkown
    cursor += 4;
    view.setUint32(cursor, 0 >>> 0, true); // TODO: nb pending
    cursor += 4;
    view.setFloat64(cursor, solution_set.solving_time, true); // time
    cursor += 8;
    view.setUint32(cursor, solution_set.nb_cells >>> 0, true); // nb cells
    cursor += 4;
    var k = 0;
    for (let sol of plotted_sols) {
        k += 1;
        for (var i = 0; i < sol.lowers.length; i++) {
            view.setFloat64(cursor, sol.lowers[i], true);
            cursor += 8;
            view.setFloat64(cursor, sol.uppers[i], true);
            cursor += 8;
        }
        view.setUint32(cursor, sol.status >>> 0, true); // box status: Pending
        cursor += 4;

        if (typeof sol.proof != undefined) {
            for (var i = 0; i < sol.proof.length; i++) {
                view.setUint32(cursor, sol.proof[i] >>> 0, true); // box status: Pending
                cursor += 4;
            }
        }
    }

    function downloadBlob(data, fileName, mimeType) {
        var blob, url;
        blob = new Blob([data], {
            type: mimeType
        });
        console.log("Blob length: " + blob.size);
        url = window.URL.createObjectURL(blob);
        downloadURL(url, fileName, mimeType);
        setTimeout(function () {
            return window.URL.revokeObjectURL(url);
        }, 1000);
    };

    console.log("Buffer length: " + buffer.byteLength, " : " + cursor);

    downloadBlob(buffer, 'plot.mnf', 'application/octet-stream');
}
