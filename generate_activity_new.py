"""Standalone: generate the redesigned activity diagram -> 'activity diagram new.png'."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle
import numpy as np

OUT = r'C:/Users/PC/petmatchai'

BLUE   = '#1d4ed8'; LBLUE  = '#dbeafe'
GREEN  = '#15803d'; LGREEN = '#dcfce7'
ORANGE = '#c2410c'; LORAN  = '#ffedd5'
YEL    = '#ca8a04'; LYEL   = '#fef9c3'
INK    = '#111827'; GRAY   = '#374151'
LINE   = '#475569'

fig, ax = plt.subplots(figsize=(16, 21))
ax.set_xlim(0, 16); ax.set_ylim(0, 21)
ax.axis('off'); fig.patch.set_facecolor('white'); ax.set_facecolor('white')
ax.text(8, 20.55, 'PetMatchAI — Activity Diagram', ha='center',
        fontsize=17, fontweight='bold', color=GRAY)

# ---- swimlanes ------------------------------------------------------------
LANES = [(0.4, 5.6, 'BUYER', GREEN, LGREEN),
         (5.6, 10.4, 'SYSTEM  (PetMatchAI)', BLUE, LBLUE),
         (10.4, 15.6, 'SELLER', ORANGE, LORAN)]
TOP, BOT = 20.0, 0.5
for x0, x1, name, ec, fc in LANES:
    ax.add_patch(Rectangle((x0, BOT), x1-x0, TOP-BOT, facecolor=fc, edgecolor='none',
                           alpha=0.25, zorder=0))
    ax.add_patch(Rectangle((x0, TOP-0.6), x1-x0, 0.6, facecolor=ec, edgecolor=ec, zorder=1))
    ax.text((x0+x1)/2, TOP-0.3, name, ha='center', va='center', fontsize=11,
            fontweight='bold', color='white', zorder=2)
    ax.add_patch(Rectangle((x0, BOT), x1-x0, TOP-BOT, facecolor='none',
                           edgecolor='#cbd5e1', lw=1.2, zorder=1))

BX, SX, LX = 3.0, 8.0, 13.0   # lane centres


def start(cx, cy):
    ax.add_patch(plt.Circle((cx, cy), 0.18, color=INK, zorder=5))


def end(cx, cy):
    ax.add_patch(plt.Circle((cx, cy), 0.24, fill=False, ec=INK, lw=2.2, zorder=5))
    ax.add_patch(plt.Circle((cx, cy), 0.13, color=INK, zorder=5))


def act(cx, cy, label, ec, fc, w=2.8, h=0.86):
    ax.add_patch(FancyBboxPatch((cx-w/2, cy-h/2), w, h, boxstyle='round,pad=0.02,rounding_size=0.18',
                                facecolor=fc, edgecolor=ec, linewidth=1.6, zorder=4))
    ax.text(cx, cy, label, ha='center', va='center', fontsize=8.4,
            color=ec, fontweight='bold', zorder=5)
    return {'cx': cx, 'cy': cy, 't': (cx, cy+h/2), 'b': (cx, cy-h/2),
            'l': (cx-w/2, cy), 'r': (cx+w/2, cy)}


def dec(cx, cy, label, w=2.4, h=1.2):
    ax.add_patch(plt.Polygon([(cx, cy+h/2), (cx+w/2, cy), (cx, cy-h/2), (cx-w/2, cy)],
                             closed=True, facecolor=LYEL, edgecolor=YEL, linewidth=1.6, zorder=4))
    ax.text(cx, cy, label, ha='center', va='center', fontsize=8.0,
            color='#854d0e', fontweight='bold', zorder=5)
    return {'cx': cx, 'cy': cy, 't': (cx, cy+h/2), 'b': (cx, cy-h/2),
            'l': (cx-w/2, cy), 'r': (cx+w/2, cy)}


def bar(cx, cy, w=10.4):
    ax.add_patch(Rectangle((cx-w/2, cy-0.06), w, 0.12, facecolor=INK, edgecolor=INK, zorder=5))


def arr(points, guard='', gdx=0.0, gdy=0.0):
    pts = [np.array(p, float) for p in points]
    for i in range(len(pts)-2):
        ax.plot([pts[i][0], pts[i+1][0]], [pts[i][1], pts[i+1][1]],
                color=LINE, lw=1.5, zorder=3, solid_capstyle='round')
    ax.annotate('', xy=tuple(pts[-1]), xytext=tuple(pts[-2]),
                arrowprops=dict(arrowstyle='-|>', mutation_scale=15, color=LINE, lw=1.5), zorder=3)
    if guard:
        ax.text(pts[0][0]+gdx, pts[0][1]+gdy, guard, fontsize=7.6, color='#b91c1c',
                ha='center', va='center', style='italic', zorder=6,
                bbox=dict(facecolor='white', edgecolor='none', pad=0.6))


# ---- nodes ----------------------------------------------------------------
start(BX, 19.3)
visit = act(BX, 18.5, 'Visit PetMatchAI', GREEN, LGREEN)
dreg = dec(BX, 17.3, 'Registered?')
register = act(3.7, 16.0, 'Register & set\npet preferences', GREEN, LGREEN, w=2.5)
login = act(1.45, 16.0, 'Log in', GREEN, LGREEN, w=1.5)
verify = act(SX, 16.0, 'Send OTP &\nverify email', BLUE, LBLUE)
auth = act(SX, 14.7, 'Authenticate user', BLUE, LBLUE)
drole = dec(SX, 13.45, 'Role?')
rec = act(SX, 12.2, 'Generate AI\nrecommendations', BLUE, LBLUE)
browse = act(BX, 12.2, 'Browse & search\nlistings', GREEN, LGREEN)
detail = act(BX, 11.0, 'View listing detail', GREEN, LGREEN)
dint = dec(BX, 9.8, 'Interested?')
offer = act(BX, 8.6, 'Send inquiry /\nmake offer', GREEN, LGREEN)
alist = act(LX, 12.2, 'Create & manage\nlistings', ORANGE, LORAN)
aresp = act(LX, 10.7, 'Receive inquiry /\noffer', ORANGE, LORAN)
daccept = dec(LX, 9.4, 'Accept\noffer?')
counter = act(LX, 8.1, 'Send counter-offer', ORANGE, LORAN)
confirm = act(SX, 7.1, 'Confirm deal &\nnotify parties', BLUE, LBLUE)
purchase = act(BX, 6.0, 'Complete purchase\n(in person)', GREEN, LGREEN)
review = act(BX, 4.3, 'Leave review\n& rating', GREEN, LGREEN)
respond = act(LX, 4.3, 'Respond to review', ORANGE, LORAN)
analytics = act(SX, 3.0, 'Update analytics\n& audit log', BLUE, LBLUE)

# ---- flow -----------------------------------------------------------------
arr([(BX, 19.12), visit['t']])
arr([visit['b'], dreg['t']])
arr([dreg['b'], (3.0, 16.55), (3.7, 16.55), register['t']], 'No', gdx=0.3, gdy=-0.1)
arr([dreg['l'], (1.45, 17.3), login['t']], 'Yes', gdx=-0.45, gdy=0.2)
arr([register['r'], verify['l']])
arr([verify['b'], (SX, 14.7+0.43)])                       # verify -> auth
arr([login['b'], (1.45, 15.0), (SX-1.4, 15.0), auth['l']])  # login -> auth
arr([auth['b'], drole['t']])
arr([drole['b'], rec['t']], 'Buyer', gdx=-0.55, gdy=-0.05)
arr([drole['r'], (LX, 13.45), alist['t']], 'Seller', gdx=0.6, gdy=0.18)
arr([rec['l'], browse['r']])
arr([browse['b'], detail['t']])
arr([detail['b'], dint['t']])
arr([dint['l'], (1.0, 9.8), (1.0, 12.2), browse['l']], 'No', gdx=-0.35, gdy=-0.35)  # loop
arr([dint['b'], offer['t']], 'Yes', gdx=0.4, gdy=0.0)
arr([offer['r'], (6.4, 8.6), (6.4, 10.7), aresp['l']])    # buyer offer -> seller
arr([alist['b'], aresp['t']])
arr([aresp['b'], daccept['t']])
arr([daccept['b'], counter['t']], 'No', gdx=0.4, gdy=0.05)
arr([counter['l'], (5.7, 8.1), (5.7, 8.6), offer['r']], 'counter', gdx=-0.7, gdy=0.28)  # counter loop
arr([daccept['l'], (SX, 9.4), confirm['t']], 'Yes', gdx=-0.55, gdy=0.18)
arr([confirm['b'], (SX, 6.0), purchase['r']])
arr([purchase['b'], (BX, 5.0)])                            # to fork
bar(8.0, 5.0)                                              # fork
arr([(BX, 5.0), review['t']])
arr([(LX, 5.0), respond['t']])
bar(8.0, 3.7)                                              # join
arr([review['b'], (BX, 3.7)])
arr([respond['b'], (LX, 3.7)])
arr([(8.0, 3.7), analytics['t']])
arr([analytics['b'], (SX, 2.0)])
end(SX, 1.7)

fig.savefig(f'{OUT}/activity diagram new.png', dpi=150, bbox_inches='tight',
            facecolor='white', edgecolor='none')
plt.close(fig)
print('Saved: activity diagram new.png')
