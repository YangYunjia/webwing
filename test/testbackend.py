import numpy as np
import torch
import matplotlib.pyplot as plt
from cfdpost.wing.multi_section_wing import MultiSecWing
from flowvae.app.wing.api import SuperWingAPI

# ---- input params (from your JSON) ----
params = {
"condition": [8.0, 0.85],
"planform": [37.155554104187665, 9.230867601367212, 0.2819311251008346, 0.36783877771785206, 0.67],
"secpara": [
[0.13691224416464062, 0.11544538245648085, 0.10518840563095688, 0.10087996438393147, 0.0965443509005446, 0.09489040109868291, 0.09289746959752687],
[0.02702621677017443, -0.007122364424559255, 0.00034746284687064977, 0.020246237308386192, 0.04207733506360066, 0.06334206921446406, 0.07845966075618319],
[-2.3485334310744372, -1.8834323973960259, -1.7069561167222642, -1.4852252753403503, -0.8513446608860421, -0.6827799293963366, -1.7278582605964283]
],
"csts": [[[0.15765979380819448, 0.15928042583570806, 0.13228267645491465, 0.12579953966817886, 0.08000463676059687, 0.1666598390210396, 0.05546985862216369, 0.1875461382423998, 0.07279074868507639, 0.19612863868047595], [-0.15047297330321066, -0.23436850989365576, -0.12417157715844705, -0.38950433683864866, -0.09218454062990442, -0.3838599432222959, -0.06739268335301302, -0.2954192652731583, -0.14809719695600257, -0.0788064503304473]], [[0.13254246059284341, 0.1277255482326251, 0.12750441612547397, 0.1293251703167749, 0.15116589633388916, 0.0904961860999712, 0.15889148233897063, 0.1444169034293314, 0.0839949679853618, 0.16715038849899538], [-0.11823801859611958, -0.12747696707356176, -0.1843758106674189, -0.1523084471982017, -0.21374797508995527, -0.11990672899332905, -0.23303931272227243, -0.07682416827870207, -0.14662937487675673, 0.041432300832439976]], [[0.12813212458360024, 0.09932331481964249, 0.15882117000714407, 0.06950249948517842, 0.22431276923069568, 0.07969633573742925, 0.1544147881878638, 0.24506373968822476, 0.041903510600161634, 0.30734195972184775], [-0.10503144584451084, -0.08498449379981898, -0.17085705199378157, -0.07794992454730226, -0.2225048581412448, -0.05584153333294425, -0.2628057829466524, 0.0060192631182737644, -0.15602884632611172, 0.20002022115985313]], [[0.12973800172533004, 0.09965195218535725, 0.15771434889023347, 0.0749504715412508, 0.23548286152049452, 0.07308320081131721, 0.20132413552684778, 0.2567348400601694, 0.05129583443468409, 0.35527856276766123], [-0.10973031130413008, -0.0729414121020204, -0.16481468485715445, -0.040685191271510886, -0.2285259536476746, -0.016605547560419667, -0.23862459071835126, 0.021606271219845007, -0.08552715450164569, 0.25887620321639737]], [[0.12920384730979265, 0.10370803660252412, 0.15194226315084333, 0.09547147986957434, 0.19883423134273845, 0.11729832542791441, 0.14602371305830802, 0.30871950511814233, 0.039727414182388864, 0.38843092535746904], [-0.11125321225869199, -0.06987123708826845, -0.15443114890789222, -0.029341467059256273, -0.2254618847563139, 0.02036006087334435, -0.2442882613996898, 0.03645145137384761, -0.0921084813808083, 0.282934511786116]], [[0.12251719506437729, 0.10059399490777735, 0.15134090764637323, 0.09222356054060832, 0.18810751065827316, 0.12008480480128353, 0.16222100727351782, 0.2706844849661604, 0.08670127148046398, 0.3526828091851399], [-0.10804693688612217, -0.07576069076454575, -0.14432463313379718, -0.0465955849835236, -0.19617143584254895, -0.0014148884807688995, -0.22402376299598312, 0.038327219808792966, -0.07017082210707788, 0.249848404040014]], [[0.09179638056616778, 0.05143633059430583, 0.14111480210377228, 0.009476710248316214, 0.18032515385118694, 0.05823865930540681, 0.11204005223484376, 0.10200434003555449, 0.07119529709089738, 0.0767379923676195], [-0.09402425495655219, -0.1051989171896662, -0.12934425226711885, -0.1473736753390063, -0.16663407511176817, -0.1386512536101745, -0.16050454042523324, -0.1209058734054779, -0.06819879687969178, -0.018176049585963982]]]
}

# ---- map to MultiSecWing geom dict ----
SA, AR, TR, kink, rootadj = params["planform"]
tmaxs, DAs, twists = params["secpara"]
cst_u = np.array([c[0] for c in params["csts"]])
cst_l = np.array([c[1] for c in params["csts"]])

geom_dict = {
    "SA": SA,
    "AR": AR,
    "TR": TR,
    "kink": kink,
    "rootadj": rootadj,
    "tmaxs": tmaxs,
    "DAs": DAs,
    "twists": twists,
    "cst_u": cst_u,
    "cst_l": cst_l,
}

# ---- build reference grid ----
wg = MultiSecWing(geom_dict, aoa=params["condition"][0], iscentric=True)
wg.reconstruct_surface_grids(nx=129, nzs=[129])

geom = wg.geom  # shape: (nz, ni, 3)
ref_geom_all = np.load(r"C:\Users\yang\Research\2025Wing\skw_model\data\ppn2norigingeom.npy")
ref_geom = ref_geom_all[0].transpose(1, 2, 0)

def to_origeom(arr):
    if arr.ndim != 3:
        raise ValueError(f"geom must be 3D, got {arr.shape}")
    if arr.shape[0] == 3:
        return arr
    if arr.shape[2] == 3:
        return arr.transpose(2, 0, 1)
    raise ValueError(f"unexpected geom shape {arr.shape}")

def to_centric(origeom):
    return 0.25 * (
        origeom[..., 1:, 1:] +
        origeom[..., 1:, :-1] +
        origeom[..., :-1, 1:] +
        origeom[..., :-1, :-1]
    )

def predict_cp(model, geom_arr, condition, device):
    origeom = to_origeom(geom_arr)
    centric = to_centric(origeom)
    inputs = torch.from_numpy(centric).float().unsqueeze(0).to(device)
    auxs = torch.tensor(condition).float().unsqueeze(0).to(device)
    output = model.ATsurf_L(inputs, code=auxs)
    if isinstance(output, (list, tuple)):
        output = output[0]
    if output.ndim == 4:
        cp = output[0, 0].detach().cpu().numpy()
    elif output.ndim == 3:
        cp = output[0].detach().cpu().numpy()
    else:
        raise ValueError(f"unexpected output shape {output.shape}")
    return cp, centric[0]

api = SuperWingAPI(device='default')
cp_gen, x_gen = predict_cp(api, geom, params["condition"], api.device)
cp_ref, x_ref = predict_cp(api, ref_geom, params["condition"], api.device)
print(cp_gen.shape, x_gen.shape)
print(cp_ref.shape, x_ref.shape)

sections = 5
sec_indices = np.linspace(0, cp_gen.shape[0] - 1, sections, dtype=int)
fig, axes = plt.subplots(sections, 1, figsize=(6, 2.5 * sections), sharex=False)
for i, idx in enumerate(sec_indices):
    ax = axes[i]
    ax.plot(x_gen[idx], cp_gen[idx], label='Generated')
    ax.plot(x_ref[idx], cp_ref[idx], label='Reference')
    ax.set_title(f"Section {idx}")
    ax.set_xlabel("x")
    ax.set_ylabel("cp")
    ax.legend()
plt.tight_layout()
plt.show()

# ---- write Tecplot ASCII ----
out_path = r"crm_refgrid.dat"
nz, ni, _ = geom.shape
rnz, rni, _ = ref_geom.shape
print(ref_geom.shape)

with open(out_path, "w") as f:
    f.write('TITLE = "CRM reference grid"\n')
    f.write('VARIABLES = "X","Y","Z"\n')
    f.write(f'ZONE T="Generated", I={ni}, J={nz}, DATAPACKING=POINT\n')
    for j in range(nz):
        for i in range(ni):
            x, y, z = geom[j, i]
            f.write(f"{x:.8f} {y:.8f} {z:.8f}\n")
    f.write(f'ZONE T="Reference", I={rni}, J={rnz}, DATAPACKING=POINT\n')
    for j in range(rnz):
        for i in range(rni):
            x, y, z = ref_geom[j, i]
            f.write(f"{x:.8f} {y:.8f} {z:.8f}\n")

print("written:", out_path)
