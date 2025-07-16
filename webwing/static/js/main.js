// Sync input[type="number"] and input[type="range"]
const bindInput = (numberInputId, rangeInputId) => {
    const numberInput = document.getElementById(numberInputId);
    const rangeInput = document.getElementById(rangeInputId);

    numberInput.addEventListener('input', function () {
    rangeInput.value = numberInput.value;
    });

    rangeInput.addEventListener('input', function () {
    numberInput.value = rangeInput.value;
    });
};

// Bind all sliders and inputs
bindInput('root-thickness-value', 'root-thickness');
bindInput('swept-angle-value', 'swept-angle');
bindInput('dihedral-angle-value', 'dihedral-angle');
bindInput('aspect-ratio-value', 'aspect-ratio');
bindInput('tapper-ratio-value', 'tapper-ratio');
bindInput('tip-angle-value', 'tip-angle');
bindInput('thickness-ratio-value', 'thickness-ratio');
bindInput('aoa-value', 'aoa');
bindInput('mach-value', 'mach');

let wingIndexData = {}; // 保存从wingindex.json加载的数据
var inputs = [4.670791528, 0.721055084, 25.722569257, 2.893515097, 8.206646713, 0.594544868, 0.766402576, 0.843740541, 0.075933877, 0.127281896, 0.127509615, 0.249741682, 0.080180633, 0.253380644, 0.204942075, 0.202460864, 0.158514521, 0.300305704, 0.032347114, -0.150880952, -0.051869412, -0.225091367, -0.04184105, -0.294681513, -0.103190222, -0.094203569, -0.208170602, 0.2, 0.076282995];
fetch('static/max_min.json')
    .then(response => response.json())
    .then(data => createSliders(data))
    .catch(error => console.error('Error loading max_min.json:', error));

// 加载wingindex.json的数据并填充下拉框
fetch('static/wingindex.json')
    .then(response => response.json())
    .then(data => {
    wingIndexData = data;
    populateDropdown(wingIndexData); // 填充下拉框
    })
    .catch(error => console.error('Error loading wingindex.json:', error));

// 填充下拉框选项
function populateDropdown(data) {
    const dropdown = document.getElementById('airfoil-select');
    dropdown.innerHTML = ''; // 清空之前的选项

    // 遍历 wingindex.json 中的键并创建选项
    for (let key in data) {
    if (data.hasOwnProperty(key)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        dropdown.appendChild(option);
    }
    }
    // 添加change事件监听器，当用户选择新值时，自动更新滑动条
    dropdown.addEventListener('change', function () {
    var subArray1 = data[dropdown.value].slice(1, 9);
    var subArray2 = data[dropdown.value].slice(10, 31);
    inputs = subArray1.concat(subArray2);
    console.log(inputs);
    populateValue(inputs);
    });
}


const value_ids = ['aoa-value', 'mach-value', 'swept-angle-value', 'dihedral-angle-value', 'aspect-ratio-value', 'tapper-ratio-value', 'tip-angle-value', 'thickness-ratio-value', 'root-thickness-value', 'cstu', 'cstl'];
const slider_ids = ['aoa', 'mach', 'swept-angle', 'dihedral-angle', 'aspect-ratio', 'tapper-ratio', 'tip-angle', 'thickness-ratio', 'root-thickness'];


function createSliders(data) {
    // for each key in data, getElementById(slider_ids[i]) and set min, max
    for (let i = 0; i < slider_ids.length; i++) {
    const slider = document.getElementById(slider_ids[i]);
    slider.min = data[i + 1].min;
    slider.max = data[i + 1].max;
    }
}

function populateValue(inputs_value) {
    for (let i = 0; i < value_ids.length - 2; i++) {
    document.getElementById(value_ids[i]).value = inputs_value[i];
    document.getElementById(slider_ids[i]).value = inputs_value[i];
    }
    document.getElementById('cstu').value = inputs_value.slice(9, 19).toString();
    document.getElementById('cstl').value = inputs_value.slice(19, 29).toString();
    display_sectional_airfoil();
    // display_wing_frame();
    // update_predict();
}

populateValue(inputs);
console.log(xx)

function update_image(id, index) {
    const element = document.getElementById(id);
    if (index < 9) {
    inputs[index] = parseFloat(element.value);
    } 
    else if (index === 9) {
    const newValues = element.value.split(",").map(parseFloat);
    inputs.splice(9, 10, ...newValues);
    } 
    else if (index === 10) {
    const newValues = element.value.split(",").map(parseFloat);
    inputs.splice(19, 10, ...newValues);
    }
    console.log(inputs);
    if (index >= 8) {
    display_sectional_airfoil();
    } 
    else if (index >= 2 & index <= 7) {
    display_wing_frame();
    }
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

function value_change() {
    let lastUpdated = 0;
    let lastPredict = 0;
    
    value_ids.forEach((id, index) => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('input', function () {
        const currentTime = Date.now();
        if (currentTime - lastUpdated > 20) {
            update_image(id, index);
            lastUpdated = currentTime;
        }
        if (currentTime - lastPredict > 500) {
            update_predict();
            lastPredict = currentTime;
        }
        });
    }
    });
    
    slider_ids.forEach((id, index) => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('input', function () {
        const currentTime = Date.now();
        if (currentTime - lastUpdated > 20) {
            update_image(id, index);
            lastUpdated = currentTime;
        }
        if (currentTime - lastPredict > 500) {
            update_predict();
            lastPredict = currentTime;
        }
        });
    }
    });
}

// value_change();