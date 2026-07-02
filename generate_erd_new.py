"""Standalone: generate the redesigned ERD -> 'erd diagram new.png'."""
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
SLATE  = '#475569'; LSLATE = '#f1f5f9'
GRAY   = '#374151'; LINE   = '#64748b'
FKC    = '#b45309'

fig, ax = plt.subplots(figsize=(24, 15))
ax.set_xlim(0, 24); ax.set_ylim(-0.4, 16)
ax.axis('off'); fig.patch.set_facecolor('white'); ax.set_facecolor('white')
ax.text(12, 15.5, 'PetMatchAI — Entity Relationship Diagram (ERD)', ha='center',
        fontsize=18, fontweight='bold', color=GRAY)
ax.text(12, 15.05, 'Tables, primary/foreign keys and crow’s-foot relationships',
        ha='center', fontsize=10.5, color='#6b7280', style='italic')

W = 3.9


def entity(cx, ytop, name, fields, ec, fc):
    rh, hh = 0.34, 0.52
    H = hh + len(fields)*rh
    x = cx - W/2; ybot = ytop - H
    ax.add_patch(Rectangle((x, ytop-hh), W, hh, facecolor=ec, edgecolor=ec, zorder=3))
    ax.text(cx, ytop-hh/2, name, ha='center', va='center', fontsize=8.7,
            fontweight='bold', color='white', zorder=4)
    for i, (t, kind) in enumerate(fields):
        ry = ytop - hh - i*rh
        bg = fc if i % 2 == 0 else 'white'
        ax.add_patch(Rectangle((x, ry-rh), W, rh, facecolor=bg, edgecolor=ec, lw=0.6, zorder=3))
        if kind == 'pk':
            ax.text(x+0.14, ry-rh/2, 'PK', va='center', fontsize=6.3, color=ec, fontweight='bold', zorder=4)
            ax.text(x+0.66, ry-rh/2, t, va='center', fontsize=7.0, color=ec, fontweight='bold', zorder=4)
        elif kind == 'fk':
            ax.text(x+0.14, ry-rh/2, 'FK', va='center', fontsize=6.3, color=FKC, fontweight='bold', zorder=4)
            ax.text(x+0.66, ry-rh/2, t, va='center', fontsize=7.0, color=FKC, style='italic', zorder=4)
        else:
            ax.text(x+0.66, ry-rh/2, t, va='center', fontsize=7.0, color=GRAY, zorder=4)
    mid = (ytop+ybot)/2
    return {'cx': cx, 'cy': mid, 'ytop': ytop, 'ybot': ybot,
            't': (cx, ytop), 'b': (cx, ybot), 'l': (x, mid), 'r': (x+W, mid)}


def card(pe, pp, kind, color=LINE):
    pe = np.array(pe, float); pp = np.array(pp, float)
    d = pe - pp; u = d/(np.hypot(*d)+1e-9); n = np.array([-u[1], u[0]])
    if kind == 'many':
        base = pe - u*0.36
        for p in (pe, pe+n*0.18, pe-n*0.18):
            ax.plot([base[0], p[0]], [base[1], p[1]], color=color, lw=1.3, zorder=6)
    else:  # one
        m = pe - u*0.20
        ax.plot([m[0]+n[0]*0.16, m[0]-n[0]*0.16], [m[1]+n[1]*0.16, m[1]-n[1]*0.16],
                color=color, lw=1.5, zorder=6)


def rel(verts, cs='one', ce='many', color=LINE):
    xs = [v[0] for v in verts]; ys = [v[1] for v in verts]
    ax.plot(xs, ys, color=color, lw=1.2, zorder=2, solid_capstyle='round')
    card(verts[0], verts[1], cs, color)
    card(verts[-1], verts[-2], ce, color)


# ---- grid -----------------------------------------------------------------
C1, C2, C3, C4 = 4.3, 10.5, 16.3, 21.5
R1, R2, R3, R4 = 14.2, 10.5, 6.8, 3.0
E = {}

E['buyer_preferences'] = entity(C1, R1, 'buyer_preferences',
    [('id', 'pk'), ('user_id', 'fk'), ('preferred_species[]', 'a'),
     ('budget_min / max', 'a'), ('preferred_gender', 'a')], GREEN, LGREEN)
E['profiles'] = entity(C2, R1, 'profiles',
    [('id', 'pk'), ('name', 'a'), ('email', 'a'),
     ('role  (buyer/seller/admin)', 'a'), ('is_verified', 'a')], BLUE, LBLUE)
E['user_verification_requests'] = entity(C3, R1, 'user_verification_requests',
    [('id', 'pk'), ('user_id', 'fk'), ('id_type', 'a'),
     ('id_image_url', 'a'), ('status', 'a')], BLUE, LBLUE)
E['audit_logs'] = entity(C4, R1, 'audit_logs',
    [('id', 'pk'), ('user_id', 'fk'), ('action', 'a'),
     ('entity_type', 'a'), ('created_at', 'a')], SLATE, LSLATE)

E['ai_matches'] = entity(C1, R2, 'ai_matches',
    [('id', 'pk'), ('buyer_id', 'fk'), ('pet_id', 'fk'),
     ('score', 'a'), ('match_status', 'a')], TEAL, LTEAL)
E['pets'] = entity(C2, R2, 'pets',
    [('id', 'pk'), ('seller_id', 'fk'), ('breed', 'a'),
     ('price', 'a'), ('status', 'a')], ORANGE, LORAN)
E['offers'] = entity(C3, R2, 'offers',
    [('id', 'pk'), ('pet_id', 'fk'), ('buyer_id', 'fk'),
     ('amount', 'a'), ('status', 'a')], ORANGE, LORAN)
E['notifications'] = entity(C4, R2, 'notifications',
    [('id', 'pk'), ('user_id', 'fk'), ('type', 'a'),
     ('message', 'a'), ('is_read', 'a')], SLATE, LSLATE)

E['want_ads'] = entity(C1, R3, 'want_ads',
    [('id', 'pk'), ('buyer_id', 'fk'), ('species', 'a'),
     ('budget_max', 'a'), ('is_active', 'a')], GREEN, LGREEN)
E['message_threads'] = entity(C2, R3, 'message_threads',
    [('id', 'pk'), ('pet_id', 'fk'), ('buyer_id', 'fk'),
     ('seller_id', 'fk'), ('last_message', 'a')], PURPLE, LPURP)
E['messages'] = entity(C3, R3, 'messages',
    [('id', 'pk'), ('thread_id', 'fk'), ('sender_id', 'fk'),
     ('content', 'a'), ('is_read', 'a')], PURPLE, LPURP)
E['reviews'] = entity(C4, R3, 'reviews',
    [('id', 'pk'), ('reviewer_id', 'fk'), ('pet_id', 'fk'),
     ('rating', 'a'), ('is_verified', 'a')], GREEN, LGREEN)

E['saved_pets'] = entity(C1, R4, 'saved_pets',
    [('id', 'pk'), ('user_id', 'fk'), ('pet_id', 'fk')], SLATE, LSLATE)
E['disputes'] = entity(C3, R4, 'disputes',
    [('id', 'pk'), ('reporter_id', 'fk'), ('respondent_id', 'fk'), ('status', 'a')], RED, LRED)

# ---- channels & relationships --------------------------------------------
LCh, RCh, FRCh = 7.4, 13.4, 18.9
HC1, HC2 = 11.2, 7.5
TC = 14.6
P = E['profiles']; PET = E['pets']

# profiles -> identity / 1:1
rel([P['l'], E['buyer_preferences']['r']], 'one', 'one', BLUE)
rel([P['r'], E['user_verification_requests']['l']], 'one', 'one', BLUE)
# profiles -> 1:N
rel([P['t'], (C2, TC), (C4, TC), E['audit_logs']['t']], 'one', 'many')
rel([P['b'], PET['t']], 'one', 'many', ORANGE)
rel([(C2-0.6, P['b'][1]), (C2-0.6, HC1), (C1, HC1), E['ai_matches']['t']], 'one', 'many', TEAL)
rel([(C2-0.95, P['b'][1]), (C2-0.95, HC2), (C1, HC2), E['want_ads']['t']], 'one', 'many', GREEN)
rel([(C2+0.45, P['t'][1]), (C2+0.45, TC-0.15), (FRCh, TC-0.15),
     (FRCh, E['notifications']['cy']), E['notifications']['l']], 'one', 'many')
rel([(C2+0.7, P['b'][1]), (C2+0.7, HC1), (RCh, HC1),
     (RCh, E['disputes']['cy']), E['disputes']['r']], 'one', 'many', RED)
rel([(C2-1.25, P['b'][1]), (C2-1.25, HC2-0.3), (LCh, HC2-0.3),
     (LCh, E['saved_pets']['cy']), E['saved_pets']['l']], 'one', 'many')

# pets -> 1:N
rel([PET['l'], E['ai_matches']['r']], 'one', 'many', TEAL)
rel([PET['r'], E['offers']['l']], 'one', 'many', ORANGE)
rel([PET['b'], E['message_threads']['t']], 'one', 'many', PURPLE)
rel([(PET['cx']+0.5, PET['ybot']), (PET['cx']+0.5, HC2), (FRCh+0.0, HC2),
     (FRCh, E['reviews']['cy']), E['reviews']['r']], 'one', 'many', GREEN)
rel([(PET['cx']-0.5, PET['ybot']), (PET['cx']-0.5, HC2+0.25), (C1+1.7, HC2+0.25),
     (C1+1.7, E['saved_pets']['ytop']+0.0), E['saved_pets']['t']], 'one', 'many', ORANGE)
# message_threads -> messages
rel([E['message_threads']['r'], E['messages']['l']], 'one', 'many', PURPLE)

# ---- FK note --------------------------------------------------------------
ax.add_patch(Rectangle((18.7, 0.35), 4.9, 2.0, facecolor='#fffbeb',
                       edgecolor='#f59e0b', lw=1.0, zorder=2))
ax.text(21.15, 2.05, 'Foreign-key note', ha='center', fontsize=7.8,
        fontweight='bold', color='#b45309', zorder=3)
ax.text(21.15, 1.2, 'Additional FK columns (seller_id, buyer_id,\nreviewer_id, sender_id, respondent_id,\n'
        'resolved_by) all reference profiles.id.',
        ha='center', va='center', fontsize=6.9, color='#92400e', zorder=3)

# ---- legend ---------------------------------------------------------------
lx, ly = 8.3, 1.5
ax.add_patch(Rectangle((7.9, 0.35), 5.7, 1.85, facecolor='white', edgecolor='#cbd5e1', lw=1.0, zorder=7))
ax.text(10.75, 2.0, 'Notation', ha='center', fontsize=8.0, fontweight='bold', color=GRAY, zorder=8)
# "one" marker
ax.plot([lx, lx+0.6], [ly, ly], color=LINE, lw=1.4, zorder=8)
card((lx+0.6, ly), (lx, ly), 'one'); ax.text(lx+0.85, ly, 'exactly one (1)', fontsize=7.2, va='center', color=GRAY, zorder=8)
# "many" marker
ax.plot([lx, lx+0.6], [ly-0.5, ly-0.5], color=LINE, lw=1.4, zorder=8)
card((lx+0.6, ly-0.5), (lx, ly-0.5), 'many'); ax.text(lx+0.85, ly-0.5, 'many (∞)', fontsize=7.2, va='center', color=GRAY, zorder=8)
ax.text(lx+2.9, ly, 'PK  primary key', fontsize=7.2, va='center', color=BLUE, fontweight='bold', zorder=8)
ax.text(lx+2.9, ly-0.5, 'FK  foreign key', fontsize=7.2, va='center', color=FKC, fontweight='bold', zorder=8)

fig.savefig(f'{OUT}/erd diagram new.png', dpi=150, bbox_inches='tight',
            facecolor='white', edgecolor='none')
plt.close(fig)
print('Saved: erd diagram new.png')
