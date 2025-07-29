import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "True"

from flask import Flask, render_template, request, jsonify

from flowvae.app.wing.api import Wing_api

# establish the wing api instance at the beginning of the client
# later use it to predict wing results given input parameters
wing_api = Wing_api(saves_folder='../../saves', device='default')

app = Flask(__name__)

@app.route('/predict_wing_flowfield', methods=['POST'])
def handle_predict_wing_flowfield():
    # get all parameters
    data = request.get_json()
    inputs = data['conditions'] + data['planform'] + [data['t']] + data['cstu'] + data['cstl']  

    # call wing_api to predict
    wg = wing_api.predict(inputs)
    wg.aero_force()
    cl_array = wg.cl

    surfaceField = wg.get_formatted_surface()
    surfaceField = surfaceField.transpose(2, 0, 1)
    
    return jsonify({"geom": surfaceField[:3].tolist(), "value": surfaceField[3:].tolist(), "cl_array": cl_array.tolist()})

@app.route('/')
def index():
    return render_template('index_tailwind.html')

if __name__ == '__main__':
    # app.run(host='0.0.0.0', port=80, debug=False)
    app.run(host='0.0.0.0', port=8000, debug=True)