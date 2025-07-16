
const nn = 501
let xx = [];
let yu = [];
let yl = [];

function display_sectional_airfoil() {

    console.log("display_sectional_airfoil")
    // Send airfoil request to flask backend
    fetch('/update_cst', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: inputs.slice(8)})  // send inputs[9:] parameters (airfoil CSTs)
    })
    .then(response => response.json())
    .catch(error => {console.error('Error:', error);  // error
    });

    fetch('/display_sectional_airfoil')
    .then(response => response.json())
    .then(data => {
        const upper = {
            x: data.x, y: data.yu, mode: 'lines', type: 'scatter', line: { color: 'black' },
        };
        const lower = {
            x: data.x, y: data.yl, mode: 'lines', type: 'scatter', line: { color: 'black' },
        };
        const layout = {
            xaxis: { title: 'x' },
            yaxis: { title: 'y', range: [-0.5, 0.5] },
            margin: { t: 40, l: 50, r: 30, b: 50 }
        };
        xx = data.x;
        yu = data.yu;
        yl = data.yl;

        Plotly.newPlot('line-chart', [upper, lower], layout);
    })
    .catch(error => {console.error('Error:', error);  // error
    });
    console.log(xx)

}

