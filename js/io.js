// return a solution set object from a buffer, ie. a binary mnf file
function parse_data_mnf(buffer) {
    console.log("Parsing Manifold binary file...");
    try {
        // initialize solutions data arrays
        var sols = []; // list of solutions
        var var_names = []; // names of variables in the manifold
        var names_id = {};
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

        var_names = [];
        names_id = {};
        var nb_read_var = 0;
        if (ver == 4) { // V4 of manifold format with names for variables
            var cur_name = "";
            var ch = dec.decode(buffer.slice(20 + cursor, 21 + cursor)); //dec.decode(bytes);
            var i_ch = new Uint8Array(buffer.slice(20 + cursor, 21 + cursor));
            var prev_ich = 1;
            cursor += 1;
            while ((i_ch != 0 || prev_ich != 0) && nb_read_var < nb_var) { // The list of names ends with an end of line
                if (i_ch == 0) { // End of a name
                    var_names.push(cur_name);
                    names_id[cur_name] = var_names.length - 1;
                    cur_name = "";
                    nb_read_var += 1;
                } else { // A character of the name
                    cur_name += ch;
                }
                prev_ich = i_ch;
                ch = dec.decode(buffer.slice(20 + cursor, 21 + cursor)); //dec.decode(bytes);
                i_ch = new Uint8Array(buffer.slice(20 + cursor, 21 + cursor));
                cursor += 1;
            }
            console.log("Variables: " + var_names);
            // One more byte was read
            cursor -= 1;
        } else { // v2
            // Creating default names for variables
            for (var i = 1; i <= nb_var; i++) {
                var_names.push("x" + i);
                names_id[cur_name] = var_names.length - 1;
            }
        }
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
        sol_set.var_names = var_names;
        sol_set.names_id = names_id;
        console.log(JSON.stringify(sol_set));
        return sol_set;
    } catch (err) {
        console.log(`There was an error: ${err}`);
        return null;
    }
}


function parse_cov_list(data, cursor, nb_v, sol_set) {
    var nb_sol;
    // read the number of boxes
    nb_sol = data.getUint32(cursor, true);
    cursor += 4;

    console.log(nb_sol + " solutions to parse!");

    var mins = []; // list of minimums, i.e. lower bounds
    var maxs = []; // list of maximums, i.e. upper bounds

    //sol_set.sols = [];

    sol_set.nb_inner = 0;
    sol_set.nb_boundary = 0;
    sol_set.nb_unknown = nb_sol;
    sol_set.nb_pending = 0;

    // read all the solutions
    for (var i = 0; i < nb_sol; i++) {
        // create a new object to manipulate solutions
        var sol = new Object();
        // storing lower and upper bound separately
        sol.lowers = [];
        sol.uppers = [];
        // storing the width of each interval
        sol.width = [];
        // read all dimension values
        for (var j = 0; j < nb_v; j++) {
            // read the lower bound
            var low = data.getFloat64(cursor, true);
            cursor += 8;
            // read the upper bound
            var up = data.getFloat64(cursor, true);
            cursor += 8;
            sol.lowers.push(low);
            sol.uppers.push(up);
            sol.width.push(up - low);
            sol.status = 2; // Unkown by default
            //console.log(i + "," + j + ": [" + low + "," + up + ']');
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
        sol_set.sols.push(sol);
    }
    sol_set.mins = mins;
    sol_set.maxs = maxs;
    return cursor;
}

function parse_cov_inner(data, cursor, sol_set) {
    //var nb_inner;
    // read the number of boxes
    sol_set.nb_inner = data.getUint32(cursor, true);
    cursor += 4;

    console.log(sol_set.nb_inner + " inner boxes");

    // read all the solutions
    for (var i = 0; i < sol_set.nb_inner; i++) {
        var idx;
        idx = data.getUint32(cursor, true);
        cursor += 4;
        sol_set.sols[idx].status = 0;
    }
    return cursor;
}

function parse_cov_boundary(data, cursor, sol_set) {
    var bnd_type;
    bnd_type = data.getUint32(cursor, true);
    cursor += 4;
    //var nb_boundary;
    // read the number of boxes
    sol_set.nb_boundary = data.getUint32(cursor, true);
    cursor += 4;

    console.log(sol_set.nb_boundary + " boundary boxes");

    // read all the solutions
    for (var i = 0; i < sol_set.nb_boundary; i++) {
        var idx;
        idx = data.getUint32(cursor, true);
        cursor += 4;
        sol_set.sols[idx].status = 1;
    }
    return cursor;
}

function parse_cov_manifold(data, cursor, sol_set) {
    // read the number of equations in the problem from which this manifold come from
    const nb_eq = data.getUint32(cursor, true);
    cursor += 4;
    sol_set.nb_eq = nb_eq;
    // read the number of inequations in the problem from which this manifold come from
    const nb_ineq = data.getUint32(cursor, true);
    cursor += 4;
    sol_set.nb_ineq = nb_ineq;
    console.log(sol_set.nb_var + " variables, " + nb_eq + " equalities and " + nb_ineq + " inequalities");

    var bnd_type;
    bnd_type = data.getUint32(cursor, true);
    cursor += 4;
    console.log("Boundary type: " + bnd_type);

    var nb_proof = sol_set.nb_var - nb_eq;

    if (nb_eq > 0) {
        var nb_sol;
        // read the number of boxes
        nb_sol = data.getUint32(cursor, true);
        cursor += 4;

        console.log(nb_sol + " certified solutions in manifold");
        sol_set.nb_unknown -= nb_sol;
        sol_set.nb_inner += nb_sol;
        // read all the solutions
        for (var i = 0; i < nb_sol; i++) {
            var idx;
            idx = data.getUint32(cursor, true);
            cursor += 4;

            //console.log("IBU_" + i + ": " + idx);
            sol_set.sols[idx].status = 1; // boundary with proved solution
            if (nb_proof > 0) { //(nb_eq < nb_v) {
                sol_set.sols[idx].proof = [];

                //console.log("manifold:" + i);
                for (var j = 0; j < nb_proof; j++) {
                    sol_set.sols[idx].proof.push(data.getUint32(cursor, true)); // unused
                    sol_set.sols[idx].status = 0;
                    cursor += 4;
                }
            }
            sol_set.sols[idx].unicity = [];
            for (var k = 0; k < sol_set.nb_var; k++) {
                // read the lower bound
                var low = data.getFloat64(cursor, true);
                cursor += 8;
                // read the upper bound
                var up = data.getFloat64(cursor, true);
                cursor += 8;
                sol_set.sols[idx].unicity.push([low, up])
                //console.log("unicity[" + i + "]=" + [low, up].toString());
            }

        }
    }
    //var nb_bnd;
    // read the number of boxes
    sol_set.nb_boundary = data.getUint32(cursor, true);
    cursor += 4;
    console.log(sol_set.nb_boundary + " boundary boxes in manifold");
    for (var i = 0; i < sol_set.nb_boundary; i++) {
        var idx;
        idx = data.getUint32(cursor, true);
        cursor += 4;
        sol_set.sols[idx].status = 1; // boundary with boundary status proved
        //console.log("IBU_" + i + ": " + idx);

        if (nb_eq > 0 && nb_eq < nb_ineq) {
            sol_set.sols[idx].proof = [];
            for (var j = 0; j < nb_proof; j++) {
                var jdx;
                jdx = data.getUint32(cursor, true);
                cursor += 4;
                //console.log("jdx_" + j + ": " + jdx);
                sol_set.sols[idx].proof.push(jdx); // unused
                sol_set.sols[idx].status = 1;
            }
        }
    }


    return cursor;
}

function parse_cov_names(view,cursor,sol_set){
    var nb_read_var=0;
    
    sol_set.var_names=[];
    sol_set.names_id={};
    
    var i_ch=view.getUint8(cursor);
    cursor += 1;
    
    var cur_name = ""; //String.fromCharCode(i_ch);
    var tmp=0;
    console.log(sol_set.nb_var + " names to read:");
    while (nb_read_var < sol_set.nb_var && tmp<20) {
        if (i_ch == 0 && cur_name.length > 0) { // End of a name
            sol_set.var_names.push(cur_name);
            sol_set.names_id[cur_name] = sol_set.var_names.length - 1;
            console.log("New name: "+cur_name);
            cur_name = "";
            nb_read_var += 1;
        } else { // A character of the name
            cur_name += String.fromCharCode(i_ch);
            //console.log("Current name: "+cur_name);
        }
        i_ch = view.getUint8(cursor); // new Uint8Array(data.slice(20 + cursor, 21 + cursor));
        //console.log(i_ch);
        cursor += 1;
        tmp+=1;
    }
    return cursor-1;
}


function parse_cov_solver_data(data, view, cursor, sol_set) {
    /*var dec = new TextDecoder();
    var names_id = {};
    var var_names = [];
    var nb_read_var = 0;
    var cur_name = "";
    var ch = dec.decode(data.slice(20 + cursor, 21 + cursor)); //dec.decode(bytes);
    var i_ch = new Uint8Array(data.slice(20 + cursor, 21 + cursor));
    var prev_ich = 1;
    cursor += 1;
    while ((i_ch != 0 || prev_ich != 0) && nb_read_var < nb_var) { // The list of names ends with an end of line
        if (i_ch == 0) { // End of a name
            var_names.push(cur_name);
            names_id[cur_name] = var_names.length - 1;
            cur_name = "";
            nb_read_var += 1;
        } else { // A character of the name
            cur_name += ch;
        }
        prev_ich = i_ch;
        ch = dec.decode(data.slice(20 + cursor, 21 + cursor)); //dec.decode(bytes);
        i_ch = new Uint8Array(data.slice(20 + cursor, 21 + cursor));
        cursor += 1;
    }
    console.log("Variables: " + var_names);
    // One more byte was read
    cursor -= 1;*/
    cursor = parse_cov_names(view,cursor,sol_set);

    // read the solving status that ended with this manifold (see ibex doc for that)
    const result_status = view.getUint32(cursor, true);
    cursor += 4;
    console.log("Result status: " + result_status);
    //sol_set.status = result_status;

    // read the solving time
    const solving_time = view.getFloat64(cursor, true);
    // Float64 (double) are stored on 8 bytes
    cursor += 8;
    // Number of cells used to perform the solving process
    const nb_cells = view.getUint32(cursor, true);
    cursor += 4;
    console.log("Solving time: " + solving_time + "s, number of cells: " + nb_cells);

    //var nb_pending;
    // read the number of boxes
    sol_set.nb_pending = view.getUint32(cursor, true);
    cursor += 4;

    // read all the solutions
    for (var i = 0; i < sol_set.nb_pending; i++) {
        var idx;
        idx = view.getUint32(cursor, true);
        cursor += 4;
        sol_set.sols[idx].status = 3;
    }
    //sol_set.names_id = names_id;
    //sol_set.var_names = var_names;
    return cursor;
}


function parse_cov_optim_data(data, view, cursor, sol_set) {
    // TODO: uncomment code when cov optim data has names
    sol_set.var_names=[];
    sol_set.names_id={};
    cursor+=sol_set.nb_var;
    //cursor = parse_cov_names(view,cursor,sol_set);
    
    
    // read the optimizing status
    const result_status = view.getUint32(cursor, true);
    cursor += 4;
    console.log("Result status: " + result_status);
    //sol_set.status = result_status;
    
    // read the covering status
    const covering_status = view.getUint32(cursor, true);
    cursor += 4;
    console.log("Covering status: " + result_status + "(1 <=> covering of the extended space (vars+obj), 0 <=> covering of the original space (variables only))");
    
    var uplo, uplo_eps, loup;
    
    uplo = view.getFloat64(cursor, true);
    cursor += 8;
    uplo_eps = view.getFloat64(cursor, true);
    cursor += 8;
    loup = view.getFloat64(cursor, true);
    cursor += 8;
    
    console.log("uplo: "+uplo+" uplo-of-epsboxes: "+uplo_eps);
    console.log("loup: " +loup);
    
    var feasible_point;//, loup_point=null;
    feasible_point = view.getUint32(cursor, true);
    cursor += 4;
    if (feasible_point==1){
        /*loup_point=new Array();
        for (var i=0;i<sol_set.nb_var+covering_status;i++){
            loup_point.push(view.getFloat64(cursor, true));
            cursor += 8;
        }*/
        console.log("Best feasible point found: "+JSON.stringify(sol_set.sols[0]));
    }
    else {
        console.log("No best feasible point found!");
    }
    
    // read the solving time
    const solving_time = view.getFloat64(cursor, true);
    // Float64 (double) are stored on 8 bytes
    cursor += 8;
    // Number of cells used to perform the solving process
    const nb_cells = view.getUint32(cursor, true);
    cursor += 4;
    console.log("Solving time: " + solving_time + "s, number of cells: " + nb_cells);

    //sol_set.names_id = names_id;
    //sol_set.var_names = var_names;
    return cursor;
}


// return a solution set object from a buffer, ie. a binary mnf file
function parse_data_cov(buffer) {
    console.log("Parsing Covering binary file...");
    // initialize solutions data arrays
    var sols = []; // list of solutions
    var var_names = []; // names of variables in the manifold
    var names_id = {};
    var mins = []; // list of minimums, i.e. lower bounds
    var maxs = []; // list of maximums, i.e. upper bounds

    sol_set = new Object(); // object to store all data about the solution set

    try {
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
        // read the current level of the format (2: Optim, 5: Solver)
        const level = view.getUint32(cursor, true);
        // Uint32 are stored on 4 bytes
        cursor += 4;

        console.log(signature + level);
        sol_set.version = level;

        var format_id = new Array(level + 1);
        var format_ver = new Array(level + 1);

        for (var i = 0; i <= level; i++) {
            format_id[i] = view.getUint32(cursor, true);
            cursor += 4;
        }
        for (var i = 0; i <= level; i++) {
            format_ver[i] = view.getUint32(cursor, true);
            cursor += 4;
        }

        console.log("Current format identification: " + format_id.toString());
        console.log("Current format version: " + format_ver.toString());

        var nb_var;
        nb_var = view.getUint32(cursor, true);
        cursor += 4;
        console.log(nb_var + " dimensions in covering!");
        sol_set.nb_var = nb_var;
        
        if (level == 5) { // solver data

            sol_set.sols = new Array();
            if (format_id[1] == 0) {
                cursor = parse_cov_list(view, cursor, nb_var, sol_set);
                console.log(sol_set.sols.length + " solutions parsed");
            }
            try {
                if (format_id[2] == 0) {
                    cursor = parse_cov_inner(view, cursor, sol_set);
                }
                if (format_id[3] == 0) {
                    cursor = parse_cov_boundary(view, cursor, sol_set);
                }
                if (format_id[4] == 0) {
                    cursor = parse_cov_manifold(view, cursor, sol_set);
                }
                if (format_id[5] == 0) {
                    cursor = parse_cov_solver_data(buffer, view, cursor, sol_set);
                    var_names = sol_set.var_names;
                }
            } catch (err) {
                console.log(`There was an error while parsing Solver COV additional format: ${err}`);
                //return null;
            }

        } else if (level == 2) {
            sol_set.sols = new Array();
            if (format_id[1] == 0) {
                cursor = parse_cov_list(view, cursor, nb_var, sol_set);
                console.log(sol_set.sols.length + " solutions parsed");
            }
            try {
                if (format_id[2] == 1) {
                    cursor = parse_cov_optim_data(buffer, view, cursor, sol_set, nb_var);
                    var_names = sol_set.var_names;
                }
            } catch (err) {
                console.log(`There was an error while parsing Optimizer COV additional format: ${err}`);
                //return null;
            }
        }
        console.log(sol_set.sols.length + " solutions read using " + cursor + " Bytes!");
        //return sol_set;
    } catch (err) {
        console.log(`There was an error: ${err}`);
        //return null;
    }

    console.log(JSON.stringify(sol_set));

    return sol_set;
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
    var n_int = 11 + plotted_sols.length * (1 + nb_proof);
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
