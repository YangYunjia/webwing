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

function parseChangelogText(raw) {
    const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/);
    let i = 0;
    while (i < lines.length && lines[i].trim() === '') {
        i += 1;
    }
    const version = i < lines.length ? lines[i].trim() : '';
    const body = lines.slice(i + 1).join('\n').replace(/^\s*\n/, '');
    return { version, body: body.trim() ? body : raw.trim() };
}

function wireChangelogModal() {
    const modal = document.getElementById('changelog-modal');
    const closeBtn = document.getElementById('changelog-close');
    const content = document.getElementById('changelog-content');
    if (!modal || !closeBtn || !content) {
        return;
    }
    function close() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (event) {
        if (event.target === modal) {
            close();
        }
    });
    return { modal, content, open(fullText) {
        content.textContent = fullText;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } };
}

async function initAppVersionAndChangelog() {
    const versionEl = document.getElementById('app-version-label');
    const link = document.getElementById('changelog-link');
    if (!versionEl || !link) {
        return;
    }
    const changelogUi = wireChangelogModal();
    let fullText = '';
    try {
        const res = await fetch('static/CHANGELOG.txt');
        if (!res.ok) {
            throw new Error(String(res.status));
        }
        fullText = await res.text();
        const { version } = parseChangelogText(fullText);
        versionEl.textContent = version || '—';
        link.addEventListener('click', function (e) {
            e.preventDefault();
            changelogUi?.open(fullText.trim() || '(empty)');
        });
    } catch (err) {
        console.error('Failed to load CHANGELOG.txt:', err);
        versionEl.textContent = '—';
        link.addEventListener('click', function (e) {
            e.preventDefault();
            changelogUi?.open('Could not load CHANGELOG.txt.');
        });
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
            fetch('static/parameters.json').then(res => res.json()),
            fetch('static/config.json').then(res => res.json())
        ]);
        
        existWingParas = data
        modelConfig = minmaxData
        config = configData

    } catch (error) {
        console.error('Error loading wingindex.json:', error);

    }
    create_model_selector();
    create_user_guide_modal();
    await initAppVersionAndChangelog();
    await update_model_version();
}

main()
