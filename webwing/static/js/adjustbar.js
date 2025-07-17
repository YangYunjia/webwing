
const slider_names = ['AoA', 'Mach', 'Sweep angle', 'Dihedral angle', 'Aspect ratio', 'tapper-ratio', 'tip-angle', 'thickness-ratio', 'root-thickness'];
const slider_ids   = ['aoa', 'mach', 'swept-angle', 'dihedral-angle', 'aspect-ratio', 'tapper-ratio', 'tip-angle', 'thickness-ratio', 'root-thickness'];
const value_ids    = Array.from({ length: slider_ids.length }, (_, i) => slider_ids[i] + '-value');

let cstu = [], cstl = [], t = 0.0;
let planform = [], condition = [];

let lastUpdated = 0;
let lastPredict = 0;

function selectDropdown(data) {

    // get parameters from value
    condition = data.slice(1, 3);
    planform = data.slice(3, 9);
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
    display_wing_frame();
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
function create_slider_element(data, index) {
    id = slider_ids[index]
    valMin = data[index + 1].min
    valMax = data[index + 1].max

    const wrapper = document.createElement('div');
    wrapper.className = 'mb-1';

    const label = document.createElement('label');
    label.setAttribute('for', `${id}-value`);
    label.className = 'block text-sm font-medium text-gray-700 mb-1';
    label.innerText = slider_names[index];

    const valueWrapper = document.createElement('div');
    valueWrapper.className = 'flex w-full space-x-1'

    const inputNumber = document.createElement('input');
    inputNumber.type = 'number';
    inputNumber.id = `${id}-value`;
    inputNumber.value = valMin;
    inputNumber.min = valMin;
    inputNumber.max = valMax;
    inputNumber.step = (valMax - valMin) / 1000;
    inputNumber.className = 'w-24 mb-1 px-2 py-1 border text-sm rounded-md shadow-sm focus:ring focus:ring-indigo-200';

    const inputRange = document.createElement('input');
    inputRange.type = 'range';
    inputRange.id = id;
    inputRange.value = valMin;
    inputRange.min = valMin;
    inputRange.max = valMax;
    inputRange.step = (valMax - valMin) / 1000;
    inputRange.className = 'flex-grow accent-blue-500';

    // Sync input[type="number"] and input[type="range"]
    inputRange.addEventListener('input', () => {
        inputNumber.value = inputRange.value;
    });
    inputNumber.addEventListener('input', () => {
        inputRange.value = inputNumber.value;
    });

    inputNumber.addEventListener('input', function () {update_image(inputNumber.value, index)});
    inputRange.addEventListener('input', function () {update_image(inputRange.value, index)});

    wrapper.appendChild(label);
    valueWrapper.appendChild(inputNumber);
    valueWrapper.appendChild(inputRange);
    wrapper.appendChild(valueWrapper);
    
    return wrapper
}

function create_slides_groups(data, container, imin, imax, name) {

    // 添加标题
    const heading = document.createElement('h3');
    heading.className = 'text-lg font-semibold';
    heading.innerText = name;
    container.appendChild(heading);

    // 添加每个参数行
    // for each key in data, getElementById(slider_ids[i]) and set min, max
    for (let i = imin; i < imax; i++) {
        container.appendChild(create_slider_element(data, i));
    }
}

function createSliders(data) {
    // airfoil parameters

    create_slides_groups(data, document.getElementById('airfoil-params'), slider_ids.length - 1, slider_ids.length, 'Sectional Airfoil Parameters');
    create_slides_groups(data, document.getElementById('wing-params'), 2, slider_ids.length - 1, 'Wing Planform Parameters');
    create_slides_groups(data, document.getElementById('conditions'), 0, 2, 'Operating Conditions');
}

function update_image(value, index) {
    const currentTime = Date.now();
    // const element = document.getElementById(id);
    // console.log(id)

    if (currentTime - lastUpdated > 20) {
        if (index < 2) {
            condition[index] = parseFloat(value);
        } 
        else if (index < 8) {
            planform[index - 2] = parseFloat(value);
            display_wing_frame();
        }
        else if (index === 8) {
            t = parseFloat(value);
            // console.log(id)
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

