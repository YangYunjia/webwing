

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
        create_slides_events();
    }) // 填充下拉框
    .catch(error => console.error('Error loading wingindex.json:', error));

// Bind all sliders and inputs
for (let i = 0; i < slider_ids.length; i++) {
    bindInput(value_ids[i], slider_ids[i]);
}

function display_wing_frame() {
    console.log("display_wing_frame")

    // 发送 POST 请求到 Flask 后端
    fetch('/display_wing_frame', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: inputs.slice(2) })  // 发送 inputs[3:] 部分
    })
    .then(response => response.json())
    .then(data => {
        // 成功后，获取带时间戳的图片并更新 HTML 中的 img src
        const imgElement = document.getElementById('display_wing_frame');
        imgElement.src = data.image;
    })
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
