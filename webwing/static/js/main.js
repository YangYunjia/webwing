

fetch('static/max_min.json')
    .then(response => response.json())
    .then(data => createSliders(data))
    .catch(error => console.error('Error loading max_min.json:', error));

// 加载wingindex.json的数据并填充下拉框
fetch('static/wingindex.json')
    .then(response => response.json())
    .then(data => {
        createDropdown(data);
        create_airfoil_plot();
    }) // 填充下拉框
    .catch(error => console.error('Error loading wingindex.json:', error));

let currentCamera;

function create_camera_monitor() {
    const plotDiv = document.getElementById('wing-plot');

    plotDiv.on('plotly_relayout', function(eventData) {
    if (eventData['scene.camera']) {
        currentCamera = eventData['scene.camera'];
    }
    });
}


function display_wing_frame() {

    // 发送 POST 请求到 Flask 后端
    fetch('/display_wing_frame', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ planform: planform, cstu: cstu, cstl: cstl, t: t})  // 发送 inputs[3:] 部分
    })
    .then(response => response.json())
    .then(data => {
        const traces = data['lines'].map((curve, index) => ({
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
                xaxis: { title: 'X', range: [0, 4] },
                yaxis: { title: 'Y', range: [0, 7] },
                zaxis: { title: 'Z', range: [-0.5, 1.5] },
                aspectmode: 'equal',
                ...(currentCamera && { camera: currentCamera })
            }
        };

        Plotly.react('wing-plot', traces, layout);
    })
    .then( () => create_camera_monitor())
    .catch(error => {
        console.error('Error:', error);  // 错误处理
    });
}


function update_predict() {
    console.log("predict_wing_flowfield");
    // 发送 POST 请求到 Flask 后端
    fetch('/predict_wing_flowfield', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: inputs })
    })
    .then(response => response.json())
    .then(data => {
        // 成功后，获取带时间戳的图片并更新 HTML 中的 img src
        const imgElement = document.getElementById('predict_wing_flowfield');
        imgElement.src = data.image;
        console.log(data.cl_array);
        const cl_array = data.cl_array;
        document.getElementById('CL').textContent = data.cl_array[0];
        document.getElementById('CD').textContent = data.cl_array[1];
        document.getElementById('CM').textContent = data.cl_array[2];
    })
    .catch(error => {
        console.error('Error:', error);  // 错误处理
    });
}
