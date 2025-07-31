
const DEGREE       = Math.PI / 180

let cstu = [], cstl = [], t = 0.0;
let planform = [], condition = [];
// [sa0, da0, ar, tr, tw, tcr]

let lastUpdated = 0;
let predictTimer = null;

async function selectDropdown(data) {

    // get parameters from value
    condition = data.slice(0, 2);
    planform = data.slice(2, 8);
    cstu = data.slice(9, 19);
    cstl = data.slice(19, 29);
    t    = data[8];

    // update every bar and box
    inputs = condition.concat(planform).concat([t]);

    for (groupKey in parameterConfig) {
        for (key in parameterConfig[groupKey]) {
            const id = key.replace(/ /g, "-")
            document.getElementById(id).value  = inputs[parameterConfig[groupKey][key].index-1];
            document.getElementById(`${id}-value`).value  = inputs[parameterConfig[groupKey][key].index-1];
        }
    }

    update_bar_values_airfoil();
    update_airfoil();
    update_wing_frame();
    await update_predict();

}

// construct the dropdown
async function createDropdown(data) {
    const dropdown = document.getElementById('airfoil-select');
    dropdown.innerHTML = ''; // clear former selection

    // create selections from data
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            dropdown.appendChild(option);
        }
    }
    // add listener to dropdown box
    dropdown.addEventListener('change', function () {selectDropdown(data[dropdown.value])});
    await selectDropdown(data['DPW-W1'])
}

// Construct sliders
function create_slider_element(id, name, valMin, valMax, valInit, updataCallback) {
    
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-1';

    const label = document.createElement('label');
    label.setAttribute('for', `${id}-value`);
    label.className = 'block text-sm font-medium text-gray-700 mb-1';
    label.innerText = name;

    const valueWrapper = document.createElement('div');
    valueWrapper.className = 'flex w-full space-x-1'

    const inputNumber = document.createElement('input');
    inputNumber.type = 'number';
    inputNumber.id = `${id}-value`;
    inputNumber.min = valMin;
    inputNumber.max = valMax;
    inputNumber.step = (valMax - valMin) / 1000;
    inputNumber.className = 'w-16 mb-1 px-2 py-1 border text-sm rounded-md shadow-sm focus:ring focus:ring-indigo-200';
    inputNumber.value = valInit;

    const inputRange = document.createElement('input');
    inputRange.type = 'range';
    inputRange.id = id;
    inputRange.min = valMin;
    inputRange.max = valMax;
    inputRange.step = (valMax - valMin) / 1000;
    inputRange.className = 'flex-grow accent-blue-500';
    inputRange.value = valInit;

    let isSyncing = false; // avoid duplication in updating values

    // Sync input[type="number"] and input[type="range"]
    inputRange.addEventListener('input', () => {
        if (isSyncing) return;
        isSyncing = true
        inputNumber.value = inputRange.value;
        updataCallback(inputRange.value)
        isSyncing = false
    });
    inputNumber.addEventListener('input', () => {
        if (isSyncing) return;
        isSyncing = true
        inputRange.value = inputNumber.value;
        updataCallback(inputNumber.value)
        isSyncing = false
    });

    wrapper.appendChild(label);
    valueWrapper.appendChild(inputNumber);
    valueWrapper.appendChild(inputRange);
    wrapper.appendChild(valueWrapper);

    return wrapper
}

function create_slides_groups(data, container, name) {

    // add heading
    const heading = document.createElement('h3');
    heading.className = 'text-sm py-2 font-semibold';
    heading.innerText = name;
    container.appendChild(heading);

    // for each key in data, create slide and set min, max
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            const id = key.replace(/ /g, "-");
            const valMin = data[key].min;
            const valMax = data[key].max;

            wrapper = create_slider_element(id, key, valMin, valMax, valMin, 
                value => update_image(value, data[key].index - 1)
            )
            container.appendChild(wrapper);
        }
    }
}

function createSliders() {

    create_slides_groups(parameterConfig.airfoil, document.getElementById('airfoil-params'), 'Sectional Airfoil Parameters');
    create_slides_groups(parameterConfig.planform, document.getElementById('wing-params'), 'Wing Planform Parameters');
    create_slides_groups(parameterConfig.condition, document.getElementById('conditions'), 'Operating Conditions');
}

function update_image(value, index) {
    const currentTime = Date.now();
    // const element = document.getElementById(id);
    // console.log(index, 'call update');

    if (currentTime - lastUpdated > config.updateThrottle) {
        if (index < 2) {
            condition[index] = parseFloat(value);
        } 
        else if (index < 8) {
            planform[index - 2] = parseFloat(value);
            update_wing_frame();
        }
        else if (index === 8) {
            t = parseFloat(value);
            update_airfoil();
        }
        else {
            // CSTs
            update_airfoil();
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

    // debounce of prediction
    if (predictTimer) clearTimeout(predictTimer);
    predictTimer = setTimeout(() => update_predict(), config.predictDebounce);

}

