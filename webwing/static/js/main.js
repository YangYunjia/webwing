
async function main() {
    fetch('static/max_min.json')
        .then(response => response.json())
        .then(data => createSliders(data))
        .catch(error => console.error('Error loading max_min.json:', error));

    try {
        const response = await fetch('static/wingindex.json');
        const data = await response.json();

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

