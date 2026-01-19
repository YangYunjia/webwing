

// plot points for the airfoil
const nn = 201;
let xx = [];
let yu = [];
let yl = [];

// control points for the airfoil
let   ctrlX = [];
let   ctrlYu = [], ctrlYl = [];
const nCtrl = 9
let   showPoints = false;
let   draggedPoint = -1;
let   draggedSurface = 1; // 1 - for upper, 2 - for lower
const draggedPointIndx = Array.from({ length: nCtrl }, (_, i) => Math.round((i + 1) * nn / (nCtrl + 1)));

// Gaussian Bump parameters
const sigma = 0.3;

// plot parameters
const yHeight = 0.25, ymax = 0.15, ymin = -0.1;

function show_airfoil(){

    const plotData = [{
        x: xx, y: yu[activeSecIndex], mode: 'lines', type: 'scatter', line: { color: 'black' },
    }, {
        x: xx, y: yl[activeSecIndex], mode: 'lines', type: 'scatter', line: { color: 'black' },
    }];
    const layout = {
        xaxis: { title: 'x', range: [0, 1] },
        yaxis: { title: 'y', range: [ymin, ymax] },
        margin: { t: 40, l: 50, r: 30, b: 50 },
        showlegend: false,
        responsive: true,
        dragmode: showPoints ? 'lasso' : false,
        hovermode:'closest',
        annotations: showPoints ? [{
            xref: 'paper',  
            yref: 'paper',
            x: 0.5,         // center ref to paper
            y: 1.2,        
            text: 'Please click on the red points to modify the shape <br> click again to release.',
            showarrow: false,
            font: {
                size: 14,
                color: 'red'
            },
            align: 'center'
        }] : null
    };

    if (showPoints) {
        
        ctrlX = [];
        ctrlYl = [];
        ctrlYu = [];
        for (let i = 0; i < nCtrl; i += 1) {
            ctrlX.push(xx[draggedPointIndx[i]]);
            ctrlYu.push(yu[activeSecIndex][draggedPointIndx[i]]);
            ctrlYl.push(yl[activeSecIndex][draggedPointIndx[i]]);
        }

        plotData.push({
            x: ctrlX, y: ctrlYu, mode: 'markers', marker: { color: 'red', size: 10 }, name: 'upper CPs'
        });
        plotData.push({
            x: ctrlX, y: ctrlYl, mode: 'markers', marker: { color: 'red', size: 10 }, name: 'lower CPs'
        });
    }
    Plotly.react('airfoil-plot', plotData, layout);
}

function update_cst_boxs_values() {

    document.getElementById('cstu').value = (currentParas.csts[activeSecIndex][0] || []).toString();
    document.getElementById('cstl').value = (currentParas.csts[activeSecIndex][1] || []).toString();
}

function initial_airfoil_points() {
    // initial all airfoils
    yu = [];
    yl = [];
    for (let i = 0; i < sectionCount; i++) {
        foil = cst_foil(nn, currentParas.csts[i][0], currentParas.csts[i][1], x=null, t=currentParas.secpara[0][i], tail=0.004);
        xx = foil[0];
        yu.push(foil[1]);
        yl.push(foil[2]);
    }
    show_airfoil();
}

function update_airfoil_points() {

    // console.log("display_sectional_airfoil")
    foil = cst_foil(nn, currentParas.csts[activeSecIndex][0], currentParas.csts[activeSecIndex][1], x=null, t=currentParas.secpara[0][activeSecIndex], tail=0.004);
    yu[activeSecIndex] = foil[1];
    yl[activeSecIndex] = foil[2];
    show_airfoil();
}

function create_airfoil_plot_motion() {

    // start listening the drag
    document.getElementById('airfoil-plot').on('plotly_click', function (plotData) {

        if (!showPoints) return;

        if (draggedPoint > -1) {
            draggedPoint = -1;
            update_image(fit_curve(xx, yu[activeSecIndex], n_cst=10), 'csts', draggedSurface === 1 ? 0: 1); // 0 for upper, 1 for lower
            update_cst_boxs_values();
        }
        else {
            if (plotData.points.length && plotData.points[0].curveNumber > 1) {
                // upper surface
                draggedPoint = plotData.points[0].pointIndex;
                draggedSurface = plotData.points[0].curveNumber - 1
            }
        }
    });

    document.getElementById('airfoil-plot').addEventListener('mousemove', function (e) {
        if (draggedPoint !== -1) {
            const chart = document.getElementById('airfoil-plot');
            const bb = chart.getBoundingClientRect();
            const yaxis = chart._fullLayout.yaxis;
            const yPixel = e.clientY - bb.top;

            const [y0, y1] = yaxis.range;
            const yPixel0 = yaxis._offset + yaxis._length, yPixel1 = yaxis._offset;
            const y = y0 + (yPixel - yPixel0) * (y1 - y0) / (yPixel1 - yPixel0);
            
            // const x = (e.clientX - bb.left) / bb.width * 5;
            // const y = ymax - ((e.clientY - bb.top) / (bb.height)) * yHeight;
            x0 = xx[draggedPointIndx[draggedPoint]]
            if (draggedSurface === 1) {
                dy = Math.max(yl[activeSecIndex][draggedPointIndx[draggedPoint]], Math.min(ymax, y)) - yu[activeSecIndex][draggedPointIndx[draggedPoint]]; // 
            } else {
                dy = Math.min(yu[activeSecIndex][draggedPointIndx[draggedPoint]], Math.max(ymin, y)) - yl[activeSecIndex][draggedPointIndx[draggedPoint]]; // 
            }
            
            const range = Math.min(x0, 1 - x0, 0.2);
            for (let j = 0; j < xx.length; j++) {
                const d = Math.abs(xx[j] - x0);
                if (d <= range) {
                    const b = Math.pow(1 - Math.pow(d / range, 2), 2);
                    (draggedSurface === 1 ? yu[activeSecIndex] : yl[activeSecIndex])[j] += dy * b;
                }
                // const g = Math.exp(-Math.pow((xx[j] - x0), 2) / (2 * sigma * sigma));
                // const w = Math.max(1 - Math.abs(xx[j] - x0) / range, 0)
                // yu[j] += dy * g * w;
            }
            show_airfoil();
        }
    });

    // start and end modify
    const toggleBtn = document.getElementById('modify-airfoil-button');
    const cstBoxes = document.getElementById('cst-boxes');
    toggleBtn.addEventListener('click', function () {
        showPoints = !showPoints;
        toggleBtn.textContent = showPoints ? 'Confirm' : 'Modify airfoil';
        if (cstBoxes) {
            cstBoxes.classList.toggle('hidden', !showPoints);
        }
        show_airfoil();
    });

}
