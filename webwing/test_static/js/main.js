
function fetchAndDraw(shape) {
  fetch(`/data?type=${shape}`)
    .then(res => res.json())
    .then(data => {
      let layout = { scene: {} };
      let plotData;

      if (data.type === 'sphere') {
        plotData = [{
          type: 'surface',
          x: data.x,
          y: data.y,
          z: data.z
        }];
      } else if (data.type === 'cube') {
        plotData = [{
          type: 'mesh3d',
          x: data.x,
          y: data.y,
          z: data.z,
          i: data.i,
          j: data.j,
          k: data.k,
          opacity: 0.5,
          color: 'blue'
        }];
      }

      Plotly.newPlot('plot', plotData, layout);
    });
}

function updateView() {
  const azimuth = document.getElementById('azimuth').value;
  const elevation = document.getElementById('elevation').value;
  const zoom = document.getElementById('zoom').value;

  const x = Math.cos(azimuth * Math.PI / 180) * Math.cos(elevation * Math.PI / 180) * zoom;
  const y = Math.sin(azimuth * Math.PI / 180) * Math.cos(elevation * Math.PI / 180) * zoom;
  const z = Math.sin(elevation * Math.PI / 180) * zoom;

  Plotly.relayout('plot', {
    'scene.camera.eye': { x, y, z }
  });
}

let currentShape = "sphere";

// 初始化绘图
fetchAndDraw(currentShape);

// Tab 切换
const tabs = document.querySelectorAll('.tab-btn');
tabs.forEach(tab => {
tab.addEventListener('click', () => {
    // UI 样式切换
    tabs.forEach(t => t.classList.remove('bg-blue-500', 'text-white', 'active-tab'));
    tab.classList.add('bg-blue-500', 'text-white', 'active-tab');

    // 更新形状
    currentShape = tab.dataset.shape;
    fetchAndDraw(currentShape);
});
});

// 滑动条绑定
['azimuth', 'elevation', 'zoom'].forEach(id => {
document.getElementById(id).addEventListener('input', updateCameraView);
});