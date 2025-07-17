import base64
from io import BytesIO
from matplotlib.figure import Figure
from flask import Flask, render_template, request, jsonify

# establish the wing api instance at the beginning of the client
# later use it to predict wing results given input parameters
# from flowvae.app.wing.wing_api import Wing_api
import numpy as np
wing_api = None
# wing_api = Wing_api(saves_folder='saves', device='default')
from cst_modeling.section import cst_foil, cst_foil_fit, clustcos
from cfdpost.wing.basic import reconstruct_surface_frame, points2line

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
    # 获取前端发送的JSON数据
    data = request.get_json()

    cstu, cstl = cst_foil_fit(np.array(data['xx']), np.array(data['yu']), np.array(data['xx']), np.array(data['yl']), n_cst=10)

    return jsonify({"cstu": cstu.tolist(), "cstl": cstl.tolist()})

@app.route('/display_wing_frame', methods=['POST'])
def handle_display_wing_frame():
    # 获取前端发送的JSON数据
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
    # 获取前端发送的JSON数据
    data = request.get_json()
    inputs = data['inputs']  # 获取输入的 inputs[9:] 部分

    # 调用 wing_api 的 display_sectional_airfoil 函数，生成图片
    wg = wing_api.predict(inputs)
    wg.lift_distribution()
    cl_array = wg.cl
    
    fig = Figure(figsize=(14, 10), dpi=100)
    wg._plot_2d(fig, ['upper', 'full'], contour=9, reverse_y=-1)
    
    buf = BytesIO()
    fig.savefig(buf, format="png")

    # 返回图片，供前端使用
    data = base64.b64encode(buf.getbuffer()).decode("ascii")
    return jsonify({"image": f"data:image/png;base64,{data}", "cl_array": cl_array.tolist()})

@app.route('/')
def index():
    return render_template('index_tailwind.html')

@app.route('/data')
def data():
    shape_type = request.args.get('type', 'sphere')
    
    if shape_type == 'cube':
        # 八个点
        x = [0, 1, 1, 0, 0, 1, 1, 0]
        y = [0, 0, 1, 1, 0, 0, 1, 1]
        z = [0, 0, 0, 0, 1, 1, 1, 1]
        # 定义面的三角网格（12个三角面）
        i = [0, 0, 0, 1, 1, 2, 4, 4, 5, 5, 6, 7]
        j = [1, 3, 4, 2, 5, 3, 5, 7, 6, 1, 2, 3]
        k = [3, 4, 5, 3, 6, 7, 7, 6, 1, 0, 3, 0]

        return jsonify({
            'type': 'cube',
            'x': x,
            'y': y,
            'z': z,
            'i': i,
            'j': j,
            'k': k
        })

    else:
        # 球面数据
        phi = np.linspace(0, np.pi, 20)
        theta = np.linspace(0, 2 * np.pi, 40)
        phi, theta = np.meshgrid(phi, theta)
        r = 1
        x = r * np.sin(phi) * np.cos(theta)
        y = r * np.sin(phi) * np.sin(theta)
        z = r * np.cos(phi)
        return jsonify({
            'type': 'sphere',
            'x': x.tolist(),
            'y': y.tolist(),
            'z': z.tolist()
        })


if __name__ == '__main__':
    app.run(debug=True)