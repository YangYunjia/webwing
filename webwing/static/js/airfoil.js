
const nn = 501
const nCtrl = 9
let xx = [];
let yu = [];
let yl = [];
let cstu = [ 0.127281896,  0.127509615,  0.249741682,  0.080180633, 0.253380644,  0.204942075,  0.202460864,  0.158514521, 0.300305704, 0.032347114];
let cstl = [-0.150880952, -0.051869412, -0.225091367, -0.04184105, -0.294681513, -0.103190222, -0.094203569, -0.208170602, 0.2,         0.076282995];
let t = 0.075933877;
let   ctrlX = [];
let   ctrlY = [];
let   showPoints = true;
let   draggedPoint = -1;
const draggedPointIndx = Array.from({ length: nCtrl }, (_, i) => Math.round((i + 1) * nn / (nCtrl + 1)));
const sigma = 0.3;
const yHeight = 0.35, ymax = 0.2, ymin = -0.15;

function show_airfoil(){

    const plotData = [{
        x: xx, y: yu, mode: 'lines', type: 'scatter', line: { color: 'black' },
    }, {
        x: xx, y: yl, mode: 'lines', type: 'scatter', line: { color: 'black' },
    }];
    const layout = {
        xaxis: { title: 'x', range: [0, 1] },
        yaxis: { title: 'y', range: [-0.15, 0.2] },
        margin: { t: 40, l: 50, r: 30, b: 50 },
        dragmode: showPoints ? 'lasso' : false
    };

    if (showPoints) {
        ctrlX = [];
        ctrlY = [];
        for (let i = 0; i < nCtrl; i += 1) {
            ctrlX.push(xx[draggedPointIndx[i]]);
            ctrlY.push(yu[draggedPointIndx[i]]);
        }
        plotData.push({
            x: ctrlX, y: ctrlY, mode: 'markers', marker: { color: 'red', size: 10 }, name: '控制点'
        });
    }

    Plotly.react('airfoil-plot', plotData, layout);
}

function display_sectional_airfoil() {

    console.log("display_sectional_airfoil")
    // Send airfoil request to flask backend
    fetch('/cst_foil', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cstu: cstu, cstl: cstl, t: t})  // send inputs[9:] parameters (airfoil CSTs)
    })
    .then(response => response.json())
    .then(data => {
        xx = data.x;
        yu = data.yu;
        yl = data.yl;
        show_airfoil();
    })
    .catch(error => {console.error('Error:', error);  // error
    });
}

function cst_fit() {

    fetch('/cst_fit', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xx: xx, yu: yu, yl: yl})  // send new x,ys
    })
    .then(response => response.json())
    .then(data => {
        cstu = data.cstu;
        cstl = data.cstl;
        display_sectional_airfoil();
    })
    .catch(error => {console.error('Error:', error);  // error
    });

}

show_airfoil()

// 启用 Plotly 拖动事件监听
document.getElementById('airfoil-plot').on('plotly_click', function (plotData) {
    if (!showPoints) return;

    if (draggedPoint > -1) {
        draggedPoint = -1
        cst_fit()
    }
    else {
        if (plotData.points.length && plotData.points[0].curveNumber === 2) {
            draggedPoint = plotData.points[0].pointIndex;
        }
    }
    console.log(draggedPoint)
});

document.getElementById('airfoil-plot').addEventListener('mousemove', function (e) {
    if (draggedPoint !== -1) {
        const chart = document.getElementById('airfoil-plot');
        const bb = chart.getBoundingClientRect();
        // const x = (e.clientX - bb.left) / bb.width * 5;
        const y = ymax - ((e.clientY - bb.top) / bb.height) * yHeight;
        
        x0 = xx[draggedPointIndx[draggedPoint]]
        dy = Math.max(0, Math.min(0.2, y)) - yu[draggedPointIndx[draggedPoint]]; // 
        
        const range = Math.min(x0, 1 - x0, 0.2);
        for (let j = 0; j < xx.length; j++) {
            const d = Math.abs(xx[j] - x0);
            if (d <= range) {
                const b = Math.pow(1 - Math.pow(d / range, 2), 2)
                yu[j] += dy * b;
            }
            // const g = Math.exp(-Math.pow((xx[j] - x0), 2) / (2 * sigma * sigma));
            // const w = Math.max(1 - Math.abs(xx[j] - x0) / range, 0)
            // yu[j] += dy * g * w;
        }
        show_airfoil();
    }
});

// start and end toggle
const toggleBtn = document.getElementById('toggle-btn');
toggleBtn.addEventListener('click', function () {
    showPoints = !showPoints;
    toggleBtn.textContent = showPoints ? '隐藏控制点' : '显示控制点';
    toggleBtn.className = showPoints
    ? 'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md mb-4'
    : 'bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md mb-4';
    show_airfoil();
});