let existWingParas = null;
let config = null;
let modelConfig = null;

// let activeModelVersion = 'simple';
let activeModelVersion = 'transonic';

// let isModelUpdating = false;
// let lastModelSwitchTime = 0;
// const modelSwitchCooldownMs = 800;
// let airfoilPlotMotionInitialized = false;
// let cameraMonitorInitialized = false;

function reset_model_ui() {
    const containers = ['block-secpara', 'block-planform', 'block-conditions', 'slices-plot', 'button-container'];
    containers.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '';
        }
    });
}

async function update_model_version() {
    // all activities after model version change （almost the main function for app)
    // if (isModelUpdating) {
    //     return;
    // }
    // isModelUpdating = true;
    try {

        reset_model_ui();
        createSliders();
        create_section_slides_groups();
        create_channel_selector();

        await createDropdown(); // update all values here

        // if (!airfoilPlotMotionInitialized) {
        create_airfoil_plot_motion();
        //     airfoilPlotMotionInitialized = true;
        // }
        // if (!cameraMonitorInitialized) {
        create_camera_monitor();
        //     cameraMonitorInitialized = true;
        // }
    } finally {
        // isModelUpdating = false;
    }
}

function create_model_selector() {
    const modelSelect = document.getElementById('model-select');
    if (!modelSelect) {
        return;
    }
    modelSelect.innerHTML = '';
    Object.keys(modelConfig).forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = modelConfig[key].label || key;
        modelSelect.appendChild(option);
    });
    modelSelect.value = activeModelVersion;
    modelSelect.addEventListener('change', function () {
        // if (isModelUpdating) {
        //     modelSelect.value = activeModelVersion;
        //     return;
        // }
        // const now = Date.now();
        // if (now - lastModelSwitchTime < modelSwitchCooldownMs) {
        //     modelSelect.value = activeModelVersion;
        //     return;
        // }
        // lastModelSwitchTime = now;
        activeModelVersion = modelSelect.value;
        update_model_version();
    });
}

async function main() {

    try {
        const [data, minmaxData, configData] = await Promise.all([
            fetch('static/wingindex.json').then(res => res.json()),
            fetch('static/max_min.json').then(res => res.json()),
            fetch('static/config.json').then(res => res.json())
        ]);
        
        existWingParas = data
        modelConfig = minmaxData
        config = configData

    } catch (error) {
        console.error('Error loading wingindex.json:', error);

    }
    create_model_selector();
    await update_model_version();
}

main()
