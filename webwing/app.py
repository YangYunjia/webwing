import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "True"

from flask import Flask, render_template, request, jsonify


import numpy as np

from cst_modeling.section import cst_foil, cst_foil_fit, clustcos
from cfdpost.wing.basic import reconstruct_surface_frame, points2line, Wing
from flowvae.app.wing.api import Wing_api

# establish the wing api instance at the beginning of the client
# later use it to predict wing results given input parameters
wing_api = Wing_api(saves_folder='C:\\Users\\yang\\Research\\2025Wing\\ssw_model\\saves', device='default')

app = Flask(__name__)

@app.route('/cst_foil', methods=['POST'])
def handle_cst_foil():
    # get csts direct from UI
    data = request.get_json()
    nx = 501
    xx, yu, yl, _, _ = cst_foil(nx, data['cstu'], data['cstl'], x=None, t=data['t'], tail=0.004)
    return jsonify({"x": xx.tolist(), "yu": yu.tolist(), "yl": yl.tolist()})

@app.route('/cst_fit', methods=['POST'])
def handle_cst_fit():

    data = request.get_json()

    cstu, cstl = cst_foil_fit(np.array(data['xx']), np.array(data['yu']), np.array(data['xx']), np.array(data['yl']), n_cst=10)

    return jsonify({"cstu": cstu.tolist(), "cstl": cstl.tolist()})

@app.route('/display_wing_frame', methods=['POST'])
def handle_display_wing_frame():

    data = request.get_json()

    sa0, da0, ar, tr, tw, tcr = data['planform']
    troot = data['t']
    cst_u = data['cstu']
    cst_l = data['cstl']

    hs = 0.5 * ar * (1 + tr)
    g = {
        'tip_twist_angle': tw,
        'tapper_ratio': tr,
        'half_span': hs,
        'swept_angle': sa0,
        'dihedral_angle': da0
    }
    nx = 51

    xxs, yys = reconstruct_surface_frame(nx, [cst_u, cst_u], [cst_l, cst_l], [troot, troot * tcr], g)

    lines = []
    # tip and root section airfoil
    lines.append([xxs[0].tolist(), [0 for _ in xxs[0]], yys[0].tolist()])
    lines.append([xxs[1].tolist(), [hs for _ in xxs[0]], yys[1].tolist()])

    # leading and tailing edges
    for ix in [0, nx-1, -1]:
        lines.append(list(points2line(p1=[xxs[0][ix], 0, yys[0][ix]], p2=[xxs[1][ix], hs, yys[1][ix]])))

    return jsonify({"lines": lines})

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
    app.run(debug=True)