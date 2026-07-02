"""Standalone: generate the redesigned class diagram -> 'class diagram new.png'."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Rectangle
import numpy as np

OUT = r'C:/Users/PC/petmatchai'

BLUE   = '#1d4ed8'; LBLUE  = '#dbeafe'
GREEN  = '#15803d'; LGREEN = '#dcfce7'
PURPLE = '#7e22ce'; LPURP  = '#f3e8ff'
ORANGE = '#c2410c'; LORAN  = '#ffedd5'
TEAL   = '#0f766e'; LTEAL  = '#ccfbf1'
RED    = '#b91c1c'; LRED   = '#fee2e2'
GRAYH  = '#475569'; LGRAY  = '#f1f5f9'
GRAY   = '#374151'
LINE   = '#64748b'

fig, ax = plt.subplots(figsize=(24, 15))
ax.set_xlim(0, 24); ax.set_ylim(-0.6, 16)
ax.axis('off'); fig.patch.set_facecolor('white'); ax.set_facecolor('white')
ax.text(12, 15.6, 'PetMatchAI — Class Diagram', ha='center',
        fontsize=18, fontweight='bold', color=GRAY)
ax.text(12, 15.15, 'Domain classes, attributes, operations and their relationships',
        ha='center', fontsize=10.5, color='#6b7280', style='italic')

W = 3.8


def box(cx, ytop, name, attrs, methods, ec, fc):
    rh, hh = 0.30, 0.46
    ah = len(attrs)*rh + 0.12
    mh = len(methods)*rh + 0.12
    H = hh + ah + mh
    x = cx - W/2
    ybot = ytop - H
    ax.add_patch(Rectangle((x, ytop-hh), W, hh, facecolor=ec, edgecolor=ec, zorder=3))
    ax.text(cx, ytop-hh/2, name, ha='center', va='center', fontsize=8.8,
            fontweight='bold', color='white', zorder=4)
    ax.add_patch(Rectangle((x, ytop-hh-ah), W, ah, facecolor=fc, edgecolor=ec, lw=1.1, zorder=3))
    for i, a in enumerate(attrs):
        ax.text(x+0.13, ytop-hh-0.12-i*rh-rh/2+0.05, a, va='center',
                fontsize=6.7, color=GRAY, zorder=4)
    ax.add_patch(Rectangle((x, ybot), W, mh, facecolor='white', edgecolor=ec, lw=1.1, zorder=3))
    for i, m in enumerate(methods):
        ax.text(x+0.13, ytop-hh-ah-0.12-i*rh-rh/2+0.05, m, va='center',
                fontsize=6.7, color=GRAYH, style='italic', zorder=4)
    mid = (ytop+ybot)/2
    return {'cx': cx, 'cy': mid, 'ytop': ytop, 'ybot': ybot,
            't': (cx, ytop), 'b': (cx, ybot), 'l': (x, mid), 'r': (x+W, mid)}


def diamond(p0, p1, filled, color):
    d = np.array(p1, float) - np.array(p0, float)
    u = d/(np.hypot(*d)+1e-9); n = np.array([-u[1], u[0]]); s = 0.17
    c = np.array(p0, float) + u*s*1.3
    pts = [tuple(np.array(p0, float)), tuple(c+n*s*0.75),
           tuple(np.array(p0, float)+u*s*2.6), tuple(c-n*s*0.75)]
    ax.add_patch(plt.Polygon(pts, closed=True, fc=(color if filled else 'white'),
                             ec=color, lw=1.2, zorder=6))


def mult(pe, pp, text):
    d = np.array(pe, float) - np.array(pp, float)
    u = d/(np.hypot(*d)+1e-9); n = np.array([-u[1], u[0]])
    pos = np.array(pe, float) - u*0.38 + n*0.24
    ax.text(pos[0], pos[1], text, fontsize=6.6, color='#334155',
            ha='center', va='center', zorder=6)


def conn(verts, ms='', me='', deco='none', color=LINE, label=''):
    xs = [v[0] for v in verts]; ys = [v[1] for v in verts]
    ax.plot(xs, ys, color=color, lw=1.2, zorder=2, solid_capstyle='round')
    if deco in ('comp', 'aggr'):
        diamond(verts[0], verts[1], filled=(deco == 'comp'), color=color)
    if ms:
        mult(verts[0], verts[1], ms)
    if me:
        mult(verts[-1], verts[-2], me)
    if label:
        mx = (verts[0][0]+verts[1][0])/2; my = (verts[0][1]+verts[1][1])/2
        ax.text(mx, my+0.18, label, fontsize=6.3, color='#94a3b8',
                ha='center', style='italic', zorder=6)


# ---- column / row layout --------------------------------------------------
L, C, R, FR = 4.2, 10.4, 16.2, 21.4
R1, R2, R3, R4 = 14.0, 10.4, 6.6, 3.0
B = {}

B['BuyerPreference'] = box(L, R1, 'BuyerPreference',
    ['+ userId: UUID', '+ species: String[]', '+ budgetMin: Decimal', '+ budgetMax: Decimal'],
    ['+ save()', '+ getMatchCriteria()'], GREEN, LGREEN)
B['User'] = box(C, R1, 'User',
    ['+ id: UUID', '+ name: String', '+ email: String', '+ role: Enum'],
    ['+ register()', '+ login()', '+ logout()'], BLUE, LBLUE)
B['Profile'] = box(R, R1, 'Profile',
    ['+ userId: UUID', '+ phone: String', '+ location: String', '+ isVerified: Bool'],
    ['+ update()', '+ verify()'], BLUE, LBLUE)
B['UserVerification'] = box(FR, R1, 'UserVerification',
    ['+ userId: UUID', '+ idType: Enum', '+ idImageUrl: String', '+ status: Enum'],
    ['+ submit()', '+ approve()', '+ reject()'], BLUE, LBLUE)

B['AIMatch'] = box(L, R2, 'AIMatch',
    ['+ buyerId: UUID', '+ petId: UUID', '+ score: Int', '+ reasons: String[]'],
    ['+ computeScore()', '+ updateFeedback()'], TEAL, LTEAL)
B['Pet'] = box(C, R2, 'Pet',
    ['+ id: UUID', '+ sellerId: UUID', '+ breed: String', '+ price: Decimal', '+ status: Enum'],
    ['+ create()', '+ update()', '+ incrementViews()'], ORANGE, LORAN)
B['Offer'] = box(R, R2, 'Offer',
    ['+ petId: UUID', '+ buyerId: UUID', '+ amount: Decimal', '+ status: Enum'],
    ['+ submit()', '+ accept()', '+ counter()'], ORANGE, LORAN)
B['Review'] = box(FR, R2, 'Review',
    ['+ reviewerId: UUID', '+ petId: UUID', '+ rating: Int', '+ comment: String'],
    ['+ submit()', '+ respond()'], GREEN, LGREEN)

B['WantAd'] = box(L, R3, 'WantAd',
    ['+ buyerId: UUID', '+ species: String', '+ budgetMax: Decimal', '+ isActive: Bool'],
    ['+ post()', '+ close()'], GREEN, LGREEN)
B['MessageThread'] = box(C, R3, 'MessageThread',
    ['+ id: UUID', '+ petId: UUID', '+ buyerId: UUID', '+ sellerId: UUID'],
    ['+ create()', '+ archive()'], PURPLE, LPURP)
B['Message'] = box(R, R3, 'Message',
    ['+ threadId: UUID', '+ senderId: UUID', '+ content: String', '+ isRead: Bool'],
    ['+ send()', '+ markRead()'], PURPLE, LPURP)
B['Notification'] = box(FR, R3, 'Notification',
    ['+ userId: UUID', '+ type: Enum', '+ message: String', '+ isRead: Bool'],
    ['+ create()', '+ markRead()'], GRAYH, LGRAY)

B['Dispute'] = box(C, R4, 'Dispute',
    ['+ reporterId: UUID', '+ respondentId: UUID', '+ status: Enum'],
    ['+ file()', '+ resolve()'], RED, LRED)
B['AuditLog'] = box(R, R4, 'AuditLog',
    ['+ userId: UUID', '+ action: String', '+ entityType: String'],
    ['+ log()', '+ export()'], GRAYH, LGRAY)

# ---- relationships --------------------------------------------------------
LCh, RCh, FRCh = 7.3, 13.3, 18.8
HC1, HC2 = 10.8, 7.1
TOP = 14.0

# User-owned (composition)
conn([B['User']['r'], B['Profile']['l']], '1', '1', 'comp', BLUE)
conn([B['User']['l'], B['BuyerPreference']['r']], '1', '0..1', 'comp', BLUE)
# User associations
conn([B['User']['t'], (C, TOP+0.4), (FR, TOP+0.4), B['UserVerification']['t']], '1', '0..1')
conn([B['User']['b'], B['Pet']['t']], '1', '*', label='seller')
conn([(C-0.6, B['User']['ybot']), (C-0.6, HC1), (L, HC1), B['AIMatch']['t']], '1', '*', label='buyer')
conn([(C-0.9, B['User']['ybot']), (C-0.9, HC2), (L, HC2), B['WantAd']['t']], '1', '*')
conn([(C+0.6, B['User']['ybot']), (C+0.6, HC1), (RCh, HC1),
      (RCh, B['Dispute']['cy']), B['Dispute']['r']], '1', '*', label='reporter')
conn([(C+0.95, B['User']['ybot']), (C+0.95, HC1-0.3), (RCh+0.4, HC1-0.3),
      (RCh+0.4, B['AuditLog']['cy']), B['AuditLog']['l']], '1', '*')
conn([(C+0.45, B['User']['ytop']), (C+0.45, TOP+0.15), (FRCh, TOP+0.15),
      (FRCh, B['Notification']['cy']), B['Notification']['l']], '1', '*')
# Pet associations
conn([B['Pet']['l'], B['AIMatch']['r']], '1', '*')
conn([B['Pet']['r'], B['Offer']['l']], '1', '*')
conn([B['Pet']['b'], B['MessageThread']['t']], '1', '*')
conn([(B['Pet']['cx']+0.5, B['Pet']['ybot']), (B['Pet']['cx']+0.5, HC2),
      (FR, HC2), B['Review']['b']], '1', '*')
# Thread-owned (composition)
conn([B['MessageThread']['r'], B['Message']['l']], '1', '*', 'comp', PURPLE)

# ---- FK note --------------------------------------------------------------
ax.add_patch(Rectangle((2.3, 0.55), 3.8, 1.7, facecolor='#fffbeb',
                       edgecolor='#f59e0b', lw=1.0, zorder=2))
ax.text(4.2, 1.95, 'Note', ha='center', fontsize=7.5, fontweight='bold', color='#b45309', zorder=3)
ax.text(4.2, 1.25, 'Foreign-key attributes (buyerId,\nsellerId, reviewerId, senderId,\n'
        'respondentId) denote further\nassociations to User.',
        ha='center', va='center', fontsize=6.6, color='#92400e', zorder=3)

# ---- legends --------------------------------------------------------------
zones = [
    mpatches.Patch(facecolor=LBLUE, edgecolor=BLUE, label='Identity & Access'),
    mpatches.Patch(facecolor=LGREEN, edgecolor=GREEN, label='Buyer / Trust'),
    mpatches.Patch(facecolor=LORAN, edgecolor=ORANGE, label='Listing & Transactions'),
    mpatches.Patch(facecolor=LPURP, edgecolor=PURPLE, label='Communication'),
    mpatches.Patch(facecolor=LTEAL, edgecolor=TEAL, label='AI Matching'),
    mpatches.Patch(facecolor=LGRAY, edgecolor=GRAYH, label='System / Audit'),
    mpatches.Patch(facecolor=LRED, edgecolor=RED, label='Dispute'),
]
leg = ax.legend(handles=zones, loc='lower center', bbox_to_anchor=(0.5, -0.035),
                ncol=7, fontsize=8.3, frameon=True, columnspacing=1.2, handlelength=1.1)
leg.get_frame().set_edgecolor('#cbd5e1')

# relationship-notation key (bottom-right empty area)
ax.add_patch(Rectangle((19.0, 0.35), 4.7, 1.85, facecolor='white', edgecolor='#cbd5e1', lw=1.0, zorder=1))
ax.text(21.35, 1.95, 'Relationship notation', ha='center', fontsize=7.6,
        fontweight='bold', color=GRAY, zorder=3)
ax.add_patch(plt.Polygon([(19.35, 1.5), (19.57, 1.62), (19.79, 1.5), (19.57, 1.38)],
                         closed=True, fc=GRAY, ec=GRAY, zorder=3))
ax.text(19.95, 1.5, 'composition (whole ◆— part)', fontsize=7.0, va='center', color=GRAY, zorder=3)
ax.plot([19.35, 19.79], [1.05, 1.05], color=LINE, lw=1.3, zorder=3)
ax.text(19.95, 1.05, 'association', fontsize=7.0, va='center', color=GRAY, zorder=3)
ax.text(19.35, 0.62, '1, *, 0..1  =  multiplicity', fontsize=7.0, va='center', color=GRAY, zorder=3)

fig.savefig(f'{OUT}/class diagram new.png', dpi=150, bbox_inches='tight',
            facecolor='white', edgecolor='none')
plt.close(fig)
print('Saved: class diagram new.png')
