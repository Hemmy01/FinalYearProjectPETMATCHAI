"""Generate all thesis diagram images using matplotlib."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe
import numpy as np
import os

OUT = r'C:/Users/PC/petmatchai/thesis_images'
os.makedirs(OUT, exist_ok=True)

BLUE   = '#1e40af'
LBLUE  = '#dbeafe'
GREEN  = '#15803d'
LGREEN = '#dcfce7'
PURPLE = '#7e22ce'
LPURP  = '#f3e8ff'
ORANGE = '#c2410c'
LORAN  = '#ffedd5'
GRAY   = '#374151'
LGRAY  = '#f3f4f6'
RED    = '#b91c1c'
LRED   = '#fee2e2'
TEAL   = '#0f766e'
LTEAL  = '#ccfbf1'
WHITE  = '#ffffff'

def save(fig, name):
    fig.savefig(f'{OUT}/{name}', dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)
    print(f'✓ {name}')


# ══════════════════════════════════════════════════════════════════
# FIGURE 1 — SYSTEM ARCHITECTURE DIAGRAM
# ══════════════════════════════════════════════════════════════════
def fig_architecture():
    fig, ax = plt.subplots(figsize=(16, 11))
    ax.set_xlim(0, 16); ax.set_ylim(0, 11)
    ax.axis('off')
    ax.set_facecolor(WHITE)
    fig.patch.set_facecolor(WHITE)

    title = ax.text(8, 10.5, 'PetMatchAI — System Architecture Diagram',
                    ha='center', va='center', fontsize=14, fontweight='bold', color=GRAY)

    def box(x, y, w, h, label, sublabel='', fc=LBLUE, ec=BLUE, fs=10):
        rect = FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.08',
                               facecolor=fc, edgecolor=ec, linewidth=1.5)
        ax.add_patch(rect)
        ax.text(x+w/2, y+h/2+(0.15 if sublabel else 0), label,
                ha='center', va='center', fontsize=fs, fontweight='bold', color=ec)
        if sublabel:
            ax.text(x+w/2, y+h/2-0.22, sublabel, ha='center', va='center',
                    fontsize=7.5, color=GRAY, style='italic')

    def arr(x1,y1,x2,y2,label=''):
        ax.annotate('', xy=(x2,y2), xytext=(x1,y1),
                    arrowprops=dict(arrowstyle='->', color=GRAY, lw=1.5))
        if label:
            mx,my = (x1+x2)/2,(y1+y2)/2
            ax.text(mx+0.1, my+0.05, label, fontsize=7.5, color=GRAY)

    # Layer labels
    for lbl, y in [('CLIENT LAYER', 9.2), ('PRESENTATION LAYER (Vercel / Next.js 16)', 7.6),
                   ('APPLICATION LAYER (API Routes + AI)', 5.6),
                   ('DATA LAYER (Supabase Cloud)', 3.4), ('EXTERNAL SERVICES', 1.4)]:
        ax.text(0.2, y, lbl, fontsize=8, fontweight='bold', color=WHITE,
                bbox=dict(fc=GRAY, ec=GRAY, pad=3, boxstyle='round,pad=0.2'))

    # Client
    box(2,  8.6, 3, 0.8, 'Web Browser', 'Chrome / Safari / Firefox', fc=LGREEN, ec=GREEN)
    box(6,  8.6, 3, 0.8, 'Mobile Browser', 'Responsive PWA', fc=LGREEN, ec=GREEN)
    box(10, 8.6, 3, 0.8, 'Desktop App', 'Claude Code / VSCode', fc=LGREEN, ec=GREEN)

    # Presentation
    box(1.5, 6.9, 3.5, 1.0, 'Next.js 16 Pages', 'App Router / RSC / Suspense', fc=LBLUE, ec=BLUE)
    box(5.5, 6.9, 3.5, 1.0, 'React Components', 'Tailwind CSS / Lucide', fc=LBLUE, ec=BLUE)
    box(9.5, 6.9, 3.5, 1.0, 'Auth Context', 'Supabase Client SDK', fc=LBLUE, ec=BLUE)

    # Application
    box(0.5, 4.8, 2.2, 1.1, 'API Routes', '/api/pets\n/api/matches', fc=LPURP, ec=PURPLE)
    box(3.0, 4.8, 2.2, 1.1, 'Auth API', '/api/auth\n/api/verify', fc=LPURP, ec=PURPLE)
    box(5.5, 4.8, 2.2, 1.1, 'Groq AI', 'Match Scoring\nSummary Gen', fc=LORAN, ec=ORANGE)
    box(8.0, 4.8, 2.2, 1.1, 'Cron Jobs', 'Weekly Report\nScheduled Tasks', fc=LPURP, ec=PURPLE)
    box(10.5,4.8, 2.2, 1.1, 'Push / SMS', 'VAPID / Termii\nBrevo Email', fc=LPURP, ec=PURPLE)
    box(13.0,4.8, 2.2, 1.1, 'Storage API', '/api/upload\nSupabase Bucket', fc=LPURP, ec=PURPLE)

    # Data
    box(1,  2.6, 3,  1.1, 'PostgreSQL', 'Supabase DB\n18 Tables / RLS', fc=LTEAL, ec=TEAL)
    box(4.5,2.6, 3,  1.1, 'Supabase Auth', 'JWT / OAuth\nEmail OTP', fc=LTEAL, ec=TEAL)
    box(8,  2.6, 3,  1.1, 'Realtime', 'WebSocket Subs\nLive Chat & Notif', fc=LTEAL, ec=TEAL)
    box(11.5,2.6,3,  1.1, 'Storage Bucket', 'Pet Images\nID Docs / Videos', fc=LTEAL, ec=TEAL)

    # External
    box(0.5, 0.6, 2.2, 1.0, 'Groq API', 'llama-3.3-70b', fc=LORAN, ec=ORANGE)
    box(3.0, 0.6, 2.2, 1.0, 'Brevo SMTP', 'Email Service', fc=LORAN, ec=ORANGE)
    box(5.5, 0.6, 2.2, 1.0, 'Termii SMS', 'Nigerian SMS', fc=LORAN, ec=ORANGE)
    box(8.0, 0.6, 2.2, 1.0, 'Google OAuth', 'Social Login', fc=LORAN, ec=ORANGE)
    box(10.5,0.6, 2.2, 1.0, 'Jitsi Meet', 'Video Calls', fc=LORAN, ec=ORANGE)
    box(13.0,0.6, 2.2, 1.0, 'Nominatim', 'Geocoding API', fc=LORAN, ec=ORANGE)

    # Arrows
    for x in [3.5, 7.5, 11.5]:
        arr(x, 8.6, x, 7.9)
    for x in [2.75, 6.75, 10.75]:
        arr(x, 6.9, x, 5.9)
    for x in [1.6, 4.1, 6.6, 9.1, 11.6, 14.1]:
        arr(x, 4.8, x, 3.7)
    for x in [1.6, 4.1, 6.6, 9.1, 11.6, 14.1]:
        arr(x, 2.6, x, 1.6)

    fig.tight_layout()
    save(fig, 'fig01_system_architecture.png')


# ══════════════════════════════════════════════════════════════════
# FIGURE 2 — ENTITY RELATIONSHIP DIAGRAM
# ══════════════════════════════════════════════════════════════════
def fig_erd():
    fig, ax = plt.subplots(figsize=(20, 15))
    ax.set_xlim(0, 20); ax.set_ylim(0, 15)
    ax.axis('off')
    ax.set_facecolor(WHITE)
    fig.patch.set_facecolor(WHITE)
    ax.text(10, 14.5, 'PetMatchAI — Entity Relationship Diagram (ERD)',
            ha='center', fontsize=14, fontweight='bold', color=GRAY)

    def entity(ax, x, y, name, fields, fc=LBLUE, ec=BLUE, w=3.2, row_h=0.38):
        h = (len(fields)+1) * row_h
        # header
        ax.add_patch(FancyBboxPatch((x,y), w, row_h, boxstyle='square',
                                     facecolor=ec, edgecolor=ec))
        ax.text(x+w/2, y+row_h/2, name, ha='center', va='center',
                fontsize=9, fontweight='bold', color='white')
        # rows
        for i,f in enumerate(fields):
            bg = fc if i%2==0 else WHITE
            ax.add_patch(FancyBboxPatch((x, y-(i+1)*row_h), w, row_h,
                                         boxstyle='square', facecolor=bg, edgecolor=ec, linewidth=0.5))
            ax.text(x+0.12, y-(i+0.5)*row_h, f, va='center', fontsize=7.5, color=GRAY)
        return x+w/2, y+row_h/2, x+w/2, y-(len(fields))*row_h/2

    def rel(ax, x1,y1,x2,y2, label=''):
        ax.annotate('', xy=(x2,y2), xytext=(x1,y1),
                    arrowprops=dict(arrowstyle='->', color='#9ca3af', lw=1.2,
                                    connectionstyle='arc3,rad=0.0'))
        if label:
            ax.text((x1+x2)/2+0.05,(y1+y2)/2+0.05,label,fontsize=7,color=GRAY)

    # profiles — centre
    entity(ax, 8.2, 13.0, 'profiles (users)',
           ['🔑 id UUID PK','name TEXT','email TEXT',
            'role TEXT (buyer/seller/admin)','phone TEXT','location TEXT',
            'avatar_url TEXT','is_verified BOOLEAN'],
           fc=LBLUE, ec=BLUE)

    # buyer_preferences — left
    entity(ax, 0.3, 13.0, 'buyer_preferences',
           ['🔑 id UUID PK','🔗 user_id UUID FK→profiles',
            'preferred_species TEXT[]','preferred_breeds TEXT[]',
            'age_min / age_max INT','budget_min / budget_max NUMERIC',
            'preferred_location TEXT','preferred_gender TEXT',
            'purpose TEXT','health_requirements TEXT[]'],
           fc=LGREEN, ec=GREEN)
    rel(ax,3.5,12.2,8.2,12.2,'1:1')

    # pets — right
    entity(ax, 13.0, 13.0, 'pets',
           ['🔑 id UUID PK','🔗 seller_id UUID FK→profiles',
            'name TEXT','species TEXT','breed TEXT',
            'age_months INT','gender TEXT','color TEXT',
            'price NUMERIC','location TEXT','status TEXT',
            'vaccinated/dewormed/microchipped BOOL',
            'image_url TEXT','traits TEXT[]','views INT'],
           fc=LORAN, ec=ORANGE)
    rel(ax,11.4,12.2,13.0,12.2,'1:N')

    # saved_pets
    entity(ax, 13.0, 8.8, 'saved_pets',
           ['🔑 id UUID PK','🔗 user_id FK→profiles',
            '🔗 pet_id FK→pets','created_at TIMESTAMPTZ'],
           fc=LGRAY, ec=GRAY)
    rel(ax,14.6,13.0,14.6,10.5,'N:M')

    # message_threads
    entity(ax, 0.3, 8.5, 'message_threads',
           ['🔑 id UUID PK','🔗 pet_id FK→pets',
            '🔗 buyer_id FK→profiles','🔗 seller_id FK→profiles',
            'last_message TEXT','buyer_unread INT','seller_unread INT'],
           fc=LPURP, ec=PURPLE)
    rel(ax,2.0,12.0,2.0,10.4,'1:N')

    # messages
    entity(ax, 0.3, 5.8, 'messages',
           ['🔑 id UUID PK','🔗 thread_id FK→message_threads',
            '🔗 sender_id FK→profiles',
            'content TEXT','is_read BOOLEAN','created_at TIMESTAMPTZ'],
           fc=LPURP, ec=PURPLE)
    rel(ax,2.0,8.5,2.0,8.0,'1:N')

    # offers
    entity(ax, 4.5, 8.5, 'offers',
           ['🔑 id UUID PK','🔗 pet_id FK→pets',
            '🔗 buyer_id FK→profiles','🔗 seller_id FK→profiles',
            'amount NUMERIC','status TEXT','counter_amount NUMERIC',
            'note TEXT'],
           fc=LORAN, ec=ORANGE)
    rel(ax,6.5,13.0,6.5,11.2,'1:N')

    # reviews
    entity(ax, 4.5, 5.0, 'reviews',
           ['🔑 id UUID PK','🔗 reviewer_id FK→profiles',
            '🔗 seller_id FK→profiles','🔗 pet_id FK→pets',
            'rating INT (1-5)','communication_rating INT',
            'accuracy_rating INT','health_rating INT',
            'comment TEXT','is_verified BOOLEAN','photo_urls TEXT[]'],
           fc=LGREEN, ec=GREEN)
    rel(ax,6.1,8.5,6.1,7.3,'1:N')

    # ai_matches
    entity(ax, 8.5, 8.5, 'ai_matches',
           ['🔑 id UUID PK','🔗 buyer_id FK→profiles',
            '🔗 pet_id FK→pets','score INT (0-100)',
            'reasons TEXT[]','feedback TEXT','match_status TEXT'],
           fc=LTEAL, ec=TEAL)
    rel(ax,10.0,13.0,10.0,11.0,'1:N')

    # notifications
    entity(ax, 8.5, 5.2, 'notifications',
           ['🔑 id UUID PK','🔗 user_id FK→profiles',
            'type TEXT','title TEXT','message TEXT',
            'data JSONB','is_read BOOLEAN'],
           fc=LGRAY, ec=GRAY)
    rel(ax,10.0,8.5,10.0,7.1,'1:N')

    # disputes
    entity(ax, 13.0, 5.8, 'disputes',
           ['🔑 id UUID PK','🔗 reporter_id FK→profiles',
            '🔗 respondent_id FK→profiles','subject TEXT',
            'description TEXT','status TEXT',
            'resolution TEXT','resolved_by FK→profiles'],
           fc=LRED, ec=RED)
    rel(ax,14.6,8.8,14.6,8.2,'1:N')

    # user_verification_requests
    entity(ax, 13.0, 2.8, 'user_verification_requests',
           ['🔑 id UUID PK','🔗 user_id FK→profiles UNIQUE',
            'id_type TEXT','id_image_url TEXT',
            'selfie_url TEXT','status TEXT',
            'admin_note TEXT','reviewed_at TIMESTAMPTZ'],
           fc=LRED, ec=RED)
    rel(ax,14.6,5.8,14.6,5.3,'1:1')

    # audit_logs
    entity(ax, 0.3, 2.5, 'audit_logs',
           ['🔑 id UUID PK','🔗 user_id FK→profiles',
            'action TEXT','entity_type TEXT',
            'entity_id UUID','details JSONB','created_at TIMESTAMPTZ'],
           fc=LGRAY, ec=GRAY)
    rel(ax,2.0,5.8,2.0,5.2,'1:N')

    # want_ads
    entity(ax, 4.5, 2.5, 'want_ads',
           ['🔑 id UUID PK','🔗 buyer_id FK→profiles',
            'species TEXT','breed TEXT',
            'budget_min / budget_max NUMERIC',
            'location TEXT','description TEXT','is_active BOOLEAN'],
           fc=LGREEN, ec=GREEN)
    rel(ax,6.1,5.0,6.1,4.2,'1:N')

    save(fig, 'fig02_erd.png')


# ══════════════════════════════════════════════════════════════════
# FIGURE 3 — USE CASE DIAGRAM
# ══════════════════════════════════════════════════════════════════
def fig_use_case():
    fig, ax = plt.subplots(figsize=(18, 14))
    ax.set_xlim(0, 18); ax.set_ylim(0, 14)
    ax.axis('off'); ax.set_facecolor(WHITE); fig.patch.set_facecolor(WHITE)
    ax.text(9,13.5,'PetMatchAI — Use Case Diagram',ha='center',fontsize=14,fontweight='bold',color=GRAY)

    def actor(x,y,name,color=BLUE):
        # stick figure
        ax.plot(x, y+1.1, 'o', ms=16, color=color, zorder=3)
        ax.plot([x,x],[y+0.85,y+0.25], lw=2, color=color)
        ax.plot([x-0.35,x+0.35],[y+0.65,y+0.65], lw=2, color=color)
        ax.plot([x,x-0.3],[y+0.25,y-0.1], lw=2, color=color)
        ax.plot([x,x+0.3],[y+0.25,y-0.1], lw=2, color=color)
        ax.text(x, y-0.3, name, ha='center', va='top', fontsize=9, fontweight='bold', color=color)

    def uc(x,y,label,fc=LBLUE,ec=BLUE):
        ellipse = mpatches.Ellipse((x,y),3.2,0.72,facecolor=fc,edgecolor=ec,linewidth=1.3)
        ax.add_patch(ellipse)
        ax.text(x,y,label,ha='center',va='center',fontsize=7.8,color=ec,fontweight='bold')

    def link(ax,x1,y1,x2,y2):
        ax.plot([x1,x2],[y1,y2],'-',color='#9ca3af',lw=1.0,zorder=1)

    # System boundary
    ax.add_patch(FancyBboxPatch((3,0.5),12,12.5,boxstyle='round,pad=0.1',
                                 facecolor='#fafafa',edgecolor='#d1d5db',linewidth=2,zorder=0))
    ax.text(9,12.7,'PetMatchAI System',ha='center',fontsize=10,color=GRAY,style='italic')

    # Actors
    actor(1.0, 9.5, 'Buyer', color=GREEN)
    actor(1.0, 5.0, 'Seller', color=ORANGE)
    actor(17.0, 7.5, 'Admin', color=PURPLE)

    # Buyer use cases
    buyer_ucs = [
        (6.5,11.8,'Register / Login'), (6.5,10.8,'Manage Profile'),
        (6.5,9.8,'Browse Listings'), (6.5,8.8,'Search & Filter Pets'),
        (6.5,7.8,'View AI Recommendations'),(6.5,6.8,'Save Listing'),
        (6.5,5.8,'Send Message to Seller'),(6.5,4.8,'Make / Counter Offer'),
        (6.5,3.8,'Leave Review'),(6.5,2.8,'File Dispute'),
        (6.5,1.8,'Manage Preferences'),
    ]
    for x,y,l in buyer_ucs:
        uc(x,y,l,fc=LGREEN,ec=GREEN)
        link(ax,1.7,10.5,x-1.6,y)

    # Seller use cases
    seller_ucs = [
        (9.5,11.4,'Create Pet Listing'),(9.5,10.4,'Edit / Delete Listing'),
        (9.5,9.4,'Manage Listing Status'),(9.5,8.4,'Respond to Messages'),
        (9.5,7.4,'Accept / Reject Offer'),(9.5,6.4,'View Listing Analytics'),
        (9.5,5.4,'Verify Identity (KYC)'),(9.5,4.4,'View Seller Dashboard'),
        (9.5,3.4,'Receive Notifications'),(9.5,2.4,'View Buyer Want-Ads'),
    ]
    for x,y,l in seller_ucs:
        uc(x,y,l,fc=LORAN,ec=ORANGE)
        link(ax,1.7,6.0,x-1.6,y)

    # Admin use cases
    admin_ucs = [
        (13.5,11.4,'Manage Users'),(13.5,10.4,'Approve Verifications'),
        (13.5,9.4,'Moderate Listings'),(13.5,8.4,'Resolve Disputes'),
        (13.5,7.4,'View Audit Logs'),(13.5,6.4,'Broadcast Announcement'),
        (13.5,5.4,'View Platform Analytics'),(13.5,4.4,'Manage Categories'),
        (13.5,3.4,'Change User Roles'),(13.5,2.4,'Review Reported Content'),
    ]
    for x,y,l in admin_ucs:
        uc(x,y,l,fc=LPURP,ec=PURPLE)
        link(ax,16.3,8.5,x+1.6,y)

    # Legend
    ax.legend(handles=[
        mpatches.FancyBboxPatch((0,0),1,1,facecolor=LGREEN,edgecolor=GREEN,label='Buyer Use Cases'),
        mpatches.FancyBboxPatch((0,0),1,1,facecolor=LORAN,edgecolor=ORANGE,label='Seller Use Cases'),
        mpatches.FancyBboxPatch((0,0),1,1,facecolor=LPURP,edgecolor=PURPLE,label='Admin Use Cases'),
    ], loc='lower right', fontsize=8)

    save(fig,'fig03_use_case.png')


# ══════════════════════════════════════════════════════════════════
# FIGURE 4 — CLASS DIAGRAM
# ══════════════════════════════════════════════════════════════════
def fig_class():
    fig, ax = plt.subplots(figsize=(18, 13))
    ax.set_xlim(0,18); ax.set_ylim(0,13)
    ax.axis('off'); ax.set_facecolor(WHITE); fig.patch.set_facecolor(WHITE)
    ax.text(9,12.5,'PetMatchAI — Class Diagram',ha='center',fontsize=14,fontweight='bold',color=GRAY)

    def cls(x,y,name,attrs,methods,fc=LBLUE,ec=BLUE,w=3.5):
        rh=0.32; ah=(len(attrs)+1)*rh; mh=(len(methods)+1)*rh; total=rh+ah+mh
        # header
        ax.add_patch(FancyBboxPatch((x,y),w,rh,boxstyle='square',facecolor=ec,edgecolor=ec))
        ax.text(x+w/2,y+rh/2,name,ha='center',va='center',fontsize=8.5,fontweight='bold',color='white')
        # attrs
        ax.add_patch(FancyBboxPatch((x,y-ah),w,ah,boxstyle='square',facecolor=fc,edgecolor=ec,linewidth=0.8))
        for i,a in enumerate(attrs):
            ax.text(x+0.1,y-(i+0.6)*rh,a,va='center',fontsize=7,color=GRAY)
        # methods
        ax.add_patch(FancyBboxPatch((x,y-ah-mh),w,mh,boxstyle='square',facecolor=WHITE,edgecolor=ec,linewidth=0.8))
        for i,m in enumerate(methods):
            ax.text(x+0.1,y-ah-(i+0.6)*rh,m,va='center',fontsize=7,color=GRAY,style='italic')
        return x+w/2, y+rh/2

    def assoc(x1,y1,x2,y2,label='',style='-'):
        ls = '--' if style=='dashed' else '-'
        ax.annotate('',xy=(x2,y2),xytext=(x1,y1),
                    arrowprops=dict(arrowstyle='->',color='#6b7280',lw=1.2,linestyle=ls))
        if label:
            ax.text((x1+x2)/2+0.05,(y1+y2)/2,label,fontsize=6.5,color=GRAY)

    # User
    cls(0.3,11.8,'User',
        ['- id: UUID','- name: String','- email: String','- role: Enum','- password: String'],
        ['+ register()','+ login()','+ logout()','+ resetPassword()'],
        fc=LBLUE,ec=BLUE)

    # Profile
    cls(4.5,11.8,'Profile',
        ['- userId: UUID','- phone: String','- location: String','- isVerified: Boolean','- avatarUrl: String'],
        ['+ update()','+ getVerificationStatus()'],
        fc=LBLUE,ec=BLUE)
    assoc(3.8,12.0,4.5,12.0,'1→1')

    # BuyerPreference
    cls(0.3,8.5,'BuyerPreference',
        ['- userId: UUID','- species: String[]','- breeds: String[]','- budgetMin: Decimal','- budgetMax: Decimal',
         '- ageMin: Int','- ageMax: Int','- purpose: String'],
        ['+ save()','+ getMatchCriteria()'],
        fc=LGREEN,ec=GREEN)
    assoc(2.05,11.2,2.05,10.3,'1→1')

    # Pet
    cls(4.5,8.5,'Pet',
        ['- id: UUID','- sellerId: UUID','- name: String','- species: String','- breed: String',
         '- price: Decimal','- status: Enum','- vaccinated: Boolean'],
        ['+ create()','+ update()','+ delete()','+ incrementViews()'],
        fc=LORAN,ec=ORANGE)
    assoc(6.25,11.2,6.25,10.3,'N→1')

    # AIMatch
    cls(8.5,11.5,'AIMatch',
        ['- buyerId: UUID','- petId: UUID','- score: Int','- reasons: String[]','- feedback: String'],
        ['+ computeScore()','+ cacheResult()','+ updateFeedback()'],
        fc=LTEAL,ec=TEAL)
    assoc(6.25,9.5,8.5,10.5,'1→N')

    # MessageThread
    cls(0.3,5.2,'MessageThread',
        ['- id: UUID','- petId: UUID','- buyerId: UUID','- sellerId: UUID','- buyerUnread: Int'],
        ['+ create()','+ markRead()','+ archive()'],
        fc=LPURP,ec=PURPLE)
    assoc(2.05,8.5,2.05,7.3,'1→N')

    # Message
    cls(4.5,5.2,'Message',
        ['- id: UUID','- threadId: UUID','- senderId: UUID','- content: String','- isRead: Boolean'],
        ['+ send()','+ markAsRead()'],
        fc=LPURP,ec=PURPLE)
    assoc(2.05,5.6,4.5,5.6,'1→N')

    # Offer
    cls(8.5,8.2,'Offer',
        ['- id: UUID','- petId: UUID','- buyerId: UUID','- amount: Decimal','- status: Enum','- counterAmount: Decimal'],
        ['+ submit()','+ accept()','+ reject()','+ counter()'],
        fc=LORAN,ec=ORANGE)
    assoc(6.25,8.5,8.5,8.5,'1→N')

    # Review
    cls(8.5,5.2,'Review',
        ['- id: UUID','- reviewerId: UUID','- sellerId: UUID','- rating: Int','- comment: String','- isVerified: Boolean'],
        ['+ submit()','+ moderate()','+ addHelpful()'],
        fc=LGREEN,ec=GREEN)
    assoc(10.25,8.2,10.25,7.1,'1→N')

    # Notification
    cls(12.5,11.5,'Notification',
        ['- id: UUID','- userId: UUID','- type: Enum','- title: String','- message: String','- isRead: Boolean'],
        ['+ create()','+ markRead()','+ send()'],
        fc=LGRAY,ec=GRAY)
    assoc(6.25,9.0,12.5,11.0,'1→N')

    # Dispute
    cls(12.5,8.2,'Dispute',
        ['- id: UUID','- reporterId: UUID','- respondentId: UUID','- subject: String','- status: Enum','- resolution: String'],
        ['+ file()','+ resolve()','+ escalate()'],
        fc=LRED,ec=RED)
    assoc(14.25,11.5,14.25,10.0,'1→N')

    # UserVerification
    cls(12.5,5.0,'UserVerification',
        ['- userId: UUID','- idType: Enum','- idImageUrl: String','- selfieUrl: String','- status: Enum'],
        ['+ submit()','+ approve()','+ reject()'],
        fc=LRED,ec=RED)
    assoc(14.25,8.2,14.25,6.8,'1→1')

    # AuditLog
    cls(0.3,1.8,'AuditLog',
        ['- id: UUID','- userId: UUID','- action: String','- entityType: String','- details: JSON'],
        ['+ log()','+ filter()','+ export()'],
        fc=LGRAY,ec=GRAY)
    assoc(2.05,5.2,2.05,3.6,'1→N')

    save(fig,'fig04_class_diagram.png')


# ══════════════════════════════════════════════════════════════════
# FIGURE 5 — SEQUENCE: USER REGISTRATION
# ══════════════════════════════════════════════════════════════════
def fig_seq_register():
    fig, ax = plt.subplots(figsize=(16,10))
    ax.set_xlim(0,16); ax.set_ylim(0,10)
    ax.axis('off'); ax.set_facecolor(WHITE); fig.patch.set_facecolor(WHITE)
    ax.text(8,9.6,'Sequence Diagram — User Registration Flow',
            ha='center',fontsize=13,fontweight='bold',color=GRAY)

    actors = ['User\nBrowser','Next.js\nFrontend','/api/auth\n(Supabase)',
              'profiles\nTable','Brevo\nEmail','User\nEmail']
    xs = [1.5, 4.0, 6.8, 9.5, 12.2, 14.8]
    colors=[GREEN,BLUE,PURPLE,TEAL,ORANGE,GREEN]

    for x,a,c in zip(xs,actors,colors):
        ax.add_patch(FancyBboxPatch((x-0.6,8.6),1.2,0.6,boxstyle='round,pad=0.05',facecolor=c,edgecolor=c))
        ax.text(x,8.9,a,ha='center',va='center',fontsize=7.5,color='white',fontweight='bold')
        ax.plot([x,x],[8.6,0.3],'--',color='#d1d5db',lw=1.2,zorder=0)

    msgs = [
        (1.5,4.0,8.0,'Fill registration form (name, email, role, password)'),
        (4.0,6.8,7.4,'POST /auth/register {email, password, role, name}'),
        (6.8,9.5,6.8,'INSERT INTO auth.users'),
        (9.5,9.5,6.2,'TRIGGER: handle_new_user()'),
        (9.5,9.5,5.8,'INSERT INTO profiles'),
        (6.8,12.2,5.2,'Send OTP verification email'),
        (12.2,14.8,4.6,'Email delivered to inbox'),
        (14.8,6.8,4.0,'User clicks verify link → POST /auth/confirm'),
        (6.8,4.0,3.4,'Return: session + JWT token'),
        (4.0,1.5,2.8,'Redirect to dashboard (/dashboard/buyer or /seller)'),
        (4.0,9.5,2.2,'POST /api/preferences (buyer preferences step)'),
        (9.5,4.0,1.6,'Preferences saved → Registration complete'),
    ]
    for x1,x2,y,label in msgs:
        ax.annotate('',xy=(x2,y),xytext=(x1,y),
                    arrowprops=dict(arrowstyle='->',color=BLUE,lw=1.3))
        mx=(x1+x2)/2
        ax.text(mx,y+0.12,label,ha='center',va='bottom',fontsize=7,color=GRAY)

    save(fig,'fig05_seq_register.png')


# ══════════════════════════════════════════════════════════════════
# FIGURE 6 — SEQUENCE: AI MATCHING
# ══════════════════════════════════════════════════════════════════
def fig_seq_ai():
    fig, ax = plt.subplots(figsize=(16,10))
    ax.set_xlim(0,16); ax.set_ylim(0,10)
    ax.axis('off'); ax.set_facecolor(WHITE); fig.patch.set_facecolor(WHITE)
    ax.text(8,9.6,'Sequence Diagram — AI Recommendation Matching Flow',
            ha='center',fontsize=13,fontweight='bold',color=GRAY)

    actors=['Buyer\nBrowser','Next.js\nFrontend','/api/\nrecommendations',
            'buyer_\npreferences','pets\nTable','ai_matches\nCache','Groq\nLLM API']
    xs=[1.5,3.5,6.0,8.5,10.5,12.5,14.8]
    colors=[GREEN,BLUE,PURPLE,TEAL,ORANGE,TEAL,RED]
    for x,a,c in zip(xs,actors,colors):
        ax.add_patch(FancyBboxPatch((x-0.6,8.6),1.2,0.6,boxstyle='round,pad=0.05',facecolor=c,edgecolor=c))
        ax.text(x,8.9,a,ha='center',va='center',fontsize=7,color='white',fontweight='bold')
        ax.plot([x,x],[8.6,0.3],'--',color='#d1d5db',lw=1.2,zorder=0)

    msgs=[
        (1.5,3.5,8.0,'Navigate to /recommendations'),
        (3.5,6.0,7.4,'GET /api/recommendations (Bearer token)'),
        (6.0,8.5,6.8,'Fetch buyer preferences'),
        (8.5,6.0,6.2,'Return: species, budget, breed prefs'),
        (6.0,10.5,5.6,'Fetch active pet listings (limit 60)'),
        (10.5,6.0,5.0,'Return: pet pool'),
        (6.0,12.5,4.4,'Check ai_matches cache for buyer'),
        (12.5,6.0,3.8,'Return: cached scores (subset)'),
        (6.0,14.8,3.2,'Batch score uncached pets via Groq LLM'),
        (14.8,6.0,2.6,'Return: scores[] + reasons[] per pet'),
        (6.0,12.5,2.0,'Cache new scores → ai_matches.upsert()'),
        (6.0,3.5,1.4,'Return top-6 matches + contextual sections'),
        (3.5,1.5,0.8,'Display match cards with % scores + reasons'),
    ]
    for x1,x2,y,label in msgs:
        ax.annotate('',xy=(x2,y),xytext=(x1,y),
                    arrowprops=dict(arrowstyle='->',color=BLUE,lw=1.3))
        mx=(x1+x2)/2
        ax.text(mx,y+0.12,label,ha='center',va='bottom',fontsize=7,color=GRAY)

    save(fig,'fig06_seq_ai_matching.png')


# ══════════════════════════════════════════════════════════════════
# FIGURE 7 — SEQUENCE: MESSAGING
# ══════════════════════════════════════════════════════════════════
def fig_seq_msg():
    fig, ax = plt.subplots(figsize=(16,10))
    ax.set_xlim(0,16); ax.set_ylim(0,10)
    ax.axis('off'); ax.set_facecolor(WHITE); fig.patch.set_facecolor(WHITE)
    ax.text(8,9.6,'Sequence Diagram — Buyer-Seller Messaging Flow',
            ha='center',fontsize=13,fontweight='bold',color=GRAY)

    actors=['Buyer\nBrowser','Next.js\nAPI','/api/\nmessages',
            'Supabase\nRealtime','Seller\nBrowser','Notification\nService']
    xs=[1.5,4.0,6.5,9.5,12.5,14.8]
    colors=[GREEN,BLUE,PURPLE,TEAL,ORANGE,RED]
    for x,a,c in zip(xs,actors,colors):
        ax.add_patch(FancyBboxPatch((x-0.6,8.6),1.2,0.6,boxstyle='round,pad=0.05',facecolor=c,edgecolor=c))
        ax.text(x,8.9,a,ha='center',va='center',fontsize=7.5,color='white',fontweight='bold')
        ax.plot([x,x],[8.6,0.3],'--',color='#d1d5db',lw=1.2,zorder=0)

    msgs=[
        (1.5,4.0,8.0,'Click "Inquire" on listing'),
        (4.0,6.5,7.4,'POST /api/messages {petId, content}'),
        (6.5,6.5,6.8,'CREATE message_thread (if new)'),
        (6.5,6.5,6.2,'INSERT message → messages table'),
        (6.5,6.5,5.6,'UPDATE message_threads.last_message'),
        (6.5,9.5,5.0,'Realtime INSERT event fires on channel'),
        (9.5,12.5,4.4,'Deliver message to seller in real-time (<300ms)'),
        (12.5,12.5,3.8,'Seller sees message bubble (typing indicator clears)'),
        (6.5,14.8,3.2,'INSERT notification for seller'),
        (14.8,12.5,2.6,'Push notification sent (SMS if offline)'),
        (12.5,9.5,2.0,'Seller marks as read → Realtime UPDATE'),
        (9.5,1.5,1.4,'"Seen" indicator shown under buyer\'s message'),
    ]
    for x1,x2,y,label in msgs:
        ax.annotate('',xy=(x2,y),xytext=(x1,y),
                    arrowprops=dict(arrowstyle='->',color=BLUE,lw=1.3))
        mx=(x1+x2)/2
        ax.text(mx,y+0.12,label,ha='center',va='bottom',fontsize=7,color=GRAY)

    save(fig,'fig07_seq_messaging.png')


# ══════════════════════════════════════════════════════════════════
# FIGURE 8 — ACTIVITY DIAGRAM
# ══════════════════════════════════════════════════════════════════
def fig_activity():
    fig, ax = plt.subplots(figsize=(14,16))
    ax.set_xlim(0,14); ax.set_ylim(0,16)
    ax.axis('off'); ax.set_facecolor(WHITE); fig.patch.set_facecolor(WHITE)
    ax.text(7,15.5,'PetMatchAI — System Activity Diagram',
            ha='center',fontsize=13,fontweight='bold',color=GRAY)

    def state(x,y,label,fc=LBLUE,ec=BLUE,w=3.8,h=0.55):
        ax.add_patch(FancyBboxPatch((x-w/2,y-h/2),w,h,boxstyle='round,pad=0.1',
                                     facecolor=fc,edgecolor=ec,linewidth=1.4))
        ax.text(x,y,label,ha='center',va='center',fontsize=8.5,color=ec,fontweight='bold')

    def decision(x,y,label):
        d = mpatches.FancyArrowPatch((x,y+0.4),(x+0.5,y),arrowstyle='-',
                                      color=ORANGE,linewidth=1.5)
        diamond = plt.Polygon([[x,y+0.45],[x+0.55,y],[x,y-0.45],[x-0.55,y]],
                               facecolor=LORAN,edgecolor=ORANGE,linewidth=1.5)
        ax.add_patch(diamond)
        ax.text(x,y,label,ha='center',va='center',fontsize=7.5,color=ORANGE,fontweight='bold')

    def arrow(x1,y1,x2,y2,label=''):
        ax.annotate('',xy=(x2,y2),xytext=(x1,y1),
                    arrowprops=dict(arrowstyle='->',color=GRAY,lw=1.3))
        if label:
            ax.text((x1+x2)/2+0.1,(y1+y2)/2,label,fontsize=7.5,color=GRAY)

    # Start
    ax.add_patch(plt.Circle((7,14.8),0.22,color=BLUE,zorder=3))

    arrow(7,14.58,7,14.1)
    state(7,13.8,'Visit PetMatchAI Website',fc=LGREEN,ec=GREEN)
    arrow(7,13.52,7,13.0)
    decision(7,12.7,'Has Account?')
    arrow(7,12.25,7,11.7,'Yes')
    state(7,11.4,'Login (Email / Google OAuth)',fc=LBLUE,ec=BLUE)
    arrow(4.5,12.7,4.5,11.4,'No')
    ax.plot([4.5,7],[12.7,12.7],'-',color=GRAY,lw=1.3)
    state(4.5,11.1,'Register + Verify Email',fc=LGREEN,ec=GREEN)
    arrow(4.5,10.83,7,10.5)
    arrow(7,11.12,7,10.5)
    decision(7,10.2,'Role?')

    # Buyer path
    ax.plot([5.5,7],[10.2,10.2],'-',color=GRAY,lw=1.3)
    arrow(5.5,10.2,5.5,9.5,'Buyer')
    state(5.5,9.2,'View Buyer Dashboard\n& Recommendations',fc=LGREEN,ec=GREEN,w=4.2)
    arrow(5.5,8.92,5.5,8.4)
    decision(5.5,8.1,'Action?')
    arrow(3.5,8.1,3.5,7.4,'Search')
    state(3.5,7.1,'Search & Filter Listings',fc=LBLUE,ec=BLUE,w=3.5)
    arrow(5.5,7.65,5.5,7.1,'View Recs')
    state(5.5,6.8,'View AI Recommendations',fc=LTEAL,ec=TEAL,w=3.8)
    arrow(7.5,8.1,7.5,7.4,'Saved')
    state(7.5,7.1,'View Saved Listings',fc=LBLUE,ec=BLUE,w=3.5)

    arrow(5.5,6.52,5.5,5.9)
    state(5.5,5.6,'View Listing Detail',fc=LORAN,ec=ORANGE,w=3.5)
    arrow(5.5,5.32,5.5,4.7)
    decision(5.5,4.4,'Next Step?')
    arrow(3.5,4.4,3.5,3.7,'Message')
    state(3.5,3.4,'Send Inquiry\nMessage to Seller',fc=LPURP,ec=PURPLE,w=3.5)
    arrow(5.5,3.95,5.5,3.4,'Offer')
    state(5.5,3.1,'Submit Price Offer',fc=LORAN,ec=ORANGE,w=3.5)
    arrow(7.5,4.4,7.5,3.7,'Save')
    state(7.5,3.4,'Save to Wishlist',fc=LGREEN,ec=GREEN,w=3.5)

    # Seller path
    ax.plot([8.5,7],[10.2,10.2],'-',color=GRAY,lw=1.3)
    arrow(8.5,10.2,8.5,9.5,'Seller')
    state(8.5,9.2,'View Seller Dashboard',fc=LORAN,ec=ORANGE,w=3.5)
    arrow(8.5,8.92,8.5,8.4)
    state(8.5,8.1,'Create / Manage Listings',fc=LORAN,ec=ORANGE,w=3.5)
    arrow(8.5,7.82,8.5,7.3)
    state(8.5,7.0,'Respond to Inquiries\n& Manage Offers',fc=LPURP,ec=PURPLE,w=3.8)

    # End
    arrow(5.5,2.82,7,2.2)
    arrow(8.5,6.72,7,2.2)
    state(7,1.9,'Leave Review / File Dispute\n(if transaction completed)',fc=LGREEN,ec=GREEN,w=5.2)
    arrow(7,1.62,7,0.9)
    ax.add_patch(plt.Circle((7,0.6),0.22,color='white',zorder=3,ec=BLUE,lw=3))
    ax.add_patch(plt.Circle((7,0.6),0.15,color=BLUE,zorder=4))

    save(fig,'fig08_activity_diagram.png')


# ══════════════════════════════════════════════════════════════════
# FIGURE: Current System Flowchart (Manual Process)
# ══════════════════════════════════════════════════════════════════
def fig_current_system():
    fig, ax = plt.subplots(figsize=(12,12))
    ax.set_xlim(0,12); ax.set_ylim(0,12)
    ax.axis('off'); ax.set_facecolor(WHITE); fig.patch.set_facecolor(WHITE)
    ax.text(6,11.5,'Hemmy Kennel — Current Manual Process Flow',
            ha='center',fontsize=13,fontweight='bold',color=GRAY)

    def box(x,y,label,fc=LGRAY,ec=GRAY,w=5,h=0.7):
        ax.add_patch(FancyBboxPatch((x-w/2,y-h/2),w,h,boxstyle='round,pad=0.1',
                                     facecolor=fc,edgecolor=ec,linewidth=1.5))
        ax.text(x,y,label,ha='center',va='center',fontsize=9,color=ec,fontweight='bold')

    def arr(x1,y1,x2,y2):
        ax.annotate('',xy=(x2,y2),xytext=(x1,y1),
                    arrowprops=dict(arrowstyle='->',color=GRAY,lw=1.5))

    ax.add_patch(plt.Circle((6,10.7),0.25,color=RED,zorder=3))
    arr(6,10.45,6,9.85)
    box(6,9.5,'Buyer Sees Pet on Instagram / WhatsApp Status',fc=LORAN,ec=ORANGE)
    arr(6,9.15,6,8.55)
    box(6,8.2,'Buyer Sends Informal WhatsApp Inquiry',fc=LORAN,ec=ORANGE)
    arr(6,7.85,6,7.25)
    box(6,6.9,'Seller Responds Manually with Photos & Info',fc=LGRAY,ec=GRAY)
    arr(6,6.55,6,5.95)

    diamond = plt.Polygon([[6,5.6],[6.8,4.9],[6,4.2],[5.2,4.9]],
                           facecolor=LBLUE,edgecolor=BLUE,linewidth=1.5)
    ax.add_patch(diamond)
    ax.text(6,4.9,'Price\nAgreed?',ha='center',va='center',fontsize=8.5,color=BLUE,fontweight='bold')

    arr(6,4.2,6,3.65)
    ax.text(6.15,3.95,'Yes',fontsize=8,color=GREEN)
    box(6,3.3,'Buyer Makes Bank Transfer (Cash/USSD)',fc=LGREEN,ec=GREEN)
    arr(6,2.95,6,2.35)
    box(6,2.0,'Buyer Collects Pet in Person',fc=LGREEN,ec=GREEN)
    arr(6,1.65,6,1.05)
    ax.add_patch(plt.Circle((6,0.7),0.25,color='white',ec=BLUE,lw=3,zorder=3))
    ax.add_patch(plt.Circle((6,0.7),0.15,color=BLUE,zorder=4))

    # No path
    ax.plot([5.2,2.5],[4.9,4.9],'-',color=GRAY,lw=1.5)
    arr(2.5,4.9,2.5,8.2)
    ax.text(1.5,6.7,'No —\nRenegotiate',fontsize=8.5,color=RED,ha='center')

    # Problems annotation
    probs = ['⚠ No structured listing format',
             '⚠ No intelligent search or filtering',
             '⚠ No health document standards',
             '⚠ No transaction records',
             '⚠ No analytics or demand insights',
             '⚠ Slow, manual, unscalable']
    for i,p in enumerate(probs):
        ax.text(9.5,9.5-i*0.6,p,fontsize=7.5,color=RED,va='center')
    ax.add_patch(FancyBboxPatch((8.3,6.1),3.4,4.0,boxstyle='round,pad=0.1',
                                 facecolor=LRED,edgecolor=RED,linewidth=1.2,alpha=0.4))
    ax.text(9.95,10.3,'System Problems',fontsize=8.5,color=RED,fontweight='bold',ha='center')

    save(fig,'fig_current_system.png')


# Run all
fig_architecture()
fig_erd()
fig_use_case()
fig_class()
fig_seq_register()
fig_seq_ai()
fig_seq_msg()
fig_activity()
fig_current_system()
print('\nAll diagrams generated successfully!')
