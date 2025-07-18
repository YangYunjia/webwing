    
const ctrlX = [1, 2, 3, 4];
let ctrlY = [2, 3, 1, 2];
let draggedPoint = -1;
let showPoints = true;

function updateCurve() {
    const curveX = [];
    const curveY = [];
    for (let i = 0; i <= 100; i++) {
    const x = 1 + (3 * i) / 100;
    let y = 0;
    for (let j = 0; j < ctrlX.length - 1; j++) {
        if (x >= ctrlX[j] && x <= ctrlX[j + 1]) {
        const ratio = (x - ctrlX[j]) / (ctrlX[j + 1] - ctrlX[j]);
        y = ctrlY[j] * (1 - ratio) + ctrlY[j + 1] * ratio;
        break;
        }
    }
    curveX.push(x);
    curveY.push(y);
    }

    const data = [{
        x: curveX, y: curveY, mode: 'lines', line: { color: 'blue' }, name: '曲线'
    }];

    if (showPoints) {
        data.push({
          x: ctrlX, y: ctrlY, mode: 'markers', marker: { color: 'red', size: 10 }, name: '控制点'
        });
    }

    Plotly.react('toggle-chart', data, {
        title: '拖动红点改变曲线形状',
        dragmode: showPoints ? 'lasso' : false,
        xaxis: { range: [0, 5] },
        yaxis: { range: [0, 4] }
    });
}

// 初始绘图
updateCurve();

// 启用 Plotly 拖动事件监听
document.getElementById('toggle-chart').on('plotly_click', function (data) {
    if (!showPoints) return;

    if (draggedPoint > -1) {
        draggedPoint = -1
    }
    else {
        if (data.points.length && data.points[0].curveNumber === 1) {
            draggedPoint = data.points[0].pointIndex;
        }
    }
});

document.getElementById('toggle-chart').addEventListener('mousemove', function (e) {
    if (draggedPoint !== -1) {
        const chart = document.getElementById('toggle-chart');
        const bb = chart.getBoundingClientRect();
        const x = (e.clientX - bb.left) / bb.width * 5;
        const y = 4 - ((e.clientY - bb.top) / bb.height) * 4;
        ctrlY[draggedPoint] = Math.max(0, Math.min(4, y)); // 限制范围
        updateCurve();
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
    updateCurve();
});