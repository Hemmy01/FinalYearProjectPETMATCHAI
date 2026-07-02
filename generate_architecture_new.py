"""Standalone: generate the redesigned system architecture diagram."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle

OUT = r'C:/Users/PC/petmatchai'

BLUE   = '#1d4ed8'; LBLUE  = '#dbeafe'
GREEN  = '#15803d'; LGREEN = '#dcfce7'
PURPLE = '#7e22ce'; LPURP  = '#f3e8ff'
ORANGE = '#c2410c'; LORAN  = '#ffedd5'
TEAL   = '#0f766e'; LTEAL  = '#ccfbf1'
RED    = '#b91c1c'; LRED   = '#fee2e2'
SLATE  = '#475569'; LSLATE = '#f1f5f9'
GRAY   = '#374151'

fig, ax = plt.subplots(figsize=(18, 13))
ax.set_xlim(0, 18); ax.set_ylim(0, 13)
ax.axis('off'); fig.patch.set_facecolor('white'); ax.set_facecolor('white')
ax.text(9, 12.55, 'PetMatchAI — System Architecture', ha='center',
        fontsize=17, fontweight='bold', color=GRAY)
ax.text(9, 12.12, 'Layered architecture: client, presentation, application, data and external services',
        ha='center', fontsize=10, color='#6b7280', style='italic')


def layer(y0, y1, name, ec, fc, x1=17.5):
    ax.add_patch(FancyBboxPatch((1.55, y0), x1-1.55, y1-y0, boxstyle='round,pad=0.02',
                                facecolor=fc, edgecolor='none', alpha=0.30, zorder=0))
    ax.add_patch(FancyBboxPatch((0.35, y0), 1.05, y1-y0, boxstyle='round,pad=0.02',
                                facecolor=ec, edgecolor=ec, zorder=1))
    ax.text(0.87, (y0+y1)/2, name, ha='center', va='center', rotation=90,
            fontsize=8.7, fontweight='bold', color='white', zorder=2)


def box(cx, cy, w, h, title, sub, ec, fc):
    ax.add_patch(FancyBboxPatch((cx-w/2, cy-h/2), w, h, boxstyle='round,pad=0.03,rounding_size=0.10',
                                facecolor=fc, edgecolor=ec, linewidth=1.6, zorder=3))
    ax.text(cx, cy+0.16, title, ha='center', va='center', fontsize=8.3,
            fontweight='bold', color=ec, zorder=4)
    ax.text(cx, cy-0.20, sub, ha='center', va='center', fontsize=6.8,
            color='#64748b', style='italic', zorder=4)


def flow(x, ytop, ybot, label=''):
    ax.annotate('', xy=(x, ybot), xytext=(x, ytop),
                arrowprops=dict(arrowstyle='<|-|>', mutation_scale=13, color=SLATE, lw=1.5), zorder=2)
    if label:
        ax.text(x+0.12, (ytop+ybot)/2, label, fontsize=6.6, color='#64748b',
                ha='left', va='center', style='italic', zorder=2)


# ---- layer bands ----------------------------------------------------------
layer(10.7, 11.85, 'CLIENT', GREEN, LGREEN, x1=17.5)
layer(8.95, 10.25, 'PRESENTATION', BLUE, LBLUE, x1=13.9)
layer(5.85, 8.45, 'APPLICATION', PURPLE, LPURP, x1=13.9)
layer(3.55, 5.35, 'DATA', TEAL, LTEAL, x1=13.9)
layer(1.15, 2.95, 'EXTERNAL', SLATE, LSLATE, x1=17.5)

# ---- security cross-cutting band -----------------------------------------
ax.add_patch(FancyBboxPatch((14.1, 3.55), 3.4, 6.7, boxstyle='round,pad=0.02',
                            facecolor=LRED, edgecolor=RED, alpha=0.9, linewidth=1.6, zorder=1))
ax.text(15.8, 9.95, 'SECURITY & GOVERNANCE', ha='center', fontsize=8.6,
        fontweight='bold', color=RED, zorder=3)
sec_items = ['JWT Authentication', 'Row-Level Security (RLS)', 'RBAC — buyer / seller / admin',
             'Identity Verification (KYC)', 'Audit Logging', 'Session & Lockout Control']
for i, s in enumerate(sec_items):
    yy = 9.45 - i*0.95
    ax.add_patch(FancyBboxPatch((14.35, yy-0.33), 2.9, 0.62, boxstyle='round,pad=0.02,rounding_size=0.08',
                                facecolor='white', edgecolor=RED, linewidth=1.2, zorder=3))
    ax.text(15.8, yy, s, ha='center', va='center', fontsize=7.0, color=RED, fontweight='bold', zorder=4)

# ---- CLIENT ---------------------------------------------------------------
box(4.6, 11.28, 3.3, 0.92, 'Web / Desktop Browser', 'Chrome · Safari · Edge', GREEN, LGREEN)
box(9.0, 11.28, 3.3, 0.92, 'Mobile Browser (PWA)', 'Responsive · Installable', GREEN, LGREEN)
box(13.7, 11.28, 3.3, 0.92, 'Service Worker', 'Web Push · Offline cache', GREEN, LGREEN)

# ---- PRESENTATION ---------------------------------------------------------
box(3.55, 9.60, 3.4, 0.95, 'Next.js 16 App Router', 'RSC · SSR · Routing', BLUE, LBLUE)
box(7.70, 9.60, 3.4, 0.95, 'React UI Components', 'Tailwind CSS · Lucide', BLUE, LBLUE)
box(11.85, 9.60, 3.4, 0.95, 'Client Auth Context', 'Supabase JS SDK', BLUE, LBLUE)

# ---- APPLICATION (two rows; AI highlighted) -------------------------------
box(3.55, 7.65, 3.4, 0.95, 'Listings & Search API', '/api/pets · /api/geocode', PURPLE, LPURP)
box(7.70, 7.65, 3.4, 0.95, 'Auth & KYC API', '/api/auth · /api/verify', PURPLE, LPURP)
box(11.85, 7.65, 3.4, 0.95, 'Messaging & Realtime', '/api/messages · threads', PURPLE, LPURP)
box(3.55, 6.45, 3.4, 0.95, 'AI Matchmaking Service', '/api/matches · recommendations', ORANGE, LORAN)
box(7.70, 6.45, 3.4, 0.95, 'Notifications Service', 'Email · SMS · Web Push', PURPLE, LPURP)
box(11.85, 6.45, 3.4, 0.95, 'Analytics & Cron Jobs', '/api/analytics · weekly report', PURPLE, LPURP)

# ---- DATA -----------------------------------------------------------------
box(3.25, 4.45, 2.9, 0.95, 'PostgreSQL', '18 tables · RLS policies', TEAL, LTEAL)
box(6.45, 4.45, 2.9, 0.95, 'Supabase Auth', 'JWT · OAuth · OTP', TEAL, LTEAL)
box(9.65, 4.45, 2.9, 0.95, 'Realtime Engine', 'WebSocket subscriptions', TEAL, LTEAL)
box(12.55, 4.45, 2.6, 0.95, 'Storage Buckets', 'Images · IDs · video', TEAL, LTEAL)

# ---- EXTERNAL -------------------------------------------------------------
ext = [(3.0, 'Groq LLM API', 'llama-3.3-70b'), (5.55, 'Brevo SMTP', 'Email delivery'),
       (8.05, 'Termii', 'SMS (Nigeria)'), (10.55, 'Google OAuth', 'Social login'),
       (13.05, 'Jitsi Meet', 'Video calls'), (15.75, 'Nominatim', 'Geocoding')]
for cx, t, s in ext:
    box(cx, 2.05, 2.4, 0.92, t, s, SLATE, LSLATE)

# ---- inter-layer flows ----------------------------------------------------
flow(4.6, 10.70, 10.27, 'HTTPS')
flow(11.85, 10.70, 10.27)
flow(3.55, 8.93, 8.47, 'API call')
flow(7.70, 8.93, 8.47)
flow(11.85, 8.93, 8.47)
flow(3.55, 5.83, 5.37, 'SQL · SDK')
flow(7.70, 5.83, 5.37)
flow(11.85, 5.83, 5.37)
# data / app  <-> external
flow(3.0, 3.53, 2.53, 'LLM')
flow(6.45, 3.53, 2.53, 'mail/SMS')
flow(8.05, 3.53, 2.53)
flow(10.55, 3.53, 2.53, 'OAuth')
flow(12.55, 3.53, 2.53)

fig.savefig(f'{OUT}/architecture diagram new.png', dpi=150, bbox_inches='tight',
            facecolor='white', edgecolor='none')
plt.close(fig)
print('Saved: architecture diagram new.png')
