
const DEGREE       = Math.PI / 180
const coeffsPerSurface = 10;
let activeSecIndex = 0;
let sectionCount = 0;
let sectionNames = [];

let currentParas = null;
// [sa0, da0, ar, tr, tw, tcr]

let barsConfig = null;
let lastUpdated = 0;
let predictTimer = null;

async function update_dropdown() {

    // const conditionLen = Object.keys(barsConfig.condition || {}).length;
    // const planformLen = Object.keys(barsConfig.planform   || {}).length;
    // const secParaLen  = Object.keys(barsConfig.secpara    || {}).length;

    // -------------------------
    // update global values here
    // -------------------------

    // condition = data['condition'];
    // planform = data[''];

    // deal with sectional parameters (x_sec1, x_sec2, ..., y_sec1, ..., cst_u_sec1, cst_l_sec1, ...)
    // sectional parameters are stored based on variables; csts are stored based on section
    // secParas = [];
    // cstu = [];
    // cstl = [];
    // for (let i = 0; i < secParaLen; i += 1) {
    //     const baseSecParas = conditionLen + planformLen + i * sectionCount;
    //     const base = conditionLen + planformLen + secParaLen * sectionCount + i * coeffsPerSurface * 2;
    //     secParas.push(data.slice(baseSecParas, baseSecParas + sectionCount));
    //     cstu.push(data.slice(base, base + coeffsPerSurface));
    //     cstl.push(data.slice(base + coeffsPerSurface, base + coeffsPerSurface * 2));
    // }

    // -------------------------
    // update every bar and box based on global values
    // -------------------------
    update_bars('secpara', currentParas.secpara, true);
    update_bars('planform', currentParas.planform, false);
    update_bars('condition', currentParas.condition, false)
    update_cst_boxs_values();

    initial_airfoil_points();
    update_wing_frame();
    await update_predict();

}

// construct the dropdown
async function createDropdown() {
    const dropdown = document.getElementById('wing-para-select');
    dropdown.innerHTML = ''; // clear former selection
    const existWingPara = existWingParas[activeModelVersion]

    // create selections from data
    for (let key in existWingPara) {
        if (existWingPara.hasOwnProperty(key)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            dropdown.appendChild(option);
        }
    }
    // add listener to dropdown box
    dropdown.onchange = async function () {
        currentParas = existWingPara[dropdown.value];
        await update_dropdown();
    };
    currentParas = existWingPara[Object.keys(existWingPara)[0]];
    await update_dropdown();
}

function create_airfoil_selector(container) {
    sectionNames = modelConfig[activeModelVersion].sections;
    sectionCount = sectionNames.length;

    const wrapper = document.createElement('div');
    wrapper.className = 'my-2 flex';

    const label = document.createElement('label');
    label.setAttribute('for', 'airfoil-index-select');
    label.className = 'block text-xs font-medium text-gray-700 whitespace-nowrap';
    label.innerText = 'Section index';

    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 flex-1';

    const leftCol = document.createElement('div');
    leftCol.className = 'flex flex-col flex-1 gap-1';

    const select = document.createElement('select');
    select.id = 'airfoil-index-select';
    select.className = 'flex-grow h-4 rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs';

    for (let i = 0; i < sectionCount; i += 1) {
        const option = document.createElement('option');
        option.value = `${i}`;
        option.textContent = sectionNames[i] || `Section ${i + 1}`;
        select.appendChild(option);
    }
    select.value = `${activeSecIndex}`;
    select.addEventListener('change', function () {
        activeSecIndex = parseInt(select.value, 10);
        update_cst_boxs_values();
        update_airfoil_points();
    });

    let toggleBtn = document.getElementById('modify-airfoil-button');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'modify-airfoil-button';
        toggleBtn.textContent = 'Modify airfoil';
    }
    toggleBtn.className = 'h-10 w-28 bg-blue-500 hover:bg-blue-600 text-white rounded-md';

    leftCol.appendChild(label);
    leftCol.appendChild(select);
    row.appendChild(leftCol);
    row.appendChild(toggleBtn);
    wrapper.appendChild(row);
    container.appendChild(wrapper);
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

function create_slides_groups(groupName, container, groupDispName, extras) {

    // add heading
    const heading = document.createElement('h3');
    heading.className = 'text-sm py-2 font-semibold';
    heading.innerText = groupDispName;
    container.appendChild(heading);

    if (typeof extras === 'function') {
        extras(container);
    }

    const groupConfig = barsConfig[groupName]

    // for each key in data, create slide and set min, max
    for (let key in groupConfig) {
        if (groupConfig.hasOwnProperty(key)) {
            const id = key.replace(/ /g, "-");
            const valMin = groupConfig[key].min;
            const valMax = groupConfig[key].max;

            wrapper = create_slider_element(id, key, valMin, valMax, valMin, 
                value => update_image(value, groupName, groupConfig[key].index - 1)
            )
            container.appendChild(wrapper);
        }
    }
}

function createSliders() {
    
    barsConfig = modelConfig[activeModelVersion]['bars'];

    create_slides_groups('secpara', document.getElementById('block-secpara'), 'Sectional Airfoil Parameters', create_airfoil_selector);
    create_slides_groups('planform', document.getElementById('block-planform'), 'Wing Planform Parameters');
    create_slides_groups('condition', document.getElementById('block-conditions'), 'Operating Conditions');
}

function update_bars(group, values, isSec) {

    for (key in barsConfig[group]) {
        const id = key.replace(/ /g, "-");
        let newValue = values[barsConfig[group][key].index-1];
        if (isSec) {newValue = newValue[activeSecIndex];}

        document.getElementById(id).value = newValue;
        document.getElementById(`${id}-value`).value  = newValue;
    }
}


function update_image(value, group, index) {
    const currentTime = Date.now();
    // const element = document.getElementById(id);
    // console.log(index, 'call update');

    if (currentTime - lastUpdated > config.updateThrottle) {
        if (group === 'condition') {
            currentParas.condition[index] = parseFloat(value);
        } 
        else if (group === 'planform') {
            currentParas.planform[index] = parseFloat(value);
            update_wing_frame();
        }
        else if (group === 'secpara') {
            currentParas.secpara[index][activeSecIndex] = parseFloat(value);
            update_airfoil_points();
            update_wing_frame();
        }
        else if (group === 'csts') {
            // global values should be updated elsewhere
            currentParas.csts[activeSecIndex][index] = value
            update_airfoil_points();
            update_wing_frame();
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

