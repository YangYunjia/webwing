let wingData = [], wingGeom = [];
const nSlices = 2;
const etas = [0.2, 0.8];
let currentCamera;

const buttonLabels = ['Cp', 'Cft', 'Cfz'];
const rangesPlot2d = [[0, 5], [0, 7], [-0.1, 0.25]];
const rangesPlot   = [[0, 5], [0, 7], [-0.5, 1.5]];
const rangesChannel = [[1, -1.8], [-0.005, 0.015], [-0.004, 0.004]];
const signsChannel  = [-1, 1, 1];
let activeChannel = 0;
const wingFrameCamera = { eye: { x: 1.2, y: 1.2, z: 0.6 } };

// ================================
// Create components
// ================================

function create_camera_monitor() {

    const surfacePlot = document.getElementById('surface-plot');
    if (!surfacePlot) {
        return;
    }
    surfacePlot.on('plotly_relayout', function(eventData) {
        if (eventData['scene.camera']) {
            currentCamera = eventData['scene.camera'];
        }
    });
   
}

function create_section_slides_groups() {

    const containerPlots = document.getElementById('slices-plot')

    for (let i = 0; i < nSlices; i++) {

        // bars
        const id = `slices-${i}`
        wrapper = create_slider_element(id, `section ${i}`, 0, 1, etas[i],
            value => {
                etas[i] = value;
                update_slices(i);
            }
        )

        containerPlots.appendChild(wrapper);

        // plots
        const plot = document.createElement('div')
        plot.className = 'h-48 w-full bg-white rounded-xl shadow-md'
        plot.id = `slice-plot-${i}`
        containerPlots.appendChild(plot)
    }

}

function create_channel_selector(){

    const buttonContainer = document.getElementById('button-container');

    const renderButtons = () => {
      buttonContainer.innerHTML = ''; // clear container

      buttonLabels.forEach((label, index) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.className = `modify-airfoil-button px-4 py-2 rounded shadow ${
          index === activeChannel ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
        }`;

        btn.addEventListener('click', () => {
          activeChannel = index;
          update_plot_slices();
          renderButtons(); // render
        });

        buttonContainer.appendChild(btn);
      });
    };

    renderButtons(); // initial
}

// ================================
// Plot wing frame
// ================================

function linear_intp(x, xmin, xmax, ymin, ymax) {

    const y = new Array(x.length).fill(0);

    for (let idx = 0; idx < x.length; idx++) {
        y[idx] = ymin + (x[idx] - xmin) / (xmax - xmin) * (ymax - ymin)
    }

    return y
}

function rotate_Z(xx0, yy0, ref, angle) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const [x0, y0] = ref;

    const xRot = [];
    const yRot = [];

    for (let i = 0; i < xx0.length; i++) {
        const dx = xx0[i] - x0;
        const dy = yy0[i] - y0;
        xRot.push(x0 + dx * cosA - dy * sinA);
        yRot.push(y0 + dx * sinA + dy * cosA);
    }

    return [xRot, yRot];
}

function half_span(ar, tr) {

    return 0.25 * ar * (1 + tr)

}

function reconstruct_surface_frame() {

    currPlanform = currentParas.planform
    // for simple and transonic wings, this is trap-based AR and TR
    let hs, zLEs, yLEs, thickRatios, twistAngles, chordLengths;

    switch (activeModelVersion) {
        case 'simple':
            hs = half_span(currPlanform[2], currPlanform[3]);
            zLEs = numeric.linspace(0, hs, 7);
            yLEs = linear_intp(zLEs, 0, hs, 0, Math.tan(currPlanform[1] * DEGREE) * hs);
            thickRatios = linear_intp(zLEs, 0, hs, 1, currPlanform[5]);
            twistAngles = linear_intp(zLEs, 0, hs, 0, currPlanform[4]);
            chordLengths = linear_intp(zLEs, 0, hs, 1, currPlanform[3]);
            break;
        case 'transonic':
            const AR = currPlanform[1];
            const TR = currPlanform[2];
            const KK = currPlanform[3];
            hs = half_span(AR, TR);
            zLEs = numeric.linspace(0.1*hs, KK*hs, 3).concat(numeric.linspace(KK*hs, hs, 5).slice(1))
            yLEs = currentParas.secpara[1];
            twistAngles = currentParas.secpara[2];

            const xLE_kink = Math.tan(currPlanform[0] * DEGREE) * KK * hs;
            const chord_tip   = TR;
            const chord_kink  = TR * KK + 1 * (1 - KK);
            const root_adj_l  = currPlanform[4] * (xLE_kink + chord_kink - 1);
            const chord_cabin = TR * 0.1 + 1 * (1 - 0.1) + root_adj_l * (KK - 0.1) / KK;
            chordLengths = numeric.linspace(chord_cabin, chord_kink, 3).concat(numeric.linspace(chord_kink, chord_tip, 5).slice(1));
            break;
    
        default:
            break;
    }
    const xLEs = linear_intp(zLEs, 0, hs, 0, Math.tan(currPlanform[0] * DEGREE) * hs)

    const wingFrameLines = [[xLEs, zLEs, yLEs]];

    // get airfoil points from current xx, yl, yu
    let _xx, _yy;
    const tailLine = [[], zLEs, []];

    for (let idx = 0; idx < zLEs.length; idx++) {

        let xFinal = new Array(nn*2-1).fill(0);
        let yFinal = new Array(nn*2-1).fill(0);

        switch (activeModelVersion) {
            case 'simple':
                _xx = [...xx].reverse().concat(xx.slice(1));
                _yy = [...yl[0]].reverse().concat(yu[0].slice(1));
                for (let i = 0; i < xFinal.length; i++) {
                    // scaling
                    xFinal[i] = _xx[i] * chordLengths[idx];
                    yFinal[i] = _yy[i] * thickRatios[idx];
                }
                break;
            
            case 'transonic':
                _xx = [...xx].reverse().concat(xx.slice(1));
                _yy = [...yl[idx]].reverse().concat(yu[idx].slice(1));
                for (let i = 0; i < xFinal.length; i++) {
                    // scaling
                    xFinal[i] = _xx[i] * chordLengths[idx];
                    yFinal[i] = _yy[i];
                    // no scaling for y-axis; since its decided by sectional CSTs
                }
                break;
            
            default:
                break;
        }

        const [rotX, rotY] = rotate_Z(xFinal, yFinal, [0., 0.], twistAngles[idx] * DEGREE);

        for (let i = 0; i < xFinal.length; i++) {
            xFinal[i] = rotX[i] + xLEs[idx];
            yFinal[i] = rotY[i] + yLEs[idx];
        }

        wingFrameLines.push([xFinal, new Array(xFinal.length).fill(zLEs[idx]), yFinal]);

        // tail line
        tailLine[0].push(0.5 * (xFinal[0] + xFinal[xFinal.length - 1]))
        tailLine[2].push(0.5 * (yFinal[0] + yFinal[yFinal.length - 1]))

    }

    wingFrameLines.push(tailLine)

    return wingFrameLines;
}

function update_wing_frame() {

    const curves = reconstruct_surface_frame();
    const views = [
        { id: 'wing-plot-top', xIdx: 1, yIdx: 0, xTitle: 'Y', yTitle: 'X', xRange: rangesPlot2d[1], yRange: rangesPlot2d[0] },
        { id: 'wing-plot-front', xIdx: 1, yIdx: 2, xTitle: 'Y', yTitle: 'Z', xRange: rangesPlot2d[1], yRange: rangesPlot2d[2] },
        { id: 'wing-plot-side', xIdx: 0, yIdx: 2, xTitle: 'X', yTitle: 'Z', xRange: rangesPlot2d[0], yRange: rangesPlot2d[2] }
    ];

    views.forEach((view) => {
        const traces = curves.map((curve) => ({
            type: 'scatter',
            mode: 'lines',
            x: curve[view.xIdx],
            y: curve[view.yIdx],
            line: { width: 3, color: 'black' }
        }));

        const layout = {
            margin: { l: 35, r: 10, t: 10, b: 30 },
            showlegend: false,
            xaxis: {
                title: view.xTitle,
                range: view.xRange
            },
            yaxis: {
                title: view.yTitle,
                range: view.yRange,
                ...(view.id === 'wing-plot-top' && { autorange: 'reversed' })
            }
        };

        Plotly.react(view.id, traces, layout);
    });

    const traces3d = curves.map((curve) => ({
        type: 'scatter3d',
        mode: 'lines',
        x: curve[0],
        y: curve[1],
        z: curve[2],
        line: { width: 4, color: 'black' }
    }));

    const layout3d = {
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false,
        scene: {
            xaxis: { title: 'X', range: rangesPlot[0] },
            yaxis: { title: 'Y', range: rangesPlot[1] },
            zaxis: { title: 'Z', range: rangesPlot[2] },
            aspectmode: 'equal',
            camera: currentCamera || wingFrameCamera
        }
    };

    Plotly.react('wing-plot-3d', traces3d, layout3d);
}

// ================================
// Plot wing surface
// ================================

function update_plot_slices() {

    update_wing_plot();
    for (let i = 0; i < nSlices; i++) {
        update_slices(i)
    }
}

async function update_predict() {

    console.log("predict_wing_flowfield");
    document.getElementById('coefficients').innerText = 'Predicting... please wait';

    try {
        let response = await fetch('/predict_wing_flowfield', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ver: activeModelVersion, inputs: currentParas})
        })
        let submitInfo = await response.json();

        if (submitInfo.status == 429 || submitInfo.status == 503) {
            document.getElementById('coefficients').innerText = 'Sever is busy... please try again later';
        } else {
            const taskID = submitInfo.task_id;

            // polling for results
            let attempts = 0;
            let data = null;

            while (attempts < config.maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, config.attemptTimeout));
                let check = await fetch(`/result/${taskID}`);

                if (check.status == 200) {
                    data = await check.json();
                    break
                }

                attempts += 1;
            }

            if (!data) {
                alart('prediction timeout')
                throw new Error("Prediction timeout")
            }

            wingData = data.value;
            wingGeom = data.geom;
            update_plot_slices();
            document.getElementById('coefficients').innerText = 'CL = ' + data.cl_array[0].toFixed(4) + 
                '    CD = ' + data.cl_array[1].toFixed(4) + '     CMz = ' + data.cl_array[2].toFixed(4) +
                '    L/D = ' + (data.cl_array[0] / data.cl_array[1]).toFixed(4);
        }
    } catch (error) {
        console.error('Error:', error);  // error
    }
}

function update_wing_plot() {

    const plotData = [{
        type: 'surface',
        x: wingGeom[0], y: wingGeom[2], z: wingGeom[1],
        surfacecolor: wingData[activeChannel],
        colorscale: 'rainbow',
        reversescale: activeChannel === 0,
        cmin: rangesChannel[activeChannel][0], cmax: rangesChannel[activeChannel][1],
        contours: {
            x: { show: false }, y: { show: false }, z: { show: false },
            surface: {
                show: true,
                usecolormap: true,
                // highlightcolor: "#42f462",
                count: 15
                // project: { z: true }
            }
        },
        colorbar: {
            title: buttonLabels[activeChannel],
            len: 0.75
        },
        caps: { x: { show: false }, y: { show: false }, z: { show: false } }
    }];

    const layout = {
        scene: {
            xaxis: { title: 'X', range: rangesPlot[0] },
            yaxis: { title: 'Y', range: rangesPlot[1] },
            zaxis: { title: 'Z', range: rangesPlot[1] },
            aspectmode: 'mannal',
            aspectratio: {'x': rangesPlot[0][1] - rangesPlot[0][0], 'y': rangesPlot[1][1] - rangesPlot[1][0], 'z': rangesPlot[2][1] - rangesPlot[2][0]},
            ...(currentCamera && { camera: currentCamera })
        },
        margin: { t: 0, l: 0, r: 0, b: 0 }
    };

    Plotly.react('surface-plot', plotData, layout);
}

function update_slices(i) {

    let sliceIdx = Math.round(etas[i] * 100)

    const plotData = [{
        x: wingGeom[0][sliceIdx], y: wingData[activeChannel][sliceIdx], mode: 'lines', type: 'scatter', line: { color: 'black' },
    }];
    const layout = {
        xaxis: { title: 'x'},
        yaxis: { title: 'y', range: rangesChannel[activeChannel]},
        margin: { t: 5, l: 100, r: 80, b: 30 },
        showlegend: false,
    };
    Plotly.newPlot(`slice-plot-${i}`, plotData, layout);

}
