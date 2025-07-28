let wingData = [], wingGeom = [];
const nSlices = 2;
const etas = [0.2, 0.8];
let currentCamera;

const buttonLabels = ['Cp', 'Cft', 'Cfz'];
const rangesPlot   = [[0, 5], [0, 7], [-0.5, 1.5]];
const rangesChannel = [[1, -1.5], [-0.005, 0.015], [-0.004, 0.004]];
const signsChannel  = [-1, 1, 1];
let activeChannel = 0;

// ================================
// Create components
// ================================

function create_camera_monitor() {

    plots = ['wing-plot', 'surface-plot'];
    plots.forEach((id, ) => {
        document.getElementById(id).on('plotly_relayout', function(eventData) {
            if (eventData['scene.camera']) {
                currentCamera = eventData['scene.camera'];
            }
        });
    });
   
}

function create_section_slides_groups() {

    const containerPlots = document.getElementById('slices-plot')

    for (let i = 0; i < nSlices; i++) {

        // bars
        const id = `slices-${i}`
        elements = create_slider_element(id, `section ${i}`, 0, 1, etas[i])
        const wrapper = elements[0]
        const inputNumber = elements[1]
        const inputRange = elements[2]

        inputNumber.addEventListener('input', function () {
            etas[i] = inputNumber.value;
            update_slices(i);
        });
        inputRange.addEventListener('input', function () {
            etas[i] = inputNumber.value;
            update_slices(i);
        });

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
        btn.className = `toggle-btn px-4 py-2 rounded shadow ${
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

    const hs = half_span(planform[2], planform[3]);
    const zLEs = numeric.linspace(0, hs, 5);
    const xLEs = linear_intp(zLEs, 0, hs, 0, Math.tan(planform[0] * DEGREE) * hs)
    const yLEs = linear_intp(zLEs, 0, hs, 0, Math.tan(planform[1] * DEGREE) * hs)
    const thickRatios = linear_intp(zLEs, 0, hs, 1, planform[5]);
    const twistAngles = linear_intp(zLEs, 0, hs, 0, planform[4]);
    const chordLengths = linear_intp(zLEs, 0, hs, 1, planform[3]);

    const wingFrameLines = [[xLEs, zLEs, yLEs]];

    // get airfoil points from current xx, yl, yu
    const _xx = [...xx].reverse().concat(xx.slice(1));
    const _yy = [...yl].reverse().concat(yu.slice(1));
    const tailLine = [[], zLEs, []];

    for (let idx = 0; idx < zLEs.length; idx++) {

        let xFinal = new Array(_xx.length).fill(0);
        let yFinal = new Array(_yy.length).fill(0);

        for (let i = 0; i < xFinal.length; i++) {
            // scaling
            xFinal[i] = _xx[i] * chordLengths[idx]
            yFinal[i] = _yy[i] * thickRatios[idx]
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

    const traces = reconstruct_surface_frame().map((curve, index) => ({
        type: 'scatter3d',
        mode: 'lines',
        x: curve[0],
        y: curve[1],
        z: curve[2],
        line: {width: 4, color: `black`},
    }));

    const layout = {
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false,
        scene: {
            xaxis: { title: 'X', range: [0, 5] },
            yaxis: { title: 'Y', range: [0, 7] },
            zaxis: { title: 'Z', range: [-0.5, 1.5] },
            aspectmode: 'equal',
            ...(currentCamera && { camera: currentCamera })
        }
    };

    Plotly.react('wing-plot', traces, layout);

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

    try {
        response = await fetch('/predict_wing_flowfield', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ conditions: condition, planform: planform, cstu: cstu, cstl: cstl, t: t })
        })
        data = await response.json();
        wingData = data.value;
        wingGeom = data.geom;
        update_plot_slices();
        document.getElementById('coefficients').innerText = 'CL = ' + data.cl_array[0].toFixed(4) + 
            '    CD = ' + data.cl_array[1].toFixed(4) + '     CMz = ' + data.cl_array[2].toFixed(4) +
            '    L/D = ' + (data.cl_array[0] / data.cl_array[1]).toFixed(4);
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
            title: 'Value',
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
        margin: { t: 0 }
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
        margin: { t: 40, l: 50, r: 30, b: 50 },
        showlegend: false,
    };
    Plotly.newPlot(`slice-plot-${i}`, plotData, layout);

}
