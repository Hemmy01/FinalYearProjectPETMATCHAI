"""Standalone: generate the redesigned use case diagram -> 'use case new.png'."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

OUT = r'C:/Users/PC/petmatchai'

BLUE   = '#1e40af'; LBLUE  = '#dbeafe'
GREEN  = '#15803d'; LGREEN = '#dcfce7'
PURPLE = '#7e22ce'; LPURP  = '#f3e8ff'
ORANGE = '#c2410c'; LORAN  = '#ffedd5'
GRAY   = '#374151'
WHITE  = '#ffffff'


def fig_use_case():
    fig, ax = plt.subplots(figsize=(18, 13))
    ax.set_xlim(0, 18); ax.set_ylim(0, 13)
    ax.axis('off'); ax.set_facecolor(WHITE); fig.patch.set_facecolor(WHITE)
    ax.text(9, 12.6, 'PetMatchAI — Use Case Diagram', ha='center',
            fontsize=16, fontweight='bold', color=GRAY)
    ax.text(9, 12.12, 'Actors, system boundary, and role-based use cases',
            ha='center', fontsize=10, color='#6b7280', style='italic')

    def actor(x, y, name, color):
        """Stick-figure actor centred on (x, y)."""
        ax.add_patch(plt.Circle((x, y+0.42), 0.16, fill=False, ec=color, lw=2.2, zorder=4))
        ax.plot([x, x], [y+0.26, y-0.12], color=color, lw=2.2, zorder=4)            # torso
        ax.plot([x-0.28, x+0.28], [y+0.12, y+0.12], color=color, lw=2.2, zorder=4)  # arms
        ax.plot([x, x-0.24], [y-0.12, y-0.5], color=color, lw=2.2, zorder=4)        # left leg
        ax.plot([x, x+0.24], [y-0.12, y-0.5], color=color, lw=2.2, zorder=4)        # right leg
        ax.text(x, y-0.72, name, ha='center', va='top', fontsize=10,
                fontweight='bold', color=color)

    def uc(x, y, label, fc, ec):
        ax.add_patch(mpatches.Ellipse((x, y), 2.55, 0.82, facecolor=fc,
                                      edgecolor=ec, linewidth=1.4, zorder=3))
        ax.text(x, y, label, ha='center', va='center', fontsize=7.6,
                color=ec, fontweight='bold', zorder=4)

    def link(x1, y1, cx, cy, color):
        """Association line from an actor to the left edge of a use-case ellipse."""
        ax.annotate('', xy=(cx-1.27, cy), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='-', color=color, lw=1.0, alpha=0.5,
                                    connectionstyle='arc3,rad=0.04'), zorder=1)

    # ---- System boundary -------------------------------------------------
    ax.add_patch(FancyBboxPatch((3.6, 2.0), 11.7, 9.9, boxstyle='round,pad=0.1',
                                facecolor='#fcfcfd', edgecolor='#cbd5e1',
                                linewidth=2, zorder=0))
    ax.text(9.45, 11.66, 'PetMatchAI System', ha='center', fontsize=11,
            color='#64748b', style='italic')

    # ---- Functional bands (translucent backgrounds + side tabs) ----------
    bands = [
        ('ALL USERS',      10.55, 11.35, LBLUE,  BLUE),
        ('BUYER',           7.95, 10.35, LGREEN, GREEN),
        ('SELLER',          5.20,  7.60, LORAN,  ORANGE),
        ('ADMINISTRATOR',   2.45,  4.85, LPURP,  PURPLE),
    ]
    for name, y0, y1, fc, ec in bands:
        ax.add_patch(FancyBboxPatch((3.85, y0), 11.2, y1-y0, boxstyle='round,pad=0.02',
                                    facecolor=fc, edgecolor='none', alpha=0.35, zorder=0))
        ax.text(3.78, (y0+y1)/2, name, ha='center', va='center', rotation=90,
                fontsize=8.5, fontweight='bold', color=ec)

    # ---- Actors (generalisation: Buyer/Seller/Admin -> User) -------------
    actor(1.5, 10.95, 'User',  GRAY)
    actor(1.5,  9.10, 'Buyer', GREEN)
    actor(1.5,  6.35, 'Seller', ORANGE)
    actor(1.5,  3.60, 'Admin', PURPLE)

    gx = 0.62
    ax.plot([gx, gx], [3.60, 10.55], color='#94a3b8', lw=1.3, zorder=1)
    for ay in (9.10, 6.35, 3.60):
        ax.plot([gx, 1.22], [ay, ay], color='#94a3b8', lw=1.3, zorder=1)
    ax.annotate('', xy=(1.30, 10.86), xytext=(gx, 10.55),
                arrowprops=dict(arrowstyle='-|>', mutation_scale=20, fc='white',
                                ec='#94a3b8', lw=1.3), zorder=2)
    ax.text(gx-0.05, 7.6, 'generalises', rotation=90, ha='center', va='center',
            fontsize=7, color='#94a3b8', style='italic')

    COLX = [5.4, 8.2, 11.0, 13.8]

    # ---- Shared use cases (User) -----------------------------------------
    shared = [(COLX[0], 'Register /\nLogin'), (COLX[1], 'Manage\nProfile'),
              (COLX[2], 'Receive\nNotifications')]
    for x, l in shared:
        uc(x, 10.95, l, LBLUE, BLUE)
        link(1.82, 10.95, x, 10.95, BLUE)

    # ---- Buyer use cases -------------------------------------------------
    buyer = [
        (COLX[0], 9.70, 'Set Pet\nPreferences'), (COLX[1], 9.70, 'Browse &\nSearch Listings'),
        (COLX[2], 9.70, 'View AI\nRecommendations'), (COLX[3], 9.70, 'Save &\nCompare Pets'),
        (COLX[0], 8.50, 'Message\nSeller'), (COLX[1], 8.50, 'Make /\nCounter Offer'),
        (COLX[2], 8.50, 'Leave Review\n& Rating'), (COLX[3], 8.50, 'File\nDispute'),
    ]
    for x, y, l in buyer:
        uc(x, y, l, LGREEN, GREEN)
        link(1.82, 9.10, x, y, GREEN)

    # ---- Seller use cases ------------------------------------------------
    seller = [
        (COLX[0], 6.95, 'Create Pet\nListing'), (COLX[1], 6.95, 'Manage\nListings'),
        (COLX[2], 6.95, 'Verify Identity\n(KYC)'), (COLX[3], 6.95, 'Respond to\nInquiries'),
        (COLX[0], 5.75, 'Manage\nOffers'), (COLX[1], 5.75, 'View Listing\nAnalytics'),
        (COLX[2], 5.75, 'View Buyer\nWant-Ads'),
    ]
    for x, y, l in seller:
        uc(x, y, l, LORAN, ORANGE)
        link(1.82, 6.35, x, y, ORANGE)

    # ---- Admin use cases -------------------------------------------------
    admin = [
        (COLX[0], 4.20, 'Manage Users\n& Roles'), (COLX[1], 4.20, 'Approve KYC\nVerifications'),
        (COLX[2], 4.20, 'Moderate\nContent'), (COLX[3], 4.20, 'Resolve\nDisputes'),
        (COLX[0], 3.00, 'Broadcast\nAnnouncements'), (COLX[1], 3.00, 'View Platform\nAnalytics'),
        (COLX[2], 3.00, 'Access\nAudit Logs'),
    ]
    for x, y, l in admin:
        uc(x, y, l, LPURP, PURPLE)
        link(1.82, 3.60, x, y, PURPLE)

    # ---- Sample «include» relationship -----------------------------------
    ax.annotate('', xy=(COLX[0]+1.30, 8.50), xytext=(COLX[1]-1.30, 8.50),
                arrowprops=dict(arrowstyle='-|>', mutation_scale=14, color='#475569',
                                lw=1.1, linestyle='--'), zorder=2)
    ax.text((COLX[0]+COLX[1])/2, 8.74, '«include»', ha='center', va='bottom',
            fontsize=6.8, color='#475569', style='italic')

    # ---- Legend ----------------------------------------------------------
    handles = [
        mpatches.Patch(facecolor=LBLUE, edgecolor=BLUE, label='Shared use cases (all users)'),
        mpatches.Patch(facecolor=LGREEN, edgecolor=GREEN, label='Buyer use cases'),
        mpatches.Patch(facecolor=LORAN, edgecolor=ORANGE, label='Seller use cases'),
        mpatches.Patch(facecolor=LPURP, edgecolor=PURPLE, label='Admin use cases'),
    ]
    leg = ax.legend(handles=handles, loc='lower center', bbox_to_anchor=(0.5, 0.0),
                    ncol=4, fontsize=8.5, frameon=True, borderpad=0.8,
                    columnspacing=1.4, handlelength=1.2)
    leg.get_frame().set_edgecolor('#cbd5e1')
    ax.text(9, 0.95, '——  association        ▷ generalisation        ⇢ «include» dependency',
            ha='center', fontsize=8, color='#475569')

    fig.savefig(f'{OUT}/use case new.png', dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)
    print('Saved: use case new.png')


fig_use_case()
