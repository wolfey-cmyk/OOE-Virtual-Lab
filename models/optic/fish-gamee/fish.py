"""
Refraction Hunter - Python/Pygame (optimized)
pip install pygame
python refraction_hunter.py
"""

import pygame
import math
import random
import sys

# ── constants ─────────────────────────────────────────────────────────────────
WATER_LINE_RATIO = 0.35
N_AIR            = 1.0
N_WATER          = 1.33
REFRACTION_RATIO = N_WATER / N_AIR
FISH_COUNT       = 5
FPS              = 60

FISH_COLORS = [
    ((255,107, 53),(232, 93, 38),(255,140, 90)),
    ((255,215,  0),(255,165,  0),(255,236,128)),
    ((255, 71, 87),(192, 57, 43),(255,107,122)),
    (( 46,213,115),( 39,174, 96),(123,237,159)),
    ((165, 94,234),(136, 84,208),(195,155,255)),
    (( 30,144,255),(  0,102,204),( 84,160,255)),
    ((255,107,129),(232, 67,147),(255,154,174)),
    ((254,202, 87),(243,156, 18),(254,221,122)),
]

def lerp_color(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return (int(c1[0]+(c2[0]-c1[0])*t),
            int(c1[1]+(c2[1]-c1[1])*t),
            int(c1[2]+(c2[2]-c1[2])*t))

def dist(x1,y1,x2,y2):
    return math.hypot(x1-x2, y1-y2)

# ── static background (built once) ────────────────────────────────────────────
def build_background(W, H, WL):
    bg = pygame.Surface((W, H))

    sky_top=(15,12,41); sky_mid=(48,43,99); sky_bot=(36,36,62)
    for y in range(WL):
        t = y/max(WL-1,1)
        c = lerp_color(sky_top,sky_mid,t*2) if t<0.5 else lerp_color(sky_mid,sky_bot,(t-0.5)*2)
        pygame.draw.line(bg,c,(0,y),(W,y))

    wt=(0,105,148); wm=(0,85,119); wl2=(0,61,92); wb=(0,26,44)
    for y in range(WL, H):
        t=(y-WL)/max(H-WL-1,1)
        if   t<0.3: c=lerp_color(wt,wm,t/0.3)
        elif t<0.7: c=lerp_color(wm,wl2,(t-0.3)/0.4)
        else:       c=lerp_color(wl2,wb,(t-0.7)/0.3)
        pygame.draw.line(bg,c,(0,y),(W,y))

    # sandy bottom tint
    for y in range(35):
        c = lerp_color((0,26,44),(180,160,100),y/35*0.35)
        pygame.draw.line(bg,c,(0,H-35+y),(W,H-35+y))

    # rock
    for i in range(12):
        rx=int((i*137.7+30)%W); ry=H-8-(i%3)*5
        rw=(6+(i%4)*3)*2; rh=(3+(i%3)*2)*2
        s=pygame.Surface((rw,rh),pygame.SRCALPHA)
        pygame.draw.ellipse(s,(60,80,100,76),(0,0,rw,rh))
        bg.blit(s,(rx-rw//2,ry-rh//2))

    # moon glow
    mx2=int(W*0.82); my2=int(WL*0.28)
    for gr in range(80,0,-4):
        a=int((1-gr/80)**2*55)
        s=pygame.Surface((gr*2,gr*2),pygame.SRCALPHA)
        pygame.draw.circle(s,(200,200,255,a),(gr,gr),gr)
        bg.blit(s,(mx2-gr,my2-gr))
    pygame.draw.circle(bg,(255,248,220),(mx2,my2),22)
    pygame.draw.circle(bg,sky_mid,(mx2+7,my2-4),18)
    return bg

# ── game objects ───────────────────────────────────────────────────────────────
class Seaweed:
    def __init__(self,W):
        import colorsys
        self.x=30+random.random()*(W-60)
        self.height=60+random.random()*100
        self.segments=5+int(random.random()*4)
        hue=130+random.random()*30
        r,g,b=colorsys.hls_to_rgb(hue/360,(25+random.random()*15)/100,(50+random.random()*30)/100)
        self.color=(int(r*255),int(g*255),int(b*255))
        self.sway_speed=0.5+random.random()
        self.sway_amount=5+random.random()*15
        self.phase=random.random()*math.pi*2

class Fish:
    def __init__(self,W,H,WL):
        c=random.choice(FISH_COLORS)
        self.color,self.tail_color,self.fin_color=c
        self.size=25+random.random()*20
        self.real_y=WL+80+random.random()*(H-WL-160)
        self.real_x=80+random.random()*(W-160)
        self.apparent_x=self.real_x
        self.apparent_y=WL+(self.real_y-WL)/REFRACTION_RATIO
        self.speed=0.3+random.random()*1.2
        self.direction=1 if random.random()>0.5 else -1
        self.wiggle=random.random()*math.pi*2
        self.wiggle_speed=3+random.random()*3
        self.caught=False; self.caught_timer=0

    def update(self,W,WL):
        if self.caught: self.caught_timer-=1; return
        self.wiggle+=self.wiggle_speed*0.02
        self.real_x+=self.speed*self.direction
        if self.real_x<50 or self.real_x>W-50: self.direction*=-1
        self.apparent_x=self.real_x
        self.apparent_y=WL+(self.real_y-WL)/REFRACTION_RATIO

class Bubble:
    def __init__(self,W,H,WL):
        self.x=random.random()*W
        self.y=WL+20+random.random()*(H-WL-40)
        self.radius=1+random.random()*4
        self.speed=0.3+random.random()*0.8
        self.opacity=0.2+random.random()*0.5
        self.wobble=random.random()*math.pi*2
        self.wobble_speed=1+random.random()*2

class Particle:
    def __init__(self,x,y,color):
        angle=random.random()*math.pi*2; speed=1+random.random()*4
        self.x=float(x); self.y=float(y)
        self.vx=math.cos(angle)*speed; self.vy=math.sin(angle)*speed
        self.max_life=70; self.life=40+random.random()*30
        self.color=color; self.size=2+random.random()*4

class Ripple:
    def __init__(self,x,y):
        self.x=x; self.y=y; self.radius=0.0; self.opacity=0.8

class Ray:
    def __init__(self,cx,cy,rx,ry,hit):
        self.cx=cx; self.cy=cy; self.rx=rx; self.ry=ry
        self.hit=hit; self.timer=90

# ── drawing ────────────────────────────────────────────────────────────────────
def draw_fish_to(surf, x, y, size, color, tail_color, fin_color, direction, wiggle, alpha_f):
    pad=int(size*2.6)+4
    fs=pygame.Surface((pad*2,pad*2),pygame.SRCALPHA)
    cx=cy=pad; a8=int(alpha_f*255)
    wsin=math.sin(wiggle)
    # tail
    tail=[(cx-int(size*0.8),cy),
          (cx-int(size*1.6),cy-int(size*0.4+wsin*8)),
          (cx-int(size*1.2),cy),
          (cx-int(size*1.6),cy+int(size*0.4+wsin*8))]
    pygame.draw.polygon(fs,(*tail_color,a8),tail)
    # body
    pygame.draw.ellipse(fs,(*color,a8),
                        (cx-int(size),cy-int(size*0.55),int(size*2),int(size*1.1)))
    # dorsal fin
    pygame.draw.polygon(fs,(*fin_color,a8),
        [(cx-int(size*0.2),cy-int(size*0.45)),
         (cx+int(size*0.1),cy-int(size*0.9)),
         (cx+int(size*0.4),cy-int(size*0.45))])
    # pectoral fin
    pygame.draw.polygon(fs,(*fin_color,a8),
        [(cx+int(size*0.1),cy+int(size*0.2)),
         (cx+int(size*0.3),cy+int(size*0.6+math.sin(wiggle*0.5)*3)),
         (cx+int(size*0.05),cy+int(size*0.45))])
    # eye
    pygame.draw.circle(fs,(255,255,255,a8),(cx+int(size*0.45),cy-int(size*0.1)),int(size*0.18))
    pygame.draw.circle(fs,(26,26,46,a8),  (cx+int(size*0.50),cy-int(size*0.1)),int(size*0.10))
    pygame.draw.circle(fs,(255,255,255,a8),(cx+int(size*0.53),cy-int(size*0.14)),max(1,int(size*0.04)))
    if direction<0: fs=pygame.transform.flip(fs,True,False)
    surf.blit(fs,(int(x)-pad,int(y)-pad))

def dashed_line_on(surf,col4,p1,p2,width,dash,gap):
    dx,dy=p2[0]-p1[0],p2[1]-p1[1]; L=math.hypot(dx,dy)
    if L==0: return
    nx,ny=dx/L,dy/L; pos=0.0; on=True
    tmp=pygame.Surface((surf.get_width(),surf.get_height()),pygame.SRCALPHA)
    while pos<L:
        seg=min(dash if on else gap,L-pos)
        if on:
            a=(int(p1[0]+nx*pos),int(p1[1]+ny*pos))
            b=(int(p1[0]+nx*(pos+seg)),int(p1[1]+ny*(pos+seg)))
            pygame.draw.line(tmp,col4,a,b,width)
        pos+=seg; on=not on
    surf.blit(tmp,(0,0))

def draw_panel(surf,x,y,w,h,radius=14):
    p=pygame.Surface((w,h),pygame.SRCALPHA)
    p.fill((0,0,0,145))
    pygame.draw.rect(p,(255,255,255,30),(0,0,w,h),1,border_radius=radius)
    surf.blit(p,(x,y))

# ── main ───────────────────────────────────────────────────────────────────────
def main():
    pygame.init()
    info=pygame.display.Info()
    W,H=info.current_w,info.current_h
    screen=pygame.display.set_mode((W,H),pygame.FULLSCREEN|pygame.HWSURFACE|pygame.DOUBLEBUF)
    pygame.display.set_caption("Refraction Hunter")
    pygame.mouse.set_visible(False)
    clock=pygame.time.Clock()

    WL=int(H*WATER_LINE_RATIO)

    f_sm  = pygame.font.SysFont("monospace",13)
    f_med = pygame.font.SysFont("monospace",15,bold=True)
    f_lg  = pygame.font.SysFont("monospace",17,bold=True)
    f_xl  = pygame.font.SysFont("sans",30,bold=True)
    f_title=pygame.font.SysFont("sans",34,bold=True)

    bg=build_background(W,H,WL)
    stars=[((i*137.5+50)%W,(i*73.7+20)%max(WL-20,1),i) for i in range(80)]

    fishes  =[Fish(W,H,WL) for _ in range(FISH_COUNT)]
    bubbles =[Bubble(W,H,WL) for _ in range(30)]
    seaweeds=[Seaweed(W) for _ in range(8)]
    particles:list=[]
    ripples  :list=[]
    rays     :list=[]

    score=shots=0
    show_help=True
    show_real=False

    # reusable overlay surface
    overlay=pygame.Surface((W,H),pygame.SRCALPHA)
    # reusable effect surfaces
    eff=pygame.Surface((W,H),pygame.SRCALPHA)

    running=True
    while running:
        t=pygame.time.get_ticks()
        mx,my=pygame.mouse.get_pos()
        clock.tick(FPS)

        # ── events ──────────────────────────────────────────────────────────
        for ev in pygame.event.get():
            if ev.type==pygame.QUIT: running=False
            elif ev.type==pygame.KEYDOWN:
                if ev.key in(pygame.K_ESCAPE,pygame.K_q): running=False
                elif ev.key==pygame.K_h: show_help=not show_help
                elif ev.key==pygame.K_r: show_real=not show_real
            elif ev.type==pygame.MOUSEBUTTONDOWN and ev.button==1:
                if show_help:
                    btn=pygame.Rect(W//2-200,H//2+140,400,50)
                    if btn.collidepoint(mx,my): show_help=False
                    continue
                cx2,cy2=mx,my
                rx2,ry2=float(cx2),float(cy2)
                if cy2>WL: ry2=WL+(cy2-WL)*REFRACTION_RATIO
                shots+=1
                ripples.append(Ripple(cx2,WL))
                hit=False
                for fish in fishes:
                    if fish.caught: continue
                    if dist(rx2,ry2,fish.real_x,fish.real_y)<fish.size*1.2:
                        hit=True; fish.caught=True; fish.caught_timer=60; score+=1
                        for _ in range(20): particles.append(Particle(fish.real_x,fish.real_y,fish.color))
                        for _ in range(8):
                            b=Bubble(W,H,WL)
                            b.x=fish.real_x+(random.random()-0.5)*40
                            b.y=fish.real_y+(random.random()-0.5)*20
                            b.speed=1+random.random()*2
                            bubbles.append(b)
                        break
                rays.append(Ray(cx2,cy2,int(rx2),int(ry2),hit))

        # ── update ──────────────────────────────────────────────────────────
        for i,fish in enumerate(fishes):
            fish.update(W,WL)
            if fish.caught and fish.caught_timer<=0: fishes[i]=Fish(W,H,WL)
        for b in bubbles:
            b.y-=b.speed; b.wobble+=b.wobble_speed*0.02
            if b.y<WL: b.y=H-20; b.x=random.random()*W
        for p in particles: p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.life-=1
        particles[:]=[p for p in particles if p.life>0]
        for r in ripples: r.radius+=1.5; r.opacity-=0.015
        ripples[:]=[r for r in ripples if r.opacity>0]
        for ray in rays: ray.timer-=1
        rays[:]=[ray for ray in rays if ray.timer>0]

        # ── render ──────────────────────────────────────────────────────────
        screen.blit(bg,(0,0))

        # stars
        for sx,sy,i in stars:
            flicker=0.3+0.7*abs(math.sin(t*0.001+i*0.7))
            pygame.draw.circle(screen,(255,255,255),(int(sx),int(sy)),1+(i%3))

        # light shafts
        eff.fill((0,0,0,0))
        for i in range(6):
            sx2=W*0.08+i*W*0.18; sway=math.sin(t*0.0005+i*1.5)*30
            pts=[(sx2+sway-12,WL),(sx2+sway+12,WL),
                 (sx2+sway+70,H),(sx2+sway+15,H)]
            pygame.draw.polygon(eff,(100,200,255,14),pts)
        screen.blit(eff,(0,0))

        # seaweed
        for sw in seaweeds:
            base_y=H-5; prev=(sw.x,base_y)
            for i in range(1,sw.segments+1):
                frac=i/sw.segments
                sway=math.sin(t*0.001*sw.sway_speed+sw.phase+frac*2)*sw.sway_amount*frac
                cur=(sw.x+sway,base_y-sw.height*frac)
                pygame.draw.line(screen,sw.color,(int(prev[0]),int(prev[1])),(int(cur[0]),int(cur[1])),3)
                prev=cur

        # fish
        for fish in fishes:
            if fish.caught:
                if fish.caught_timer>0:
                    draw_fish_to(screen,fish.real_x,fish.real_y,fish.size,
                                 fish.color,fish.tail_color,fish.fin_color,
                                 fish.direction,fish.wiggle,fish.caught_timer/60)
                continue
            draw_fish_to(screen,fish.apparent_x,fish.apparent_y,fish.size*0.9,
                         fish.color,fish.tail_color,fish.fin_color,
                         fish.direction,fish.wiggle,0.22)
            if show_real:
                draw_fish_to(screen,fish.real_x,fish.real_y,fish.size,
                             fish.color,fish.tail_color,fish.fin_color,
                             fish.direction,fish.wiggle,0.8)
                screen.blit(f_sm.render("REAL",True,(255,100,100)),
                            (int(fish.real_x)-14,int(fish.real_y)+int(fish.size)+14))
                screen.blit(f_sm.render("APPARENT",True,(100,200,255)),
                            (int(fish.apparent_x)-30,int(fish.apparent_y)-int(fish.size)-5))

        # bubbles + particles + ripples on shared eff surface
        eff.fill((0,0,0,0))
        for b in bubbles:
            bx=b.x+math.sin(b.wobble)*5; r2=max(1,int(b.radius)); a8=int(b.opacity*200)
            pygame.draw.circle(eff,(100,200,255,a8),(int(bx),int(b.y)),r2)
            pygame.draw.circle(eff,(255,255,255,int(a8*0.7)),
                               (int(bx)-max(1,r2//4),int(b.y)-max(1,r2//4)),max(1,r2//4))
        for p in particles:
            a8=int(p.life/p.max_life*255); r2=max(1,int(p.size*(p.life/p.max_life)))
            pygame.draw.circle(eff,(*p.color,a8),(int(p.x),int(p.y)),r2)
        for r in ripples:
            a8=int(r.opacity*200); rw=max(1,int(r.radius)); rh=max(1,int(r.radius*0.3))
            pygame.draw.ellipse(eff,(180,230,255,a8),(int(r.x)-rw,int(r.y)-rh,rw*2,rh*2),2)
        screen.blit(eff,(0,0))

        # waves
        wave_s=pygame.Surface((W,30),pygame.SRCALPHA)
        for layer in range(3):
            a8=int((0.12-layer*0.03)*255); yo=layer*3
            pts=[(0,yo+15)]
            for x in range(0,W+4,6):
                y2=yo+math.sin(x*0.02+t*0.002+layer*0.5)*4+math.sin(x*0.04+t*0.003+layer)*2
                pts.append((x,y2))
            pts+=[(W,yo+20),(0,yo+20)]
            pygame.draw.polygon(wave_s,(100,200,255,a8),pts)
        screen.blit(wave_s,(0,WL-2))
        # surface line
        prev2=None
        for x in range(0,W+3,8):
            y2=WL+math.sin(x*0.025+t*0.002)*3+math.sin(x*0.05+t*0.004)*1.5
            if prev2: pygame.draw.line(screen,(180,230,255),(int(prev2[0]),int(prev2[1])),(x,int(y2)),2)
            prev2=(x,y2)

        # rays
        eff.fill((0,0,0,0))
        ex2,ey2=W//2,30
        for ray in rays:
            af=ray.timer/90; a8=int(af*230)
            if ray.cy>WL:
                hx=ray.cx
                pygame.draw.line(eff,(255,215,0,a8),(ex2,ey2),(hx,WL),3)
                pygame.draw.line(eff,(0,255,200,a8),(hx,WL),(ray.rx,ray.ry),3)
                dashed_line_on(eff,(255,215,0,int(af*100)),(hx,WL),(ray.cx,ray.cy),2,10,7)
                pygame.draw.circle(eff,(255,100,100,a8),(hx,WL),5)
                if not ray.hit:
                    s2=10
                    pygame.draw.line(eff,(255,80,80,int(af*180)),(ray.rx-s2,ray.ry),(ray.rx+s2,ray.ry),2)
                    pygame.draw.line(eff,(255,80,80,int(af*180)),(ray.rx,ray.ry-s2),(ray.rx,ray.ry+s2),2)
        screen.blit(eff,(0,0))

        # hunter
        hx,hy=W//2,40
        pygame.draw.line(screen,(139,69,19),(hx,hy+15),(hx,hy+70),3)
        pygame.draw.polygon(screen,(192,192,192),[(hx,hy+5),(hx-4,hy+15),(hx+4,hy+15)])
        pygame.draw.circle(screen,(255,218,185),(hx,hy-5),12)
        pygame.draw.ellipse(screen,(44,62,80),(hx-16,hy-19,32,10))
        pygame.draw.rect(screen,(44,62,80),(hx-8,hy-22,16,10))
        pygame.draw.line(screen,(44,62,80),(hx,hy+7),(hx,hy+35),3)
        pygame.draw.line(screen,(44,62,80),(hx,hy+15),(hx-12,hy+25),3)
        pygame.draw.line(screen,(44,62,80),(hx,hy+15),(hx+12,hy+25),3)

        # cursor
        if my>WL:
            pulse=0.8+0.2*math.sin(t*0.005); a8=int(pulse*160)
            r2=int(12+math.sin(t*0.004)*2)
            eff.fill((0,0,0,0))
            pygame.draw.circle(eff,(255,100,100,a8),(mx,my),r2,2)
            for ddx,ddy in [(-r2-4,0),(r2-4,0),(0,-r2-4),(0,r2-4)]:
                pygame.draw.line(eff,(255,100,100,a8),
                                 (mx+ddx,my+ddy),(mx+ddx+(8 if ddx else 0),my+ddy+(8 if ddy else 0)),2)
            screen.blit(eff,(0,0))

        # zone labels
        lbl=f_med.render("AIR  n=1.00",True,(200,200,255)); lbl.set_alpha(60); screen.blit(lbl,(10,WL-22))
        lbl2=f_med.render("WATER  n=1.33",True,(180,230,255)); lbl2.set_alpha(60); screen.blit(lbl2,(10,WL+8))

        # ── HUD ─────────────────────────────────────────────────────────────
        if not show_help:
            draw_panel(screen,16,16,230,115)
            screen.blit(f_lg.render("Refraction Hunter",True,(255,255,255)),(28,24))
            acc=f"{score/shots*100:.1f}%" if shots else "0.0%"
            for i,(lbl_t,val,col) in enumerate([
                ("Score",str(score),(52,211,153)),
                ("Shots",str(shots),(200,200,200)),
                ("Accuracy",acc,(251,191,36))]):
                screen.blit(f_sm.render(lbl_t,True,(150,150,150)),(30,62+i*18))
                screen.blit(f_sm.render(val,True,col),(190,62+i*18))

            draw_panel(screen,W-246,16,230,105)
            screen.blit(f_lg.render("PHYSICS",True,(251,191,36)),(W-230,24))
            for i,(txt,col) in enumerate([
                ("n_air   = 1.00",(200,200,180)),
                ("n_water = 1.33",(200,200,180)),
                (f"y_real = y_click x {REFRACTION_RATIO:.2f}",(52,211,153))]):
                screen.blit(f_sm.render(txt,True,col),(W-230,56+i*18))

            by=H-46
            r_col=(220,80,80) if show_real else (100,100,100)
            draw_panel(screen,W//2-190,by-6,170,38)
            screen.blit(f_sm.render("[R] Real ON" if show_real else "[R] Show Real",True,r_col),(W//2-180,by+4))
            draw_panel(screen,W//2+10,by-6,130,38)
            screen.blit(f_sm.render("[H] Help",True,(100,100,100)),(W//2+20,by+4))

        # ── help overlay ─────────────────────────────────────────────────────
        if show_help:
            overlay.fill((0,0,0,185))
            cw,ch=500,500; cx0,cy0=W//2-cw//2,H//2-ch//2

            card=pygame.Surface((cw,ch),pygame.SRCALPHA)
            for y in range(ch):
                c=lerp_color((30,41,59),(15,23,42),y/ch)
                pygame.draw.line(card,(*c,230),(0,y),(cw,y))
            pygame.draw.rect(card,(255,255,255,30),(0,0,cw,ch),1,border_radius=20)
            overlay.blit(card,(cx0,cy0))

            tl=f_title.render("Refraction Hunter",True,(255,255,255))
            overlay.blit(tl,(cx0+cw//2-tl.get_width()//2,cy0+18))

            sy2=cy0+66
            for hdr,hcol,lines in [
                ("How to Play",(52,211,153),[
                    "Fish swim at their REAL positions underwater.",
                    "Refraction makes them appear HIGHER than they are.",
                    "Click where the fish REALLY is  --  aim DEEPER!",
                ]),
                ("Snell's Law",(251,191,36),[
                    "n1 * sin(a1) = n2 * sin(a2)",
                    "Water n=1.33  makes objects appear shallower.",
                ]),
                ("Controls",(100,200,255),[
                    "[R]  Toggle real fish positions",
                    "[H]  Toggle this help",
                    "[ESC]  Quit",
                ]),
            ]:
                overlay.blit(f_med.render(hdr,True,hcol),(cx0+24,sy2)); sy2+=24
                for line in lines:
                    overlay.blit(f_sm.render(line,True,(180,180,180)),(cx0+36,sy2)); sy2+=18
                sy2+=10

            # start button
            btn=pygame.Rect(cx0+40,cy0+ch-68,cw-80,48)
            hover=btn.collidepoint(mx,my)
            btn_col=(34,197,94) if hover else (52,211,153)
            pygame.draw.rect(overlay,btn_col,btn,border_radius=12)
            pygame.draw.rect(overlay,(255,255,255,40),btn,1,border_radius=12)
            bl=f_lg.render(">> Start Fishing! <<",True,(255,255,255))
            overlay.blit(bl,(btn.centerx-bl.get_width()//2,btn.centery-bl.get_height()//2))

            screen.blit(overlay,(0,0))

        pygame.display.flip()

    pygame.quit()
    sys.exit()

if __name__=="__main__":
    main()