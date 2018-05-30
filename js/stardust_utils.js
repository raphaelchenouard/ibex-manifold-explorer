// Common code for stardust examples

function measureFPS(renderFunction) {
    var count = 10;
    var totalFrames = 0;
    var t0 = new Date().getTime();
    var doFrame = function() {
        if(totalFrames >= count) {
            var t1 = new Date().getTime();
            var fps = totalFrames / ((t1 - t0) / 1000);
            //d3.select(".fps").text("FPS: " + fps.toFixed(1));
            d3.select("#fps").html("FPS: " + (1000 / dt).toFixed(1));
            return;
        }
        renderFunction();
        totalFrames += 1;
        requestAnimationFrame(doFrame);
    };
    requestAnimationFrame(doFrame);
}

function FPS() {
    this.updates = [];
    this.updateIndex = 0;
}

FPS.prototype.update = function() {
    this.updateIndex += 1;
    this.updates.push(new Date().getTime());
    if(this.updates.length > 100) {
        this.updates.splice(0, this.updates.length - 100);
    }
    if(this.updateIndex % 20 == 0) {
        var dt = (this.updates[this.updates.length - 1] - this.updates[0]) / (this.updates.length - 1);
        //d3.select(".fps").text("FPS: " + (1000 / dt).toFixed(1));
        d3.select("#fps").html("FPS: " + (1000 / dt).toFixed(1));
    }
}

