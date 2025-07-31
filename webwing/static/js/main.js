let config = null;
let parameterConfig = null;

async function main() {

    try {
        const [data, minmaxData, configData] = await Promise.all([
            fetch('static/wingindex.json').then(res => res.json()),
            fetch('static/max_min.json').then(res => res.json()),
            fetch('static/config.json').then(res => res.json())
        ]);

        config = configData
        parameterConfig = minmaxData

        createSliders();
        create_section_slides_groups();
        create_channel_selector();

        await createDropdown(data); // update all values here

        create_airfoil_plot_motion();
        create_camera_monitor();

    } catch (error) {
        console.error('Error loading wingindex.json:', error);

    }
}

main()

