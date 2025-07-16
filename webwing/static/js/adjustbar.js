
const slider_ids = ['aoa', 'mach', 'swept-angle', 'dihedral-angle', 'aspect-ratio', 'tapper-ratio', 'tip-angle', 'thickness-ratio', 'root-thickness'];
const value_ids = Array.from({ length: slider_ids.length }, (_, i) => slider_ids[i] + '-value');

let cstu = [], cstl = [], t = 0.0;
let planform = [], condition = [];

let lastUpdated = 0;
let lastPredict = 0;

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

function selectDropdown(data) {

    // get parameters from value
    condition = data.slice(1, 3);
    planform = data.slice(3, 10);
    cstu = data.slice(11, 21);
    cstl = data.slice(21, 31);
    t    = data[10];

    // update every bar and box
    inputs = condition.concat(planform)
    for (let i = 0; i < value_ids.length - 1; i++) {
        document.getElementById(value_ids[i]).value  = inputs[i];
        document.getElementById(slider_ids[i]).value = inputs[i];
    }
    update_bar_values_airfoil();
    display_sectional_airfoil();
    // display_wing_frame();
    // update_predict();

}

// construct the dropdown
function createDropdown(data) {
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
    dropdown.addEventListener('change', function () {selectDropdown(data[dropdown.value])});
    selectDropdown(data[0])
}

// Construct sliders
function createSliders(data) {
    // for each key in data, getElementById(slider_ids[i]) and set min, max
    for (let i = 0; i < slider_ids.length; i++) {
    const slider = document.getElementById(slider_ids[i]);
    slider.min = data[i + 1].min;
    slider.max = data[i + 1].max;
    }
}

function update_image(id, index) {
    const currentTime = Date.now();
    const element = document.getElementById(id);

    if (currentTime - lastUpdated > 20) {
        if (index < 2) {
            condition[index] = parseFloat(element.value);
        } 
        else if (index < 8) {
            planform[index - 2] = parseFloat(element.value);
            display_wing_frame();
        }
        else if (index === 8) {
            t = parseFloat(element.value);
            display_sectional_airfoil();
        }
        // else if (index === 9) {
        // const newValues = element.value.split(",").map(parseFloat);
        // inputs.splice(9, 10, ...newValues);
        // } 
        // else if (index === 10) {
        // const newValues = element.value.split(",").map(parseFloat);
        // inputs.splice(19, 10, ...newValues);
        // }
        // console.log(inputs);
    lastUpdated = currentTime;
    }
    if (currentTime - lastPredict > 500) {
        // update_predict();
        lastPredict = currentTime;
    }
}

function create_slides_events() {

    value_ids.forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', function () {update_image(id, index)});
        }
    });
    
    slider_ids.forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', function () {update_image(id, index)});
        }
    });
}

